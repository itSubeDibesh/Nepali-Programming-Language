//! Real local AI backend for `एआई_सोध्नुहोस्`/`एआई_सुन्नुहोस्`/`एआई_बोल्नुहोस्`.
//!
//! `ask` runs a real quantized (GGUF) Qwen2 language model through
//! `candle` - a pure-Rust ML runtime, not a C++/CUDA binding, keeping the
//! same "no extra native toolchain" portability story the rest of this
//! project holds itself to. CPU-only inference (no CUDA/Metal feature
//! wired up) so it runs anywhere the binary itself runs, at the real
//! cost of being slower than a GPU-backed setup.
//!
//! `listen` runs a real Whisper model (candle's own implementation,
//! same runtime as `ask`) for speech-to-text - real, not a stub.
//!
//! `speak` (text-to-speech) is real too, but through a different route
//! than `ask`/`listen`: no Rust ML runtime (`candle` included, even at
//! its latest version) ships a VITS/SpeechT5-family TTS model, and
//! hand-writing one from scratch would be unverifiable guesswork - a
//! real risk of shipping silently-wrong audio, which this project holds
//! itself to a higher bar than. Instead `speak` reuses the *other*
//! already-verified bridge in this file's neighborhood: real embedded
//! CPython via `pyo3` (the same mechanism `host_python.rs` uses for
//! `पाइथन_चलाउनुहोस्`), running a real, proven `transformers` SpeechT5
//! pipeline. Real, open model: a community Nepali SpeechT5 fine-tune
//! (`aryamanstha/speecht5_tts_nepali_oslr43_tokenizermodified_swos`,
//! MIT-licensed, trained on the real OpenSLR-43 Nepali corpus) plus
//! Microsoft's open HiFi-GAN vocoder - Meta's own MMS-TTS Nepali
//! checkpoint is gated behind a Hugging Face login/license, which isn't
//! something this bridge can silently satisfy on a user's behalf.

use candle_core::quantized::gguf_file;
use candle_core::{Device, IndexOp, Tensor};
use candle_transformers::generation::LogitsProcessor;
use candle_transformers::models::quantized_qwen2::ModelWeights;
use candle_transformers::models::whisper::{self as whisper_mod, audio as whisper_audio, model as whisper_model};
use nepali_core::interpreter::HostAi;
use pyo3::prelude::*;
use pyo3::types::PyModule;
use std::cell::RefCell;
use std::env;
use std::fs::File;
use std::io::BufReader;
use std::time::{SystemTime, UNIX_EPOCH};

/// The real Python side of `speak` - loaded once via `PyModule::from_code`
/// and kept warm in the process (re-loading SpeechT5's real weights from
/// disk on every single `एआई_बोल्नुहोस्` call would be an obviously wrong
/// cost model, same reasoning as `LoadedModel`/`LoadedWhisper` above).
/// Model/vocoder/speaker-embedding paths are passed in as real Python
/// objects via `load(...)`, never string-formatted into source - the
/// text to synthesize later goes through the same safe call path via
/// `synthesize(text, out_path)`, so arbitrary `.nep`-supplied text can
/// never inject Python source.
const TTS_PY_SOURCE: &str = r#"
_state = {}

def load(model_path, vocoder_path, speaker_embedding_path):
    import numpy as np
    import torch
    from transformers import SpeechT5ForTextToSpeech, SpeechT5HifiGan, SpeechT5Processor

    _state["processor"] = SpeechT5Processor.from_pretrained(model_path)
    _state["model"] = SpeechT5ForTextToSpeech.from_pretrained(model_path)
    _state["vocoder"] = SpeechT5HifiGan.from_pretrained(vocoder_path)
    _state["speaker"] = torch.tensor(np.load(speaker_embedding_path)).unsqueeze(0)

def synthesize(text, out_path):
    import soundfile as sf

    inputs = _state["processor"](text=text, return_tensors="pt")
    speech = _state["model"].generate_speech(
        inputs["input_ids"], _state["speaker"], vocoder=_state["vocoder"]
    )
    sf.write(out_path, speech.numpy(), samplerate=16000)
    return out_path
"#;

