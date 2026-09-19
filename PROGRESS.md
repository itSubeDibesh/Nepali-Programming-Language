# PROGRESS.md - implementation plan for the next agent

Read `CLAUDE.md` first (project history and the honesty standard). This file is the
work order for the next stretch. Nothing here is implemented yet unless it says so.

## Ground rules (inherited, not optional)

- Never claim something works without running it and checking the result independently.
  Say what was NOT verified. Every work package below ends with an acceptance test; a
  package is not done until that test has been run and its output read.
- Do not push to GitHub unless the user says so in that turn. Commit messages carry no
  AI co-author line (the user asked for this).
- One feature per commit, working tree clean afterwards, tests green before committing.
- macOS dev box: `sed -E` (no `\|`), Docker Desktop needs `nohup` + log files for long
  builds, keep one Docker build at a time, LLVM 22 for `nepali-codegen`
  (`.cargo/config.toml` there). Base test command: `cd crates/nepali-core && cargo test`
  plus `python3 os-image/tests/test_translit.py`, `python3 studio/tests/test_parity.py`,
  `cd crates/nepali-codegen && cargo test`.

## What the user wants (their words, condensed)

1. The language must run natively **without Rust installed** on the target machine.
   Shipping it, or any way around it.
2. The Studio must run with a browser **or without one**.
3. The ISO must do the same: language and Studio working with no browser and no Rust.
4. **Running the language on its own must not execute OS commands.** Only when the Studio
   (or shell) runs *on Nepali OS* may it have shell access.

## Where things stand today

| Piece | State |
|---|---|
| `nepali` CLI | Builds only via `cargo` (`install.sh`). Every bridge is wired unconditionally in `new_interpreter()` (`crates/nepali-core/src/cli/main.rs`), so a script run anywhere can run commands (`आदेश_चलाउनुहोस्`), read/write files, load native plugins, embed Python. **This violates requirement 4.** |
| Static binary | `crates/nepali-core/static-build.Dockerfile` builds a fully static Linux binary (musl) with only the `rust-interop` + `js-interop` bridges. Verified once on aarch64. No macOS/Windows release binaries exist. No CI. |
| Browser Studio | `studio/` = `studio.py` (Python 3 stdlib server) + `index.html` + `translit.js`; started by `./dev.sh studio`. Needs Python and a browser. Runs code by spawning the `nepali` binary. |
| GTK Studio | `os-image/overlay/usr/local/bin/nepali-studio` (Python + GTK3 + VTE). ISO only. Works with no browser. Also runs everything via `nepali`. |
| ISO | x86_64 and arm64 builds work (`os-image/`). Studio starts automatically. arm64 verified under QEMU+HVF; UTM, real hardware, x86_64 patched ISO on UEFI are unverified. |
| WASM | `wasm = ["wasm-bindgen"]` feature exists in `crates/nepali-core/Cargo.toml`. There is NO shim crate and nothing has ever been built for `wasm32`. Treat as unproven. |
| Typing | Roman -> Devanagari phonetic typing exists twice (`translit.py`, `translit.js`), kept equal by `studio/tests/test_parity.py`. Digits typed in phonetic mode become Devanagari; output digits become Devanagari when `NEPALI_DIGITS=devanagari` (Studios + ISO shell set it). |
| Syntax | `भनौँ` parentheses are optional (`भनौँ x, y।`). |

## Design

### D1. Two run modes: `sandbox` and `os`

`sandbox` is the default everywhere except on Nepali OS. `os` is today's behaviour.

- **Detection.** `os` only if `/etc/nepali-os-release` exists (the ISO and the Docker
  image create it) or the user passes `--mode os` / `NEPALI_MODE=os` explicitly.
  Everything else is `sandbox`. `--mode sandbox` forces the safe mode even on the OS.
- **Sandbox allows:** the whole language, `आयात` of files (read-only, relative to the
  script, no `..` escape), printing, the bytecode VM and codegen, the embedded QuickJS/
  TypeScript engine (it has no host access), `कोड_चलाउनुहोस्`, and the local AI question
  builtins (`एआई_*`, `सहायक_सोध्नुहोस्`) because inference is not OS access.
