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
    match env::args().nth(1) {
        Some(path) => run_script(&path),
        // No argument: this is how a login shell is invoked (the shell
        // field in /etc/passwd is run with no arguments, not "-i") - so
        // no-args means "be an interactive shell", not "print usage".
        None => run_shell(),
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
            eprintln!("warning: could not open database at {}: {e}", path.display());
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
            eprintln!("{e}");
            return ExitCode::FAILURE;
        }
    };

    if let Err(errors) = Resolver::resolve(&program) {
        for e in &errors {
            eprintln!("resolution error: {e}");
        }
        return ExitCode::FAILURE;
    }

    let mut interp = new_interpreter();
    if let Err(e) = interp.run(&program) {
        for line in &interp.output {
            println!("{line}");
        }
        eprintln!("runtime error: {e}");
        return ExitCode::FAILURE;
    }

    for line in &interp.output {
        println!("{line}");
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

    loop {
        print_prompt();
        let mut line = String::new();
        let bytes_read = match stdin.read_line(&mut line) {
            Ok(n) => n,
            Err(e) => {
                eprintln!("nepali: {e}");
                return ExitCode::FAILURE;
            }
        };
        if bytes_read == 0 {
            println!();
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

        if let Some(dir) = line.strip_prefix("cd ").or_else(|| (line == "cd").then_some("")) {
            change_dir(dir.trim());
            continue;
        }

        let first_word = line.split_whitespace().next().unwrap_or("");
        if is_real_executable(first_word) {
            run_external(line);
            continue;
        }

        match try_run_as_nepali(&mut interp, line) {
            Some(()) => {}
            None => run_external(line),
        }
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
    print!("nep:{} $ ", cwd.display());
    let _ = io::stdout().flush();
}

/// Returns `Some(())` (and has already run the line and printed its
/// output) if `line` parses as `.nep` code; `None` if it doesn't, so the
/// caller can fall back to treating it as an external command. Parse
/// errors are the routing signal, not resolution errors - resolving
/// just this one line in isolation would wrongly flag every variable a
/// *previous* REPL line declared as undefined.
fn try_run_as_nepali(interp: &mut Interpreter, line: &str) -> Option<()> {
    let mut parser = Parser::new(line);
    let program = parser.parse_program().ok()?;

    interp.output.clear();
    if let Err(e) = interp.run(&program) {
        for out_line in &interp.output {
            println!("{out_line}");
        }
        eprintln!("runtime error: {e}");
        return Some(());
    }
    for out_line in &interp.output {
        println!("{out_line}");
    }
    Some(())
}

fn change_dir(dir: &str) {
    let target = if dir.is_empty() {
        env::var("HOME").unwrap_or_else(|_| "/".to_string())
    } else {
        dir.to_string()
    };
    if let Err(e) = env::set_current_dir(&target) {
        eprintln!("cd: {target}: {e}");
    }
}

fn run_external(line: &str) {
    let mut parts = line.split_whitespace();
    let Some(cmd) = parts.next() else { return };
    let args: Vec<&str> = parts.collect();

    match Command::new(cmd).args(&args).status() {
        Ok(status) if !status.success() => {
            if let Some(code) = status.code() {
                eprintln!("{cmd}: exited with status {code}");
            }
        }
        Ok(_) => {}
        Err(e) => eprintln!("{cmd}: {e}"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