/// Real, no-Python-style "load once, keep in the process" caching - a
/// fresh `ModelWeights`/tokenizer load per call would mean re-reading a
/// multi-gigabyte GGUF file from disk on every single `एआई_सोध्नुहोस्`
/// call, an obviously wrong cost model.
struct LoadedModel {
    weights: ModelWeights,
    tokenizer: tokenizers::Tokenizer,
    eos_token_id: Option<u32>,
    device: Device,
}

/// Same load-once reasoning as `LoadedModel` - a fresh Whisper load per
/// call would mean re-reading real safetensors weights from disk every
/// time `एआई_सुन्नुहोस्` is called.
struct LoadedWhisper {
    whisper: whisper_model::Whisper,
    tokenizer: tokenizers::Tokenizer,
    mel_filters: Vec<f32>,
    device: Device,
}

pub struct LocalAi {
    model: RefCell<Option<LoadedModel>>,
    whisper: RefCell<Option<LoadedWhisper>>,
    tts: RefCell<Option<Py<PyModule>>>,
}

impl LocalAi {
    pub fn new() -> Self {
        LocalAi {
            model: RefCell::new(None),
            whisper: RefCell::new(None),
            tts: RefCell::new(None),
        }
    }

    fn load(&self) -> Result<(), String> {
        if self.model.borrow().is_some() {
            return Ok(());
        }
        let (model_path, tokenizer_path) = match (env::var("NEPALI_AI_MODEL_PATH"), env::var("NEPALI_AI_TOKENIZER_PATH")) {
            (Ok(m), Ok(t)) => (m, t),
            _ => {
                let mut found = None;
                if let Ok(home) = env::var("HOME") {
                    let candidates = [
                        (format!("{home}/.nepali-ai/llm-large/model.gguf"), format!("{home}/.nepali-ai/llm-large/tokenizer.json")),
                        (format!("{home}/.nepali-ai/llm-small/model.gguf"), format!("{home}/.nepali-ai/llm-small/tokenizer.json")),
                        (format!("{home}/.nepali-ai/llm/model.gguf"), format!("{home}/.nepali-ai/llm/tokenizer.json")),
                        (format!("{home}/.cache/nepali/model.gguf"), format!("{home}/.cache/nepali/tokenizer.json")),
                    ];
                    for (m, t) in candidates {
                        if std::path::Path::new(&m).exists() && std::path::Path::new(&t).exists() {
                            found = Some((m, t));
                            break;
                        }
                    }
                }
                if found.is_none() {
                    if let Ok(exe) = env::current_exe() {
                        if let Some(parent) = exe.parent() {
                            let bundle_candidates = [
                                (parent.join("../Resources/models/llm/model.gguf"), parent.join("../Resources/models/llm/tokenizer.json")),
                                (parent.join("../Resources/models/llm-small/model.gguf"), parent.join("../Resources/models/llm-small/tokenizer.json")),
                                (parent.join("models/llm/model.gguf"), parent.join("models/llm/tokenizer.json")),
                            ];
                            for (m, t) in bundle_candidates {
                                if m.exists() && t.exists() {
                                    found = Some((m.to_string_lossy().to_string(), t.to_string_lossy().to_string()));
                                    break;
                                }
                            }
                        }
                    }
                }
                if found.is_none() {
                    let system_candidates = [
                        ("/usr/local/share/nepali-ai/llm/model.gguf".to_string(), "/usr/local/share/nepali-ai/llm/tokenizer.json".to_string()),
                        ("/opt/homebrew/share/nepali-ai/llm/model.gguf".to_string(), "/opt/homebrew/share/nepali-ai/llm/tokenizer.json".to_string()),
                    ];
                    for (m, t) in system_candidates {
                        if std::path::Path::new(&m).exists() && std::path::Path::new(&t).exists() {
                            found = Some((m, t));
                            break;
                        }
                    }
                }
                found.ok_or_else(|| {
                    "एआई_सोध्नुहोस् needs NEPALI_AI_MODEL_PATH set to a real local GGUF model file \
                     (e.g. a Qwen2.5-Instruct GGUF quantized checkpoint) - none was set"
                        .to_string()
                })?
            }
        };

        let device = Device::Cpu;
        let mut reader = BufReader::new(
            File::open(&model_path)
                .map_err(|e| format!("could not open GGUF model at {model_path}: {e}"))?,
        );
        let content = gguf_file::Content::read(&mut reader)
            .map_err(|e| format!("{model_path} is not a valid GGUF file: {e}"))?;
        let eos_token_id = content
            .metadata
            .get("tokenizer.ggml.eos_token_id")
            .and_then(|v| v.to_u32().ok());
        let weights = ModelWeights::from_gguf(content, &mut reader, &device)
            .map_err(|e| format!("failed to load model weights from {model_path}: {e}"))?;
        let tokenizer = tokenizers::Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| format!("could not load tokenizer at {tokenizer_path}: {e}"))?;

