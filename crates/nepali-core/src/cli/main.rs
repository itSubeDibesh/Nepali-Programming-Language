use nepali_core::{Interpreter, Parser, Resolver};
use std::env;
use std::io::{self, Write};
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
use host_linux::{LinuxFs, RealCommand, SqliteDb};
#[cfg(feature = "python-interop")]
use host_python::PyHost;
#[cfg(feature = "rust-interop")]
use host_rust::RustPluginHost;

fn main() -> ExitCode {
    // --roman / --devanagari force how output is shown (see roman.rs); read before any output.
    let mut args: Vec<String> = Vec::new();
    for (i, a) in env::args().enumerate() {
        match a.as_str() {
            "--roman" if i > 0 => env::set_var("NEPALI_SCRIPT", "roman"),
            "--devanagari" if i > 0 => env::set_var("NEPALI_SCRIPT", "devanagari"),
            _ => args.push(a),
        }
    }
    match args.get(1).map(String::as_str) {
        Some("fmt") => run_fmt(&args[2..]),
        Some(kind @ ("ask" | "agent")) => run_ai_command(kind, &args[2..].join(" ")),
        Some(_) => run_script(&args[1]),
        // No argument: this is how a login shell is invoked (the shell
        // field in /etc/passwd is run with no arguments, not "-i") - so
        // no-args means "be an interactive shell", not "print usage".
        None => run_shell(),
    }
}

/// `nepali ask "question"` - one grounded answer from the local AI;
/// `nepali agent "goal"` - lets the AI agent act. Non-interactive, prints
/// only the answer (used by the Studio editor and by scripts).
fn run_ai_command(kind: &str, text: &str) -> ExitCode {
    if text.trim().is_empty() {
        warn_!("प्रयोग: nepali {kind} \"...\"");
        return ExitCode::FAILURE;
    }
    let mut interp = new_interpreter();
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

fn open_host_db() -> Option<Rc<SqliteDb>> {
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

fn new_interpreter() -> Interpreter {
    let mut interp = Interpreter::new();
    interp.set_host_fs(Rc::new(LinuxFs));
    interp.set_host_command(Rc::new(RealCommand));
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

fn run_script(path: &str) -> ExitCode {
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

    let mut interp = new_interpreter();
    if let Err(e) = interp.run(&program) {
        for line in &interp.output {
            say!("{line}");
        }
        warn_!("चलाउँदा त्रुटि: {e}");
        return ExitCode::FAILURE;
    }

    for line in &interp.output {
        say!("{line}");
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
fn run_shell() -> ExitCode {
    let mut interp = new_interpreter();
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
            run_external(forced.trim());
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
            if goal.is_empty() {
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
            run_external(line);
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
                if !run_external(line) {
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
    use std::os::unix::fs::PermissionsExt;

    fn is_executable_file(path: &Path) -> bool {
        std::fs::metadata(path)
            .map(|m| m.is_file() && m.permissions().mode() & 0o111 != 0)
            .unwrap_or(false)
    }

    if name.is_empty() {
        return false;
    }
    if name.contains('/') {
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
        say!("{out_line}");
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
