# नेपाली OS — project gist (post-rewrite)

This file is the one thing that survived a full reset of this repo. Everything
else (the from-scratch bare-metal kernel, the UEFI/Linux boot scaffolding, the
Go/TypeScript tooling, all example scripts) was deleted on purpose — it's
still in `git log` if anything from it is ever worth resurrecting, but it is
not the foundation going forward. `crates/nepali-core/` is the one piece of
old code that survived, kept as-is, because the language itself is real and
worth building on rather than redesigning from zero.

## The decision that caused this reset

The original plan was a from-scratch bare-metal OS (custom kernel, custom
bootloader, everything hand-rolled) with the eventual goal of hosting real
workloads — Next.js, Node.js, Go, Rust projects, with a real fileserver,
database, cache, and nameserver/DNS.

That's not realistic on a from-scratch kernel. Getting there needs a real
TCP/IP stack, a real ELF loader with dynamic linking (or at minimum static
exec), and a Linux-compatible syscall surface wide enough for those language
runtimes (mmap, threads, epoll-equivalent, etc.) — each of those is itself a
multi-year effort for a funded OS team (see: Redox OS, gVisor, both still
incomplete after a decade of work). Forcing it fast would mean faking pieces,
which contradicts the standard this project holds itself to: everything
claimed to work must actually work, verified, not simulated.

**The decision: build on a real Linux kernel, not a custom one.** Linux
already has a real, audited, production-grade network stack, ELF+dynamic
linker, and syscall surface. Node/Next.js/Go/Rust binaries just run on it. The
Nepali-language identity of this project isn't the kernel — it's the
user-facing shell, tooling, and orchestration layer built in `nepali-core` on
top of real Linux. Real fileserver/database/cache/DNS needs are met by
wrapping proven, audited software (not reimplementing TCP/IP or a database
engine from scratch), with Nepali-language configuration and commands as the
UX layer over them.

## What survived: `crates/nepali-core/`

A real, working Nepali-language interpreter, in Rust, `no_std`-capable via
host-trait dependency injection (so it can run inside a kernel, inside a CLI,
or wherever). Confirmed real (not aspirational) at the point of this reset:

- Real lexer + recursive-descent parser + AST + tree-walking interpreter.
  `if`/`else`, `while`, recursion, closures (real, not simulated).
- Real arrays: literals, indexing, assignment, `लम्बाइ`/`थप्नुहोस्` (length/push)
  builtins. Out-of-bounds indexing is a real runtime error, not a panic.
- Real logical operators: `र`/`वा`/`होइन` (and/or/not), genuinely
  short-circuiting.
- Real static analysis: a resolver doing scope resolution
  (undefined-variable/assignment errors) and conservative static type
  checking (flags confirmed type mismatches before the program runs, sound
  but incomplete — no false positives, some false negatives).
- Real module system: `आयात "path"` for multi-file programs (host-side loader
  does the actual file resolution, since the core stays `no_std`).
- A second execution model: a bytecode compiler + VM (deliberately smaller
  scope than the tree-walker right now — no closures/arrays/logical-ops
  there yet, and it says so explicitly rather than silently miscompiling).
- Host integration traits (`HostFs`, `HostProcess`, `HostChannel`) —
  dependency injection points for whatever real OS is running underneath,
  proven out by real (non-mocked) implementations in the previous kernel.
- Both Devanagari and romanized keyword syntax (e.g. `यदि`/`yadi`), so the
  language is typable on any physical keyboard without an input method.
- Real string builtins (`लम्बाइ`/`अक्षर`/`संकेत`) counted in Unicode scalar
  values, so indexing stays correct over multi-byte Devanagari text.
- A first real self-hosting slice: a lexer written *in* the language itself.

Known, honest gaps in the language as of this reset: no LLVM-backed native
codegen yet, no LSP/formatter, the bytecode VM is behind the tree-walker in
feature coverage.

## Target architecture going forward

1. **Base OS: real Linux**, not a custom kernel. Whatever distro/build
   approach is chosen, the kernel, network stack, and ELF loading are real
   Linux, unmodified in spirit — no reimplementing what Linux already solved
   correctly.
2. **Nepali-language layer on top**: `nepali-core` as the shell, init
   scripting, and orchestration language for this OS's identity — not the
   thing responsible for networking, memory isolation, or process execution
   at the kernel level. That's Linux's job.
3. **Real services, not reimplementations**: fileserver, database, cache,
   and DNS should be real, proven, audited software (e.g. an existing
   webserver/fileserver, a real database engine, a real cache like Redis, a
   real DNS server like CoreDNS or bind) — wrapped, configured, and exposed
   through Nepali-language tooling and commands, not rewritten from scratch
   in Go/Rust as a smaller, less-trusted clone. A hand-rolled DNS server or
   database is a liability for a hosting platform, not an achievement.
4. **Hosting Next.js/Node/Go/Rust** then falls out for free from being real
   Linux — those runtimes just run, the same way they run anywhere else.

## Non-goals (explicitly, to avoid repeating the mistake)

- Do not reimplement a TCP/IP stack, an ELF/dynamic linker, or a
  Linux-compatible syscall surface from scratch. Not a good use of effort
  when Linux already provides all of this, audited and battle-tested.
- Do not reimplement a database engine, DNS server, or cache server from
  scratch for production use. Wrap or configure a real one.
- Do not claim something works ("real database", "real DNS server") unless
  it's been verified end-to-end (bound socket, persisted+fsynced data,
  actually resolves a real query) — this project's credibility rests on that
  discipline, and it's the reason this reset happened in the first place.

## Concrete decisions locked in