        *self.model.borrow_mut() = Some(LoadedModel {
            weights,
            tokenizer,
            eos_token_id,
            device,
        });
        Ok(())
    }

    fn load_whisper(&self) -> Result<(), String> {
        if self.whisper.borrow().is_some() {
            return Ok(());
        }
        let need = |var: &str, hint: &str| {
            env::var(var).map_err(|_| format!("एआई_सुन्नुहोस् needs {var} set to {hint} - none was set"))
        };
        let weights_path = need("NEPALI_AI_WHISPER_MODEL_PATH", "a real Whisper model.safetensors file")?;
        let config_path = need("NEPALI_AI_WHISPER_CONFIG_PATH", "that model's real config.json")?;
        let tokenizer_path = need("NEPALI_AI_WHISPER_TOKENIZER_PATH", "that model's real tokenizer.json")?;
        let mel_filters_path = need(
            "NEPALI_AI_WHISPER_MEL_FILTERS_PATH",
            "a real mel-filterbank bytes file (80 or 128 mel bins, matching the model)",
        )?;

        let device = Device::Cpu;
        let config_json = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("could not read Whisper config at {config_path}: {e}"))?;
        let config: whisper_mod::Config = serde_json::from_str(&config_json)
            .map_err(|e| format!("{config_path} is not a valid Whisper config: {e}"))?;

        let vb = unsafe {
            candle_nn::VarBuilder::from_mmaped_safetensors(&[weights_path.clone()], whisper_mod::DTYPE, &device)
                .map_err(|e| format!("could not load Whisper weights at {weights_path}: {e}"))?
        };
        let whisper = whisper_model::Whisper::load(&vb, config)
            .map_err(|e| format!("failed to build Whisper model from {weights_path}: {e}"))?;
        let tokenizer = tokenizers::Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| format!("could not load tokenizer at {tokenizer_path}: {e}"))?;

        let mel_bytes = std::fs::read(&mel_filters_path)
            .map_err(|e| format!("could not read mel filters at {mel_filters_path}: {e}"))?;
        if mel_bytes.len() % 4 != 0 {
            return Err(format!(
                "{mel_filters_path} is not a valid little-endian f32 array (byte length {} not a multiple of 4)",
                mel_bytes.len()
            ));
        }
        let mel_filters: Vec<f32> = mel_bytes
            .chunks_exact(4)
            .map(|c| f32::from_le_bytes([c[0], c[1], c[2], c[3]]))
            .collect();

        *self.whisper.borrow_mut() = Some(LoadedWhisper {
            whisper,
            tokenizer,
            mel_filters,
            device,
        });
        Ok(())
    }

    fn load_tts(&self) -> Result<(), String> {
        if self.tts.borrow().is_some() {
            return Ok(());
        }
        let need = |var: &str, hint: &str| {
            env::var(var).map_err(|_| format!("एआई_बोल्नुहोस् needs {var} set to {hint} - none was set"))
        };
        let model_path = need(
            "NEPALI_AI_TTS_MODEL_PATH",
            "a real SpeechT5 text-to-speech model (a local path or a Hugging Face model id, \
             e.g. aryamanstha/speecht5_tts_nepali_oslr43_tokenizermodified_swos)",
        )?;
        let vocoder_path = need(
            "NEPALI_AI_TTS_VOCODER_PATH",
            "a real SpeechT5-compatible HiFi-GAN vocoder (e.g. microsoft/speecht5_hifigan)",
        )?;
        let speaker_embedding_path = need(
            "NEPALI_AI_TTS_SPEAKER_EMBEDDING_PATH",
            "a real speaker x-vector .npy file (e.g. one of Matthijs/cmu-arctic-xvectors)",
        )?;

        Python::with_gil(|py| -> Result<(), String> {
            let module = PyModule::from_code_bound(py, TTS_PY_SOURCE, "nepali_tts.py", "nepali_tts")
                .map_err(|e| format!("failed to load the real Python TTS pipeline: {e}"))?;
            module
                .getattr("load")
                .and_then(|f| f.call1((model_path, vocoder_path, speaker_embedding_path)))
                .map_err(|e| {
                    format!(
                        "failed to load real SpeechT5 weights - is `transformers`/`torch`/`soundfile`/\
                         `sentencepiece`/`numpy` installed in the embedded Python? {e}"
                    )
                })?;
            *self.tts.borrow_mut() = Some(module.into());
            Ok(())
        })
    }
}