- **Sandbox denies, with a clear Nepali error that says how to enable it:**
  `आदेश_चलाउनुहोस्`, `ओएस_*`, `फाइल_*` (read and write), `सूची`, `डिस्क_ठाउँ`,
  `प्रक्रिया_सूची`, `प्रणाली_जानकारी`, `नयाँ_प्रक्रिया`, `नयाँ_च्यानल`/`च्यानल_*`,
  `पाइथन_चलाउनुहोस्` (embedded CPython can `import os`), `रस्ट_चलाउनुहोस्` and
  `गो_चलाउनुहोस्` (they `dlopen` arbitrary native code), `क्यास_*` (network),
  `डाटाबेस_*` (disk file), `एजेन्ट_चलाउनुहोस्` and `सम्झना_*` (agent tools are OS tools),
  the interactive shell's external-command path (`run_external` in `main.rs`), and `nepali agent`.
  Optional fine-grained opt-ins later: `--allow fs=DIR`, `--allow db=FILE`.
- **How.** A `Capabilities`/`Mode` value chosen in `main.rs`; `new_interpreter(mode)` only
  calls `set_host_*` for what the mode allows. Today a missing host already produces an
  error ("no host filesystem available"); improve those messages so a sandboxed user gets
  "यो सुविधा नेपाली OS मा मात्र चल्छ ..." instead of a generic one. Do NOT put the check in
  the interpreter core (it is `no_std` and host-agnostic by design; the host traits are
  the seam).
- **Honesty:** this is capability gating inside one process, not kernel isolation. A bug
  in an allowed builtin is still a bug in the host process. Do not describe it as a
  security sandbox for hostile code until limits (fuel, call depth via `set_limits`,
  wall-clock timeout, output size, memory) are applied to every sandbox run and, on Linux,
  seccomp/landlock is considered. The browser Studio server must run user code with these
  limits and a kill timeout.
- The Studios choose the mode: browser/standalone Studio always `sandbox`; the GTK
  Studio on the ISO and the ISO login shell use `os`. The terminal inside the Studio is a
  real shell only in `os` mode.

### D2. Ship a binary, not a toolchain

- **Prebuilt release binaries** for: Linux x86_64 and aarch64 (musl, fully static),
  macOS arm64 and x86_64, Windows x86_64. Portable feature set:
  `--no-default-features --features js-interop` plus always-on SQLite; sandbox mode makes
  Python/Rust-plugin/cache irrelevant on these targets. A second "full" Linux build keeps
  today's feature set for the OS image and Docker.
- **CI** (`.github/workflows/release.yml`) builds the matrix on tag, uploads archives and
  `SHA256SUMS`. macOS binaries are unsigned unless the user provides Apple credentials;
  say so in the install docs (Gatekeeper prompt) rather than hiding it.
- **Installers** that need no Rust: `install.sh` gains a default "download the matching
  release binary and verify its checksum" path (cargo path stays as `--from-source`);
  Homebrew tap, `.deb`, and a Windows zip/scoop manifest are follow-ups.
- **`nepali bundle app.nep -o app`**: copy the running executable, append the program (and
  its imports) plus a trailer with a magic marker; at startup, look for the trailer and
  run the embedded program (sandbox mode). This gives a single-file program that needs
  neither Rust nor LLVM nor a separate runtime. `nepali-codegen` stays the separate,
  numeric-only true-native path (it needs LLVM and `cc` at build time).
- **WASM**: new crate `crates/nepali-wasm` on `nepali-core` (`no_std`, no host traits, so
  it is sandboxed by construction) exposing `run(source) -> {stdout, error}`. Gives a
  Studio that runs in any browser from static files: no server, no install, no Python.

### D3. One Studio, three fronts, one binary

`nepali studio` subcommand replaces `studio.py`:

- Embedded HTTP server (std `TcpListener` or the already-used `tiny_http`), assets via
  `include_str!` (`studio/index.html`, `translit.js`), same rules as `studio.py`:
  127.0.0.1 only, Host-header check, per-user token file `~/.nepali/studio-token` mode
  600, endpoints `/api/run`, `/api/ask`, `/api/examples`, `/api/example`. Runs code
  in-process with limits, or in a child of itself, in `sandbox` mode.
- Front selection, automatic, overridable by flags:
  1. `--window` (cargo feature `gui`): native window with the system web view (`wry`+`tao`;
     WKWebView on macOS, WebView2 on Windows, WebKitGTK on Linux). No browser needed.
  2. default: open the default browser if one can be launched (`open`, `xdg-open`, `start`).
  3. `--tui` (also the fallback when nothing else is available, e.g. SSH or the ISO text
     console): terminal editor + output pane, Roman display fallback already in
     `cli/roman.rs`, phonetic typing built in. Use a small crate (e.g. `crossterm`/
     `ratatui`); keep it optional so the core stays small.
  4. `--no-open`: print the URL only (SSH port-forward, headless boxes).