- **Base**: a Docker container on Debian (`Dockerfile`, `debian:bookworm-slim`
  runtime), not a hand-built rootfs or a custom boot image. Real networking
  comes for free from Docker's own bridge networking — no NIC-attachment
  work needed the way the old QEMU-based `os/` track required (confirmed:
  real outbound DNS resolution works in a plain `debian:bookworm-slim`
  container on this dev machine, unrelated to any of this project's code).
- **Language integration**: `nepali-core-cli` is registered as a real login
  shell (`/etc/shells` + `useradd -s`), not just a container `ENTRYPOINT`
  trick — meaningful if this base is ever used for a real VM/bare-metal
  install later too.
- **First native service**: a `HostDb` trait (mirroring the existing
  `HostFs`/`HostProcess`/`HostChannel` pattern), backed by real SQLite via
  `rusqlite` (bundled, statically-linked C SQLite — a real, audited engine).

## Status: done, verified end-to-end

- Real interactive shell (`src/cli/main.rs::run_shell`): one persistent
  `Interpreter` per session, real `cd`, real external-command execution via
  a real `$PATH` executable check (not a naive "try to parse as `.nep`
  first" heuristic — that silently misroutes anything shaped like
  `word -flag`, e.g. `uname -a` parses as valid `.nep` subtraction; fixed
  and documented in the function's own doc comment).
- Real `HostDb` (`डाटाबेस_चलाउनुहोस्`/`डाटाबेस_सोध्नुहोस्`) and real
  Linux `HostFs` (`src/cli/host_linux.rs`, plain `std::fs`).
- Verified inside the actual built Docker image, not just locally: real
  `uname -a` (genuine Linux 6.12 kernel), a real SQLite `INSERT`/`SELECT`
  round-trip independently re-read by the standalone `sqlite3` CLI after
  the process exited (real durability, real fsync — not in-memory), and
  real Devanagari file write/read round-tripped through `cat`.
- **Automated coverage for the bridges, not just manual verification.**
  Every `host_*.rs` module (Python, JS/TS, Rust plugins, Linux
  filesystem/SQLite) had only ever been checked by hand until a real gap
  was closed with `#[cfg(test)]` unit tests in each module (`cargo test`
  discovers unit tests on bin targets too, no crate restructuring
  needed) — 25 new tests, `cargo test` now covers 71 total. The Rust
  plugin tests panic with the exact build command if
  `nepali-example-plugin` isn't built yet, rather than silently skipping
  (a silent skip would let that bridge regress without `cargo test`
  noticing).

## Pivot: real language-level interop with Go/TypeScript/Python/Rust

**All four real interop bridges, including real TypeScript transpilation,
are done and verified as of this writing** (Python, Rust, JavaScript+TS,
Go — see each below). What's left on this front: the static-linking/
portability hardening pass stated at the end of this section - the next
real thing to pick up here, now that every bridge has a proven, working,
(mostly already statically-linked) vertical slice to finish hardening.

The language itself can really call into Go, TypeScript/JavaScript,
Python, and Rust — not just orchestrate them as separate external
processes. Ranked by real tractability, in the order they were built:

1. **Python — done, verified.** `HostPython` trait (mirrors `HostDb`),
   `src/cli/host_python.rs`, real embedded CPython via `pyo3` (the actual
   system libpython linked into the process, not a subprocess). New builtin
   `पाइथन_चलाउनुहोस्(code)` runs real multi-statement Python (real `import`s,
   real `def`, real loops) and returns whatever the script assigns to the
   conventional variable `परिणाम`, converted recursively into this
   language's `Value` type (numbers/strings/bools/`None`/lists — a dict or
   arbitrary object is a real, explicit error, not a silent stringify).
   Verified end-to-end, in the actual Docker container, not just locally:
   `math.sqrt(144)` → real `12`, `platform.python_version()` → the real
   linked interpreter's actual version, and a real multi-line
   tuple-unpacking Fibonacci function called from a `.nep` script file.
   Also fixed a real, unrelated bug this surfaced: the lexer terminated
   every string literal at the first literal newline, making genuinely
   multi-line foreign-code arguments impossible — fixed in
   `lexer.rs::read_string`.
   - **Known, stated gap, now mitigated**: dynamically linked against the
     host's/container's libpython (Debian's `libpython3.11` is an
     explicit Dockerfile dependency, needed for any build with the
     `python-interop` feature enabled). True static CPython linking is
     still real follow-up work (`pyo3` itself says static embedding isn't
     first-class supported yet - see the portability section below for
     the actual investigation). What's already real: `python-interop` is
     now an independently optional Cargo feature (default on, so nothing
     existing changes) - a build without it has zero `libpython`
     dependency at all, verified with `otool -L`, giving anyone who
     doesn't need Python interop a genuinely self-contained binary today
     without waiting on `pyo3`.
2. **Rust — done, verified.** `crates/nepali-plugin-abi` (a shared crate
   defining a stable, hand-tagged `#[repr(C)]` `CValue` struct and the
   exact `nepali_plugin_call`/`nepali_plugin_free_string` export
   signatures both the host and every plugin depend on, so the ABI can't
   silently drift between separately-compiled binaries), a new `HostRust`
   trait + `src/cli/host_rust.rs` (real `libloading`-based `dlopen`, a
   real loaded-library cache, careful cross-boundary string ownership -
   the host only ever frees a plugin-returned string via *that plugin's
   own* `nepali_plugin_free_string`, never a direct `free()`, since host
   and plugin may not share an allocator), and a real minimal example
   plugin (`crates/nepali-example-plugin`) that exists specifically to
   verify the bridge. New builtin: `रस्ट_चलाउनुहोस्(so_path, fn_name, args...)`.
   Verified end-to-end both locally (macOS `.dylib`) and inside the real
   Docker container (Linux `.so`, built in the Dockerfile's builder stage
   and shipped at `/usr/local/lib/nepali/example-plugin.so`): real
   `double(21)=42`, real `add(40,2)=42`, a real Devanagari string
   round-tripped through the FFI boundary with correct ownership
   handoff, and a real error path for an unknown plugin function name.
3. **JavaScript and TypeScript — both done, verified.** `HostJs` trait +
   `src/cli/host_js.rs`, real embedded QuickJS via `rquickjs` - bundled,
   statically-compiled C sources (notably more self-contained already
   than Python's dynamically-linked libpython: confirmed the Docker image
   needed zero new system packages for this bridge). New builtin
   `जेएस_चलाउनुहोस्(code)`: no result-variable convention needed like
   Python's - JS's `eval` genuinely returns the last expression's value.
   Verified end-to-end, both locally and in the real Docker container:
   real arithmetic, a real JS function (array destructuring, a for-loop,
   `.map()`) computing a real Fibonacci sequence, Devanagari string
   concatenation, and the honest error path for an unsupported return
   type (a plain object).
   **TypeScript**: `HostJs::eval_ts` + builtin `टिएस_चलाउनुहोस्(code)`,
   real transpilation via `swc_core` (a real, proven compiler - real TS
   parsing, real structural type-stripping, not a hand-rolled
   type-annotation regex) feeding the exact same QuickJS engine. Verified
   with real, non-trivial TS, not just "types that happen to parse as
   comments": a typed interface + function computing a real Pythagorean
   distance, a real `enum` used via its reverse-mapping (`Direction[d]`
   returning the string name - specifically requires swc's real enum
   compilation, not just deleting the `enum` keyword), and a generic
   function with an explicit type argument. Verified both locally and in
   the real Docker container - no new system packages needed, `swc`
   bundles its own compiler the same way `rquickjs` does.
4. **Go — done, verified. All four bridges now real.** Go's runtime can't
   embed as a library the way CPython or QuickJS can, so this one differs
   in kind from the other three: a real `go build -buildmode=c-shared`
   binary (`plugins/go-example/main.go`, using cgo to match
   `nepali-plugin-abi`'s exact `CValue` struct layout and export
   signatures) satisfies the *same* C-ABI contract the Rust bridge already
   implements. New builtin `गो_चलाउनुहोस्` is a real alias onto the
   existing `HostRust`/`host_rust.rs` dlopen mechanism - one host-side
   loader, two real source languages producing a compatible shared
   library, not two separate implementations. Dockerfile gained a
   `golang:1.23-bookworm` builder stage. Verified end-to-end, both locally
   (macOS `.dylib`) and inside the real Docker container (Linux `.so`):
   real `double(21)=42`, real `add(40,2)=42`, a real Devanagari string
   round-tripped through the same FFI ownership contract as the Rust
   plugin - through the identical loader, side by side.

**Portability status: mostly solved already, one real gap investigated and
knowingly deferred.** A single binary byte-for-byte identical across
Windows/macOS/Linux is impossible for native code (different executable
formats) - what's actually achievable is one statically-linked binary *per
OS* with zero separate runtime installs. Checked each bridge for real,
not assumed:

- **Rust/Go plugins (`रस्ट_चलाउनुहोस्`/`गो_चलाउनुहोस्`)**: not a gap at all -
  `dlopen`ing a plugin at runtime is inherently dynamic *by design* (that's
  the feature - loading a `.so` the main binary didn't know about at
  compile time). Nothing to statically link here.
- **SQLite (`HostDb`)**: already statically compiled in (`rusqlite`'s
  `bundled` feature) - confirmed via the Dockerfile needing no separate
  SQLite runtime package beyond the `sqlite3` CLI (installed only for
  independent verification, not required for `nepali` itself to run).
- **QuickJS (`HostJs`)**: already statically compiled in (`rquickjs`
  bundles its C sources) - confirmed live: the Docker image needed *zero*
  new system packages to add this bridge.
- **Python (`HostPython`)**: static linking specifically is still a real,
  unresolved gap - re-investigated with `pyo3` 0.29.2 (up from 0.22)
  and pushed further this time, past the original one-line "not
  first-class support" finding, to pin down exactly what actually
  blocks it:
  1. `python-build-standalone`'s only non-debug static builds are
     `pgo+lto` variants - linking their `libpython3.13.a` failed with a
     real, reproducible LLVM bitcode-version mismatch (`could not parse
     bitcode object file ... 'Unknown attribute kind (105)'`), exactly
     the "C compiler and flags... must be compatible with your Rust
     compiler" complication `pyo3`'s own docs warn about.
  2. Switching to the debug-ABI static build (`libpython3.13d.a`,
     `Py_DEBUG`) got past the bitcode error and linked successfully
     once every one of CPython's bundled C-extension modules' own
     transitive static dependencies (OpenSSL, expat, libffi, lzma,
     mpdecimal, sqlite3, bz2, uuid, zstd - all real, all found and
     linked from `python-build-standalone`'s own `build/lib/`) were
     supplied by hand - `pyo3-ffi`'s build script doesn't do this
     automatically for a fully static embed.
  3. Two concrete gaps remained even then, not vague ones:
     `pyo3-ffi`'s build script doesn't link CPython's own
     `Hacl_Hash_SHA2.o` (a loose object file, not bundled into any
     `.a`, needed for `hashlib`'s SHA-2 implementation) - a real,
     specific `pyo3-ffi` build-script gap, not a Rust-side limitation.
     And macOS's system `ncurses` ships no `libpanel` at all, so the
     `_curses_panel` module - unconditionally compiled into every
     CPython build - can't be satisfied on macOS without building
     ncurses+panel from source, a separate real undertaking.
  Real conclusion, more precise than before: static embedding is
  reachable in principle, but only via a debug-ABI Python (wrong
  runtime profile for production) and after separately patching around
  two independent gaps (one in `pyo3-ffi`, one a macOS platform
  limitation) - not something to ship half-working. Deferred until
  `pyo3` supports this properly, rather than shipped fragile.
  **What's solved instead**: every interop bridge (`python-interop`,
  `rust-interop`, `js-interop`, `cache`) is now an independently optional
  Cargo feature (`default = all four`, so every existing build needs zero
  changes). A build without Python has *zero* `libpython` dependency at
  all - verified with `otool -L` on the resulting binary, not assumed -
  so anyone who doesn't need Python interop gets a genuinely
  self-contained binary today, without waiting on `pyo3`. The Docker
  image (default features, all four bridges) remains the real
  "no separate setup needed" unit for the full feature set - nobody
  running it needs Python/SQLite/QuickJS/a Rust or Go toolchain
  pre-installed, only Docker.
  - **Taken further: a genuinely, fully statically-linked binary.**
    `crates/nepali-core/static-build.Dockerfile` builds the
    `rust-interop`+`js-interop` variant on `rust:1-alpine` (musl libc) -
    not just "no libpython", zero dynamic dependencies at all. Verified
    in the real build log: `file` reports "statically linked", `ldd`
    reports "Not a valid dynamic program" (musl's own confirmation
    there's no dynamic interpreter to even try loading). This is the
    real single-binary portability the "same binary, no separate setup"
    goal was asking for, for the two bridges that support it today.
    **Completed further**: after the `.dockerignore` fix, re-ran the same
    build through to a full, exported, tagged image (not just the build
    log this time) - extracted the binary from the real container with
    `docker cp`, re-verified `file` on the host independently (ELF
    aarch64, statically linked, 10.5MB, no `sh`/libc in the `scratch`
    base image at all), and ran a real `.nep` script
    (`bhana("...", 2 + 3)`) through it inside the container, producing
    the correct output. This is the full artifact, not just proof it
    would work.

**Also install.sh**: a real local install for the language on its own
(builds from source via `cargo`, installs to `$NEPALI_INSTALL_DIR`,
supports the feature flags above via `$NEPALI_FEATURES`) - the concrete
"shareable, go-to setup" half of the language, separate from `os-image/`.

## Services roadmap (resumed - interop pivot above is done)

1. **Real fileserver — done, verified.** `crates/nepali-fileserver`: a
   real HTTP/1.1 server on `tiny_http` (a real, small, audited crate, not
   a hand-rolled socket/HTTP parser). `GET /` lists files, `GET /<name>`
   downloads, `PUT`/`POST /<name>` uploads - flat single-level filenames
   only, with real path-traversal protection (any `/` or `..` rejected
   before touching the filesystem). Shipped in the Dockerfile as
   `/usr/local/bin/nepali-fileserver`, `:8080` `EXPOSE`d. Verified
   end-to-end over a real published Docker port: real `curl` upload/
   download round-tripping exact Devanagari content, real listing, a
   real 400 on a URL-encoded traversal attempt, independently re-read
   with plain `cat`.
2. **Real cache — done, verified.** New `HostCache` trait (mirrors
   `HostDb`) + `src/cli/host_cache.rs`, real `redis` crate client against
   a real `redis-server` process - no in-process `HashMap` fallback.
   Builtins: `क्यास_राख्नुहोस्(key, value, ttl_seconds)`,
   `क्यास_ल्याउनुहोस्(key)` (real miss -> `null`), `क्यास_हटाउनुहोस्(key)`.
   Connects lazily on first real use, not eagerly at shell startup.
   `redis-server`/`redis-tools` added to the Dockerfile. Verified
   end-to-end, both locally and in the real container: real set/get of
   Devanagari content, a real miss, a real delete, and real TTL expiry
   (confirmed via `redis-cli TTL` showing the real countdown, then a real
   miss after it elapsed) - independently re-checked with `redis-cli GET`
   after every write, not just trusted through the language's own output.
3. **Real DNS — done, verified. All three services now real.**
   `crates/nepali-dnsserver`: a real, bound UDP nameserver on
   `hickory-server` (a real, proven, audited DNS protocol implementation
   - real wire-format parsing, not hand-rolled). Zone/records come from
   `NEPALI_DNS_ZONE`/`NEPALI_DNS_RECORDS` env vars - a real, if minimal,
   authoritative zone (no recursion/forwarding, honestly scoped to this
   OS's own service discovery). Shipped as `/usr/local/bin/nepali-
   dnsserver`, `EXPOSE 53/udp` (binding the privileged port as the
   non-root `nepali` user needs root/`CAP_NET_BIND_SERVICE` like any real
   DNS server on Linux - `NEPALI_DNS_PORT` can be set to a non-privileged
   port instead). Verified end-to-end with real `dig`, both locally and
   through a real published Docker UDP port: real A-record answers for
   configured names, and a genuine `NXDOMAIN` (correct status code, not
   just an empty/wrong answer) for an unconfigured one.
4. **Done, verified - the capstone test of the whole premise.**
   `examples/hosting/nextjs-demo/`: a real Next.js 14.2.15 App Router app,
   built and run on an image extending `nepali-os:dev` (Debian's own
   `nodejs`/`npm` packages, no external install script needed). The page
   is deliberately `dynamic = "force-dynamic"` with a real server-computed
   timestamp embedded in it - verified genuinely live, not static: two
   real `curl`s a second apart returned two different real timestamps in
   the actual React Server Components payload. Cross-verified the same
   way with a real standalone Go `net/http` server (cross-compiled
   statically, run directly in the container, no separate Go runtime
   install needed) - two different real timestamps again. Rust hosting
   was already proven by `nepali-fileserver` itself, a real production
   Rust HTTP service this OS ships, not a demo.

**This closes out the original ask.** Real fileserver, real database,
real cache, real DNS, and now real, twice-curled proof that Next.js/Node,
Go, and Rust workloads genuinely run on this OS.

## Bootable OS image — done, verified in QEMU

`os-image/`: a real bootable Debian Live ISO (~340MB), not just a
container - built with `live-build` (Debian's own standard tool, see
`os-image/README.md` for the full build/verify steps and the real
macOS-bind-mount-can't-do-device-nodes problem found and fixed getting
here). Ships the exact same compiled binaries as the container image,
`nepali` registered as the real login shell, same runtime services.

Verified for real in QEMU: a real GRUB boot menu, real boot to
`nepalios login: nepali (automatic login)`, landing directly in the real
`nep:/home/nepali $` prompt - `uname -a` returned a real booted kernel
(`Linux nepalios 6.1.0-53-amd64 ... x86_64 GNU/Linux`), `which
nepali-fileserver` resolved to the real installed binary. This is the
actual "OS" half of the original ask (a real Linux system, real
Nepali-language shell baked in, real services) as an installable image,
not only a `docker run` deployable.

**AI models baked into the ISO too - done, verified end to end.** The
user's requirement: the bootable ISO should have the same zero-config AI
the container image already has (LLM, Whisper, TTS - see the AI section
above), not just the container. `os-image/build.sh`,
`os-image/builder.Dockerfile`, and `os-image/README.md` mirror the exact
same approach the container Dockerfile uses: real `curl`/`huggingface_hub`
downloads placed under `config/includes.chroot/usr/local/share/nepali-ai/`
(so `live-build` copies them straight into the ISO), a
`0200-nepali-ai-deps.hook.chroot` running the same real `pip3 install
torch --extra-index-url ...`, and the same `NEPALI_AI_*` env-var defaults
in `/etc/environment`.

An earlier attempt was blocked by a Docker Desktop network/GPG flake in
the builder image; that did not recur on the retry (2026-09-18/19), and
the full pipeline ran clean: amd64 image (QEMU-emulated build on Apple
Silicon) -> builder image -> privileged `lb build` -> `output/nepalios.iso`
(1.78GB, `file` reports a bootable ISO 9660 hybrid). Other real problems
hit and worked around: the Docker Desktop VM disk filled up (39GB; user
raised it to 64GB) - and two simultaneous builds of the same image tag
made it worse, so run one at a time.

**Verified for real, in QEMU, against this exact ISO**:
- Contents (`unsquashfs -ll` on `/live/filesystem.squashfs`): LLM
  `model.gguf` 491MB, Whisper `model.safetensors` 151MB + config/
  tokenizer/mel filters, TTS model 578MB + vocoder + speaker embedding,
  `torch` and `transformers` in dist-packages, and every `NEPALI_AI_*`
  variable in `/etc/environment`.
- Boot: SeaBIOS -> ISOLINUX -> kernel 6.1.0-53-amd64 -> systemd ->
  `nepalios login: nepali (automatic login)` -> the real
  `nep:/home/nepali $` shell; `which nepali-fileserver` resolves to
  `/usr/local/bin/nepali-fileserver`.
- **Inference inside the booted ISO**: a `.nep` script calling
  `एआई_सोध्नुहोस्("What is the capital of Nepal? ...")` printed "The
  capital of Nepal is Kathmandu." from the baked-in Qwen model, zero
  configuration. Slow (several minutes) because QEMU emulates x86 on
  Apple Silicon without acceleration - not representative of real
  hardware. Whisper/TTS were not exercised inside the ISO (only their
  files/env are confirmed present); both were verified in the container
  image.

**How to verify headlessly (non-obvious)**: `console=ttyS0` serial cannot
log in as `nepali` - the account has a locked password, and autologin
exists only on `getty@tty1..6` (`live-config-getty-generator`), not
`serial-getty@ttyS0`. So use `qemu-system-x86_64 -cdrom ... -boot d
-display none -monitor telnet:...`, send Enter for the ISOLINUX menu,
capture the tty1 framebuffer with the monitor's `screendump` (convert PPM
with `sips`), and type commands with `sendkey` (ASCII only). QEMU can't
inject Devanagari, so write `.nep` files from ASCII `printf '\xe0\xa4...'`
hex escapes inside `bash`.

**What's still separate**: the language itself (`crates/nepali-core`)
remains independently shareable - it's a real, standalone Rust crate,
publishable to crates.io on its own, usable outside this OS image
entirely (the whole reason it survived the original reset untouched).
Every interop bridge is now an independently optional Cargo feature (see
the interop section above), so a genuinely self-contained language
binary is available today via `--no-default-features` plus whichever
bridges are actually needed - not blocked on the OS image existing, and
not blocked on `pyo3`'s still-missing static-linking support either.

## Real local AI: `एआई_सोध्नुहोस्`/`एआई_सुन्नुहोस्`/`एआई_बोल्नुहोस्`

The user's ask: an AI baked natively into the language and OS, working
in Nepali, eventually covering text/voice/image/video, an "OS aware of
the language." Broken into what's real vs honestly not:

- **`एआई_सोध्नुहोस्(prompt)` - done, verified with real weights, not just
  compiled.** New `HostAi` trait (`interpreter.rs`, same DI pattern as
  every other `Host*`), CLI backend `src/cli/host_ai.rs` on a new
  `ai-interop` Cargo feature (optional, NOT in `default` - unlike every
  other bridge, this one's dependency is a multi-gigabyte model download,
  a genuinely separate choice from "does this build need internet at
  all"). Runs a real quantized (GGUF) Qwen2 language model through
  `candle` - Hugging Face's own pure-Rust ML runtime, deliberately not a
  C++/CUDA binding like llama.cpp, to keep the same "no extra native
  toolchain" portability story the static-binary work already proved for
  the other bridges. CPU-only inference (no CUDA/Metal wired up), so it
  runs anywhere the binary runs, at the honest cost of being slower than
  a GPU setup.
  **Verified for real**: downloaded a real Qwen2.5-0.5B-Instruct GGUF
  checkpoint (~468MB) and its real tokenizer.json, ran the real built
  binary against them. English prompt through the real Qwen chat
  template ("What is the capital of Nepal? Answer in one sentence.")
  returned a real, correct, clean answer ("The capital of Nepal is
  Kathmandu.") with correct EOS-token stopping - proves the whole
  pipeline (tokenize, chat template, forward pass, sampling, decode,
  stop condition) is genuinely correct end to end, not faked.
  **Honest, real limitation found by the same test, not hidden**: the
  identical question asked in Nepali produced garbled, largely incoherent
  output. This is a real property of this specific small (0.5B parameter)
  open model's weights - its Nepali training coverage is weak - not a bug
  in the bridge. A bigger or Nepali-fine-tuned GGUF model (swappable via
  `NEPALI_AI_MODEL_PATH`/`NEPALI_AI_TOKENIZER_PATH` env vars, no code
  change needed) would very plausibly do much better; this hasn't been
  tested yet and isn't claimed as solved.
- **`एआई_सुन्नुहोस्(audio_path)` (speech-to-text) - done, verified with
  real weights and real audio.** Real Whisper model (`candle`'s own
  implementation, same CPU-only runtime as `ask`, no new toolchain)
  loaded from real safetensors weights (openai/whisper-tiny), real
  greedy decode (encoder runs once, decoder recomputes the growing
  token sequence each step per Whisper's own real architecture - cross-
  attention K/V cached, self-attention isn't), real mel-spectrogram
  front end (`candle_transformers`'s own FFT/mel-filterbank code, not a
  hand-rolled one) fed from a real 16kHz mono WAV file via the `hound`
  crate. **Verified for real**: downloaded the real model/config/
  tokenizer files plus the real mel-filterbank data candle's own
  examples use, synthesized a real test WAV locally (macOS `say` ->
  `afconvert` to 16kHz mono PCM - no external audio download needed),
  and ran it through the real built binary. Exact correct transcript
  came back on the first attempt: `"The capital of Nepal is
  Kathmandu."`. Also confirmed (via the real tokenizer.json's
  `added_tokens`) that Whisper's own multilingual training genuinely
  covers Nepali - a real `<|ne|>` language token exists (id `50313`) -
  unlike the small Qwen text model, Whisper's *speech* recognition has
  real, non-toy Nepali language coverage.
  **Real Nepali-audio accuracy, tested for real, not assumed.** Fetched
  one real recording plus its ground-truth transcript from the public
  OpenSLR-43 Nepali speech corpus (the same real dataset the TTS
  bridge's SpeechT5 fine-tune was trained on) - a real human speaker,
  not synthesized - via HTTP range requests against the archive's real
  remote zip (confirmed the mirror supports `Range`, pulled just the
  one `.wav` and `line_index.tsv` entry needed, not the full 800MB
  archive). Ground truth: *"दीपा धामीको जन्म सुदूरपश्चिम नेपालको बझाङ
  जिल्लामा भएको हो"*. `एआई_सुन्नुहोस्` (whisper-tiny, the smallest real
  Whisper variant) returned: *"Deepad Hamiko Jornmasudur Pasti Nepal
  kebazangji Lama Vai keho"* - wrong script (Latin instead of
  Devanagari) and real spelling/word-boundary errors, but genuinely
  phonetically close throughout (*"Deepa Dhami"*, *"sudur paschim"*,
  *"Nepal"*, *"Bajhang"*, *"bhayeko ho"* are all real, recognizable
  matches to the actual words spoken) - not garbage, a real, honest,
  quantifiable limitation of the smallest Whisper checkpoint on a
  lower-resource language, the same "small model, real but limited
  quality" pattern already found with the small Qwen LLM. A larger
  Whisper variant (`base`/`small`/`medium`, swappable via
  `NEPALI_AI_WHISPER_MODEL_PATH` with no code change) would plausibly
  do much better; not tested, not claimed as solved.
  (A first attempt at this test round-tripped through the TTS bridge
  itself - `एआई्बोल्नुहोस्` output fed into `एआई_सुन्नुहोस्` - but was
  dropped as an honest methodology flaw: a mismatched non-Nepali
  speaker x-vector degraded the synthesized audio enough that a garbled
  STT result couldn't be attributed to either component specifically,
  so real human-recorded audio was used instead.)
  Real, stated scope limit: only 16kHz mono 16-bit PCM WAV is accepted -
  no resampling is implemented, a wrong-rate file is a real, explicit
  error naming the fix (`ffmpeg -ar 16000 -ac 1`), not silently wrong
  output from feeding the model misaligned audio.
- **`एआई_बोल्नुहोस्(text)` (text-to-speech) - done, verified with real
  weights, real audio out.** No Rust ML runtime (`candle` included, even
  checked at its newest version, 0.11) ships a VITS/SpeechT5-family TTS
  model - hand-writing one from scratch would have been unverifiable
  guesswork, a real risk of shipping silently-wrong audio this project
  holds itself to a higher bar than. Real path taken instead: reuse the
  *other* already-verified bridge, real embedded CPython via `pyo3`
  (the same mechanism `host_python.rs` uses), running a real, proven
  `transformers` SpeechT5 pipeline (`src/cli/host_ai.rs`'s
  `TTS_PY_SOURCE` - loaded once via `PyModule::from_code_bound` and kept
  warm, same caching reasoning as every other loaded model here; text
  crosses into Python only as a real Python object via `call1`, never
  string-formatted into source, so it can't inject Python code).
  **Real, honest finding**: Meta's own MMS-TTS Nepali checkpoint
  (`facebook/mms-tts-npi`) is gated behind a Hugging Face login/license
  acceptance - confirmed live (`curl` returns 401 "Invalid username or
  password" for it, while the ungated English variant returns 200) -
  not something this bridge can silently satisfy on a user's behalf.
  Used a different real, fully open model instead:
  `aryamanstha/speecht5_tts_nepali_oslr43_tokenizermodified_swos`
  (MIT-licensed, a real community SpeechT5 fine-tune trained on the real
  OpenSLR-43 Nepali corpus, confirmed ungated) plus Microsoft's open
  HiFi-GAN vocoder and a real speaker x-vector from the standard
  `Matthijs/cmu-arctic-xvectors` dataset (SpeechT5 needs a real speaker
  embedding - tried a zero vector first, honestly noted it produced
  shorter/flatter audio than a real x-vector, switched to the real one).
  **Verified for real, twice**: first a standalone Python script
  (`transformers`/`torch`/`soundfile`/`numpy`, real pip installs, no
  fakes) produced a real, non-silent 2.08s WAV (max amplitude 0.39, only
  9% near-silent samples - genuinely varying waveform, not noise or
  silence) for "नमस्ते, यो एउटा परीक्षण हो।" Then the exact same pipeline
  run through the real compiled `nepali-core-cli` binary via
  `एआई_बोल्नुहोस्` produced a real, valid 1.76s WAV file on disk,
  confirmed independently with `soundfile`/`file`, not just trusted from
  the language's own return value. Packages must be installed into
  whatever Python `pyo3` embeds at build time (the same `PYO3_PYTHON`
  pin `.cargo/config.toml` already documents for `पाइथन_चलाउनुहोस्`) -
  a real, stated prerequisite, not silently assumed.
- **Baked into the real OS image, not just verified on a developer's own
  machine.** The main `Dockerfile`'s single `cargo build` for
  `nepali-core-cli` now adds `--features ai-interop` on top of the
  default feature set - every other bridge (Python/Rust/Go/JS/TS/cache)
  stays on, the AI bridge becomes real capability the OS image itself
  ships, not a separate dev-only build. Model weights are deliberately
  NOT baked into the image (multi-gigabyte, a real per-deployment
  choice) - supplied at runtime via
  `NEPALI_AI_MODEL_PATH`/`NEPALI_AI_WHISPER_*_PATH` env vars pointing at
  a real mounted volume, the same runtime-config pattern `NEPALI_DB`
  already uses. **Verified for real, twice**: (1) an isolated
  Rust-only cross-build (no `apt`, unaffected by anything below) proved
  the AI bridge's own code compiles clean for real `linux/amd64` - a
  real ELF binary, the actual architecture this OS runs on, not just
  macOS; (2) the full production `Dockerfile` (every bridge, every
  service, this change included) built successfully end-to-end for
  `linux/amd64` and was smoke-tested by really running the resulting
  container: `एआई_सोध्नुहोस्` with no model mounted returned a clean,
  explicit "needs NEPALI_AI_MODEL_PATH... none was set" error rather
  than a crash - real graceful degradation inside the real shipped
  image, the same honest-failure behavior every other optional bridge
  already has.
- **Image/video generation - explicitly declined by the user, closed,
  not on the roadmap.** Real local image/video generation models are
  far larger (5-50GB+) and need a real GPU runtime (CUDA/Metal), which
  would have conflicted with the portability goal already proven for
  this project (a single static, CPU-only, no-GPU-driver-required
  binary) unless done via an external API instead. Given that real
  trade-off, the user chose to drop this from scope entirely rather
  than pursue either option - not a deferred item, a closed one.
- **"OS aware of the language" framing**: `एआई_सोध्नुहोस्` is reachable
  both as a `.nep` builtin and directly at the interactive shell prompt
  (same `new_interpreter()` wiring `run_shell` already uses for every
  other bridge) - typing a Nepali question at `nep:/ $` and getting a
  real model's real answer back already works today, when
  `NEPALI_AI_MODEL_PATH`/`NEPALI_AI_TOKENIZER_PATH` are set.

## The agent loop: real AI-driven orchestration, not just Q&A

The user asked whether this OS/language can "learn and evolve," be
"aware of the OS," "orchestrate things," and "build and test" on its
own. Honest answer at the time: none of that existed - `एआई_सोध्नुहोस्`
only ever returned text; nothing executed what it said, and the AI had
zero visibility into OS state beyond what a `.nep` script manually
pasted into a prompt. This section is the first real piece of turning
that into something that can actually **act**, not just answer.

**Real, honest prerequisite finding**: `HostProcess`/`HostChannel`
(`नयाँ_प्रक्रिया`/`प्रक्रिया_सूची`/`नयाँ_च्यानल`/...) are dead code for
this OS - never wired into `new_interpreter()` in `src/cli/main.rs` at
all (a leftover from the deleted from-scratch kernel, where even if
wired, "processes" only ever ran a fixed hand-written machine-code
loop, not real programs). And the interactive shell's own external-
command path (`run_external` in `main.rs`) inherits stdio straight
through rather than capturing it. So before any agent work could start,
there was genuinely no way for `.nep` code - or an AI - to run a real
command and see what it printed or whether it succeeded.

**New: `HostCommand` / `आदेश_चलाउनुहोस्(program, args)` - done, real,
tested.** `std::process::Command`-backed (`src/cli/host_linux.rs`'s
`RealCommand`), returns `(exit_code, stdout, stderr)` as a real
3-element array. Deliberately `Command::new(program).args(args)`, never
a shell string handed to `sh -c` - a real, meaningful security property
verified with a real unit test (`real_command_shell_metacharacters_are_
inert`): an argv entry containing `$(whoami); rm -rf /tmp/nonexistent`
comes back through `echo` completely literally, not executed. This
matters specifically because the next thing built on top of it is
AI-driven.

**New: `एजेन्ट_चलाउनुहोस्(goal, max_steps)` - done, real, verified with
a real model actually using real tools, not a scripted demo.** A tool-
using loop on `Interpreter` (`run_agent`/`execute_agent_action` in
`interpreter.rs`): the AI proposes one real action per turn from a
small, fixed toolset (`फाइल_पढ्नुहोस्`/`फाइल_लेख्नुहोस्`/`सूची` via the
real `HostFs`, `आदेश` via the real new `HostCommand`), this interpreter
actually executes it through the exact same `Host*` implementations
every other builtin uses, and the real result is fed back for the next
turn. A tiny line-based protocol (`कार्य: TOOL(args)` / `अन्तिम: answer`)
rather than JSON tool-calling - no JSON parser exists in this
`no_std`+`alloc` crate, and plain text is also more forgiving of a
small model's imperfect formatting.

**Real bugs found and fixed while verifying this against the actual
Qwen2.5-0.5B checkpoint already used to verify `एआई_सोध्नुहोस्`** (not
found by inspection - found by actually running it and reading the raw
model output at each step):
1. Without Qwen's ChatML template, the model just did text continuation
   instead of following instructions at all (rambled about the goal
   instead of proposing an action). Fixed by having `ask()` itself
   always wrap the prompt in the real ChatML template
   (`<|im_start|>system...<|im_end|><|im_start|>user...`) - a real fix
   to the bridge itself, not just the agent, verified with real
   before/after output.
2. Even with the template, the model needed a one-shot example in the
   system prompt before it reliably produced the exact `कार्य:`/`अन्तिम:`
   syntax - added one.
3. A real transcript-construction bug: the model's own action line was
   never appended back into the transcript before the tool result was,
   so the conversation lost track of *whose* turn produced the result -
   the model would just see a dangling "नतिजा: ..." line and echo
   another one instead of answering. Fixed by appending the model's own
   line before the result.
4. **Real, honest small-model limitation, not a bug**: even fixed, this
   specific 0.5B model sometimes gets stuck re-proposing the identical
   already-answered action instead of ever switching to `अन्तिम:` - a
   known, real weakness of small non-reasoning models at agentic
   tool-loop termination, not something prompt-tuning fully solved here.
   Mitigated with a real, honest safeguard (not a second AI call
   pretending to "decide" this is the end): if the model proposes the
   exact same action twice in a row, the loop stops and returns the
   already-known real result instead of burning the rest of
   `max_steps` going in circles.

**Verified for real, three separate ways, with real, unguessable
results proving genuine tool execution (not the model hallucinating a
plausible-sounding answer)**:
- Goal "read this file and tell me what it says" -> real
  `फाइल_पढ्नुहोस्` call -> returned the file's exact real contents.
- Goal "run `whoami` and tell me exactly what it prints" -> real
  `आदेश` call -> returned this machine's real actual username
  (`dibeshrajsubedi`) inside the result - not something the model could
  have guessed, genuine proof the command really ran.
- Goal "write this text to this file" -> real `फाइल_लेख्नुहोस्` call ->
  independently confirmed with `cat` on the real file afterward, not
  just trusted from the agent's own summary.

**OS-state awareness - done, verified.** The agent's fixed toolset now
includes three explicit, named OS-state tools alongside file/command
access - `प्रक्रिया_सूची()` (real running processes, via `ps aux`),
`डिस्क_ठाउँ()` (real disk usage, via `df -h`), and `प्रणाली_जानकारी()`
(real OS/kernel identity, via `uname -a`) - each a real
`HostCommand::run` call under the hood, the same mechanism `आदेश`
already uses, not a second implementation. The point: the agent no
longer has to already know which raw shell command answers "what's
running"/"how much disk is left" - these are discoverable, named
capabilities in its own tool list. **Verified for real, with an
unguessable result again**: goal "check how much disk space is free
and tell me the percentage used for the root filesystem" -> real
`डिस्क_ठाउँ()` call -> the agent's final answer contained this actual
machine's real root-filesystem usage (`12Gi` used, `88Gi` available,
`12%`), matching independently-run `df -h` exactly - not something the
model could have guessed.

**Real preventive destruction guardrails - done, verified.** The
agent's own request: it must never destroy things, even ones that
would normally just need confirmation elsewhere, and must explain
*why* when it refuses - not a silent no-op. `destructive_command_reason`
and `system_path_write_reason` (`interpreter.rs`) run inside
`execute_agent_action` itself, before `HostCommand::run`/`HostFs::
write_file` are ever called - a real, hard refusal, not a "proceed
after confirming" flow (there's no live human to confirm to inside an
autonomous agent run). Deliberately scoped to the *agent's own
autonomous* tool-execution path only, not the underlying
`आदेश_चलाउनुहोस्`/`फाइल_लेख्नुहोस्` builtins a human-written `.nep`
script calls directly - a human explicitly writing `rm -rf` in their
own script is a deliberate, authorized action, the same way a shell
script isn't guarded against `rm`; the guardrail is specifically about
what an AI can talk itself into doing on its own.
Blocked outright: `rm`/`rmdir`/`dd`/`mkfs*`/`shutdown`/`reboot`/`halt`/
`poweroff`/`kill`/`killall`/`pkill`/`fdisk`/`parted`/`diskutil`/
`shred`/`wipefs`/`unlink`, `git push --force`/`git reset --hard`/
`git clean -f`, any command carrying a `-rf`/`-fr` flag, and any
`फाइल_लेख्नुहोस्` write targeting a real system directory (`/etc`,
`/boot`, `/usr`, `/bin`, `/sbin`, `/lib`, `/sys`, `/proc`, `/dev`,
`/var/lib`, `/root`). Each refusal returns a real, plain-language
explanation of what was blocked and why, and the agent's own system
prompt now tells the model explicitly that blocked actions are final -
don't retry, explain the refusal in the final answer.
**Verified for real**: 6 new unit tests cover the exact blocked/allowed
cases (`rm -rf`, `dd`, `shutdown`, `kill`, `mkfs.ext4`, `git push
--force`, `git reset --hard` all blocked; `echo`/`ls`/`git status`/
`cargo build` and writes to `/home`/`/tmp` all allowed) - deterministic,
not dependent on model behavior. Also tried live, twice, asking the
real Qwen agent to run `rm -rf` on a real marker file with an
increasingly forceful prompt - the small model chose a safer action
both times rather than ever proposing `rm`, so the block message itself
wasn't observed firing live in this session, but the real, load-bearing
proof is the deterministic unit tests plus the real fact that the
marker file survived both attempts untouched either way. Explicitly
**not** a complete sandbox - the agent's allowed tools still run with
the same real Linux permissions the host process has (a real, honestly
narrower but still separate gap, unchanged from before).

**Persistent agent memory - done, verified.** New tools
`सम्झना_राख्नुहोस्(key, value)`/`सम्झना_ल्याउनुहोस्(key)`, backed by the
same real `HostDb` (SQLite) every other builtin uses, not an
in-process cache that dies with the interpreter - a fact remembered in
one `एजेन्ट्_चलाउनुहोस्` call is genuinely still there in a separate
call, even a separate process, because it's on disk in the real
database file `NEPALI_DB` points at (table `nepali_agent_memory`,
created lazily on first use). Every `run_agent` call also automatically
loads all remembered facts and prepends them to its own transcript as
"Known facts remembered from previous sessions," so the agent doesn't
have to think to check - real, if simple, continuity across separate
runs. **Verified for real, twice**: a deterministic SQL round-trip
(real `ON CONFLICT ... DO UPDATE` upsert, real persistence re-read in a
genuinely separate process invocation - no LLM involved, the same
direct-DB-builtin technique used to verify `HostDb` itself), then a
real live run against the Qwen agent: asked it to save a fact using
`सम्झना_राख्नुहोस्`, and the real value it chose (`favorite_color` /
`teal`) was independently confirmed sitting in the real SQLite file via
a separate direct query afterward - not trusted from the agent's own
summary. Honest, consistent finding: the small test model still
doesn't reliably reach a clean `अन्तिम:` conclusion in every run (the
same known limitation documented earlier in this section) - the tool
call and the real persistence succeeded even when the overall run
didn't end cleanly.

**Still real, honest gaps, not attempted here**: no reading of
arbitrary system logs (only the three named OS-state tools above,
plus whatever `आदेश`/file tools can reach), no learning/fine-tuning
(model weights are static files, nothing updates from usage), no
autonomous triggering (something has to call `एजेन्ट_चलाउनुहोस्` - it
doesn't watch anything on its own). "Build and test" specifically (e.g.
the agent running `cargo build`/`cargo test` on its own and reasoning
about the result) is real, reachable *today* through `आदेश` - verified
capability exists - but hasn't itself been run as a test case yet.

## AI models baked directly into the OS image - done, verified with zero config

The user's explicit requirement: booting/running the OS directly should
have working AI out of the box, while the standalone language
(`install.sh`) stays AI-free by design. Real split, both halves done:

- **`install.sh`** never downloads or bakes in any model weights, with
  or without `ai-interop` enabled - documented explicitly in the
  script's own comment now. The language works standalone with zero AI
  unless you separately supply your own model files.
- **The main `Dockerfile`** now bakes real model weights directly into
  the image at build time (not left to a runtime download): the same
  Qwen2.5-0.5B-Instruct GGUF, whisper-tiny, and Nepali SpeechT5+HiFi-GAN
  models already verified in the AI sections above, fetched with real
  `curl`/`huggingface_hub` calls during the build, plus `torch`/
  `transformers`/`sentencepiece`/`soundfile`/`numpy` installed into the
  image's own python3 for `एआई_बोल्नुहोस्`. All `NEPALI_AI_*` env vars are
  set as real `ENV` defaults pointing at these baked-in local files, so
  a plain `docker run nepali-os` needs zero extra configuration.

**Two real bugs found and fixed getting the build to succeed**:
1. `.dockerignore`'s `target/` pattern had stopped excluding nested
   crate `target/` dirs (`crates/nepali-core/target` had grown to ~3GB
   from this session's own testing) - reproduced live with a trivial
   alpine `COPY . .` sanity check (build context: 2.9GB before the fix,
   12.1MB after). Added an explicit `**/target/` pattern alongside the
   existing one.
2. A real, easy-to-hit pip gotcha: `pip install torch --index-url
   https://download.pytorch.org/whl/cpu` REPLACES the default PyPI
   index rather than adding to it, so plain dependencies torch needs
   (`typing_extensions`) that aren't mirrored on PyTorch's own wheel
   index had nowhere to resolve from, and pip's source-build fallback
   failed on a missing build backend (`flit_core`) with no useful error
   otherwise. Fixed with `--extra-index-url` instead.

**Verified for real, zero env vars set, inside the actual built image
(not assumed from the Dockerfile alone)**:
- `एआई_सोध्नुहोस्("What is the capital of Nepal?...")` -> real, correct
  answer ("The capital of Nepal is Kathmandu.") with nothing configured.
- `एआई_सुन्नुहोस्` on a real synthesized English WAV -> exact correct
  transcript, once `NEPALI_AI_WHISPER_LANG=en` overrode the image's
  default (`ne`) - the default is intentional (matches this OS's
  identity, forces Nepali decoding unless told otherwise), not a bug,
  but real and worth knowing: it means non-Nepali audio needs an
  explicit override.
- `एआई_बोल्नुहोस्` on real Nepali text -> a real, non-silent WAV file
  (1.024s, max amplitude ~0.34, genuinely varying - not flat/silent)
  written to disk and independently confirmed, not just trusted from
  the language's own return value.
- Confirmed all baked files are actually present at their real sizes
  (LLM 491MB, Whisper 150MB, TTS model ~564MB + vocoder ~49MB) and
  `torch`/`transformers` import successfully in the image's python3.
  Final image size: ~1.56GB.

**Known, real, external constraint hit repeatedly getting here (not a
code problem)**: Docker Desktop's own VM virtual disk filled up
completely (`100% used, 0 available`) partway through this work,
independent of anything in this repo - confirmed by checking `df -h`
*inside a running container* showing the VM's `overlay` filesystem at
capacity. Worked around each time by pruning this project's own build
cache (`docker builder prune`), careful never to touch the ~50 other,
unrelated project images already on this machine. The user has been
told before (and it's worth repeating): the real fix is increasing
Docker Desktop's disk image size in Settings -> Resources -> Virtual
disk limit - not something fixable from inside this repo.

## Published to crates.io - done, with the user's explicit go-ahead

The language is now real, independently installable via `cargo add
nepali-core` or `cargo install`, not only buildable from this repo:

- [`nepali-plugin-abi` v0.1.0](https://crates.io/crates/nepali-plugin-abi) -
  published first (a real prerequisite: `nepali-core`'s path dependency
  on it needed a real `version` field too, not just a local `path`, for
  crates.io to accept the publish - path deps resolve by version once
  published, the local path is ignored).
- [`nepali-core` v0.1.0](https://crates.io/crates/nepali-core) - the
  language itself. Verified with a real `cargo publish --dry-run`
  first, which genuinely downloaded and compiled against the just-
  published `nepali-plugin-abi` from the real registry, not the local
  path - proof the dependency chain resolves correctly for anyone else
  installing this crate cold, not just inside this repo. Then published
  for real, and re-confirmed live via the real `crates.io` API
  afterward, not just trusted from `cargo`'s own success message.

Blocked once on a real crates.io requirement, not a code issue: a first
publish attempt failed with "a verified email address is required" -
the user verified their crates.io account email, then the same publish
succeeded on retry.

## Bytecode VM: closed the real gap with the tree-walker

The language's earlier honest gap list said "the bytecode VM is behind
the tree-walker in feature coverage" - three real, named pieces of that
gap are closed now, one at a time, each verified before moving to the
next:

1. **Logical `र`/`वा`/`होइन` (and/or/not) - done.** Real short-circuit
   jump codegen in `bytecode::Compiler` (a new `ToBool` opcode coerces
   the non-short-circuited operand, matching
   `interpreter::Interpreter`'s exact "result is always a real bool"
   rule) - not "evaluate both sides and discard one."
   **Verified**: `test_vm_and_or_short_circuit_real_side_effect` uses
   the identical technique the tree-walker's own short-circuit test
   uses (a function call as the right operand, whose print side effect
   would show up in the output if its bytecode ever actually ran) -
   confirms the right operand's instructions are genuinely skipped, not
   just computed-and-ignored.
2. **Arrays - done.** Real `vm::Value::Array(Rc<RefCell<Vec<Value>>>)`,
   the identical reference-type representation
   `interpreter::Value::Array` uses, with real bounds-checked indexing
   (`expect_index`, same error message shape) and real `लम्बाइ`/
   `थप्नुहोस्` support for arrays, mirrored from `interpreter::
   call_builtin` line for line. **Verified**: 5 new tests, including
   `test_vm_arrays_are_reference_types_across_bindings` (a second
   binding sees a mutation through the first - real reference
   semantics, not deep-copied on assignment) and a real bounds-check
   error test.
3. **Closures / first-class functions - done, the biggest of the
   three.** This needed a real architectural change, not just new
   opcodes: VM frames were plain stack-allocated `BTreeMap`s that died
   with their call, so nothing could keep an outer function's
   variables alive for an inner function to reference after the outer
   one returned. Frames are now `Rc<RefCell<FrameData>>` with a real
   parent chain - the same linked-scope shape `interpreter::Env`
   already uses - and `Stmt::FunctionDecl` compiles to a real runtime
   `MakeClosure` instruction (not a compile-time-only name→chunk
   table), so every time a function-declaring statement actually
   *executes*, a fresh closure captures whichever frame is live at that
   moment. Calling through a named identifier resolves via the frame
   chain directly (`Call(name, argc)`); calling through any other
   expression (e.g. a function returned straight from another call)
   goes through a new `CallValue` opcode. Not upvalues in the clox/Lua
   sense (those close over individual stack slots; this closes over a
   whole frame by reference) - a real, working mechanism that fits this
   VM's existing name-keyed-frame design rather than requiring a
   stack-slot rewrite as a prerequisite.
   **Verified for real, four ways**:
   `test_vm_closures_capture_outer_scope` runs the *exact* program
   `interpreter::Interpreter`'s own `test_closures_capture_outer_scope`
   does, same expected output; a second test proves two closures made
   from the same template in two different calls capture
   *independently* (`जोड्_५(1)` and `जोड्_१०(1)` disagree, so it's
   genuinely not one shared function object); a third calls a returned
   closure directly off a call expression (`बनाउ()()`), exercising the
   new `CallValue` path specifically, not just the common by-name case;
   a fourth is a real regression guard confirming plain recursive
   named-function calls (`fib`) still work through the frame-chain
   lookup, not just the old removed global map.

**Real, honest, remaining gap in the VM, unchanged**: variables are
still name-keyed per frame rather than resolved to stack-slot indices
at compile time (a real, separate optimization a from-scratch bytecode
VM usually does for speed) - a genuinely different, working execution
model from the tree-walker either way, just not yet the fully
slot-optimized version real production bytecode VMs end up as. Default
build test suite: 95/95 pass.

## `crates/nepali-mcp`: a real MCP server exposing the language + AI + agent

The user's "give mcp" ask - a real MCP (Model Context Protocol) server,
not a hand-rolled JSON-RPC/stdio framing implementation. Built on the
official Rust SDK (`rmcp`, `github.com/modelcontextprotocol/rust-sdk` -
confirmed real and official via its crates.io metadata before depending
on it, not assumed), which also caught two real API-drift issues the
SDK's own README example (fetched for a starting point) didn't reflect
at the pinned version (3.4.0) - `#[tool_router(server_handler)]`
conflicting with a hand-written `ServerHandler` impl, and
`ServerInfo`/`Implementation` being non-exhaustive structs needing
their real builder methods - both found by actually compiling, not
assumed correct from the fetched doc.

Three real tools: `run_script(code)`, `ask_ai(prompt)`,
`run_agent(goal, max_steps)`. Deliberately reuses the already-built,
already-verified `nepali` binary via a real subprocess for every call,
rather than re-implementing the interpreter/AI/agent machinery a second
time in this crate - `nepali-core-cli`'s `Host*` implementations are
private modules inside its own binary target, not a reusable library
surface, so duplicating them here would mean two copies of real code
drifting apart, a worse outcome than a subprocess hop. Real, stated
cost of that choice: every tool call is a fresh process, so
`ask_ai`/`run_agent` reload model weights from disk on every single
call - not hidden, not optimized away yet.

**Verified for real, twice, over the actual wire protocol** (not unit
tests calling the tool functions directly in-process): a real client
built on the same official SDK spawns the actual built `nepali-mcp`
binary as a real child process and speaks real MCP - full
`initialize` handshake, real `tools/list` (confirms all three tools are
actually advertised), real `tools/call` for `run_script` (a real `.nep`
print statement's output came back through the real MCP response
content, not assumed), and a second, real `ask_ai` call against the
real local Qwen model (skips cleanly if no model is configured, rather
than failing default `cargo test` runs) - the real answer
("Kathmandu") came back through the full stack: MCP client → spawned
server → subprocess → real interpreter → real AI bridge → real model.
`cargo build --release` succeeds; this crate has no root workspace
`Cargo.toml` tying it to the others (same independent-crate convention
as everything else here) and doesn't affect `nepali-core`'s own build
or test suite.

## A real formatter: `nepali fmt`

The earlier honest gap list said "no LSP/formatter" - the formatter
half is real now (`crates/nepali-core/src/formatter.rs`, wired in as
`nepali fmt <file>` / `nepali fmt --check <file>`, the same real
"check, don't write" convention `rustfmt --check`/`gofmt -l` use).

**Deliberately scoped smaller than a full pretty-printer, for a real
reason, not laziness**: this language keeps Devanagari and romanized
keyword spellings as a genuine, deliberate feature (typing on any
keyboard - see `lexer.rs`), and a full AST-based pretty-printer that
re-serializes from the parsed tree would either have to invent one
canonical spelling (silently overriding the user's own accessibility
choice) or thread that choice through the AST (real, but substantially
more work, and a real next step if wanted). Instead: real re-indentation
only, computed from real brace/paren/bracket depth via the real
tokenizer - every line's actual content is left untouched, only its
leading whitespace changes. Still real, useful progress (inconsistent
indentation is the single most common formatting complaint), not
"no formatter."

**Real bug found and fixed before writing a single line of the
formatter itself**: the lexer discards comments entirely - they never
become tokens at all. A naive token-based formatter built directly on
`Lexer::next_token` would have silently deleted every comment in a
file, a real, serious data-loss bug, not a hypothetical one. Fixed with
a small, purely additive change: `Lexer` now also collects a real
`Vec<Comment>` side-channel (position + verbatim text, including the
`//`/`/* */` delimiters) that doesn't change what `next_token` returns
or affect any existing caller (`interpreter.rs`'s resolver/loader, the
bytecode compiler, etc.) at all - verified by the full 95-test suite
(pre-formatter) still passing unchanged after the lexer change.

**Verified for real, 9 new tests, including the load-bearing
correctness property**: `formatted_output_still_parses_to_the_same_
behavior` runs a real recursive Fibonacci program before and after
formatting and asserts identical output (`55`) both times - formatting
must never change what a program actually does, not just look nicer.
Also verified: nested-block re-indentation, fixing genuinely wrong
existing indentation, idempotency (formatting twice produces
byte-identical output), line and block comments surviving with correct
per-line indentation, and - a real, meaningful correctness check, not
an edge case picked for show - that a literal `{` inside a string
literal or inside a comment is never mistaken for a real brace token
and never affects indentation depth. Real end-to-end CLI test: a
messily-indented real Fibonacci program with a real comment, run
through the actual built `nepali fmt` - `--check` correctly reported it
unformatted (exit 1), formatting fixed the indentation while preserving
the comment exactly, the reformatted file still printed the correct
`55`, and a second `--check` then passed (exit 0).

## `crates/nepali-lsp`: a real Language Server Protocol server

The earlier honest gap said LSP "remains not attempted." Closed now,
deliberately scoped: real diagnostics + real formatting, no
completion/hover/goto-definition (this language has no real
symbol/type info to back those yet, and the AST carries no source
spans at all - a fake "always empty" response for those would be worse
than not claiming the capability).

Built on `lsp-server` (the real transport/framing crate rust-analyzer
itself uses, not a hand-rolled `Content-Length`/JSON-RPC
implementation) + `lsp-types`. `textDocument/didOpen`/`didChange`
(full sync) trigger real `nepali_core::Parser`/`Resolver` runs and
publish real diagnostics - parse errors carry a real line number
(extracted from the parser's own `"...at line N"` message text, since
`Parser` has no structured `Location` type yet); resolution errors
have no location info at all yet (`Resolver::resolve` returns
`Vec<String>` with no position - the AST itself carries no spans),
anchored to line 1 rather than fabricated, stated honestly in the
crate's own doc comment. `textDocument/formatting` calls the exact
same `nepali_core::format` the `nepali fmt` CLI uses.

**Verified for real, twice, over the actual wire protocol** - not unit
tests calling handler functions in-process. A throwaway Python client
first, doing manual `Content-Length`-framed JSON-RPC over the real
spawned binary's stdio: real `initialize`, a real diagnostic for real
bad syntax (`"काम f(x) { यदि x > 0"` -> exactly one diagnostic,
`"expected LBrace, found Eof (\"\") at line 1"`), diagnostics correctly
clearing for valid code, a real resolver diagnostic for an undefined
variable, and real `textDocument/formatting` returning the exact
expected reformatted text. That verification was then converted into a
permanent Rust integration test file
(`crates/nepali-lsp/tests/lsp_protocol_test.rs`, 3 tests, same
technique - spawns the real built binary via
`env!("CARGO_BIN_EXE_nepali-lsp")`, speaks real framed JSON-RPC over
real child-process stdio): `cargo test` - 3 passed. `cargo test` in
`nepali-core` itself re-run afterward to confirm the new path
dependency had zero effect on its own suite - 104 passed.

**Still real, honest gap, unchanged**: no completion/hover/
goto-definition (no symbol/type info to back them), no incremental
sync (full-document sync only - fine at this project's current file
sizes, a real limitation at large-file scale), and diagnostic
*positions* for resolution errors are real but imprecise (line 1
always) until the AST carries real spans.

## Nepali Studio, phonetic typing, and an AI that knows the language (ISO)

Driven by user feedback on the first Nepali ISO: Devanagari was hard to type,
did not render properly, "the language does not feel natural", and copy/paste
into QEMU did not work.

**Rendering.** A terminal is a fixed cell grid: the kernel console has no
Devanagari glyphs, kmscon splits vowel signs into their own cells (dotted
circles), and even a VTE terminal spaces letters unevenly. So the ISO's
desktop is now **Nepali Studio** (`os-image/overlay/usr/local/bin/nepali-studio`,
GTK/Pango, which shapes Devanagari correctly): editor, output, an embedded VTE
terminal (a separate terminal window gets no keyboard focus without a window
manager), an AI pane, an examples menu, and a clickable keyword cheat sheet.
Keys: F5 run, Ctrl+Space typing mode, Ctrl+T terminal, Ctrl+E editor, Ctrl+L
AI box. Everything is added by `os-image/build-overlay.sh` as a second
squashfs layer plus in-place edits of the boot menu, in about a minute rather
than a full ISO rebuild (live-boot stacks `/live/*.squashfs` alphabetically).
Real bugs found on the way: real `/lib`/`/sbin` directories in the layer hid
the base's usr-merge symlinks (no `/sbin/init`, kernel panic); the isolinux
boot-info-table went stale unless `-boot_image any replay` is used; the
window has no keyboard focus with no window manager until `present()` is
called after it is mapped; X blanked the screen after idle.

**Typing.** Ctrl+Space toggles phonetic mode (`overlay/usr/local/lib/nepali/
translit.py`): `namaste` -> नमस्ते; a finished word that is a language keyword
or builtin becomes the canonical Devanagari one (`bhana` -> भनौँ); `|` -> `।`.
Every builtin also has a Latin name in the lexer (`ROMAN_BUILTIN_ALIASES`,
e.g. `lambai`, `ai_sodhnuhos`), so whole programs can be typed on any keyboard
(test: an ASCII program behaves identically to its Devanagari twin).
`os-image/tests/test_translit.py` also checks the keyword table against
`lexer.rs`, so it cannot drift. **IBus + m17n was tried first and dropped**:
it worked in a native container but its engine process died or timed out when
spawned inside the emulated ISO (no GSettings schemas, then slow startup, then
still no engine), and hours of debugging through screenshots did not find a
clean fix; a built-in input method is deterministic and testable.

**The AI knows the language and the OS.** `grounding.rs`: language rules, OS
facts, a live snapshot (hostname/kernel/disk via `HostCommand`), and 13 verified
recipes (each parsed, resolved and, where possible, run in tests) retrieved by
keyword per question. Reason: a 0.5B model invents Devanagari code badly but
copies well. New: builtin `सहायक_सोध्नुहोस्`, shell commands `? question`,
`गर्नुहोस् goal` (agent), `किन` (explain the last error), `nepali ask` /
`nepali agent`; the agent gets a sandboxed `कोड_चलाउनुहोस्` tool (fresh
interpreter, no host access, step and call-depth limits, so it cannot bypass
the destructive-action guardrails or hang the shell); grounded/agent calls
sample at temperature 0.2. Padding the agent prompt with the language guide
made the small model pick wrong tools (it ran `/tmp/whoami`), so the guide is
only included when the goal looks like code. **Measured with a real model**
(6 "write a Nepali program that ..." questions, code extracted, run, output
compared): Qwen2.5-0.5B 3/6, Qwen2.5-1.5B 5/6 (the function question failed
for both). `build-overlay.sh` can bundle the 1.5B (`NEPALI_BUNDLE_MODEL`).

**Also fixed**: fractional/NaN/infinite array indexes are now errors
(interpreter and VM) instead of silently reading the wrong element.

**Not verified / limits, honestly.** UEFI boot of the patched ISO and real
hardware are untested. Whisper and TTS inside the ISO were not exercised. AI
answers under QEMU are very slow (x86 emulated on Apple Silicon): one question to
the bundled 1.5B model had still not finished after ~16 minutes, so an answer
inside the ISO was NOT observed (inconclusive; natively the same model answers in
~20 s). The AI pane's wiring (ask, show answer, put its code in the editor, run
it) was verified natively with a stand-in for `nepali ask`, not with a real model
inside the ISO. The screen-blanking fix (`xset s off -dpms`) is in the overlay
sources but is not in the ISO built today.
**Clipboard:** the Homebrew QEMU here only has the `cocoa` display, which cannot
share a clipboard, so copy/paste with the Mac does not work in QEMU; the ISO
ships the SPICE agent (`spice-vdagent`) for UTM or other SPICE hosts, but that
was not tested. Non-Roman typing in the embedded terminal is not supported
(the input method is in the editor and the AI box only). Error messages from
the language itself are still English.

## Nepali Studio in the browser (`./dev.sh studio`)

Reported by the user: on their Mac the Nepali shell showed dotted circles and
gaps around Devanagari vowel signs - that is the host terminal drawing a fixed
cell grid, which no program can fix from inside. So the same Studio as the ISO's
desktop exists as a local web app (`studio/`: `studio.py` standard-library server,
`index.html`, `translit.js`): browsers lay text out properly and copy/paste works.
`./dev.sh studio` builds the binary, points it at the models in `~/.nepali-ai`,
starts the server and opens the browser. It runs the code you type, so it listens on
127.0.0.1 only, needs a random per-run token (kept in the URL fragment) and rejects
non-localhost Host headers. Typing mode key is **F2** (macOS reserves Ctrl+Space for
switching input sources). `translit.js` is a port of `translit.py`; `studio/tests/
test_parity.py` checks both give identical output on 40 words and identical keyword
tables. Verified in a browser: correct Devanagari rendering, Roman typing produced
`राखौँ x = 5 ।` / `भनौँ("नमस्ते सन्सार", x + 1) ।`, run printed `नमस्ते सन्सार 6`, and the
AI pane with the real Qwen2.5-1.5B returned a loop program that was inserted and
run (`1 2 3`). The shell also takes questions naturally now: `ask ...`, or any line
ending in `?`.

**Where there is no browser (or no Devanagari-capable display).** Three tiers: (1)
Nepali Studio - the GTK desktop on the ISO, or `./dev.sh studio` in a browser; (2) a
terminal that shapes Devanagari - the shell prints it as is; (3) a plain Linux
console (`TERM=linux`/`dumb`), a non-UTF-8 locale, or an SSH session without Indic
fonts - the shell prints **Roman** instead (`crates/nepali-core/src/cli/roman.rs`):
`नमस्ते` -> `namaste`, prompt `nepaalee:~ $`, keywords as their typed forms (`राखौँ` ->
`rakha`, verified against the lexer in a test). Automatic; force with `--roman`,
`--devanagari` or `NEPALI_SCRIPT=roman|devanagari|auto`. The other direction needs no
feature: keywords and builtins already have Latin names, so programs can be typed
in ASCII anywhere. The studio server's token is now a per-user file
(`~/.nepali/studio-token`, mode 600) so restarts and reloads no longer give 403.

## Natural syntax and Devanagari digits

`भनौँ` no longer needs parentheses: `भनौँ अभिवादन।` and `भनौँ "x", x * 3।` parse (the old
`भनौँ(...)` form still works; `भनौँ (1+2)*3` is read as the call form, write
`भनौँ ((1+2)*3)`). Found when the Studio's AI "fixed" a program by returning the same code:
the real cause was the missing parentheses. Digits: Devanagari digits were already accepted as
input; now phonetic typing (browser and GTK Studio) types `५` for `5`, and program output shows
Devanagari digits when `NEPALI_DIGITS=devanagari` (or `--digits`; the Studios and the ISO shell
set it, plain CLI keeps ASCII, Roman mode always ASCII). It converts every digit in program
output, including inside strings. Tests: `print_without_parens_tests` in `lib.rs`, the digit
test in `os-image/tests/test_translit.py`; the digit output path was run by hand, and digit
typing in the browser was only checked at the function level, not clicked through.
The next work order (run modes so the language alone cannot run OS commands, releases that need
no Rust, a Studio with no browser or Python) is in `PROGRESS.md`.

## AI language: Devanagari questions get a Nepali instruction

Reported by the user: `एआई_सोध्नुहोस्` answered a Nepali question in Hindi. Cause: plain `ask` sent only
"You are a helpful assistant." (temperature 0.7) with no language instruction. Now a prompt that
contains Devanagari gets a system prompt asking for Nepali only (`host_ai.rs`, `NEPALI_SYSTEM`,
temperature 0.2), and the answer is cut at the first repeated sentence (`cut_repeated_sentences`).
Measured with the real Qwen2.5-1.5B on 4 questions: replies are now Nepali instead of Hindi, and
the "उमेर २५" question is answered correctly, but **facts are still wrong** (it did not know the
capital of Nepal in Nepali; the English question is correct) and longer answers drift and mix in
Marathi/Hindi words. A repetition penalty was tried and made the drift worse (Devanagari is split
into byte-level tokens), so it was removed. A small model cannot be fixed by prompting; a larger
model (Qwen2.5 3B/7B GGUF via `NEPALI_AI_MODEL_PATH`) is the real fix and has not been tried.

## ARM64 ISO (UEFI/GRUB, native on Apple Silicon)

The x86_64 ISO is emulated on an M-series Mac, so the AI was unusably slow there.
`build.sh`/`build-overlay.sh` take `ARCH=arm64` (`builder-arm64.Dockerfile`,
`--architecture arm64 --bootloaders grub-efi`, GRUB menu derived from the ISO's own
`grub.cfg`). **Verified** with `qemu-system-aarch64 -accel hvf` (edk2 UEFI): boots to
the autologin shell in ~40 s; the full image (Studio + 1.5B model, 3.0 GB) shows the
"Nepali OS (Nepali language)" GRUB entry, the Studio desktop after ~45 s, F5 prints
correct Devanagari, and **the AI answered inside the ISO** (loop program, correct,
Devanagari; ~100 s for the first question, mostly loading the 1.1 GB model from the
xz squashfs). Bugs found: macOS `sed` has no `\|` (menu rename silently failed - use
`sed -E`); the Studio session runs with `TERM=linux`, which triggered the new Roman
fallback inside the GUI (answers showed as `rakha i = 1|`) - Studio and the web
server now force `NEPALI_SCRIPT=devanagari` for their children. **Not verified**: UTM
itself, the SPICE clipboard, the x86_64 GRUB menu rename after the `sed -E` change,
Roman fallback on the ISO's real text console, and ARM64 Whisper/TTS.

## `crates/nepali-codegen`: real LLVM-backed native machine code

The last item on the original list. A real *third* execution model,
distinct from both the tree-walking `interpreter` and the `vm`
bytecode interpreter - this one emits genuine machine code via LLVM,
not another software interpreter loop.

Built on `inkwell` (the real, safe Rust wrapper over LLVM's own C++
APIs - the same crate real from-scratch compiler projects use, not a
hand-rolled machine-code emitter), pinned to the `llvm22-1` feature -
the newest LLVM release inkwell 0.10 actually supports (checked against
its published feature list, which tops out below LLVM 23 - the dev
machine's default `brew install llvm` gave 23.1.1, too new; fixed by
installing `llvm@22` specifically and pointing `LLVM_SYS_221_PREFIX` at
it via the crate's own `.cargo/config.toml`).

**Deliberately scoped smaller than the full language**, the same
precedent the bytecode VM's own v1 and the formatter already set: every
runtime value is a real `f64` (mirroring `interpreter::Value::Number`'s
own representation) - no strings, no arrays, no closures, no imports.
Direct-name function calls (including real recursion), `यदि`/`नत्र`,
`भएसम्म`, arithmetic, comparisons, `र`/`वा`/`होइन` (with real
short-circuit codegen via LLVM basic blocks + a `phi` node - the same
"only emit the right operand's instructions where they're actually
reachable" shape the bytecode VM's own short-circuit codegen uses), and
numeric `भनौँ` printing are all real and supported. Anything outside
that - a string literal, an array, a nested function, an `आयात` - is a
real, explicit compile-time error naming exactly what's unsupported,
never silently miscompiled.

**Two real, independently-verified execution paths, not one**:
1. `nepali-codegen run <file.nep>` - JIT-compiles the module in-process
   via LLVM's own `ExecutionEngine` and actually executes the real
   compiled machine code. Its print calls route to a real Rust
   `extern "C" fn` in the same crate that reproduces
   `interpreter::Value::display`'s exact integer-vs-float formatting
   logic, so JIT output is provably byte-identical to the interpreter's
   for the same program, not just "close."
2. `nepali-codegen build <file.nep> -o <out>` - the real "true native
   codegen" path: `TargetMachine::write_to_file` emits an actual object
   file (the identical mechanism `rustc`/`clang` themselves use), which
   is then linked via the system `cc` together with a small bundled C
   print runtime (`runtime.c`, which also supplies the real C `main`
   entry point the object file itself doesn't have) into a genuine
   standalone native executable - one with zero dependency on this
   project's interpreter or runtime process once built. Its non-integer
   number formatting uses C's `%g` rather than Rust's exact `Display`
   (a real, stated, narrow divergence from the JIT path - integer
   output is guaranteed identical either way).

**Verified for real, 4/4 tests, by actually running the produced
artifacts as real subprocesses** - not calling `Codegen`'s internal
methods in-process:
- Real recursive Fibonacci (`फिबो(10)`) through the JIT path -> `55`.
- Real `भएसम्म` loop with mutation, `भनौँ` with multiple numeric
  arguments, and a real `र` (and) short-circuit condition combined with
  `यदि`/`नत्र` - JIT output exactly `"10 5"` then `"1"`, matching hand-
  worked expected values.
- **The load-bearing one**: `nepali-codegen build` on the same real
  Fibonacci program, then running the *produced binary itself* as a
  fresh subprocess with no `nepali-codegen` involved at all - real
  stdout `55`. This is the actual proof of real, standalone native
  compilation, not just JIT-in-process execution.
- A real, explicit compile error (naming "string") for a program using
  an unsupported string literal - confirms the scope boundary fails
  loud, not silent-wrong.

**Real, honest, stated gap, unchanged from the bytecode VM's own
precedent**: no optimization passes are run beyond LLVM's own default
`OptimizationLevel::Default` at object-emission time (JIT uses `None`
for fast compile), no debug info, and the scope above (numeric-only,
no strings/arrays/closures/imports) is real and current, not
temporary - extending it to the full language is real, substantial,
separate future work, the same honest framing given to the bytecode
VM's remaining slot-allocation gap.

## `examples/tour` and `examples/native`: a tested tour of the language

`examples/tour/01..13_*.nep` (plus `ai/14_ai.nep`) teach the language step
by step - printing, variables, conditions, loops, functions, arrays,
strings, closures, algorithms, romanized keywords, modules, OS/database
access, Python/JS/TS interop, local AI (`examples/tour/README.md` indexes
them). `examples/native/` holds numeric programs for `nepali-codegen`.
Another, separate collection of 20 numbered programs with `.expected`
files lives directly in `examples/` (written in parallel by another
session, with its own test and the language cheat-sheet in
`examples/README.md`).

**Kept honest by tests** (`crates/nepali-core/tests/tour.rs`): every
tour file is run through the real `nepali-core-cli` binary (cwd
`examples/tour`, a temp `NEPALI_DB`) and its stdout must equal the
neighbouring `.out` file; the model-needing `ai/` example is only
parse+resolve checked; the native examples must give their known answers
in the interpreter (168 primes below 1000, 26623 with 307 Collatz steps).
Corrupting an `.out` file makes the test fail (checked). Separately
verified by hand that interpreter, `nepali-codegen run` (JIT) and a
`nepali-codegen build` binary print identical output for all three native
examples.

**Real bug found by writing the examples**: `आदेश_चलाउनुहोस्` takes its
arguments as one array (`("echo", ["a", "b"])`); passing them as extra
parameters is a runtime error. An example and the AI's recipe both had it
wrong until actually run.

**`examples/conditions/`**: seven programs covering every condition form
(if/else chains, comparisons, truthiness, logic and precedence,
short-circuiting, loop conditions, number edge cases) plus fifteen
`errors/E*.nep` programs, each with the exact stdout, the message that must
appear on stderr, and exit code 1 (`crates/nepali-core/tests/conditions.rs`).
Real behaviours pinned there: analysis errors (undefined names, obvious type
errors, arity) stop the program before anything prints, runtime errors keep
earlier output; `1/0` is `inf` and `0/0` is `NaN` (no error); `null + 1`
concatenates text; a fractional index truncates; text supports only `==`/`!=`.

**`docs/NEPALI_OS.md`** is the user guide for the OS: three ways to run it,
first steps, every capability, configuration variables, limits and
troubleshooting. Its Docker recipes were each run against the real image
(script mounting, file server upload/download/traversal refusal, DNS answer
and NXDOMAIN, Redis cache, bind-mounted database, AI answer, `nepali fmt`).
**Real bug found doing that**: a named Docker volume mounted at
`/home/nepali/.nepali` was root-owned, so the `nepali` user could not create
the database and every database call failed. Fixed in the Dockerfile by
creating that folder owned by `nepali` (verified on a derived image: the row
count went 1, then 2 across two container runs). Not rebuilt into
`nepali-os:dev` yet; a bind mount works with the existing image.

## What's left, honestly

The original ask (memory, MCP, LSP/formatter/native-codegen,
bytecode-VM parity) is now fully closed at the scope each piece was
deliberately built to: agent memory, MCP, VM closures/arrays/logical-
ops, LSP+formatter, and now real LLVM native codegen are all real and
independently verified. The stated, current real gaps that remain are
the ones called out inside each section above (native codegen's
numeric-only subset, the VM's name-keyed-vs-slot-indexed variables,
LSP's line-1-only resolver diagnostics, the formatter's re-indentation-
only scope) - each a deliberate, documented boundary, not something
silently left broken.
