use nepali_core::{Interpreter, Mode, Parser, Resolver};
use std::env;
use std::fs;
use std::io::{self, Read, Seek, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, ExitCode};
use std::rc::Rc;

#[cfg(feature = "ai-interop")]
mod host_ai;
#[cfg(feature = "cache")]
mod host_cache;
#[cfg(feature = "js-interop")]
mod host_js;
mod host_linux;
#[cfg(feature = "python-interop")]
mod host_python;
#[cfg(feature = "rust-interop")]
mod host_rust;
mod loader;
mod roman;
#[cfg(feature = "studio")]
mod studio;
mod translit;
#[cfg(feature = "gui")]
mod window;

/// Print through the script filter: Devanagari normally, Roman on terminals that cannot draw it.
macro_rules! say {
    () => { println!() };
    ($($a:tt)*) => { println!("{}", roman::show(&format!($($a)*))) };
}
macro_rules! warn_ {
    ($($a:tt)*) => { eprintln!("{}", roman::show(&format!($($a)*))) };
}
macro_rules! say_no_nl {
    ($($a:tt)*) => { print!("{}", roman::show(&format!($($a)*))) };
}

#[cfg(feature = "ai-interop")]
use host_ai::LocalAi;
#[cfg(feature = "cache")]
use host_cache::RedisCache;
#[cfg(feature = "js-interop")]
use host_js::QuickJsHost;
use host_linux::{LinuxClock, LinuxFs, LinuxInput, RealCommand};
#[cfg(feature = "db")]
use host_linux::SqliteDb;
#[cfg(feature = "python-interop")]
use host_python::PyHost;
#[cfg(feature = "rust-interop")]
use host_rust::RustPluginHost;

/// Magic trailer marker: `[source][4 bytes LE len][16 bytes magic]`.
const BUNDLE_MAGIC: &[u8; 16] = b"NEPALI_BUNDLE_v1";

/// If the running executable contains an embedded program trailer,
/// extract and return the source. Returns `None` if there's no trailer.
fn try_load_embedded() -> Option<String> {
    let exe = env::current_exe().ok()?;
    let mut file = fs::File::open(&exe).ok()?;

    // Read the last 8KB to find the trailer (trailer is ~16+4 bytes,
    // but we read more to be safe about alignment).
    let file_len = file.metadata().ok()?.len();
    if file_len < BUNDLE_MAGIC.len() as u64 + 4 {
        return None;
    }
    let read_start = file_len.saturating_sub(8192);
    let mut buf = Vec::new();
    file.seek(io::SeekFrom::Start(read_start)).ok()?;
    file.read_to_end(&mut buf).ok()?;

    // Find the last magic marker in `buf`.
    let magic_pos = buf
        .windows(BUNDLE_MAGIC.len())
        .rposition(|w| w == BUNDLE_MAGIC)?;
    if magic_pos < 4 {
        return None;
    }
    let len_bytes: [u8; 4] = buf[magic_pos - 4..magic_pos].try_into().ok()?;
    let src_len = u32::from_le_bytes(len_bytes) as usize;

    // Source lives just before the length field. The offset into the file
    // is: read_start + (magic_pos - 4 - src_len).
    let src_offset = read_start + (magic_pos as u64) - 4 - src_len as u64;
    let mut src = vec![0u8; src_len];
    let mut f2 = fs::File::open(&exe).ok()?;
    f2.seek(io::SeekFrom::Start(src_offset)).ok()?;
    f2.read_exact(&mut src).ok()?;
    String::from_utf8(src).ok()
}

