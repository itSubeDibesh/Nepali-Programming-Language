# Nepali OS: how to run it and what it can do

Nepali OS is real Debian Linux whose login shell is the Nepali programming
language itself. You type Nepali code or ordinary Linux commands at the same
prompt. On top of that it ships a file server, a DNS server, Redis, SQLite,
Python/JavaScript engines, and a local (offline) AI.

Everything below was run for real while writing this guide, unless it says
**not verified**. Commands that need a shell are written for macOS/Linux.

Contents: [Ways to run it](#ways-to-run-it) · [First five minutes](#first-five-minutes)
· [What you can do](#what-you-can-do) · [Configuration](#configuration) ·
[Limits](#limits-and-known-problems) · [Troubleshooting](#troubleshooting)

## Ways to run it

| You want | Use | Needs |
|---|---|---|
| Try the language in seconds | [local binary](#3-just-the-language) | Rust |
| The full OS, easiest | [Docker image](#1-docker) | Docker |
| A real bootable system | [ISO in a VM](#2-the-bootable-iso) | QEMU (or another VM) |

### 1. Docker

```bash
docker build -t nepali-os .          # from the repo root; long the first time
docker run -it --rm nepali-os        # opens the Nepali shell
```

The first build downloads about 1.5 GB of AI models and PyTorch, and takes
roughly 30-45 minutes. The image is about 4 GB on disk. Docker Desktop's
virtual disk must have room (raise it in Settings, Resources, if a build stops
with "no space left on device").

Useful variations (all verified):

```bash
# Run a script from your machine (arguments after the image name go to `nepali`)
docker run --rm -v "$PWD:/work" -w /work nepali-os hello.nep

# Keep the database and files between runs: a folder on your machine ...
docker run -it --rm -v "$PWD/nepali-data:/home/nepali/.nepali" nepali-os
# ... or a named volume (works once the image is rebuilt from the current Dockerfile)
docker run -it --rm -v nepali-data:/home/nepali/.nepali nepali-os

# Several things in one container (Redis + the shell): use bash as the entrypoint
docker run -it --rm --entrypoint bash nepali-os
```

Services run as their own containers from the same image (see
[Services](#services)).

### 2. The bootable ISO

Two images are produced under `os-image/output/` (they are build products, not
in git; see [`os-image/README.md`](../os-image/README.md) for building):

- `nepalios.iso`: the base system. Its text console **cannot draw Devanagari**
  (the Linux console has no such glyphs), so Nepali text shows as blanks.
- `nepalios-nepali.iso`: the base plus a graphical Devanagari terminal, Nepali
  keyboard switching, a Nepal-themed boot menu and a quiet boot. Make it from
  the base in about 30 seconds:

```bash
cd os-image
./build-overlay.sh output/nepalios.iso output/nepalios-nepali.iso
```

Boot it in QEMU:

```bash
qemu-system-x86_64 -m 3072 -vga std -cdrom os-image/output/nepalios-nepali.iso -boot d
```

Press Enter at the boot menu. It logs in automatically as `nepali` and lands
in the Nepali shell inside a terminal window. On an Apple Silicon Mac QEMU
emulates x86 in software, so boot takes about a minute and the AI takes
minutes per answer; real x86 hardware or KVM would be far faster
(**not verified**, nor is writing the ISO to a USB stick or UEFI boot).

Typing Nepali: press **Alt+Shift** to switch between the English and Nepali
keyboard layouts. The language's ASCII keywords (`bhana`, `rakha`, ...) work on
any keyboard with no switching.

Inside the ISO, Redis starts by itself. The file and DNS servers are not
started automatically.

### 3. Just the language

No OS, no AI, nothing baked in:

```bash
./install.sh                                  # builds and installs `nepali`
nepali examples/tour/01_namaste.nep
```

Or `cargo run --release --manifest-path crates/nepali-core/Cargo.toml -- file.nep`.
The 0.1.0 release is also on crates.io (`cargo install nepali-core` installs a binary named `nepali-core-cli`); it predates newer features.

## First five minutes

At the prompt (`नेपाली:~ $`; older images show `nep:/home/nepali $`):

```
नेपाली:~ $ भनौँ("नमस्ते")।                 <- Nepali code
नमस्ते
नेपाली:~ $ राखौँ क = 6।
नेपाली:~ $ भनौँ(क * 7)।
42
नेपाली:~ $ uname -a                        <- any Linux command
नेपाली:~ $ जानुहोस् /tmp                    <- change directory (or: cd /tmp)
नेपाली:/tmp $ बाहिर                        <- leave (or: exit)
```

How a line is handled:

1. If the first word is a program on `$PATH` (`ls`, `cat`, `uname`, ...), it runs.
2. Otherwise it is parsed as Nepali code and run. Variables and functions stay
   defined for the rest of the session.
3. If it is neither, you get `<word>: आदेश फेला परेन` (command not found).
4. Start a line with `!` to force an external command (`!ls`), for example when
   a program has the same name as one of your variables.

Run a file with `nepali file.nep`. Format one with `nepali fmt file.nep`
(`--check` only reports). To learn the language, work through
[`examples/tour/`](../examples/tour/README.md), then
[`examples/conditions/`](../examples/conditions/README.md) for every
condition and every error message.

## What you can do

### Program in Nepali

Both Devanagari and ASCII keywords, numbers with Devanagari digits, variables,
`यदि/नत्र`, `भएसम्म`, functions, recursion, closures, arrays, text, modules
(`आयात`), a static checker for undefined names and obvious type errors, and a
formatter. Errors print a message and exit with code 1 instead of crashing.
See the tour and the [cheat sheet](../examples/README.md).

### Use the operating system from the language

| Builtin | Does |
|---|---|
| `ओएस_पढ्नुहोस्(path)` `ओएस_लेख्नुहोस्(path, text)` `ओएस_सूची(dir)` | files |
| `आदेश_चलाउनुहोस्(program, [args])` | run a program; returns `[exit code, stdout, stderr]`. Not run through a shell, so `$HOME` or `;` in arguments stay literal |
| `डाटाबेस_चलाउनुहोस्(sql)` `डाटाबेस_सोध्नुहोस्(sql)` | SQLite (real, on disk at `$NEPALI_DB`) |
| `क्यास_राख्नुहोस्(key, value, seconds)` `क्यास_ल्याउनुहोस्(key)` `क्यास_हटाउनुहोस्(key)` | Redis cache (a missing key gives `केहीछैन`) |

### Call other languages

`पाइथन_चलाउनुहोस्(code)` (result is the Python variable `परिणाम`),
`जेएस_चलाउनुहोस्(code)`, `टिएस_चलाउनुहोस्(code)` (TypeScript is compiled, then
run), and native plugins written in Rust or Go through `रस्ट_चलाउनुहोस्` and
`गो_चलाउनुहोस्` (examples ship in `/usr/local/lib/nepali/`).

### Services

Start each as its own container from the same image (verified):

```bash
# File server: upload, list, download (flat file names only)
docker run -d --rm --name nfs -p 8080:8080 --entrypoint /usr/local/bin/nepali-fileserver nepali-os
curl -X PUT --data-binary 'नमस्ते' http://localhost:8080/hello.txt
curl http://localhost:8080/            # lists "name<TAB>size"
curl http://localhost:8080/hello.txt   # downloads it
# a name containing / or .. is refused with HTTP 400

# DNS server: answers A records for its own zone (no recursion)
docker run -d --rm --name ndns -p 5353:5353/udp -e NEPALI_DNS_PORT=5353 \
  -e NEPALI_DNS_RECORDS=web=10.0.0.5,db=10.0.0.6 --entrypoint /usr/local/bin/nepali-dnsserver nepali-os
dig @127.0.0.1 -p 5353 web.nepalios.local +short     # 10.0.0.5
# an unknown name gives NXDOMAIN
```

The DNS default port 53 needs root inside the container; use a port of 1024
or higher as above (running as root to use port 53 was not tried). Redis for the cache builtins:
`docker run -it --rm --entrypoint bash nepali-os`, then `redis-server --daemonize yes`
and run your script with `nepali script.nep`.

Real Next.js, Go and Rust web apps also run on it unchanged, since it is plain
Linux: see [`examples/hosting/`](../examples/hosting).

### Local AI (offline)

Models are built in; nothing is downloaded at run time.

| Builtin | Does | Notes |
|---|---|---|
| `एआई_सोध्नुहोस्(question)` | text answer from a local LLM (Qwen2.5-0.5B) | English answers well; **Nepali answers are poor** (the model is too small) |
| `एआई_सुन्नुहोस्(wav_path)` | speech to text (Whisper tiny) | 16 kHz mono 16-bit WAV only. Decodes Nepali by default, set `NEPALI_AI_WHISPER_LANG=en` for English. On a real Nepali recording it was phonetically close but wrote Latin letters with spelling mistakes |
| `एआई_बोल्नुहोस्(text)` | text to speech (Nepali SpeechT5) | writes a WAV file, returns its path |
| `एजेन्ट_चलाउनुहोस्(goal, max_steps)` | the AI uses real tools to do a task | see below |

```
नेपाली:~ $ भनौँ(एआई_सोध्नुहोस्("What is the capital of Nepal? One sentence."))।
The capital of Nepal is Kathmandu.
```

The **agent** can read, write and list files, run commands, list processes,
show disk space and system information, and remember facts between runs (kept
in the SQLite database). Destructive actions are refused with an explanation:
deleting files, `dd`, formatting disks, shutting down, killing processes,
force-pushing git, `-rf` flags, and writing into system folders (`/etc`,
`/usr`, ...). This is a block-list on the command the agent tries to run, not a
sandbox: it does not stop an allowed program (Python, say) from deleting things. The small model
sometimes fails to finish cleanly (repeats an action); it then stops early and
returns the last real result. This protection covers what the AI does on its
own; your own scripts can still call `आदेश_चलाउनुहोस्` directly.

### Developer tools (built from this repo; not inside the Docker image or ISO)

| Tool | What |
|---|---|
| `nepali fmt` | formatter (in the `nepali` binary) |
| `crates/nepali-lsp` | language server: live errors and formatting in an editor |
| `crates/nepali-mcp` | MCP server exposing run-script, ask-AI and run-agent to AI tools |
| `crates/nepali-codegen` | compiler to machine code via LLVM, for numeric programs only |

## Configuration

Set with `-e NAME=value` in Docker, or in the environment.

| Variable | Default | Meaning |
|---|---|---|
| `NEPALI_DB` | `~/.nepali/os.db` | SQLite database file |
| `NEPALI_REDIS_URL` | `redis://127.0.0.1:6379` | Redis for the cache builtins |
| `NEPALI_FILES_DIR` | `./files` (image: `~/.nepali/files`) | file server folder |
| `NEPALI_FILESERVER_PORT` | `8080` | file server port |
| `NEPALI_DNS_ZONE` / `NEPALI_DNS_RECORDS` / `NEPALI_DNS_PORT` | `nepalios.local` / none / `53` | DNS zone, `name=ip,...`, port |
| `NEPALI_AI_MODEL_PATH`, `NEPALI_AI_TOKENIZER_PATH` | set in image | LLM files (a Qwen2-family GGUF) |
| `NEPALI_AI_MAX_TOKENS` | `256` | longest AI answer |
| `NEPALI_AI_WHISPER_*_PATH`, `NEPALI_AI_WHISPER_LANG` | set in image, `ne` | speech-to-text files and language |
| `NEPALI_AI_TTS_*` | set in image | text-to-speech model, vocoder, speaker, output folder |

To use a bigger or better language model, point the two `NEPALI_AI_MODEL_*`
variables at other files; no rebuild needed (**not tried** with other models).

## Limits and known problems

- The built-in AI is small. It answers English questions well and Nepali ones
  badly, and it cannot yet write correct Nepali code on request.
- Numbers only (64-bit floating point): `1 / 0` is `inf`, `0.1 + 0.2 == 0.3`
  is false. There is no `break` and no `for`. See
  [`examples/conditions/`](../examples/conditions/README.md).
- Only one machine architecture per image: the Docker build matches your CPU;
  the ISO is x86-64.
- The plain text console cannot show Devanagari; use `nepalios-nepali.iso` or a
  terminal that can (Docker on a Mac or Linux desktop already has one).
- Error messages from the language itself are mostly English; the shell's own
  messages are Nepali.
- Not verified: real hardware, USB boot, UEFI boot, KVM speed, other AI models,
  starting the file/DNS servers inside the ISO.

## Troubleshooting

| Problem | Cause and fix |
|---|---|
| Docker build stops: "no space left on device" | Docker Desktop's disk is full. Raise it in Settings, Resources, or run `docker builder prune` |
| `warning: could not open database ...` and database calls fail | the data folder is not writable by `nepali` (a root-owned mount). Use a bind mount of a folder you own, or rebuild the image from the current Dockerfile and use a named volume |
| Nepali text shows as blanks or boxes on the ISO | you booted the base ISO; build and use `nepalios-nepali.iso` |
| `एआई_सोध्नुहोस्` says it needs `NEPALI_AI_MODEL_PATH` | you are not in the full image (or built without models); set the variables to your model files |
| AI is very slow in QEMU on a Mac | x86 emulation. Expected; use Docker for AI work on a Mac |
| `आदेश फेला परेन` for something you meant as code | the line did not parse as Nepali either; run it as a `.nep` file to see the parse error |