impl Default for LocalAi {
    fn default() -> Self {
        Self::new()
    }
}

const DEFAULT_SYSTEM: &str = "You are a helpful assistant.";

// System prompt for Qwen instruct model to reason and provide fixed Nepali code
const NEPALI_SYSTEM: &str = "तपाईं नेपाली प्रोग्रामिङ भाषाको आधिकारिक र बौद्धिक एआई सहायक हुनुहुन्छ। \
प्रयोगकर्ताको प्रश्न र कोड ध्यानपूर्वक विश्लेषण गर्नुहोस्। \
यदि लुप कति पटक चल्ने वा त्रुटि सच्याउनेबारे सोधिएको छ भने: \
१. समस्याको कारण (जस्तै लुप ० बाट सुरु हुँदा <= २ ले ३ पटक चलाउनु) स्पष्ट नेपालीमा बुझाउनुहोस्। \
२. सच्याइएको पूर्ण सही कोड ```nepali ... ``` ब्लकमा दिनुहोस्। \
३. हुबहु कोड मात्र नदोहोर्याई वास्तविक समाधान दिनुहोस्।";

fn system_for(prompt: &str) -> &'static str {
    if prompt.chars().any(|c| ('\u{0900}'..='\u{097F}').contains(&c)) {
        NEPALI_SYSTEM
    } else {
        DEFAULT_SYSTEM
    }
}

impl HostAi for LocalAi {
    fn ask(&self, prompt: &str) -> Result<String, String> {
        self.ask_with_system(system_for(prompt), prompt)
    }