/// Copies `exe_path` to `out_path`, appending the program source as a
/// trailer so the binary runs it at startup (sandbox mode).
fn run_bundle(exe_path: &str, source_path: &str, out_path: &str) -> ExitCode {
    let src = match fs::read_to_string(source_path) {
        Ok(s) => s,
        Err(e) => {
            warn_!("nepali bundle: {source_path}: {e}");
            return ExitCode::FAILURE;
        }
    };

    // Read the source file's imports too, embedding them as a single
    // flattened source (matching loader::load's behavior).
    let program = match loader::load(Path::new(source_path)) {
        Ok(p) => p,
        Err(e) => {
            warn_!("nepali bundle: {e}");
            return ExitCode::FAILURE;
        }
    };
    if let Err(errors) = Resolver::resolve(&program) {
        for e in &errors {
            warn_!("nepali bundle: विश्लेषण त्रुटि: {e}");
        }
        return ExitCode::FAILURE;
    }

    // For the embedded source, use the raw file content (imports
    // resolve at runtime against the CWD, which is the normal behavior).
    let src_bytes = src.as_bytes();
    let len_bytes = (src_bytes.len() as u32).to_le_bytes();

    let exe = match fs::read(exe_path) {
        Ok(b) => b,
        Err(e) => {
            warn_!("nepali bundle: {exe_path}: {e}");
            return ExitCode::FAILURE;
        }
    };

    // Check it doesn't already have a bundle trailer (only at the very end).
    let trailer_len = 4 + BUNDLE_MAGIC.len();
    if exe.len() >= trailer_len {
        let end = &exe[exe.len() - trailer_len..];
        if end.ends_with(BUNDLE_MAGIC) {
            warn_!("nepali bundle: {exe_path} already has an embedded program");
            return ExitCode::FAILURE;
        }
    }

    let mut out = Vec::with_capacity(exe.len() + src_bytes.len() + 4 + BUNDLE_MAGIC.len());
    out.extend_from_slice(&exe);
    out.extend_from_slice(src_bytes);
    out.extend_from_slice(&len_bytes);
    out.extend_from_slice(BUNDLE_MAGIC);

    if let Err(e) = fs::write(out_path, &out) {
        warn_!("nepali bundle: {out_path}: {e}");
        return ExitCode::FAILURE;
    }

    // Make the output executable.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(out_path, fs::Permissions::from_mode(0o755));
    }

    say!("{out_path}");
    ExitCode::SUCCESS
}