- **Move transliteration into Rust** (`crates/nepali-core/src/translit.rs`, `no_std`) so the
  TUI, the WASM Studio and tests share ONE implementation. Keep `translit.py`/`translit.js`
  as thin ports checked against it by parity tests until the Studios use the Rust one.
- The GTK Studio stays the ISO's native front end (no browser on the ISO). It must call
  `nepali` with `--mode os`. Replacing it with `nepali studio --window` is optional and
  only if WebKitGTK is added to the ISO (large); do not do it by default.

## Work packages (do in this order)

Each: what, files, acceptance test. Commit each separately.

**WP1 - Modes and capability gating (requirement 4; do first, it is a safety issue)**
- Add `Mode` (`Sandbox`/`Os`), detection, `--mode` flag, `NEPALI_MODE`; refactor
  `new_interpreter()` in `crates/nepali-core/src/cli/main.rs`; gate the shell's
  `run_external` and the shell AI/agent commands; friendly denial messages.
- Writes `/etc/nepali-os-release` in `Dockerfile` and `os-image/build.sh`/`build-overlay.sh`.
- Studio server (`studio.py` for now) and MCP `run_script` (`crates/nepali-mcp`) pass
  `--mode sandbox`; GTK Studio and `nepali-shell` pass `--mode os`.
- Acceptance: a test per denied builtin proving the command did NOT run (use a script
  that would create a marker file / run `touch`, assert the marker is absent and the
  error text appears); the same script with `--mode os` creates the marker; an examples
  run under sandbox proves pure programs still work (`cargo test` for `examples/`,
  `tour`, `conditions` must still pass; the tour's OS/DB/interop examples need `--mode os`
  in `crates/nepali-core/tests/tour.rs`). Also check `nepali` with no args refuses to
  start an OS shell in sandbox mode and offers the language-only REPL.

**WP2 - Release binaries without Rust (requirements 1 and 3, shipping half)**
- `.github/workflows/release.yml`, `install.sh` download path, `SHA256SUMS`, docs in
  `README.md`/`docs/`. First make the portable feature set compile for
  `x86_64-pc-windows-msvc` and macOS x86_64 (unverified today; `host_linux.rs` is named
  for Linux but uses plain `std`, check `process`/`fs` differences).
- Acceptance: on a clean machine or container with NO Rust/cargo/Python, download the
  artifact, run `nepali examples/01_*.nep`, compare with its `.expected`. Linux musl
  static: `ldd` says not dynamic. State which OS/arch were actually run; do not claim
  Windows without running Windows (a Windows CI runner executing the examples counts).

**WP3 - `nepali bundle`**
- New subcommand + startup trailer detection in `main.rs`; tests: bundle a program with
  an import, delete the source, run the output on a machine path without the original
  repo; output matches the interpreter run.

**WP4 - `nepali studio` (embedded server, no Python)**
- Port `studio.py`, embed assets, token/Host rules, limits and timeouts, sandbox mode.
  Keep `./dev.sh studio` working by pointing it at the new subcommand; delete `studio.py`
  once parity is proven.
- Acceptance: automated HTTP test (start server on a random port, missing token -> 403,
  bad Host -> 403, run a program -> expected stdout, run a program that tries
  `आदेश_चलाउनुहोस्` -> denial and no marker file, infinite loop -> killed within the
  timeout). Then a manual browser pass (rendering, F2 typing, digits, AI pane).

**WP5 - Studio without a browser: TUI and headless**
- `--tui`, `--no-open`, and automatic fallback order. Rust `translit.rs` with parity
  tests against `translit.py`/`translit.js` (40-word table already in
  `studio/tests/test_parity.py`).
- Acceptance: run `nepali studio --tui` under a pseudo-terminal test harness (e.g.
  `expect`/a pty crate): type a program in Roman, run it, see output; with `TERM=linux`
  the Roman fallback is used. Verify on the ISO text console (never verified before).

**WP6 - WASM Studio**
- `crates/nepali-wasm`, `wasm32-unknown-unknown` target, a static page reusing
  `studio/index.html` with the WASM runner instead of `/api/run`. Install the target
  (`rustup target add wasm32-unknown-unknown`) and `wasm-pack`/`wasm-bindgen-cli`.
- Acceptance: run the examples through the WASM build in Node and compare with `.expected`
  (the `no_std` core has no host traits, so only host-free examples apply); load the
  static page from `file://` or a plain static server and run a program in a real browser.

