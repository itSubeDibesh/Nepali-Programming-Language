# नेपाली OS / Nepali Programming Language

A real Nepali-language programming language (`nepali-core`), with a real
Linux-based OS built on top of it — not a toy, not a simulation. Every
feature described below has been built and independently verified end
to end (see [CLAUDE.md](CLAUDE.md) for the full, honest record of
what's real, what's a stated gap, and how each claim was checked).

## What this is

- **A real programming language**: lexer, recursive-descent parser,
  tree-walking interpreter, a second bytecode VM, closures, arrays,
  static type checking, a module system. Write code in Devanagari
  (`यदि`) or romanized (`yadi`) syntax — typable on any keyboard.
- **Real interop with four other languages**: call into Python, Rust,
  Go, and JavaScript/TypeScript from `.nep` code — real embedded
  runtimes (CPython, dlopen'd native plugins, QuickJS), not subprocess
  shims.
- **A real local AI backend**: a local LLM, real speech-to-text
  (Whisper), and real text-to-speech (SpeechT5), all callable as
  language builtins and from a real AI agent loop that can read/write
  files and run commands.
- **A real OS**: built on real Linux (Debian), with a real fileserver,
  cache (Redis), and DNS server, `nepali` registered as an actual login
  shell. Ships as a Docker image or a bootable ISO.

## Quick start

### Just the language

```bash
./install.sh
nepali                    # interactive shell
nepali path/to/file.nep   # run a script
```

By default this builds every interop bridge (Python/Rust/Go/JS-TS/
cache). For a minimal, dependency-free build:

```bash
NEPALI_FEATURES="--no-default-features --features rust-interop,js-interop" ./install.sh
```

This route never downloads or bundles any AI model weights — the
language works standalone with zero AI unless you supply your own
model files via `NEPALI_AI_*` env vars.

### The full OS (AI included, zero setup)

```bash
docker build -t nepali-os .
docker run -it --rm nepali-os
```

Lands you in a real `नेपाली:~ $` shell. AI models (LLM,
Whisper, TTS) are baked into the image, so `एआई_सोध्नुहोस्`,
`एआई_सुन्नुहोस्`, `एआई_बोल्नुहोस्`, and `एजेन्ट_चलाउनुहोस्` work out of the
box, no configuration needed.

### Bootable ISO

See [os-image/README.md](os-image/README.md) for building a real,
bootable Debian Live ISO with the same OS baked in.

## Example

```
// hello.nep
bhana("नमस्ते संसार")

काम square(x) {
    पठाउँ x * x
}
bhana(square(4))
```

```bash
nepali hello.nep
```

More: [`examples/tour/`](examples/tour/README.md) is a 14-step, tested tour (variables,
loops, functions, closures, arrays, modules, OS/database, Python/JS interop,
local AI). [`examples/conditions/`](examples/conditions/README.md) covers every
condition form and every error message, and [`docs/NEPALI_OS.md`](docs/NEPALI_OS.md)
is the guide to running the OS and what it can do.

## Project layout

- `crates/nepali-core/` — the language: lexer, parser, interpreter,
  bytecode VM, and all host-integration bridges (filesystem, database,
  Python/Rust/Go/JS interop, AI, real command execution).
- `crates/nepali-plugin-abi/` — the stable C-ABI shared between the
  language and native Rust/Go plugins it can load at runtime.
- `crates/nepali-fileserver/`, `crates/nepali-dnsserver/` — real,
  independent services shipped as part of the OS.
- `plugins/go-example/`, `crates/nepali-example-plugin/` — reference
  plugins proving the native-plugin interop bridge.
- `examples/` — the tested tour of the language (`tour/`), programs for the
  native compiler (`native/`), and a Next.js hosting proof.
- `os-image/` — tooling for building the bootable ISO.
- `Dockerfile` — the full OS image, AI included.
- `install.sh` — standalone language installer.

## Status

Everything above is built and verified, not aspirational. For the full
record — including real bugs found and fixed, honest gaps (e.g. no
resampling in speech-to-text, no image/video generation, no OS-state
awareness in the AI agent loop yet), and exactly how each feature was
checked — read [CLAUDE.md](CLAUDE.md).

## License

MIT (see individual crate `Cargo.toml` files).