fn main() -> ExitCode {
    // Check for an embedded program first (nepali bundle).
    if let Some(src) = try_load_embedded() {
        return run_embedded(&src);
    }

    // --roman / --devanagari force how output is shown (see roman.rs); read before any output.
    // --mode os|sandbox controls which builtins are available (see WP1).
    let raw_args: Vec<String> = env::args().collect();
    let mut args: Vec<String> = Vec::new();
    // Preserve argv[0] so indexing matches the original: args[0]=binary, args[1]=first user arg.
    args.push(raw_args[0].clone());
    let mut mode_override: Option<Mode> = None;
    let mut i = 1;
    while i < raw_args.len() {
        match raw_args[i].as_str() {
            "--roman" => env::set_var("NEPALI_SCRIPT", "roman"),
            "--devanagari" => env::set_var("NEPALI_SCRIPT", "devanagari"),
            "--digits" => env::set_var("NEPALI_DIGITS", "devanagari"),
            "--mode" => {
                i += 1;
                if i < raw_args.len() {
                    mode_override = Some(match raw_args[i].as_str() {
                        "sandbox" => Mode::Sandbox,
                        "os" => Mode::Os,
                        other => {
                            eprintln!("nepali: अमान्य मोड '{other}' (--mode os वा --mode sandbox प्रयोग गर्नुहोस्)");
                            return ExitCode::FAILURE;
                        }
                    });
                } else {
                    eprintln!("nepali: --mode लाई मान चाहिन्छ (os वा sandbox)");
                    return ExitCode::FAILURE;
                }
            }
            _ => args.push(raw_args[i].clone()),
        }
        i += 1;
    }
    let mode = mode_override
        .or_else(|| match env::var("NEPALI_MODE").ok().as_deref() {
            Some("sandbox") => Some(Mode::Sandbox),
            Some("os") => Some(Mode::Os),
            Some(other) => {
                eprintln!("nepali: अमान्य NEPALI_MODE '{other}' (os वा sandbox हुनुपर्छ)");
                None
            }
            None => None,
        })
        .unwrap_or_else(detect_mode);

    // If launched as a macOS .app bundle directly (Finder click, Spotlight, or -psn_...)
    let is_finder_psn = args.get(1).map(|s| s.starts_with("-psn_")).unwrap_or(false);
    let is_inside_bundle = env::current_exe()
        .map(|p| p.to_string_lossy().contains(".app/Contents/MacOS"))
        .unwrap_or(false);

    if (args.len() <= 1 && is_inside_bundle) || is_finder_psn {
        #[cfg(feature = "gui")]
        {
            return window::run_window(8765, None);
        }
    }

    match args.get(1).map(String::as_str) {
        Some("fmt") => run_fmt(&args[2..]),
        Some("bundle") => {
            if args.len() < 5 {
                warn_!("usage: nepali bundle <nepali-binary> <program.nep> -o <output>");
                return ExitCode::FAILURE;
            }
            let out = if args[4] == "-o" { &args[5] } else { &args[4] };
            run_bundle(&args[2], &args[3], out)
        }
        #[cfg(feature = "studio")]
        Some("studio") => {
            let mut port: u16 = 8765;
            let mut no_open = false;
            let mut tui = false;
            #[cfg(feature = "gui")]
            let mut window = true; // Native window by default on all desktop OS
            let mut nepali_bin: Option<String> = None;
            let mut i = 2;
            while i < args.len() {
                match args[i].as_str() {
                    "--port" => {
                        i += 1;
                        if let Some(p) = args.get(i) {
                            port = p.parse().unwrap_or(8765);
                        }
                    }
                    "--no-open" => no_open = true,
                    "--tui" => tui = true,
                    #[cfg(feature = "gui")]
                    "--window" => window = true,
                    #[cfg(feature = "gui")]
                    "--browser" => window = false,
                    "--nepali" => {
                        i += 1;
                        nepali_bin = args.get(i).cloned();
                    }
                    other => {
                        warn_!("nepali studio: unknown option '{other}'");
                        return ExitCode::FAILURE;
                    }
                }
                i += 1;
            }
            if tui {
                run_tui(mode)
            } else {
                #[cfg(feature = "gui")]
                if window {
                    window::run_window(port, nepali_bin.as_deref())
                } else {
                    studio::run_studio(port, no_open, nepali_bin.as_deref());
                    ExitCode::SUCCESS
                }
                #[cfg(not(feature = "gui"))]
                {
                    studio::run_studio(port, no_open, nepali_bin.as_deref());
                    ExitCode::SUCCESS
                }
            }
        }
        Some(kind @ ("ask" | "agent")) => run_ai_command(kind, &args[2..].join(" "), mode),
        Some(_) => run_script(&args[1], mode),
        // No argument: this is how a login shell is invoked (the shell
        // field in /etc/passwd is run with no arguments, not "-i") - so
        // no-args means "be an interactive shell", not "print usage".
        None => run_shell(mode),
    }
}

/// Runs an embedded program (from `nepali bundle`) in sandbox mode.
fn run_embedded(src: &str) -> ExitCode {
    let mut parser = Parser::new(src);
    let program = match parser.parse_program() {
        Ok(p) => p,
        Err(e) => {
            warn_!("बन्डल त्रुटि (वाक्य रचना): {e}");
            return ExitCode::FAILURE;
        }
    };
    if let Err(errors) = Resolver::resolve(&program) {
        for e in &errors {
            warn_!("बन्डल त्रुटि (विश्लेषण): {e}");
        }
        return ExitCode::FAILURE;
    }

    let mut interp = Interpreter::new();
    interp.set_mode(Mode::Sandbox);
    interp.set_host_fs(Rc::new(LinuxFs));
    if let Some(db) = open_host_db() {
        interp.set_host_db(db);
    }
    #[cfg(feature = "js-interop")]
    interp.set_host_js(Rc::new(QuickJsHost));

    if let Err(e) = interp.run(&program) {
        for line in &interp.output {
            say!("{}", roman::digits(line));
        }
        warn_!("बन्डल त्रुटि (चलाउँदा): {e}");
        return ExitCode::FAILURE;
    }
    for line in &interp.output {
        say!("{}", roman::digits(line));
    }
    ExitCode::SUCCESS
}