**WP7 - Native window front (optional, after WP4)**
- `gui` feature with `wry`+`tao`; `--window`. Acceptance: window opens on macOS and shows
  correct Devanagari; on Linux only claim it if WebKitGTK is installed and it was run.

**WP8 - ISO wiring and docs**
- Rebuild the overlay for arm64 (`ARCH=arm64 NEPALI_BUNDLE_MODEL=~/.nepali-ai/llm-large/
  model.gguf ./os-image/build-overlay.sh ...`, usage at the top of that script) so the ISO
  carries the new binary: optional `भनौँ` parentheses, Devanagari digits, modes,
  `nepali studio --tui`. Then re-run the ISO checks: boot, Studio, F5, typing including
  digits, AI answer, and that the Studio's language-only run (mode sandbox) cannot run a
  command while its terminal pane (mode os) can. Update `CLAUDE.md` (facts only, with
  what was and was not verified), `docs/NEPALI_OS.md`, `README.md`.

## Handoff notes (added after the plan was written)

- **Shared working tree.** A second agent may be editing the same folder while you work
  (uncommitted `studio.rs`, `tests/sandbox.rs`, `.github/`, `install.sh`, mode code in
  `interpreter.rs`/`main.rs`). Never `git stash`/`reset`/`checkout` the tree. Commit only your
  own hunks (`git add <file>`; for a file with mixed edits, stage a blob built from `HEAD` plus
  your change via `git hash-object -w` + `git update-index --cacheinfo`). Check `git status` first.
- **Two SQLite tests failed** in `cargo test` (`host_linux::tests::real_sqlite_create_insert_select_round_trip`,
  `real_sqlite_persists_across_reopening_the_same_file`) while the sandbox-mode work was
  uncommitted in the tree. Not caused by the AI commit (`e146c2d`, which touches only `host_ai.rs`,
  a `cut_repeated_sentences` helper in `interpreter.rs`, and `CLAUDE.md`). Most likely sandbox
  mode gating the DB in unit tests; unconfirmed. Fix before committing WP1: those tests should build
  their host in `Mode::Os`. Re-run the full `cargo test` and read the result.
- **AI answers in Nepali are weak (WP-independent, needs the user's choice).** `e146c2d` made
  Devanagari questions get a Nepali-only system prompt and cut repeated sentences. Measured with the
  real Qwen2.5-1.5B: no more Hindi, the age question is right, but the capital of Nepal is wrong in
  Nepali (right in English) and longer answers drift. A repetition penalty made it worse; do not
  re-add it. The real fix is a bigger GGUF (Qwen2.5 3B/7B) via `NEPALI_AI_MODEL_PATH`; try one,
  measure the same questions, and ask the user before bundling it into the ISO (size/speed).
- **Sandbox mode and AI.** The plan allows `एआई_सोध्नुहोस्`/`सहायक_सोध्नुहोस्` in sandbox. Keep
  them off the agent tools: `एजेन्ट_चलाउनुहोस्` is OS-only.
- **Already done, do not redo:** optional `भनौँ` parentheses, Devanagari digits (typing and
  `NEPALI_DIGITS` output), Nepali-only AI prompt. Note `NEPALI_DIGITS` must be set for the
  `nepali studio` child processes and the ISO shell the same way `studio.py`/`nepali-shell` do now.
- **Verification budget.** ISO rebuilds and real-model runs are slow and costly; batch them at
  the end of WP8, and prefer automated tests for WP1-WP6.

## Decisions the user still owns (ask, do not assume)

- Apple signing/notarization and a Windows code-signing certificate (cost and accounts).
- Whether sandbox mode should allow `फाइल_*` inside a scratch directory instead of denying it.
- Whether to publish releases/crates (a new crates.io version needs their explicit go-ahead).
- Whether the GTK Studio should eventually be replaced by the Rust Studio on the ISO.

## Known limits to keep stating

- The language's own messages are mostly Nepali but parser/resolver errors are English.
- Small local models (0.5B/1.5B) write correct Nepali code only sometimes and explain
  errors badly (they once claimed a variable was undefined when the fix was parentheses).
  A future item: give `किन` the exact parse error plus the guide so it stops guessing.
- `भनौँ (1+2)*3` without an outer wrapper is read as the parenthesised call form; write
  `भनौँ ((1+2)*3)`.
- The Devanagari-digit output switch converts every ASCII digit in program output,
  including inside strings like `"127.0.0.1"`.
- Unverified: UTM, SPICE clipboard, real hardware, Whisper/TTS on the ISO, UEFI on the
  patched x86_64 ISO, Windows in any form, WASM in any form.
