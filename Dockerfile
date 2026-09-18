# Real Linux base (Debian), not a custom kernel - see CLAUDE.md for why.
# Multi-stage: build the real Rust interpreter/shell binary, then ship it
# on a minimal Debian runtime image so the container's actual OS is real,
# unmodified Debian - real networking, real ELF loading, real syscalls -
# with nepali-core as the login shell on top, not the OS itself.

FROM rust:1-bookworm AS builder
WORKDIR /build
# python3-dev: pyo3 (the real embedded-CPython interop bridge, see
# CLAUDE.md) links against Debian's real system libpython3.11 at build
# time - dynamically linked for now, not the statically-linked
# self-contained build that's real follow-up work.
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3-dev && \
    rm -rf /var/lib/apt/lists/*
# nepali-plugin-abi: the shared C-ABI crate nepali-core's HostRust bridge
# and every real Rust plugin (nepali-example-plugin) both depend on - see
# CLAUDE.md's Rust interop bridge.
COPY crates/nepali-plugin-abi ./crates/nepali-plugin-abi
COPY crates/nepali-example-plugin ./crates/nepali-example-plugin
COPY crates/nepali-core ./crates/nepali-core
COPY crates/nepali-fileserver ./crates/nepali-fileserver
COPY crates/nepali-dnsserver ./crates/nepali-dnsserver
# --features ai-interop on top of the default feature set (not
# --no-default-features): every existing bridge stays on, plus the real
# local-AI bridge (एआई_सोध्नुहोस्/एआई_सुन्नुहोस्/एआई_बोल्नुहोस् - see
# CLAUDE.md) becomes real capability baked into the actual OS image.
# Model weights themselves ARE baked into this image too (see the real
# download step in the final stage below) - booting/running this OS
# directly gives working AI with zero extra setup, unlike install.sh's
# language-only route (see install.sh's own comment) which deliberately
# stays model-free.
RUN cargo build --release --manifest-path crates/nepali-core/Cargo.toml --features ai-interop && \
    cargo build --release --manifest-path crates/nepali-example-plugin/Cargo.toml && \
    cargo build --release --manifest-path crates/nepali-fileserver/Cargo.toml && \
    cargo build --release --manifest-path crates/nepali-dnsserver/Cargo.toml

# A real go build -buildmode=c-shared plugin (plugins/go-example),
# satisfying the exact same nepali-plugin-abi C-ABI contract as the Rust
# example plugin above - proves गो_चलाउनुहोस् isn't a second
# implementation pretending to be real, it's the same dlopen mechanism
# loading a real Go-compiled shared library. Separate builder stage since
# the Rust builder image has no Go toolchain.
FROM golang:1.23-bookworm AS go-builder
WORKDIR /build
COPY plugins/go-example ./plugins/go-example
RUN cd plugins/go-example && \
    CGO_ENABLED=1 go build -buildmode=c-shared -o libnepali_go_example.so main.go

FROM debian:bookworm-slim

# sqlite3: lets you independently inspect the same database file
# डाटाबेस_चलाउनुहोस्/डाटाबेस_सोध्नुहोस् write to, exactly like the
# verification done during development (see the reset commit).
# libpython3.11: the real shared runtime library पाइथन_चलाउनुहोस्
# dynamically links against - the plain `python3` package alone does NOT
# pull this in (confirmed: the binary failed to even start with "cannot
# open shared object file libpython3.11.so.1.0" until this was added
# explicitly). Everything else here is real Debian userland already -
# bash, coreutils, a real libc, a real package manager (apt) - none of
# it reimplemented.
# curl: lets a shell session verify nepali-fileserver end-to-end the
# same way it was verified during development. redis-server/redis-tools:
# a real cache backend for HostCache (क्यास_राख्नुहोस्/...) plus
# redis-cli for independent verification, same reasoning as sqlite3.
# dnsutils: real dig, for independently verifying nepali-dnsserver.
# python3-pip: installs the real `transformers`/`torch`/etc packages
# एआई_बोल्नुहोस् (text-to-speech) needs, into this image's own python3 -
# the same interpreter python3-dev/libpython3.11 let pyo3 embed.
# unzip: needed once below to extract a real speaker x-vector from
# Matthijs/cmu-arctic-xvectors' real dataset archive.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        sqlite3 python3 python3-pip libpython3.11 curl ca-certificates unzip \
        redis-server redis-tools dnsutils && \
    rm -rf /var/lib/apt/lists/*

# Real model weights, baked directly into the image - not supplied at
# runtime like the OS's other opt-in config (NEPALI_DB, etc). The user's
# own requirement: booting/running this OS directly should give working
# AI with zero extra setup; install.sh's standalone-language route stays
# model-free by design (see that script's own comment) - this Dockerfile
# is the "OS has AI baked in" half of that split. Same real, open,
# already-verified models from CLAUDE.md's AI section - nothing new or
# unverified chosen here:
# - Qwen2.5-0.5B-Instruct (GGUF, quantized) for एआई_सोध्नुहोस्
# - openai/whisper-tiny (safetensors) + candle's own mel-filterbank data
#   for एआई_सुन्नुहोस्
# - a real, MIT-licensed community Nepali SpeechT5 fine-tune + Microsoft's
#   open HiFi-GAN vocoder + a real speaker x-vector for एआई_बोल्नुहोस्
# All from real, ungated sources (facebook/mms-tts-npi was tried first
# and found gated behind a Hugging Face login/license - see CLAUDE.md -
# so isn't used here either).
RUN mkdir -p /usr/local/share/nepali-ai/llm /usr/local/share/nepali-ai/whisper /usr/local/share/nepali-ai/tts && \
    curl -L -sf -o /usr/local/share/nepali-ai/llm/model.gguf \
        "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf" && \
    curl -L -sf -o /usr/local/share/nepali-ai/llm/tokenizer.json \
        "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/resolve/main/tokenizer.json" && \
    curl -L -sf -o /usr/local/share/nepali-ai/whisper/model.safetensors \
        "https://huggingface.co/openai/whisper-tiny/resolve/main/model.safetensors" && \
    curl -L -sf -o /usr/local/share/nepali-ai/whisper/config.json \
        "https://huggingface.co/openai/whisper-tiny/resolve/main/config.json" && \
    curl -L -sf -o /usr/local/share/nepali-ai/whisper/tokenizer.json \
        "https://huggingface.co/openai/whisper-tiny/resolve/main/tokenizer.json" && \
    curl -L -sf -o /usr/local/share/nepali-ai/whisper/mel_filters.bytes \
        "https://raw.githubusercontent.com/huggingface/candle/main/candle-examples/examples/whisper/melfilters.bytes" && \
    curl -L -sf -o /tmp/xvectors.zip \
        "https://huggingface.co/datasets/Matthijs/cmu-arctic-xvectors/resolve/main/spkrec-xvect.zip" && \
    unzip -q -j /tmp/xvectors.zip "spkrec-xvect/cmu_us_bdl_arctic-wav-arctic_b0090.npy" \
        -d /usr/local/share/nepali-ai/tts && \
    mv /usr/local/share/nepali-ai/tts/cmu_us_bdl_arctic-wav-arctic_b0090.npy \
        /usr/local/share/nepali-ai/tts/speaker.npy && \
    rm -f /tmp/xvectors.zip

# Real Python TTS pipeline dependencies (see host_ai.rs's TTS_PY_SOURCE) -
# torch CPU wheel, not the much larger default CUDA build, matching this
# image's CPU-only inference story everywhere else. --extra-index-url,
# not --index-url: a real, easy-to-hit pip gotcha - --index-url REPLACES
# the default PyPI index rather than adding to it, so plain dependencies
# torch needs (e.g. typing_extensions) that aren't mirrored on
# PyTorch's own wheel index have nowhere to resolve from and pip falls
# back to building them from source, which then fails on a missing
# build backend (flit_core) with no useful error otherwise - reproduced
# live, fixed by keeping PyPI available as a fallback.
RUN pip3 install --break-system-packages --no-cache-dir \
        torch --extra-index-url https://download.pytorch.org/whl/cpu && \
    pip3 install --break-system-packages --no-cache-dir \
        transformers sentencepiece soundfile numpy huggingface_hub

# Baking the real TTS model+vocoder in as local files too (not left to
# download from the Hub the first time एआई_बोल्नुहोस् actually runs) -
# `snapshot_download` (from the huggingface_hub package just installed)
# is the real, correct way to fetch a whole real model repo, rather than
# hand-listing every file this specific repo happens to contain.
RUN python3 -c "\
from huggingface_hub import snapshot_download; \
snapshot_download('aryamanstha/speecht5_tts_nepali_oslr43_tokenizermodified_swos', local_dir='/usr/local/share/nepali-ai/tts/model'); \
snapshot_download('microsoft/speecht5_hifigan', local_dir='/usr/local/share/nepali-ai/tts/vocoder')"

COPY --from=builder /build/crates/nepali-core/target/release/nepali-core-cli /usr/local/bin/nepali
# The real example plugin (crates/nepali-example-plugin) that verifies
# the Rust interop bridge - a real, working reference for what a real
# plugin looks like, not just a test fixture that stays local-only.
COPY --from=builder /build/crates/nepali-example-plugin/target/release/libnepali_example_plugin.so /usr/local/lib/nepali/example-plugin.so
COPY --from=go-builder /build/plugins/go-example/libnepali_go_example.so /usr/local/lib/nepali/go-example-plugin.so
COPY --from=builder /build/crates/nepali-fileserver/target/release/nepali-fileserver /usr/local/bin/nepali-fileserver
COPY --from=builder /build/crates/nepali-dnsserver/target/release/nepali-dnsserver /usr/local/bin/nepali-dnsserver

# Real login-shell registration, not just a container ENTRYPOINT trick -
# this also makes sense if this image is ever used as the base of a real
# VM/bare-metal install later, not only `docker run`.
RUN echo /usr/local/bin/nepali >> /etc/shells && \
    useradd -m -s /usr/local/bin/nepali nepali

ENV NEPALI_DB=/home/nepali/.nepali/os.db
ENV NEPALI_FILES_DIR=/home/nepali/.nepali/files
# Real, baked-in model paths - एआई_सोध्नुहोस्/एआई_सुन्नुहोस्/एआई_बोल्नुहोस्/
# एजेन्ट_चलाउनुहोस् all work with zero extra setup the moment this
# container runs, matching the user's actual requirement (the language
# alone, via install.sh, deliberately does NOT set any of these).
ENV NEPALI_AI_MODEL_PATH=/usr/local/share/nepali-ai/llm/model.gguf
ENV NEPALI_AI_TOKENIZER_PATH=/usr/local/share/nepali-ai/llm/tokenizer.json
ENV NEPALI_AI_WHISPER_MODEL_PATH=/usr/local/share/nepali-ai/whisper/model.safetensors
ENV NEPALI_AI_WHISPER_CONFIG_PATH=/usr/local/share/nepali-ai/whisper/config.json
ENV NEPALI_AI_WHISPER_TOKENIZER_PATH=/usr/local/share/nepali-ai/whisper/tokenizer.json
ENV NEPALI_AI_WHISPER_MEL_FILTERS_PATH=/usr/local/share/nepali-ai/whisper/mel_filters.bytes
ENV NEPALI_AI_WHISPER_LANG=ne
ENV NEPALI_AI_TTS_MODEL_PATH=/usr/local/share/nepali-ai/tts/model
ENV NEPALI_AI_TTS_VOCODER_PATH=/usr/local/share/nepali-ai/tts/vocoder
ENV NEPALI_AI_TTS_SPEAKER_EMBEDDING_PATH=/usr/local/share/nepali-ai/tts/speaker.npy
ENV NEPALI_AI_TTS_OUTPUT_DIR=/home/nepali/.nepali/tts-output
USER nepali
WORKDIR /home/nepali
EXPOSE 8080
# UDP :53 is a privileged port - binding it as the non-root `nepali` user
# (see USER above) needs either running as root or granting
# CAP_NET_BIND_SERVICE, the same real constraint any DNS server on Linux
# has - not something to silently work around. NEPALI_DNS_PORT can be
# set to a non-privileged port for a non-root deployment.
EXPOSE 53/udp

ENTRYPOINT ["/usr/local/bin/nepali"]