/// TUI mode: simple stdin/stdout REPL with phonetic typing.
/// Type Roman, get Devanagari. End with `?` to ask the AI, or a blank line to run.
fn run_tui(mode: Mode) -> ExitCode {
    use std::io::BufRead;
    let stdin = io::stdin();
    let mut interp = Interpreter::new();
    interp.set_mode(mode);
    interp.set_host_fs(Rc::new(host_linux::LinuxFs));
    if let Some(db) = open_host_db() {
        interp.set_host_db(db);
    }
    #[cfg(feature = "js-interop")]
    interp.set_host_js(Rc::new(host_js::QuickJsHost));

    say!("नेपाली स्टुडियो (TUI) — रोमनमा टाइप गर्नुहोस्, नेपाली पाउनुहोस्।");
    say!("खाली लाइन = चलाउनुहोस्, `?` = AI सोध्नुहोस्, Ctrl+C = बाहिर।");

    let mut buffer = String::new();
    loop {
        say_no_nl!("nep> ");
        let mut line = String::new();
        match stdin.lock().read_line(&mut line) {
            Ok(0) => break, // EOF
            Ok(_) => {}
            Err(_) => break,
        }
        let line = line.trim_end().to_string();
        if line.is_empty() && !buffer.is_empty() {
            // Run the buffered code.
            let code = std::mem::take(&mut buffer);
            let mut parser = Parser::new(&code);
            match parser.parse_program() {
                Ok(program) => {
                    if let Err(errors) = Resolver::resolve(&program) {
                        for e in &errors {
                            warn_!("विश्लेषण त्रुटि: {e}");
                        }
                        continue;
                    }
                    interp.output.clear();
                    if let Err(e) = interp.run(&program) {
                        for line in &interp.output {
                            say!("{}", roman::digits(line));
                        }
                        warn_!("त्रुटि: {e}");
                    } else {
                        for line in &interp.output {
                            say!("{}", roman::digits(line));
                        }
                    }
                }
                Err(e) => warn_!("वाक्य रचना त्रुटि: {e}"),
            }
            continue;
        }
        if line == "?" {
            // AI question.
            let q = buffer.trim().to_string();
            buffer.clear();
            if q.is_empty() {
                warn_!("प्रश्न खाली छ।");
                continue;
            }
            let result = run_ai_command_str("ask", &q, &mode);
            say!("{result}");
            continue;
        }
        // Transliterate Roman to Devanagari and buffer.
        let dev = translit::transliterate_line(&line);
        buffer.push_str(&dev);
        buffer.push('\n');
        say!("  → {dev}");
    }
    ExitCode::SUCCESS
}

/// Run an AI command and return the result as a string (for TUI use).
fn run_ai_command_str(kind: &str, text: &str, _mode: &Mode) -> String {
    let args = vec!["--mode", "sandbox", kind, text];
    match Command::new(env::current_exe().unwrap_or_default())
        .args(&args)
        .output()
    {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).into_owned();
            let stderr = String::from_utf8_lossy(&out.stderr).into_owned();
            if !stderr.is_empty() {
                format!("{stdout}\n{stderr}")
            } else {
                stdout
            }
        }
        Err(e) => format!("nepali चलाउन सकिएन: {e}"),
    }
}

/// Detects whether we're on Nepali OS by checking for `/etc/nepali-os-release`.
/// If the file exists, the OS was created by this project's Dockerfile or
/// ISO build and has full OS capabilities. Otherwise, sandbox mode.
fn detect_mode() -> Mode {
    if Path::new("/etc/nepali-os-release").exists() {
        Mode::Os
    } else {
        Mode::Sandbox
    }
}