    fn ask_with_system(&self, system: &str, prompt: &str) -> Result<String, String> {
        self.load()?;
        let mut model_ref = self.model.borrow_mut();
        let loaded = model_ref.as_mut().expect("just loaded above");

        // Real, verified finding (see CLAUDE.md): an Instruct-tuned
        // model fed a raw, unwrapped prompt just does text continuation
        // instead of following it - a small model especially will
        // ramble on rather than answer. Wrapping in Qwen's own ChatML
        // template (the same format its instruction tuning was actually
        // trained on) is what makes it behave like an instruct model at
        // all, verified with real before/after output.
        let templated = format!(
            "<|im_start|>system\n{system}<|im_end|>\n\
             <|im_start|>user\n{prompt}<|im_end|>\n<|im_start|>assistant\n"
        );
        let encoding = loaded
            .tokenizer
            .encode(templated, true)
            .map_err(|e| format!("tokenizer failed to encode prompt: {e}"))?;
        let mut tokens: Vec<u32> = encoding.get_ids().to_vec();
        if tokens.is_empty() {
            return Err("prompt encoded to zero tokens".to_string());
        }

        let max_new_tokens: usize = env::var("NEPALI_AI_MAX_TOKENS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(256);
        // Free chat keeps some randomness; answers grounded in the language
        // guide/recipes should copy them, not improvise - a small model
        // mangles Devanagari code at high temperature.
        let temperature: f64 = env::var("NEPALI_AI_TEMPERATURE")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(if system == DEFAULT_SYSTEM { 0.7 } else { 0.2 });
        let mut logits_processor = LogitsProcessor::new(299792458, Some(temperature), Some(0.9));

        let mut generated: Vec<u32> = Vec::new();
        let start_pos = 0usize;

        // First forward pass consumes the whole prompt at once; every
        // pass after that consumes just the previously sampled token,
        // relying on the model's own kv-cache (kept across calls to
        // `forward` on the same `ModelWeights`, per candle's real
        // quantized-llama-family generation pattern).
        let input = Tensor::new(tokens.as_slice(), &loaded.device)
            .and_then(|t| t.unsqueeze(0))
            .map_err(|e| format!("failed to build input tensor: {e}"))?;
        let logits = loaded
            .weights
            .forward(&input, start_pos)
            .map_err(|e| format!("model forward pass failed: {e}"))?;
        let logits = logits
            .squeeze(0)
            .map_err(|e| format!("failed to squeeze logits: {e}"))?;
        let mut next_token = logits_processor
            .sample(&logits)
            .map_err(|e| format!("sampling failed: {e}"))?;

        let mut pos = tokens.len();
        for _ in 0..max_new_tokens {
            if Some(next_token) == loaded.eos_token_id {
                break;
            }
            generated.push(next_token);
            tokens.push(next_token);

            let input = Tensor::new(&[next_token], &loaded.device)
                .and_then(|t| t.unsqueeze(0))
                .map_err(|e| format!("failed to build input tensor: {e}"))?;
            let logits = loaded
                .weights
                .forward(&input, pos)
                .map_err(|e| format!("model forward pass failed: {e}"))?;
            let logits = logits
                .squeeze(0)
                .map_err(|e| format!("failed to squeeze logits: {e}"))?;
            next_token = logits_processor
                .sample(&logits)
                .map_err(|e| format!("sampling failed: {e}"))?;
            pos += 1;
        }

        loaded
            .tokenizer
            .decode(&generated, true)
            .map_err(|e| format!("tokenizer failed to decode response: {e}"))
    }

    /// Real Whisper speech-to-text. `audio_path` must be a real 16kHz
    /// mono 16-bit PCM WAV file - resampling other sample rates is a
    /// real, stated gap (not attempted here), so a WAV recorded at a
    /// different rate is a real, explicit error rather than silently
    /// wrong output from feeding the model misaligned audio.
    fn listen(&self, audio_path: &str) -> Result<String, String> {
        self.load_whisper()?;
        let mut whisper_ref = self.whisper.borrow_mut();
        let loaded = whisper_ref.as_mut().expect("just loaded above");

        let mut reader = hound::WavReader::open(audio_path)
            .map_err(|e| format!("could not open WAV file at {audio_path}: {e}"))?;
        let spec = reader.spec();
        if spec.sample_rate != whisper_mod::SAMPLE_RATE as u32 {
            return Err(format!(
                "{audio_path} is {} Hz, but this bridge only accepts {} Hz mono WAV \
                 (resampling isn't implemented yet) - re-encode it first, \
                 e.g. `ffmpeg -i in.wav -ar 16000 -ac 1 out.wav`",
                spec.sample_rate,
                whisper_mod::SAMPLE_RATE
            ));
        }
        if spec.bits_per_sample != 16 {
            return Err(format!(
                "{audio_path} is {}-bit, but this bridge only accepts 16-bit PCM WAV",
                spec.bits_per_sample
            ));
        }
        let raw_samples: Vec<i16> = reader
            .samples::<i16>()
            .collect::<Result<Vec<i16>, _>>()
            .map_err(|e| format!("failed to read samples from {audio_path}: {e}"))?;
        let channels = spec.channels as usize;
        if channels == 0 {
            return Err(format!("{audio_path} reports zero audio channels"));
        }
        let samples: Vec<f32> = raw_samples
            .chunks_exact(channels)
            .map(|frame| {
                let sum: f32 = frame.iter().map(|s| *s as f32 / 32768.0).sum();
                sum / channels as f32
            })
            .collect();
        if samples.is_empty() {
            return Err(format!("{audio_path} contains no audio samples"));
        }

        let mel = whisper_audio::pcm_to_mel(&loaded.whisper.config, &samples, &loaded.mel_filters);
        let n_mel = loaded.whisper.config.num_mel_bins;
        let n_frames = mel.len() / n_mel;
        let mel_tensor = Tensor::from_vec(mel, (1, n_mel, n_frames), &loaded.device)
            .map_err(|e| format!("failed to build mel spectrogram tensor: {e}"))?;

        let lang = env::var("NEPALI_AI_WHISPER_LANG").unwrap_or_else(|_| "ne".to_string());
        let lang_token = format!("<|{lang}|>");
        let sot_id = loaded
            .tokenizer
            .token_to_id(whisper_mod::SOT_TOKEN)
            .ok_or_else(|| "tokenizer is missing the Whisper start-of-transcript token".to_string())?;
        let lang_id = loaded.tokenizer.token_to_id(&lang_token).ok_or_else(|| {
            format!("tokenizer has no language token '{lang_token}' - unsupported NEPALI_AI_WHISPER_LANG value")
        })?;
        let transcribe_id = loaded
            .tokenizer
            .token_to_id(whisper_mod::TRANSCRIBE_TOKEN)
            .ok_or_else(|| "tokenizer is missing the Whisper transcribe token".to_string())?;
        let no_timestamps_id = loaded
            .tokenizer
            .token_to_id(whisper_mod::NO_TIMESTAMPS_TOKEN)
            .ok_or_else(|| "tokenizer is missing the Whisper no-timestamps token".to_string())?;
        let eot_id = loaded
            .tokenizer
            .token_to_id(whisper_mod::EOT_TOKEN)
            .ok_or_else(|| "tokenizer is missing the Whisper end-of-text token".to_string())?;

        let mut tokens: Vec<u32> = vec![sot_id, lang_id, transcribe_id, no_timestamps_id];
        let max_target_positions = loaded.whisper.config.max_target_positions;

        let xa = loaded
            .whisper
            .encoder
            .forward(&mel_tensor, true)
            .map_err(|e| format!("Whisper audio encoder failed: {e}"))?;

        let mut generated: Vec<u32> = Vec::new();
        for step in 0..max_target_positions.saturating_sub(tokens.len()) {
            let x = Tensor::new(tokens.as_slice(), &loaded.device)
                .and_then(|t| t.unsqueeze(0))
                .map_err(|e| format!("failed to build decoder input tensor: {e}"))?;
            let ys = loaded
                .whisper
                .decoder
                .forward(&x, &xa, step == 0)
                .map_err(|e| format!("Whisper text decoder failed: {e}"))?;
            let last_hidden = ys
                .i((.., tokens.len() - 1..tokens.len(), ..))
                .map_err(|e| format!("failed to slice decoder output: {e}"))?;
            let logits = loaded
                .whisper
                .decoder
                .final_linear(&last_hidden)
                .map_err(|e| format!("Whisper output projection failed: {e}"))?;
            let logits: Vec<f32> = logits
                .squeeze(0)
                .and_then(|t| t.squeeze(0))
                .and_then(|t| t.to_vec1())
                .map_err(|e| format!("failed to read logits: {e}"))?;
            let next_token = logits
                .iter()
                .enumerate()
                .max_by(|(_, a), (_, b)| a.total_cmp(b))
                .map(|(i, _)| i as u32)
                .ok_or_else(|| "Whisper produced no logits".to_string())?;

            if next_token == eot_id {
                break;
            }
            generated.push(next_token);
            tokens.push(next_token);
        }

        loaded
            .tokenizer
            .decode(&generated, true)
            .map_err(|e| format!("tokenizer failed to decode transcript: {e}"))
    }

    /// Real text-to-speech via the embedded Python SpeechT5 pipeline
    /// (see `TTS_PY_SOURCE` above). Writes a real WAV file under
    /// `NEPALI_AI_TTS_OUTPUT_DIR` (default: the OS temp dir) and returns
    /// its real path.
    fn speak(&self, text: &str) -> Result<String, String> {
        self.load_tts()?;
        let tts_ref = self.tts.borrow();
        let module = tts_ref.as_ref().expect("just loaded above");

        let out_dir = env::var("NEPALI_AI_TTS_OUTPUT_DIR")
            .unwrap_or_else(|_| std::env::temp_dir().to_string_lossy().into_owned());
        std::fs::create_dir_all(&out_dir)
            .map_err(|e| format!("could not create TTS output directory {out_dir}: {e}"))?;
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let out_path = format!("{out_dir}/nepali-tts-{nanos}.wav");

        Python::with_gil(|py| -> Result<String, String> {
            let result = module
                .bind(py)
                .getattr("synthesize")
                .and_then(|f| f.call1((text, out_path.as_str())))
                .map_err(|e| format!("real Python TTS synthesis failed: {e}"))?;
            result
                .extract::<String>()
                .map_err(|e| format!("TTS pipeline returned an unexpected value: {e}"))
        })
    }
}