/// `nepali ask "question"` - one grounded answer from the local AI;
/// `nepali agent "goal"` - lets the AI agent act. Non-interactive, prints
/// only the answer (used by the Studio editor and by scripts).
fn run_ai_command(kind: &str, text: &str, mode: Mode) -> ExitCode {
    if text.trim().is_empty() {
        warn_!("प्रयोग: nepali {kind} \"...\"");
        return ExitCode::FAILURE;
    }
    let mut interp = new_interpreter(mode);
    let result = if kind == "ask" {
        interp.ask_assistant(text)
    } else {
        interp.run_agent_goal(text, 6)
    };
    match result {
        Ok(answer) => {
            say!("{}", answer.trim());
            ExitCode::SUCCESS
        }
        Err(e) => {
            warn_!("एआई उपलब्ध भएन: {e}");
            ExitCode::FAILURE
        }
    }
}

/// `nepali fmt <file>` reformats a real `.nep` file in place (see
/// `nepali_core::format`); `nepali fmt --check <file>` instead reports
/// whether it's already formatted without writing anything - the same
/// real "check, don't write" convention `rustfmt --check`/`gofmt -l`
/// use, for CI or pre-commit use.
fn run_fmt(args: &[String]) -> ExitCode {
    let check_only = args.first().map(String::as_str) == Some("--check");
    let path = if check_only { args.get(1) } else { args.first() };
    let Some(path) = path else {
        warn_!("usage: nepali fmt [--check] <file.nep>");
        return ExitCode::FAILURE;
    };

    let source = match std::fs::read_to_string(path) {
        Ok(s) => s,
        Err(e) => {
            warn_!("nepali fmt: {path}: {e}");
            return ExitCode::FAILURE;
        }
    };
    let formatted = nepali_core::format(&source);

    if check_only {
        if formatted == source {
            ExitCode::SUCCESS
        } else {
            say!("{path}");
            ExitCode::FAILURE
        }
    } else {
        if formatted != source {
            if let Err(e) = std::fs::write(path, &formatted) {
                warn_!("nepali fmt: {path}: {e}");
                return ExitCode::FAILURE;
            }
        }
        ExitCode::SUCCESS
    }
}

fn database_path() -> PathBuf {
    if let Ok(p) = env::var("NEPALI_DB") {
        return PathBuf::from(p);
    }
    let home = env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".nepali").join("os.db")
}

#[cfg(feature = "db")]
fn open_host_db() -> Option<Rc<dyn nepali_core::HostDb>> {
    let path = database_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    match SqliteDb::open(&path.to_string_lossy()) {
        Ok(db) => Some(Rc::new(db)),
        Err(e) => {
            warn_!("चेतावनी: डाटाबेस खोल्न सकिएन ({}): {e}", path.display());
            None
        }
    }
}
#[cfg(not(feature = "db"))]
fn open_host_db() -> Option<Rc<dyn nepali_core::HostDb>> {
    None
}

fn new_interpreter(mode: Mode) -> Interpreter {
    let mut interp = Interpreter::new();
    interp.set_mode(mode);
    interp.set_host_fs(Rc::new(LinuxFs));
    interp.set_host_command(Rc::new(RealCommand));
    interp.set_host_clock(Rc::new(LinuxClock));
    interp.set_host_input(Rc::new(LinuxInput));
    if let Some(db) = open_host_db() {
        interp.set_host_db(db);
    }
    #[cfg(feature = "python-interop")]
    interp.set_host_python(Rc::new(PyHost));
    #[cfg(feature = "rust-interop")]
    interp.set_host_rust(Rc::new(RustPluginHost::new()));
    #[cfg(feature = "js-interop")]
    interp.set_host_js(Rc::new(QuickJsHost));
    #[cfg(feature = "cache")]
    {
        let redis_url =
            env::var("NEPALI_REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
        interp.set_host_cache(Rc::new(RedisCache::new(redis_url)));
    }
    #[cfg(feature = "ai-interop")]
    interp.set_host_ai(Rc::new(LocalAi::new()));
    interp
}

fn run_script(path: &str, mode: Mode) -> ExitCode {
    let program = match loader::load(Path::new(path)) {
        Ok(p) => p,
        Err(e) => {
            warn_!("{e}");
            return ExitCode::FAILURE;
        }
    };

    if let Err(errors) = Resolver::resolve(&program) {
        for e in &errors {
            warn_!("विश्लेषण त्रुटि: {e}");
        }
        return ExitCode::FAILURE;
    }

    let mut interp = new_interpreter(mode);
    if let Err(e) = interp.run(&program) {
        for line in &interp.output {
            say!("{}", roman::digits(line));
        }
        warn_!("चलाउँदा त्रुटि: {e}");
        return ExitCode::FAILURE;
    }

    for line in &interp.output {
        say!("{}", roman::digits(line));
    }
    ExitCode::SUCCESS
}

/// A real, if honestly minimal, interactive shell: one persistent
/// `Interpreter` for the whole session (declarations carry across
/// lines, same reasoning as the old kernel REPL), with a real fallback
/// to executing external programs for anything that isn't `.nep` code.
///
/// **Routing heuristic, stated plainly:** if the line's first word names
/// a real executable found on `$PATH`, it always runs as an external
/// command - checked and fixed for a real reason, not a hypothetical
/// one: `uname -a` genuinely parses as valid `.nep` syntax (subtraction:
/// `uname - a`), and a naive "try to parse it as .nep first" heuristic
/// silently ran it as language code instead of the real `uname`, failing
/// with "undefined variable 'uname'". Any common shell invocation with
/// flags (`ls -la`, `ping -c1 host`, `grep -r x`) is exactly this shape
/// and would hit the same bug. Only once the first word isn't a real
/// executable does a line get a chance to parse as `.nep` code; a parse
/// error after that falls back to attempting external execution anyway
/// (an honest "command not found"-style failure, not a silent one). No
/// quoting/pipes/redirection yet (splits on plain whitespace) - a real,
/// stated gap, not a silent one. Prefix a line with `!` to force
/// external execution regardless (e.g. to shadow a `.nep` function with
/// the same name as a real binary).
fn run_shell(mode: Mode) -> ExitCode {
    let mut interp = new_interpreter(mode);
    let stdin = io::stdin();
    let mut last_error: Option<(String, String)> = None;

    loop {
        print_prompt();
        let mut line = String::new();
        let bytes_read = match stdin.read_line(&mut line) {
            Ok(n) => n,
            Err(e) => {
                warn_!("nepali: {e}");
                return ExitCode::FAILURE;
            }
        };
        if bytes_read == 0 {
            say!();
            return ExitCode::SUCCESS; // EOF (Ctrl-D)
        }

        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if line == "exit" || line == "बाहिर" {
            return ExitCode::SUCCESS;
        }

        if let Some(forced) = line.strip_prefix('!') {
            if mode == Mode::Sandbox {
                warn_!("बाहिरी आदेश चलाउन सकिँदैन (sandbox मोडमा)। `--mode os` वा NEPALI_MODE=os सेट गर्नुहोस्।");
            } else {
                run_external(forced.trim());
            }
            continue;
        }

        if let Some(dir) = line
            .strip_prefix("cd ")
            .or_else(|| line.strip_prefix("जानुहोस् "))
            .or_else(|| (line == "cd" || line == "जानुहोस्").then_some(""))
        {
            change_dir(dir.trim());
            continue;
        }

        // The embedded AI, as part of the shell itself.
        if let Some(q) = strip_command(line, &["?", "सोध्नुहोस्", "sodha", "ask"]) {
            if q.is_empty() {
                say!("प्रयोग: ? तपाईंको प्रश्न");
            } else {
                ask_ai(&mut interp, "सोच्दै छु…", |i| i.ask_assistant(q));
            }
            continue;
        }
        if let Some(goal) = strip_command(line, &["गर्नुहोस्", "gara", "agent"]) {
            if mode == Mode::Sandbox {
                warn_!("एजेन्ट सुविधा नेपाली OS मा मात्र चल्छ (`--mode os` वा NEPALI_MODE=os सेट गर्नुहोस्)।");
            } else if goal.is_empty() {
                say!("प्रयोग: गर्नुहोस् तपाईंको लक्ष्य");
            } else {
                ask_ai(&mut interp, "एजेन्ट काम गर्दै छ…", |i| i.run_agent_goal(goal, 6));
            }
            continue;
        }
        if strip_command(line, &["किन", "kina"]).is_some() {
            match last_error.clone() {
                None => say!("अहिलेसम्म कुनै त्रुटि भएको छैन।"),
                Some((code, err)) => {
                    let q = format!(
                        "I typed this in the Nepali language shell:\n{code}\nIt failed: {err}\n\
                         In one or two sentences explain the mistake, then show the corrected Nepali code."
                    );
                    ask_ai(&mut interp, "सोच्दै छु…", |i| i.ask_assistant(&q));
                }
            }
            continue;
        }

        let first_word = line.split_whitespace().next().unwrap_or("");
        if is_real_executable(first_word) {
            if mode == Mode::Sandbox {
                warn_!("बाहिरी आदेश चलाउन सकिँदैन (sandbox मोडमा)। `--mode os` वा NEPALI_MODE=os सेट गर्नुहोस्।");
            } else {
                run_external(line);
            }
            continue;
        }

        match try_run_as_nepali(&mut interp, line) {
            NepaliOutcome::Ran => {}
            NepaliOutcome::RuntimeError(e) => last_error = Some((line.to_string(), e)),
            NepaliOutcome::NotNepali(_) if is_question(line) => {
                // A plain sentence ending in `?` is a question for the AI.
                ask_ai(&mut interp, "सोच्दै छु…", |i| i.ask_assistant(line));
            }
            NepaliOutcome::NotNepali(parse_error) => {
                if mode == Mode::Sandbox {
                    warn_!("sandbox मोडमा बाहिरी आदेश चलाउन सकिँदैन: {parse_error}");
                } else if !run_external(line) {
                    last_error = Some((
                        line.to_string(),
                        format!("not a known command, and not valid Nepali code: {parse_error}"),
                    ));
                }
            }
        }
    }
}

/// `line` is exactly `name`, or starts with `name` followed by a space
/// (or, for `?`, directly by the question). Returns the rest, trimmed.
fn strip_command<'a>(line: &'a str, names: &[&str]) -> Option<&'a str> {
    for name in names {
        if line == *name {
            return Some("");
        }
        if let Some(rest) = line.strip_prefix(name) {
            if *name == "?" || rest.starts_with(' ') {
                return Some(rest.trim());
            }
        }
    }
    None
}

/// A sentence ending in `?` (ASCII or Devanagari-keyboard `?`), so people can just
/// ask: `नेपालको राजधानी कहाँ हो?`
fn is_question(line: &str) -> bool {
    let l = line.trim_end();
    (l.ends_with('?') || l.ends_with('\u{FF1F}')) && l.chars().count() > 3
}

fn ask_ai(
    interp: &mut Interpreter,
    thinking: &str,
    f: impl FnOnce(&mut Interpreter) -> Result<String, String>,
) {
    say!("\x1b[2m{thinking}\x1b[0m");
    match f(interp) {
        Ok(answer) => say!("{}", answer.trim()),
        Err(e) => warn_!("एआई उपलब्ध भएन: {e}"),
    }
}

/// A real `$PATH` scan (checked for existence and the executable bit via
/// Unix permissions) - not a hardcoded list of "things that look like
/// shell commands". Absolute/relative paths (containing `/`) are checked
/// directly rather than searched for on `$PATH`, matching how a real
/// shell treats `./script.sh` differently from a bare command name.
fn is_real_executable(name: &str) -> bool {
    #[cfg(unix)]
    fn is_executable_file(path: &Path) -> bool {
        use std::os::unix::fs::PermissionsExt;
        std::fs::metadata(path)
            .map(|m| m.is_file() && m.permissions().mode() & 0o111 != 0)
            .unwrap_or(false)
    }

    #[cfg(windows)]
    fn is_executable_file(path: &Path) -> bool {
        if path.is_file() {
            return true;
        }
        let exe = path.with_extension("exe");
        exe.is_file()
    }

    #[cfg(not(any(unix, windows)))]
    fn is_executable_file(path: &Path) -> bool {
        path.is_file()
    }

    if name.is_empty() {
        return false;
    }
    if name.contains('/') || (cfg!(windows) && name.contains('\\')) {
        return is_executable_file(Path::new(name));
    }
    let Ok(path_var) = env::var("PATH") else { return false };
    env::split_paths(&path_var).any(|dir| is_executable_file(&dir.join(name)))
}

fn print_prompt() {
    let cwd = env::current_dir().unwrap_or_else(|_| PathBuf::from("?"));
    let shown = match env::var("HOME") {
        Ok(home) if !home.is_empty() && cwd.starts_with(&home) => {
            let rest = cwd.strip_prefix(&home).unwrap();
            if rest.as_os_str().is_empty() {
                "~".to_string()
            } else {
                format!("~/{}", rest.display())
            }
        }
        _ => cwd.display().to_string(),
    };
    say_no_nl!("नेपाली:{shown} $ ");
    let _ = io::stdout().flush();
}

/// Returns `Some(())` (and has already run the line and printed its
/// output) if `line` parses as `.nep` code; `None` if it doesn't, so the
/// caller can fall back to treating it as an external command. Parse
/// errors are the routing signal, not resolution errors - resolving
/// just this one line in isolation would wrongly flag every variable a
/// *previous* REPL line declared as undefined.
fn try_run_as_nepali(interp: &mut Interpreter, line: &str) -> NepaliOutcome {
    let mut parser = Parser::new(line);
    let program = match parser.parse_program() {
        Ok(p) => p,
        Err(e) => return NepaliOutcome::NotNepali(e),
    };

    interp.output.clear();
    let result = interp.run(&program);
    for out_line in &interp.output {
        say!("{}", roman::digits(out_line));
    }
    match result {
        Ok(()) => NepaliOutcome::Ran,
        Err(e) => {
            warn_!("चलाउँदा त्रुटि: {e}");
            NepaliOutcome::RuntimeError(e)
        }
    }
}

enum NepaliOutcome {
    Ran,
    RuntimeError(String),
    /// Didn't parse as Nepali code (carries the parse error).
    NotNepali(String),
}

fn change_dir(dir: &str) {
    let target = if dir.is_empty() {
        env::var("HOME").unwrap_or_else(|_| "/".to_string())
    } else {
        dir.to_string()
    };
    if let Err(e) = env::set_current_dir(&target) {
        warn_!("cd: {target}: {e}");
    }
}

/// Returns false only when the command could not be found at all.
fn run_external(line: &str) -> bool {
    let mut parts = line.split_whitespace();
    let Some(cmd) = parts.next() else { return true };
    let args: Vec<&str> = parts.collect();

    match Command::new(cmd).args(&args).status() {
        Ok(status) if !status.success() => {
            if let Some(code) = status.code() {
                warn_!("{cmd}: स्थिति {code} सहित समाप्त भयो");
            }
        }
        Ok(_) => {}
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            warn_!("{cmd}: आदेश फेला परेन");
            return false;
        }
        Err(e) => warn_!("{cmd}: {e}"),
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plain_sentences_ending_in_a_question_mark_are_questions() {
        assert!(is_question("नेपालको राजधानी कहाँ हो?"));
        assert!(is_question("how do I write a loop?  "));
        assert!(!is_question("भनौँ(1)।"));
        assert!(!is_question("?"));
    }

    #[test]
    fn ask_and_agent_are_shell_commands_too() {
        assert_eq!(strip_command("ask how are you", &["?", "ask"]), Some("how are you"));
        assert_eq!(strip_command("asking", &["?", "ask"]), None);
        assert_eq!(strip_command("?नेपाल", &["?"]), Some("नेपाल"));
    }

    #[test]
    fn loader_resolves_import_across_files() {
        let entry = Path::new(env!("CARGO_MANIFEST_DIR")).join("examples/import_demo/main.nep");
        let program = loader::load(&entry).expect("load error");
        Resolver::resolve(&program).expect("resolution error");

        let mut interp = Interpreter::new();
        interp.run(&program).expect("runtime error");

        assert_eq!(
            interp.output,
            vec!["square(4) = 16".to_string(), "cube(3) = 27".to_string()]
        );
    }
}
