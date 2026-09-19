use crate::ast::{BinOp, Expr, Stmt};
use alloc::collections::BTreeMap;
use alloc::format;
use alloc::rc::Rc;
use alloc::string::{String, ToString};
use alloc::vec::Vec;
use core::cell::RefCell;

pub type EvalResult<T> = Result<T, String>;

#[derive(Debug, Clone)]
pub enum Value {
    Number(f64),
    Str(String),
    Bool(bool),
    Null,
    Function(Rc<FunctionValue>),
    /// `Rc<RefCell<..>>`, not a plain `Vec` - arrays are reference types
    /// here (assigning `x[i] = v` must be visible through every other
    /// binding that refers to the same array, matching how every other
    /// language with mutable arrays behaves, and how `FunctionValue`'s
    /// closure already shares `Env` the same way).
    Array(Rc<RefCell<Vec<Value>>>),
}

#[derive(Debug)]
pub struct FunctionValue {
    pub name: String,
    pub params: Vec<String>,
    pub body: Vec<Stmt>,
    pub closure: Env,
}

impl Value {
    pub fn is_truthy(&self) -> bool {
        match self {
            Value::Bool(b) => *b,
            Value::Null => false,
            Value::Number(n) => *n != 0.0,
            Value::Str(s) => !s.is_empty(),
            Value::Function(_) => true,
            Value::Array(a) => !a.borrow().is_empty(),
        }
    }

    pub fn display(&self) -> String {
        match self {
            Value::Number(n) => {
                // core has no fract()/trunc() (libm, not in core); round-trip
                // through i64 instead to detect integer-valued floats.
                let as_int = *n as i64;
                if as_int as f64 == *n {
                    format!("{}", as_int)
                } else {
                    format!("{}", n)
                }
            }
            Value::Str(s) => s.clone(),
            Value::Bool(b) => {
                if *b {
                    "सहि".to_string()
                } else {
                    "गलत".to_string()
                }
            }
            Value::Null => "केहीछैन".to_string(),
            Value::Function(f) => format!("<function {}>", f.name),
            Value::Array(a) => {
                let items: Vec<String> = a.borrow().iter().map(Value::display).collect();
                format!("[{}]", items.join(", "))
            }
        }
    }
}

#[derive(Debug)]
pub struct Scope {
    vars: BTreeMap<String, Value>,
    parent: Option<Env>,
}

pub type Env = Rc<RefCell<Scope>>;

pub fn new_scope(parent: Option<Env>) -> Env {
    Rc::new(RefCell::new(Scope {
        vars: BTreeMap::new(),
        parent,
    }))
}

fn env_get(env: &Env, name: &str) -> Option<Value> {
    if let Some(v) = env.borrow().vars.get(name) {
        return Some(v.clone());
    }
    match &env.borrow().parent {
        Some(parent) => env_get(parent, name),
        None => None,
    }
}

fn env_define(env: &Env, name: String, value: Value) {
    env.borrow_mut().vars.insert(name, value);
}

fn env_assign(env: &Env, name: &str, value: Value) -> Result<(), String> {
    if env.borrow().vars.contains_key(name) {
        env.borrow_mut().vars.insert(name.into(), value);
        return Ok(());
    }
    let parent = env.borrow().parent.clone();
    match parent {
        Some(parent) => env_assign(&parent, name, value),
        None => Err(format!("undefined variable '{}'", name)),
    }
}

enum Signal {
    Normal,
    Return(Value),
}

/// A real filesystem `.nep` code can reach through
/// `ओएस_लेख्नुहोस्`/`ओएस_पढ्नुहोस्`/`ओएस_सूची` - not a simulated one.
/// `nepali-core` is `no_std` and has no filesystem of its own (and must
/// not depend on any particular host's - the kernel and the CLI have
/// completely different real ones), so this is dependency injection: the
/// host (`kernel/src/fs.rs`'s real FAT filesystem, or a `std::fs`-backed
/// one for the CLI) implements this trait and hands it to the
/// interpreter via `set_host_fs`; without one, these three builtins fail
/// with a clear "no host filesystem available" error instead of
/// pretending to succeed.
pub trait HostFs {
    fn read_file(&self, path: &str) -> Result<String, String>;
    fn write_file(&self, path: &str, contents: &str) -> Result<(), String>;
    /// Lists filenames only (not sizes/types) - deliberately the smallest
    /// useful contract, since what a "path" even means beyond a plain
    /// filename in the current directory is host-specific (see
    /// `kernel/src/fs.rs`'s lack of general path-splitting).
    fn list_dir(&self, path: &str) -> Result<Vec<String>, String>;
}

/// Real preemptible processes `.nep` code can reach through
/// `नयाँ_प्रक्रिया`/`प्रक्रिया_सूची` - not a simulated process table.
/// Same dependency-injection reasoning as `HostFs`: `nepali-core` has no
/// scheduler of its own, and the kernel's real one (`kernel/src/
/// process.rs`) is the only thing that could ever back this honestly.
pub trait HostProcess {
    /// Starts a real process, returning its index (a real, if simple,
    /// "PID"). The name is a label only - every process this kernel can
    /// spawn runs the same fixed program regardless of what it's called.
    fn spawn(&self, name: &str) -> Result<f64, String>;
    /// Real names of every currently running process, in spawn order.
    fn list(&self) -> Result<Vec<String>, String>;
}

/// Real, kernel-tracked FIFO message queues `.nep` code can reach through
/// `नयाँ_च्यानल`/`च्यानल_पठाउनुहोस्`/`च्यानल_पाउनुहोस्`. Same
/// dependency-injection reasoning as `HostFs`/`HostProcess`.
///
/// Honestly scoped, like `HostProcess`: this kernel's ring-3 processes
/// only ever run a fixed hand-written machine-code loop (see
/// `kernel/src/process.rs`) and have no way to call into `nepali-core` at
/// all, so a channel backed by this trait is real, persistent, kernel-side
/// FIFO state - not a fake in-interpreter simulation - but it is not yet
/// genuine inter-*process* communication, since no second execution
/// context exists that could be the other end of one. `recv` is
/// non-blocking (`Ok(None)` on empty) rather than parking the caller,
/// since there is also no real scheduler hook yet to wake a blocked
/// `nepali-core` script when a message arrives.
/// A real external command `.nep` code (and the agent loop below) can
/// run and get the *result* back from, through `आदेश_चलाउनुहोस्` - a
/// real gap this fills: `HostProcess` above is dead code for this OS
/// (never wired in the CLI - see `src/cli/main.rs` - a leftover from
/// the deleted from-scratch kernel, where "processes" only ever ran a
/// fixed hand-written machine-code loop, not real programs), and the
/// interactive shell's own external-command path
/// (`run_shell`/`run_external` in `src/cli/main.rs`) inherits stdio
/// straight through rather than capturing it, so nothing - not `.nep`
/// scripts, not an AI agent - could previously run a real command and
/// see what it printed or whether it succeeded. A real backend (the
/// CLI's `std::process::Command`-based implementation) is handed to the
/// interpreter via `set_host_command`.
pub trait HostCommand {
    /// Runs `program` with real `args`, waits for it to finish, and
    /// returns `(exit_code, stdout, stderr)` - all real, captured
    /// output, not fire-and-forget. Deliberately `Command::new(program)`
    /// with a real argument array, never a shell string handed to `sh
    /// -c` - shell metacharacters in `args` (`;`, `|`, `` ` ``, `$(...)`)
    /// are inert, passed through as literal argv entries, not
    /// interpreted. A real, meaningful security property for anything
    /// (especially an AI-driven agent) that runs commands built from
    /// text it didn't fully control.
    fn run(&self, program: &str, args: &[String]) -> Result<(i32, String, String), String>;
}

pub trait HostChannel {
    /// Creates a new, empty channel, returning its id.
    fn create(&self) -> Result<f64, String>;
    /// Pushes `msg` onto channel `id`'s queue.
    fn send(&self, id: f64, msg: &str) -> Result<(), String>;
    /// Pops the oldest message off channel `id`'s queue, or `None` if it's
    /// currently empty (never blocks).
    fn recv(&self, id: f64) -> Result<Option<String>, String>;
}

/// A real SQL database `.nep` code can reach through
/// `डाटाबेस_चलाउनुहोस्`/`डाटाबेस_सोध्नुहोस्` - not an in-memory toy. Same
/// dependency-injection reasoning as `HostFs`: `nepali-core` has no
/// database engine of its own and must not assume any particular host's,
/// so a real backend (e.g. the CLI's SQLite-backed implementation, via
/// the well-audited `rusqlite` crate rather than a hand-rolled one)
/// implements this trait and is handed to the interpreter via
/// `set_host_db`. Deliberately just these two operations - a full ORM-
/// style API belongs in a `.nep` standard-library module built on top of
/// these two primitives, not baked into the interpreter itself.
pub trait HostDb {
    /// Runs a statement with no result set (INSERT/UPDATE/DELETE/CREATE/
    /// ...), returning the number of rows affected.
    fn execute(&self, sql: &str) -> Result<f64, String>;
    /// Runs a SELECT, returning each row as a `Value::Array` of column
    /// values (SQLite's own dynamic typing maps directly onto this
    /// language's existing `Value` variants: `INTEGER`/`REAL` ->
    /// `Number`, `TEXT` -> `Str`, `NULL` -> `Null`; a `BLOB` column is a
    /// real, honest runtime error rather than silently mangled text).
    fn query(&self, sql: &str) -> Result<Vec<Value>, String>;
}

/// Real embedded Python `.nep` code can reach through
/// `पाइथन_चलाउनुहोस्` - the first of four planned real-interop bridges
/// (Python, then Rust plugins, then JS/TS, then Go - see CLAUDE.md), not
/// a simulated one. Same dependency-injection reasoning as the other
/// `Host*` traits: `nepali-core` stays `no_std` and has no Python runtime
/// of its own, so a real backend (the CLI's `pyo3`-based implementation,
/// embedding the real system CPython) implements this and is handed to
/// the interpreter via `set_host_python`.
pub trait HostPython {
    /// Runs `code` as real Python (multiple statements allowed, real
    /// `import`s work). Returns whatever the script assigns to the
    /// conventional variable `परिणाम` by the time it finishes, or
    /// `Value::Null` if it never does - Python statements don't have a
    /// single trailing "value" the way an expression-based language's
    /// blocks do, so a return value needs an explicit convention rather
    /// than an implicit "last expression" rule.
    fn eval(&self, code: &str) -> Result<Value, String>;
}

/// Real, separately-compiled native plugins `.nep` code can reach
/// through `रस्ट_चलाउनुहोस्`/`गो_चलाउनुहोस्` - the second (and, since Go
/// reuses the exact same mechanism, effectively also the fourth) of four
/// planned real interop bridges (Python (done), Rust + Go (this), JS/TS
/// - see CLAUDE.md). A plugin is any real shared library exporting
/// `nepali_plugin_call`/`nepali_plugin_free_string` with the exact
/// signatures `nepali-plugin-abi` defines - a real Rust `cdylib`
/// (`crates/nepali-example-plugin`) or a real `go build
/// -buildmode=c-shared` binary (`plugins/go-example`) both satisfy the
/// same C ABI, verified side by side against the identical loader.
/// `dlopen`ed at runtime by the host implementation (the CLI's
/// `libloading`-based `src/cli/host_rust.rs`), not linked at compile
/// time, so `.nep` code can load a plugin it didn't know about when
/// `nepali-core-cli` itself was built.
pub trait HostRust {
    /// Loads (or reuses an already-loaded) shared library at `lib_path`
    /// and calls its exported `fn_name` with `args`. Only
    /// `Number`/`Str`/`Bool`/`Null` values can cross this boundary -
    /// `Array`/`Function` arguments are a real, explicit error, the same
    /// honestly-scoped limit as `HostPython`'s conversion.
    fn call(&self, lib_path: &str, fn_name: &str, args: &[Value]) -> Result<Value, String>;
}

/// Real embedded JavaScript/TypeScript `.nep` code can reach through
/// `जेएस_चलाउनुहोस्`/`टिएस_चलाउनुहोस्` - the third of four planned real
/// interop bridges (Python, Rust (both done), JS/TS (this), Go - see
/// CLAUDE.md). Same dependency-injection reasoning as `HostPython`: a
/// real backend (the CLI's `rquickjs`-based implementation, a real
/// embedded QuickJS engine) implements this and is handed to the
/// interpreter via `set_host_js`. Unlike `HostPython`, no
/// `परिणाम`-variable convention is needed - a JS program's value is
/// genuinely the value of its last expression, so `eval` returns that
/// directly.
pub trait HostJs {
    fn eval(&self, code: &str) -> Result<Value, String>;
    /// Real TypeScript, not JS-with-types-that-happen-to-parse: type
    /// annotations, `interface`, `enum`, `as` casts, etc. are real
    /// syntax `eval` alone can't handle - a real implementation
    /// transpiles TS to JS first (via `swc`, a real, proven compiler,
    /// not a hand-rolled type-annotation stripper) and then runs the
    /// result through the exact same JS engine `eval` uses.
    fn eval_ts(&self, code: &str) -> Result<Value, String>;
}

/// A real cache server `.nep` code can reach through
/// `क्यास_राख्नुहोस्`/`क्यास_ल्याउनुहोस्`/`क्यास_हटाउनुहोस्` - second item
/// of the services roadmap (fileserver done first - see CLAUDE.md). Same
/// dependency-injection reasoning as `HostDb`: a real backend (the CLI's
/// implementation, a real `redis` crate client talking to a real
/// `redis-server` process over the network) implements this and is
/// handed to the interpreter via `set_host_cache` - not an in-process
/// `HashMap` pretending to be a cache server.
pub trait HostCache {
    /// Sets `key` to `value`. `ttl_seconds` of `0` means no expiry.
    fn set(&self, key: &str, value: &str, ttl_seconds: u64) -> Result<(), String>;
    /// `Ok(None)` for a real cache miss (key absent or expired) - not an
    /// error, the same "empty means empty, not broken" reasoning as
    /// `HostChannel::recv`.
    fn get(&self, key: &str) -> Result<Option<String>, String>;
    fn delete(&self, key: &str) -> Result<(), String>;
}

/// A real, locally-running AI backend `.nep` code (and the interactive
/// shell) can reach through `एआई_सोध्नुहोस्`/`एआई_सुन्नुहोस्`/`एआई_बोल्नुहोस्`
/// - same dependency-injection reasoning as every other `Host*` trait:
/// `nepali-core` has no model runtime of its own, so a real backend (the
/// CLI's implementation, a real local LLM for text and a real local
/// speech model for voice - see CLAUDE.md for exactly which models and
/// their honest limitations) implements this and is handed to the
/// interpreter via `set_host_ai`. Deliberately three separate, narrow
/// operations rather than one do-everything call, matching how
/// `HostDb`/`HostCache` stay narrow too.
pub trait HostAi {
    /// Runs `prompt` through a real local language model and returns its
    /// real generated response (not a canned/templated string). A model
    /// too small or not fine-tuned for a language is a real, honest
    /// quality limitation of the underlying weights, not something this
    /// trait can paper over.
    fn ask(&self, prompt: &str) -> Result<String, String>;
    /// Like `ask`, but with an explicit system message (what the model is
    /// told about the language, the OS and the machine before the user's
    /// question). Backends without a system role get it prepended.
    fn ask_with_system(&self, system: &str, prompt: &str) -> Result<String, String> {
        self.ask(&format!("{system}\n\n{prompt}"))
    }
    /// Real speech-to-text: `audio_path` names a real audio file on the
    /// host filesystem, transcribed by a real local speech model.
    fn listen(&self, audio_path: &str) -> Result<String, String>;
    /// Real text-to-speech: synthesizes `text` with a real local voice
    /// model and returns the path to the real audio file it wrote.
    fn speak(&self, text: &str) -> Result<String, String>;
}

pub struct Interpreter {
    pub output: Vec<String>,
    globals: Env,
    host_fs: Option<Rc<dyn HostFs>>,
    host_process: Option<Rc<dyn HostProcess>>,
    host_channel: Option<Rc<dyn HostChannel>>,
    host_db: Option<Rc<dyn HostDb>>,
    host_python: Option<Rc<dyn HostPython>>,
    host_rust: Option<Rc<dyn HostRust>>,
    host_js: Option<Rc<dyn HostJs>>,
    host_cache: Option<Rc<dyn HostCache>>,
    host_ai: Option<Rc<dyn HostAi>>,
    host_command: Option<Rc<dyn HostCommand>>,
    fuel: Option<u64>,
    call_depth: u32,
    max_call_depth: Option<u32>,
}

impl Interpreter {
    pub fn new() -> Self {
        Interpreter {
            output: Vec::new(),
            globals: new_scope(None),
            host_fs: None,
            host_process: None,
            host_channel: None,
            host_db: None,
            host_python: None,
            host_rust: None,
            host_js: None,
            host_cache: None,
            host_ai: None,
            host_command: None,
            fuel: None,
            call_depth: 0,
            max_call_depth: None,
        }
    }

    /// Caps how much a program may do (statements executed, call depth).
    /// Used for code an AI wrote, so an infinite loop or runaway recursion
    /// becomes an error instead of hanging or crashing the whole shell.
    pub fn set_limits(&mut self, max_steps: u64, max_call_depth: u32) {
        self.fuel = Some(max_steps);
        self.max_call_depth = Some(max_call_depth);
    }

    /// Gives this interpreter a real filesystem to reach through
    /// `ओएस_लेख्नुहोस्`/`ओएस_पढ्नुहोस्`/`ओएस_सूची`. Optional - an
    /// `Interpreter` with none still runs everything else normally, and
    /// those three builtins fail with a clear error instead of a panic
    /// or a silently-fake result.
    pub fn set_host_fs(&mut self, host_fs: Rc<dyn HostFs>) {
        self.host_fs = Some(host_fs);
    }

    /// Gives this interpreter a real process host to reach through
    /// `नयाँ_प्रक्रिया`/`प्रक्रिया_सूची`. Same optionality as `set_host_fs`.
    pub fn set_host_process(&mut self, host_process: Rc<dyn HostProcess>) {
        self.host_process = Some(host_process);
    }

    /// Gives this interpreter a real channel host to reach through
    /// `नयाँ_च्यानल`/`च्यानल_पठाउनुहोस्`/`च्यानल_पाउनुहोस्`. Same
    /// optionality as `set_host_fs`/`set_host_process`.
    pub fn set_host_channel(&mut self, host_channel: Rc<dyn HostChannel>) {
        self.host_channel = Some(host_channel);
    }

    /// Gives this interpreter a real database to reach through
    /// `डाटाबेस_चलाउनुहोस्`/`डाटाबेस_सोध्नुहोस्`. Same optionality as
    /// `set_host_fs`/`set_host_process`/`set_host_channel`.
    pub fn set_host_db(&mut self, host_db: Rc<dyn HostDb>) {
        self.host_db = Some(host_db);
    }

    /// Gives this interpreter a real embedded Python to reach through
    /// `पाइथन_चलाउनुहोस्`. Same optionality as every other `set_host_*`.
    pub fn set_host_python(&mut self, host_python: Rc<dyn HostPython>) {
        self.host_python = Some(host_python);
    }

    /// Gives this interpreter a real Rust-plugin loader to reach through
    /// `रस्ट_चलाउनुहोस्`. Same optionality as every other `set_host_*`.
    pub fn set_host_rust(&mut self, host_rust: Rc<dyn HostRust>) {
        self.host_rust = Some(host_rust);
    }

    /// Gives this interpreter a real embedded JS/TS engine to reach
    /// through `जेएस_चलाउनुहोस्`. Same optionality as every other
    /// `set_host_*`.
    pub fn set_host_js(&mut self, host_js: Rc<dyn HostJs>) {
        self.host_js = Some(host_js);
    }

    /// Gives this interpreter a real cache server to reach through
    /// `क्यास_राख्नुहोस्`/`क्यास_ल्याउनुहोस्`/`क्यास_हटाउनुहोस्`. Same
    /// optionality as every other `set_host_*`.
    pub fn set_host_cache(&mut self, host_cache: Rc<dyn HostCache>) {
        self.host_cache = Some(host_cache);
    }

    /// Gives this interpreter a real local AI backend to reach through
    /// `एआई_सोध्नुहोस्`/`एआई_सुन्नुहोस्`/`एआई_बोल्नुहोस्`. Same optionality as
    /// every other `set_host_*`.
    pub fn set_host_ai(&mut self, host_ai: Rc<dyn HostAi>) {
        self.host_ai = Some(host_ai);
    }

    /// Gives this interpreter a real command runner to reach through
    /// `आदेश_चलाउनुहोस्` (and the agent loop, `एजेन्ट_चलाउनुहोस्`, below).
    /// Same optionality as every other `set_host_*`.
    pub fn set_host_command(&mut self, host_command: Rc<dyn HostCommand>) {
        self.host_command = Some(host_command);
    }

    pub fn run(&mut self, program: &[Stmt]) -> EvalResult<()> {
        let env = self.globals.clone();
        match self.exec_block(program, &env)? {
            _ => Ok(()),
        }
    }

    fn exec_block(&mut self, stmts: &[Stmt], env: &Env) -> EvalResult<Signal> {
        for stmt in stmts {
            match self.exec_stmt(stmt, env)? {
                Signal::Normal => continue,
                ret @ Signal::Return(_) => return Ok(ret),
            }
        }
        Ok(Signal::Normal)
    }

    fn exec_stmt(&mut self, stmt: &Stmt, env: &Env) -> EvalResult<Signal> {
        if let Some(fuel) = self.fuel.as_mut() {
            if *fuel == 0 {
                return Err("चरण सीमा नाघ्यो (अनन्त लुप वा धेरै लामो कार्यक्रम?)".to_string());
            }
            *fuel -= 1;
        }
        match stmt {
            Stmt::Let(name, expr) => {
                let value = self.eval_expr(expr, env)?;
                env_define(env, name.clone(), value);
                Ok(Signal::Normal)
            }
            Stmt::Print(exprs) => {
                let mut parts = Vec::with_capacity(exprs.len());
                for expr in exprs {
                    parts.push(self.eval_expr(expr, env)?.display());
                }
                self.output.push(parts.join(" "));
                Ok(Signal::Normal)
            }
            Stmt::ExprStmt(expr) => {
                self.eval_expr(expr, env)?;
                Ok(Signal::Normal)
            }
            Stmt::If(cond, then_branch, else_branch) => {
                let cond_val = self.eval_expr(cond, env)?;
                if cond_val.is_truthy() {
                    let scope = new_scope(Some(env.clone()));
                    self.exec_block(then_branch, &scope)
                } else if let Some(else_branch) = else_branch {
                    let scope = new_scope(Some(env.clone()));
                    self.exec_block(else_branch, &scope)
                } else {
                    Ok(Signal::Normal)
                }
            }
            Stmt::While(cond, body) => {
                while self.eval_expr(cond, env)?.is_truthy() {
                    let scope = new_scope(Some(env.clone()));
                    match self.exec_block(body, &scope)? {
                        Signal::Normal => continue,
                        ret @ Signal::Return(_) => return Ok(ret),
                    }
                }
                Ok(Signal::Normal)
            }
            Stmt::FunctionDecl(name, params, body) => {
                let func = Value::Function(Rc::new(FunctionValue {
                    name: name.clone(),
                    params: params.clone(),
                    body: body.clone(),
                    closure: env.clone(),
                }));
                env_define(env, name.clone(), func);
                Ok(Signal::Normal)
            }
            Stmt::Return(expr) => {
                let value = match expr {
                    Some(e) => self.eval_expr(e, env)?,
                    None => Value::Null,
                };
                Ok(Signal::Return(value))
            }
            Stmt::Import(path) => Err(format!(
                "import \"{}\" reached the interpreter unresolved - imports must be \
                 resolved by a host loader (e.g. nepali-core-cli's loader module) before running",
                path
            )),
        }
    }

    fn eval_expr(&mut self, expr: &Expr, env: &Env) -> EvalResult<Value> {
        match expr {
            Expr::Number(n) => Ok(Value::Number(*n)),
            Expr::StringLit(s) => Ok(Value::Str(s.clone())),
            Expr::Bool(b) => Ok(Value::Bool(*b)),
            Expr::Null => Ok(Value::Null),
            Expr::Ident(name) => {
                env_get(env, name).ok_or_else(|| format!("undefined variable '{}'", name))
            }
            Expr::Neg(inner) => {
                let v = self.eval_expr(inner, env)?;
                match v {
                    Value::Number(n) => Ok(Value::Number(-n)),
                    other => Err(format!("cannot negate {}", other.display())),
                }
            }
            Expr::Not(inner) => {
                let v = self.eval_expr(inner, env)?;
                Ok(Value::Bool(!v.is_truthy()))
            }
            Expr::Assign(name, value_expr) => {
                let value = self.eval_expr(value_expr, env)?;
                env_assign(env, name, value.clone())?;
                Ok(value)
            }
            Expr::ArrayLit(elements) => {
                let mut values = Vec::with_capacity(elements.len());
                for e in elements {
                    values.push(self.eval_expr(e, env)?);
                }
                Ok(Value::Array(Rc::new(RefCell::new(values))))
            }
            Expr::Index(object, index) => {
                let obj = self.eval_expr(object, env)?;
                let idx = self.eval_expr(index, env)?;
                let arr = expect_array(&obj)?;
                let i = expect_index(&idx, arr.borrow().len())?;
                let value = arr.borrow()[i].clone();
                Ok(value)
            }
            Expr::IndexAssign(object, index, value_expr) => {
                let obj = self.eval_expr(object, env)?;
                let idx = self.eval_expr(index, env)?;
                let value = self.eval_expr(value_expr, env)?;
                let arr = expect_array(&obj)?;
                let i = expect_index(&idx, arr.borrow().len())?;
                arr.borrow_mut()[i] = value.clone();
                Ok(value)
            }
            // Short-circuit: the right operand is only evaluated when the
            // left doesn't already decide the result, so any side effect
            // in it (a call, an assignment) genuinely doesn't run - not
            // just "returns the right answer regardless," an observable
            // difference for real programs, not just an optimization.
            Expr::Binary(BinOp::And, left, right) => {
                let l = self.eval_expr(left, env)?;
                if !l.is_truthy() {
                    return Ok(Value::Bool(false));
                }
                let r = self.eval_expr(right, env)?;
                Ok(Value::Bool(r.is_truthy()))
            }
            Expr::Binary(BinOp::Or, left, right) => {
                let l = self.eval_expr(left, env)?;
                if l.is_truthy() {
                    return Ok(Value::Bool(true));
                }
                let r = self.eval_expr(right, env)?;
                Ok(Value::Bool(r.is_truthy()))
            }
            Expr::Binary(op, left, right) => {
                let l = self.eval_expr(left, env)?;
                let r = self.eval_expr(right, env)?;
                self.eval_binary(op, l, r)
            }
            Expr::Call(callee, arg_exprs) => {
                if let Expr::Ident(name) = callee.as_ref() {
                    if is_host_fs_builtin(name)
                        || is_host_process_builtin(name)
                        || is_host_channel_builtin(name)
                        || is_host_db_builtin(name)
                        || is_host_python_builtin(name)
                        || is_host_rust_builtin(name)
                        || is_host_js_builtin(name)
                        || is_host_cache_builtin(name)
                        || is_host_ai_builtin(name)
                        || is_host_command_builtin(name)
                        || is_agent_builtin(name)
                        || is_builtin(name)
                    {
                        let mut args = Vec::with_capacity(arg_exprs.len());
                        for a in arg_exprs {
                            args.push(self.eval_expr(a, env)?);
                        }
                        return self.dispatch_builtin(name, &args);
                    }
                }
                let callee_val = self.eval_expr(callee, env)?;
                let mut args = Vec::with_capacity(arg_exprs.len());
                for a in arg_exprs {
                    args.push(self.eval_expr(a, env)?);
                }
                self.call(callee_val, args)
            }
        }
    }

    /// Single dispatch point for every kind of builtin (real host
    /// filesystem, real host process manager, or the plain
    /// string/array ones with no host dependency) - one place, called
    /// once args are already evaluated, rather than three separate
    /// call sites each re-deciding which category `name` falls into.
    fn dispatch_builtin(&mut self, name: &str, args: &[Value]) -> EvalResult<Value> {
        if is_host_fs_builtin(name) {
            return self.call_host_fs_builtin(name, args);
        }
        if is_host_process_builtin(name) {
            return self.call_host_process_builtin(name, args);
        }
        if is_host_channel_builtin(name) {
            return self.call_host_channel_builtin(name, args);
        }
        if is_host_db_builtin(name) {
            return self.call_host_db_builtin(name, args);
        }
        if is_host_python_builtin(name) {
            return self.call_host_python_builtin(name, args);
        }
        if is_host_rust_builtin(name) {
            return self.call_host_rust_builtin(name, args);
        }
        if is_host_js_builtin(name) {
            return self.call_host_js_builtin(name, args);
        }
        if is_host_cache_builtin(name) {
            return self.call_host_cache_builtin(name, args);
        }
        if is_host_ai_builtin(name) {
            return self.call_host_ai_builtin(name, args);
        }
        if is_host_command_builtin(name) {
            return self.call_host_command_builtin(name, args);
        }
        if is_agent_builtin(name) {
            return self.call_agent_builtin(name, args);
        }
        call_builtin(name, args)
    }

    fn call_host_fs_builtin(&mut self, name: &str, args: &[Value]) -> EvalResult<Value> {
        let host = self.host_fs.clone().ok_or_else(|| {
            format!(
                "'{}' needs a host filesystem, which isn't available here \
                 (no disk mounted, or running somewhere with no real filesystem at all)",
                name
            )
        })?;
        match name {
            "ओएस_लेख्नुहोस्" => {
                let path = expect_string(name, args, 0)?;
                let contents = expect_string(name, args, 1)?;
                host.write_file(&path, &contents)?;
                Ok(Value::Null)
            }
            "ओएस_पढ्नुहोस्" => {
                let path = expect_string(name, args, 0)?;
                let contents = host.read_file(&path)?;
                Ok(Value::Str(contents))
            }
            "ओएस_सूची" => {
                let path = expect_string(name, args, 0)?;
                let entries = host.list_dir(&path)?;
                let values: Vec<Value> = entries.into_iter().map(Value::Str).collect();
                Ok(Value::Array(Rc::new(RefCell::new(values))))
            }
            _ => unreachable!("is_host_fs_builtin only admits the three names handled above"),
        }
    }

    fn call_host_process_builtin(&mut self, name: &str, args: &[Value]) -> EvalResult<Value> {
        let host = self.host_process.clone().ok_or_else(|| {
            format!(
                "'{}' needs a host process manager, which isn't available here \
                 (running somewhere with no real process scheduler at all)",
                name
            )
        })?;
        match name {
            "नयाँ_प्रक्रिया" => {
                let proc_name = expect_string(name, args, 0)?;
                let pid = host.spawn(&proc_name)?;
                Ok(Value::Number(pid))
            }
            "प्रक्रिया_सूची" => {
                let names = host.list()?;
                let values: Vec<Value> = names.into_iter().map(Value::Str).collect();
                Ok(Value::Array(Rc::new(RefCell::new(values))))
            }
            _ => unreachable!("is_host_process_builtin only admits the two names handled above"),
        }
    }

    fn call_host_channel_builtin(&mut self, name: &str, args: &[Value]) -> EvalResult<Value> {
        let host = self.host_channel.clone().ok_or_else(|| {
            format!(
                "'{}' needs a host channel manager, which isn't available here \
                 (running somewhere with no real channel mechanism at all)",
                name
            )
        })?;
        match name {
            "नयाँ_च्यानल" => {
                let id = host.create()?;
                Ok(Value::Number(id))
            }
            "च्यानल_पठाउनुहोस्" => {
                let id = expect_number(name, args, 0)?;
                let msg = expect_string(name, args, 1)?;
                host.send(id, &msg)?;
                Ok(Value::Null)
            }
            "च्यानल_पाउनुहोस्" => {
                let id = expect_number(name, args, 0)?;
                match host.recv(id)? {
                    Some(msg) => Ok(Value::Str(msg)),
                    None => Ok(Value::Null),
                }
            }
            _ => unreachable!("is_host_channel_builtin only admits the three names handled above"),
        }
    }

    fn call_host_db_builtin(&mut self, name: &str, args: &[Value]) -> EvalResult<Value> {
        let host = self.host_db.clone().ok_or_else(|| {
            format!(
                "'{}' needs a host database, which isn't available here \
                 (running somewhere with no real database connection at all)",
                name
            )
        })?;
        match name {
            "डाटाबेस_चलाउनुहोस्" => {
                let sql = expect_string(name, args, 0)?;
                let affected = host.execute(&sql)?;
                Ok(Value::Number(affected))
            }
            "डाटाबेस_सोध्नुहोस्" => {
                let sql = expect_string(name, args, 0)?;
                let rows = host.query(&sql)?;
                Ok(Value::Array(Rc::new(RefCell::new(rows))))
            }
            _ => unreachable!("is_host_db_builtin only admits the two names handled above"),
        }
    }

    fn call_host_python_builtin(&mut self, name: &str, args: &[Value]) -> EvalResult<Value> {
        let host = self.host_python.clone().ok_or_else(|| {
            format!(
                "'{}' needs an embedded Python, which isn't available here \
                 (running somewhere with no real Python interpreter linked in)",
                name
            )
        })?;
        match name {
            "पाइथन_चलाउनुहोस्" => {
                let code = expect_string(name, args, 0)?;
                host.eval(&code)
            }
            _ => unreachable!("is_host_python_builtin only admits the one name handled above"),
        }
    }

    fn call_host_rust_builtin(&mut self, name: &str, args: &[Value]) -> EvalResult<Value> {
        let host = self.host_rust.clone().ok_or_else(|| {
            format!(
                "'{}' needs a real native-plugin loader, which isn't available here",
                name
            )
        })?;
        match name {
            // Two names, one real mechanism: a `go build
            // -buildmode=c-shared` binary satisfying the exact same
            // nepali-plugin-abi contract as a real Rust cdylib loads and
            // runs through this same dlopen call - verified live with
            // `crates/nepali-example-plugin` (Rust) and
            // `plugins/go-example` (Go) side by side, see CLAUDE.md.
            // गो_चलाउनुहोस् exists for real Go-code UX, not as a second
            // implementation pretending to be separate.
            "रस्ट_चलाउनुहोस्" | "गो_चलाउनुहोस्" => {
                let lib_path = expect_string(name, args, 0)?;
                let fn_name = expect_string(name, args, 1)?;
                // Safe: expect_string above already errored out if
                // args.len() < 2, so this slice is always in bounds.
                host.call(&lib_path, &fn_name, &args[2..])
            }
            _ => unreachable!("is_host_rust_builtin only admits the two names handled above"),
        }
    }

    fn call_host_js_builtin(&mut self, name: &str, args: &[Value]) -> EvalResult<Value> {
        let host = self.host_js.clone().ok_or_else(|| {
            format!(
                "'{}' needs an embedded JS/TS engine, which isn't available here",
                name
            )
        })?;
        match name {
            "जेएस_चलाउनुहोस्" => {
                let code = expect_string(name, args, 0)?;
                host.eval(&code)
            }
            "टिएस_चलाउनुहोस्" => {
                let code = expect_string(name, args, 0)?;
                host.eval_ts(&code)
            }
            _ => unreachable!("is_host_js_builtin only admits the two names handled above"),
        }
    }

    fn call_host_cache_builtin(&mut self, name: &str, args: &[Value]) -> EvalResult<Value> {
        let host = self.host_cache.clone().ok_or_else(|| {
            format!(
                "'{}' needs a real cache server, which isn't available here \
                 (no redis-server connection)",
                name
            )
        })?;
        match name {
            "क्यास_राख्नुहोस्" => {
                let key = expect_string(name, args, 0)?;
                let value = expect_string(name, args, 1)?;
                let ttl = if args.len() > 2 { expect_number(name, args, 2)? } else { 0.0 };
                host.set(&key, &value, ttl.max(0.0) as u64)?;
                Ok(Value::Null)
            }
            "क्यास_ल्याउनुहोस्" => {
                let key = expect_string(name, args, 0)?;
                match host.get(&key)? {
                    Some(v) => Ok(Value::Str(v)),
                    None => Ok(Value::Null),
                }
            }
            "क्यास_हटाउनुहोस्" => {
                let key = expect_string(name, args, 0)?;
                host.delete(&key)?;
                Ok(Value::Null)
            }
            _ => unreachable!("is_host_cache_builtin only admits the three names handled above"),
        }
    }

    fn call_host_ai_builtin(&mut self, name: &str, args: &[Value]) -> EvalResult<Value> {
        let host = self.host_ai.clone().ok_or_else(|| {
            format!(
                "'{}' needs a real local AI backend, which isn't available here \
                 (no model loaded)",
                name
            )
        })?;
        match name {
            "एआई_सोध्नुहोस्" => {
                let prompt = expect_string(name, args, 0)?;
                let response = host.ask(&prompt)?;
                Ok(Value::Str(cut_repeated_sentences(&cut_repetition(&response))))
            }
            "सहायक_सोध्नुहोस्" => {
                let prompt = expect_string(name, args, 0)?;
                let system = crate::grounding::assistant_system_prompt(&prompt, &self.system_snapshot());
                Ok(Value::Str(host.ask_with_system(&system, &prompt)?))
            }
            "एआई_सुन्नुहोस्" => {
                let audio_path = expect_string(name, args, 0)?;
                let text = host.listen(&audio_path)?;
                Ok(Value::Str(text))
            }
            "एआई_बोल्नुहोस्" => {
                let text = expect_string(name, args, 0)?;
                let out_path = host.speak(&text)?;
                Ok(Value::Str(out_path))
            }
            _ => unreachable!("is_host_ai_builtin only admits the three names handled above"),
        }
    }

    fn call_host_command_builtin(&mut self, name: &str, args: &[Value]) -> EvalResult<Value> {
        let host = self.host_command.clone().ok_or_else(|| {
            format!(
                "'{}' needs a real command runner, which isn't available here",
                name
            )
        })?;
        match name {
            "आदेश_चलाउनुहोस्" => {
                let program = expect_string(name, args, 0)?;
                let cmd_args = if args.len() > 1 {
                    let arr = expect_array(&args[1])?;
                    let arr = arr.borrow();
                    let mut out = Vec::with_capacity(arr.len());
                    for v in arr.iter() {
                        match v {
                            Value::Str(s) => out.push(s.clone()),
                            other => {
                                return Err(format!(
                                    "'{}' expects an array of strings as argument 2, got {}",
                                    name,
                                    other.display()
                                ))
                            }
                        }
                    }
                    out
                } else {
                    Vec::new()
                };
                let (exit_code, stdout, stderr) = host.run(&program, &cmd_args)?;
                let result = alloc::vec![
                    Value::Number(exit_code as f64),
                    Value::Str(stdout),
                    Value::Str(stderr),
                ];
                Ok(Value::Array(Rc::new(RefCell::new(result))))
            }
            _ => unreachable!("is_host_command_builtin only admits the one name handled above"),
        }
    }

    fn call_agent_builtin(&mut self, name: &str, args: &[Value]) -> EvalResult<Value> {
        match name {
            "एजेन्ट_चलाउनुहोस्" => {
                let goal = expect_string(name, args, 0)?;
                let max_steps = if args.len() > 1 {
                    expect_number(name, args, 1)?.max(1.0) as usize
                } else {
                    6
                };
                let answer = self.run_agent(&goal, max_steps)?;
                Ok(Value::Str(answer))
            }
            _ => unreachable!("is_agent_builtin only admits the one name handled above"),
        }
    }

    /// A real, if simple, tool-using agent loop for `एजेन्ट_चलाउनुहोस्`:
    /// the AI proposes one real action per turn from a small fixed
    /// toolset (read/write/list a file, run a real command), this
    /// interpreter actually executes it through the exact same `Host*`
    /// implementations every other builtin uses, and the real result is
    /// fed back for the next turn - not a simulated conversation, a real
    /// loop that really touches the filesystem and really runs
    /// commands. Deliberately a tiny, explicit line-based protocol
    /// (`कार्य: name(args)` / `अन्तिम: answer`) instead of JSON
    /// tool-calling: no JSON parser exists in this `no_std`+`alloc`
    /// crate, and a plain-text protocol is also more forgiving of a
    /// small model's imperfect formatting, which matters given how weak
    /// small open models' structured-output reliability still is (see
    /// CLAUDE.md's `एआई_सोध्नुहोस्` findings).
    fn run_agent(&mut self, goal: &str, max_steps: usize) -> EvalResult<String> {
        let host_ai = self.host_ai.clone().ok_or_else(|| {
            "एजेन्ट_चलाउनुहोस् needs a real local AI backend, which isn't available here"
                .to_string()
        })?;

        let remembered = self.load_agent_memory();
        let memory_context = if remembered.is_empty() {
            String::new()
        } else {
            let mut s = String::from("Known facts remembered from previous sessions:\n");
            for (k, v) in &remembered {
                s.push_str(&format!("- {k}: {v}\n"));
            }
            s.push('\n');
            s
        };

        let os_facts = crate::grounding::os_facts();
        let language = if crate::grounding::looks_like_code_task(goal) {
            crate::grounding::language_guide_for(goal, 2)
        } else {
            String::new()
        };
        let snapshot = self.system_snapshot();

        let mut transcript = format!(
            "You are the OS agent of Nepali OS, which is built around the Nepali \
             programming language. Respond with EXACTLY one line, one of:\n\
             कार्य: TOOL(args)\n\
             अन्तिम: your final answer\n\n\
             {os_facts}\n{language}\n{snapshot}\n\
             {memory_context}\
             Available tools:\n\
             - फाइल_पढ्नुहोस्(path) - reads a real file\n\
             - फाइल_लेख्नुहोस्(path, contents) - writes a real file\n\
             - सूची(path) - lists a real directory\n\
             - आदेश(program, arg1, arg2, ...) - runs a real command, returns its exit code and output\n\
             - प्रक्रिया_सूची() - lists real running processes on this OS\n\
             - डिस्क_ठाउँ() - real disk space usage on this OS\n\
             - प्रणाली_जानकारी() - real OS/kernel identification (uname -a)\n\
             - सम्झना_राख्नुहोस्(key, value) - persists a fact for future agent runs (survives across separate एजेन्ट्_चलाउनुहोस् calls, even after restart)\n\
             - सम्झना_ल्याउनुहोस्(key) - recalls a previously remembered fact\n\
             - कोड_चलाउनुहोस्(code) - runs a short program in the Nepali language in a safe sandbox (no files/commands) \
             and returns what it printed or the error; write it on ONE line, statements separated by ; \
             - use it to compute things or to check code you plan to show\n\n\
             Some actions (deleting files, wiping disks, killing \
             processes, shutting the system down, force-overwriting git \
             history, writing into system directories) are permanently \
             blocked for safety and will never run, no matter how you \
             phrase them. If a नतिजा: line says a कार्य was blocked, \
             do not retry it or a similar one - explain plainly in your \
             अन्तिम: answer that the action was refused and why.\n\n\
             Example:\n\
             Goal: read /tmp/x.txt and tell me what it says\n\
             कार्य: फाइल_पढ्नुहोस्(/tmp/x.txt)\n\
             नतिजा: hello world\n\
             अन्तिम: The file says \"hello world\".\n\n\
             Now the real task.\n\
             Goal: {goal}\n\n\
             Respond with exactly one line, starting with either कार्य: or अन्तिम: - nothing else.\n"
        );

        let mut last_action: Option<String> = None;

        for step in 0..max_steps {
            let response = host_ai.ask_with_system(
                "You are a careful tool-using agent. Follow the response format exactly.",
                &transcript,
            )?;
            let line: String = response
                .lines()
                .find(|l| !l.trim().is_empty())
                .unwrap_or("")
                .trim()
                .to_string();

            if let Some(answer) = line.strip_prefix("अन्तिम:") {
                return Ok(answer.trim().to_string());
            }

            let Some(action) = line.strip_prefix("कार्य:") else {
                // The model's own malformed line is still appended below -
                // without it, the transcript loses the record of what the
                // assistant just said, and it loses track of turn
                // structure (a real bug found and fixed: an agent that
                // forgets its own last turn just re-completes the last
                // pattern it can see instead of moving forward).
                transcript.push_str(&format!(
                    "\n{line}\n\nत्रुटि: अपेक्षित 'कार्य:' वा 'अन्तिम:' बाट सुरु हुने लाइन। \
                     पुन: प्रयास गर्नुहोस्:\n"
                ));
                continue;
            };
            let action = action.trim();

            // A real, honest safeguard for a real, observed small-model
            // failure mode: a weak model can get stuck re-proposing the
            // identical action forever instead of ever switching to
            // अन्तिम: once it already has the answer (see CLAUDE.md -
            // reproduced live with the same small Qwen2.5-0.5B checkpoint
            // used to verify एआई_सोध्नुहोस्). Rather than burn the rest
            // of `max_steps` re-running (and re-asking about) a call
            // already known, stop with the real result already in hand -
            // graceful degradation, not a second AI call pretending to
            // "decide" this is the end.
            if last_action.as_deref() == Some(action) {
                let result = self.execute_agent_action(action);
                return Ok(format!(
                    "(दोहोरिएको कार्य पत्ता लाग्यो, यसैले रोकियो; अन्तिम नतिजा: {result})"
                ));
            }
            last_action = Some(action.to_string());

            let result = self.execute_agent_action(action);
            let is_last = step == max_steps - 1;
            if is_last {
                return Ok(format!(
                    "(अधिकतम चरण पुग्यो, अन्तिम जवाफ बिना; अन्तिम नतिजा: {result})"
                ));
            }
            transcript.push_str(&format!(
                "\n{line}\nनतिजा: {result}\n\nअर्को कार्य वा अन्तिम जवाफ दिनुहोस्:\n"
            ));
        }
        Ok("(कुनै जवाफ आएन)".to_string())
    }

    /// Real, persistent agent memory backed by the same `HostDb`
    /// (SQLite) every other builtin uses - not an in-process cache that
    /// dies with the interpreter. A fact remembered in one
    /// `एजेन्ट्_चलाउनुहोस्` call is genuinely still there in a separate
    /// call, even a separate process invocation, because it's on disk
    /// in the real database file `NEPALI_DB` points at. Table is
    /// created lazily on first real use, same as every other real
    /// schema this project creates on demand rather than assuming a
    /// pre-existing one.
    fn ensure_agent_memory_table(&mut self) {
        if let Some(host) = self.host_db.clone() {
            let _ = host.execute(
                "CREATE TABLE IF NOT EXISTS nepali_agent_memory (key TEXT PRIMARY KEY, value TEXT)",
            );
        }
    }

    fn load_agent_memory(&mut self) -> Vec<(String, String)> {
        self.ensure_agent_memory_table();
        let Some(host) = self.host_db.clone() else {
            return Vec::new();
        };
        let Ok(rows) = host.query("SELECT key, value FROM nepali_agent_memory ORDER BY key") else {
            return Vec::new();
        };
        rows.into_iter()
            .filter_map(|row| match row {
                Value::Array(cols) => {
                    let cols = cols.borrow();
                    match (cols.first(), cols.get(1)) {
                        (Some(Value::Str(k)), Some(Value::Str(v))) => Some((k.clone(), v.clone())),
                        _ => None,
                    }
                }
                _ => None,
            })
            .collect()
    }

    fn remember_fact(&mut self, key: &str, value: &str) -> Result<(), String> {
        self.ensure_agent_memory_table();
        let Some(host) = self.host_db.clone() else {
            return Err("कुनै वास्तविक डाटाबेस उपलब्ध छैन".to_string());
        };
        let k = sql_escape(key);
        let v = sql_escape(value);
        host.execute(&format!(
            "INSERT INTO nepali_agent_memory (key, value) VALUES ('{k}', '{v}') \
             ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        ))?;
        Ok(())
    }

    fn recall_fact(&mut self, key: &str) -> Result<Option<String>, String> {
        self.ensure_agent_memory_table();
        let Some(host) = self.host_db.clone() else {
            return Err("कुनै वास्तविक डाटाबेस उपलब्ध छैन".to_string());
        };
        let k = sql_escape(key);
        let rows = host.query(&format!(
            "SELECT value FROM nepali_agent_memory WHERE key = '{k}'"
        ))?;
        Ok(rows.into_iter().find_map(|row| match row {
            Value::Array(cols) => match cols.borrow().first() {
                Some(Value::Str(v)) => Some(v.clone()),
                _ => None,
            },
            _ => None,
        }))
    }

    /// One grounded question to the local AI (same as the
    /// `सहायक_सोध्नुहोस्` builtin) - the shell's `? ...` command.
    pub fn ask_assistant(&mut self, question: &str) -> Result<String, String> {
        match self.call_host_ai_builtin("सहायक_सोध्नुहोस्", &[Value::Str(question.to_string())])? {
            Value::Str(s) => Ok(cut_repetition(&s)),
            other => Ok(other.display()),
        }
    }

    /// Runs the AI agent on a goal (same as `एजेन्ट_चलाउनुहोस्`) - the
    /// shell's `गर्नुहोस् ...` command.
    pub fn run_agent_goal(&mut self, goal: &str, max_steps: usize) -> Result<String, String> {
        self.run_agent(goal, max_steps)
    }

    /// A few real facts about the machine this is running on, read now
    /// through `HostCommand` (kernel, hostname, root disk). Empty if no
    /// command backend is attached.
    pub fn system_snapshot(&self) -> String {
        let Some(cmd) = self.host_command.clone() else {
            return String::new();
        };
        let run = |prog: &str, args: &[&str]| -> Option<String> {
            let args: Vec<String> = args.iter().map(|a| a.to_string()).collect();
            match cmd.run(prog, &args) {
                Ok((0, out, _)) => Some(out),
                _ => None,
            }
        };
        let mut s = String::from("LIVE SYSTEM STATE (measured just now):\n");
        if let Some(o) = run("hostname", &[]) {
            s.push_str(&format!("- hostname: {}\n", o.trim()));
        }
        if let Some(o) = run("uname", &["-srm"]) {
            s.push_str(&format!("- kernel: {}\n", o.trim()));
        }
        if let Some(o) = run("df", &["-h", "/"]) {
            if let Some(l) = o.lines().last() {
                let l: Vec<&str> = l.split_whitespace().collect();
                s.push_str(&format!("- root disk: {}\n", l.join(" ")));
            }
        }
        s
    }

    /// Runs Nepali-language code an AI wrote, in a fresh interpreter with
    /// NO host access (no files, commands, network) and hard step/depth
    /// limits - it can compute and print, nothing else, so it cannot
    /// bypass the agent's destructive-action guardrails.
    fn run_sandboxed_code(&self, code: &str) -> String {
        let mut parser = crate::parser::Parser::new(code);
        let program = match parser.parse_program() {
            Ok(p) => p,
            Err(e) => return format!("त्रुटि (वाक्य रचना): {e}"),
        };
        if let Err(errs) = crate::resolver::Resolver::resolve(&program) {
            return format!("त्रुटि (विश्लेषण): {}", errs.join("; "));
        }
        let mut interp = Interpreter::new();
        interp.set_limits(100_000, 64);
        let outcome = interp.run(&program);
        let mut out = interp.output.join("\n");
        if out.chars().count() > 600 {
            out = out.chars().take(600).collect::<String>() + "...";
        }
        match outcome {
            Ok(()) if out.is_empty() => "(कार्यक्रम चल्यो, केही छापिएन)".to_string(),
            Ok(()) => out,
            Err(e) => format!("त्रुटि (चलाउँदा): {e}\nअहिलेसम्मको आउटपुट: {out}"),
        }
    }

    /// Parses `name(arg1, arg2, ...)` and dispatches to the one real
    /// tool it names, via the exact same `Host*` implementations every
    /// other builtin uses - not a second, separate implementation of
    /// file/command access. Never propagates an `Err` to its caller: any
    /// failure (unknown tool, bad syntax, a real filesystem/command
    /// error) becomes a real error *string* fed back into the
    /// transcript, so the model gets a chance to recover instead of the
    /// whole agent run aborting on one bad step.
    fn execute_agent_action(&mut self, action: &str) -> String {
        let Some(open) = action.find('(') else {
            return format!("त्रुटि: '{action}' मा '(' फेला परेन");
        };
        let Some(close) = action.rfind(')') else {
            return format!("त्रुटि: '{action}' मा ')' फेला परेन");
        };
        if close < open {
            return format!("त्रुटि: '{action}' मा कोष्ठक मिलेन");
        }
        let tool = action[..open].trim();
        let args_str = &action[open + 1..close];
        let raw_args: Vec<String> = if args_str.trim().is_empty() {
            Vec::new()
        } else {
            args_str
                .split(',')
                .map(|a| a.trim().trim_matches('"').trim_matches('\'').to_string())
                .collect()
        };

        match tool {
            "फाइल_पढ्नुहोस्" => {
                let Some(host) = self.host_fs.clone() else {
                    return "त्रुटि: कुनै वास्तविक फाइलसिस्टम उपलब्ध छैन".to_string();
                };
                let Some(path) = raw_args.first() else {
                    return "त्रुटि: फाइल_पढ्नुहोस् लाई path चाहिन्छ".to_string();
                };
                match host.read_file(path) {
                    Ok(contents) => contents,
                    Err(e) => format!("त्रुटि: {e}"),
                }
            }
            "फाइल_लेख्नुहोस्" => {
                let Some(host) = self.host_fs.clone() else {
                    return "त्रुटि: कुनै वास्तविक फाइलसिस्टम उपलब्ध छैन".to_string();
                };
                if raw_args.len() < 2 {
                    return "त्रुटि: फाइल_लेख्नुहोस् लाई path र contents चाहिन्छ".to_string();
                }
                if let Some(reason) = system_path_write_reason(&raw_args[0]) {
                    return format!(
                        "रोकियो (सुरक्षा): फाइल_लेख्नुहोस्('{}', ...) चलाइएन। {reason} \
                         यो कार्य असुरक्षित भएकाले स्वतः इन्कार गरियो - कुनै \
                         पुष्टिकरणले पनि यसलाई पास गर्दैन।",
                        raw_args[0]
                    );
                }
                match host.write_file(&raw_args[0], &raw_args[1]) {
                    Ok(()) => "ठिक छ".to_string(),
                    Err(e) => format!("त्रुटि: {e}"),
                }
            }
            "सूची" => {
                let Some(host) = self.host_fs.clone() else {
                    return "त्रुटि: कुनै वास्तविक फाइलसिस्टम उपलब्ध छैन".to_string();
                };
                let Some(path) = raw_args.first() else {
                    return "त्रुटि: सूची लाई path चाहिन्छ".to_string();
                };
                match host.list_dir(path) {
                    Ok(entries) => entries.join(", "),
                    Err(e) => format!("त्रुटि: {e}"),
                }
            }
            "आदेश" => {
                let Some(host) = self.host_command.clone() else {
                    return "त्रुटि: कुनै वास्तविक आदेश-चालक उपलब्ध छैन".to_string();
                };
                let Some(program) = raw_args.first() else {
                    return "त्रुटि: आदेश लाई program चाहिन्छ".to_string();
                };
                // A stray trailing comma from the model (`आदेश(whoami, )`) must
                // not become an empty argument that makes the command fail.
                let cmd_args: Vec<String> =
                    raw_args[1..].iter().filter(|a| !a.is_empty()).cloned().collect();
                if let Some(reason) = destructive_command_reason(program, &cmd_args) {
                    return format!(
                        "रोकियो (सुरक्षा): आदेश('{program}', ...) चलाइएन। {reason} \
                         यो कार्य असुरक्षित भएकाले स्वतः इन्कार गरियो - कुनै \
                         पुष्टिकरणले पनि यसलाई पास गर्दैन। लक्ष्य पूरा गर्न सुरक्षित \
                         वैकल्पिक तरिका खोज्नुहोस् वा प्रयोगकर्तालाई सोध्नुहोस्।"
                    );
                }
                match host.run(program, &cmd_args) {
                    Ok((code, stdout, stderr)) => {
                        format!("exit={code}\nstdout: {stdout}\nstderr: {stderr}")
                    }
                    Err(e) => format!("त्रुटि: {e}"),
                }
            }
            // Real OS-state awareness: named, discoverable tools rather
            // than relying on the model to already know which raw shell
            // command answers "what's running"/"how much disk is left"/
            // "what OS is this" - each is a real `HostCommand::run` call
            // under the hood (the exact same mechanism `आदेश` uses), not
            // a separate, second way of running commands.
            "प्रक्रिया_सूची" => {
                let Some(host) = self.host_command.clone() else {
                    return "त्रुटि: कुनै वास्तविक आदेश-चालक उपलब्ध छैन".to_string();
                };
                match host.run("ps", &["aux".to_string()]) {
                    Ok((code, stdout, stderr)) => {
                        format!("exit={code}\n{stdout}{stderr}")
                    }
                    Err(e) => format!("त्रुटि: {e}"),
                }
            }
            "डिस्क_ठाउँ" => {
                let Some(host) = self.host_command.clone() else {
                    return "त्रुटि: कुनै वास्तविक आदेश-चालक उपलब्ध छैन".to_string();
                };
                match host.run("df", &["-h".to_string()]) {
                    Ok((code, stdout, stderr)) => {
                        format!("exit={code}\n{stdout}{stderr}")
                    }
                    Err(e) => format!("त्रुटि: {e}"),
                }
            }
            "प्रणाली_जानकारी" => {
                let Some(host) = self.host_command.clone() else {
                    return "त्रुटि: कुनै वास्तविक आदेश-चालक उपलब्ध छैन".to_string();
                };
                match host.run("uname", &["-a".to_string()]) {
                    Ok((code, stdout, stderr)) => {
                        format!("exit={code}\n{stdout}{stderr}")
                    }
                    Err(e) => format!("त्रुटि: {e}"),
                }
            }
            "सम्झना_राख्नुहोस्" => {
                let Some(key) = raw_args.first() else {
                    return "त्रुटि: सम्झना_राख्नुहोस् लाई key चाहिन्छ".to_string();
                };
                let value = raw_args.get(1).map(|s| s.as_str()).unwrap_or("");
                match self.remember_fact(key, value) {
                    Ok(()) => "याद राखियो".to_string(),
                    Err(e) => format!("त्रुटि: {e}"),
                }
            }
            "सम्झना_ल्याउनुहोस्" => {
                let Some(key) = raw_args.first() else {
                    return "त्रुटि: सम्झना_ल्याउनुहोस् लाई key चाहिन्छ".to_string();
                };
                match self.recall_fact(key) {
                    Ok(Some(value)) => value,
                    Ok(None) => "(केही याद छैन)".to_string(),
                    Err(e) => format!("त्रुटि: {e}"),
                }
            }
            "कोड_चलाउनुहोस्" => {
                let code = args_str
                    .trim()
                    .trim_matches('"')
                    .trim_matches('\'')
                    .replace("\\n", "\n");
                self.run_sandboxed_code(&code)
            }
            other => format!("त्रुटि: अज्ञात औजार '{other}'"),
        }
    }

    fn call(&mut self, callee: Value, args: Vec<Value>) -> EvalResult<Value> {
        let func = match callee {
            Value::Function(f) => f,
            other => return Err(format!("'{}' is not callable", other.display())),
        };
        if args.len() != func.params.len() {
            return Err(format!(
                "function '{}' expects {} argument(s), got {}",
                func.name,
                func.params.len(),
                args.len()
            ));
        }
        let call_scope = new_scope(Some(func.closure.clone()));
        for (param, arg) in func.params.iter().zip(args.into_iter()) {
            env_define(&call_scope, param.clone(), arg);
        }
        if let Some(max) = self.max_call_depth {
            if self.call_depth >= max {
                return Err(format!("कल गहिराइ सीमा ({max}) नाघ्यो (अनन्त पुनरावृत्ति?)"));
            }
        }
        self.call_depth += 1;
        let result = self.exec_block(&func.body, &call_scope);
        self.call_depth -= 1;
        match result? {
            Signal::Return(v) => Ok(v),
            Signal::Normal => Ok(Value::Null),
        }
    }

    fn eval_binary(&self, op: &BinOp, l: Value, r: Value) -> EvalResult<Value> {
        use BinOp::*;
        match op {
            Add => match (&l, &r) {
                (Value::Number(a), Value::Number(b)) => Ok(Value::Number(a + b)),
                _ => Ok(Value::Str(format!("{}{}", l.display(), r.display()))),
            },
            Sub | Mul | Div | Mod => {
                let (a, b) = match (&l, &r) {
                    (Value::Number(a), Value::Number(b)) => (*a, *b),
                    _ => {
                        return Err(format!(
                            "arithmetic on non-numbers: {} and {}",
                            l.display(),
                            r.display()
                        ))
                    }
                };
                match op {
                    Sub => Ok(Value::Number(a - b)),
                    Mul => Ok(Value::Number(a * b)),
                    Div => Ok(Value::Number(a / b)),
                    Mod => Ok(Value::Number(a % b)),
                    _ => unreachable!(),
                }
            }
            Eq => Ok(Value::Bool(values_equal(&l, &r))),
            NotEq => Ok(Value::Bool(!values_equal(&l, &r))),
            Lt | Gt | Lte | Gte => {
                let (a, b) = match (&l, &r) {
                    (Value::Number(a), Value::Number(b)) => (*a, *b),
                    _ => {
                        return Err(format!(
                            "comparison on non-numbers: {} and {}",
                            l.display(),
                            r.display()
                        ))
                    }
                };
                let result = match op {
                    Lt => a < b,
                    Gt => a > b,
                    Lte => a <= b,
                    Gte => a >= b,
                    _ => unreachable!(),
                };
                Ok(Value::Bool(result))
            }
            And | Or => unreachable!(
                "Expr::Binary(And|Or, ..) is intercepted in eval_expr for short-circuiting \
                 before it ever reaches eval_binary"
            ),
        }
    }
}

impl Default for Interpreter {
    fn default() -> Self {
        Self::new()
    }
}

/// Real, hard preventive guardrails for `एजेन्ट_चलाउनुहोस्`'s `आदेश`
/// tool - not advisory, not a "confirm to proceed" prompt (there is no
/// live human to confirm to inside an autonomous agent run), a real
/// refusal that never reaches `HostCommand::run` at all. Matches the
/// same principle this assistant itself operates under: genuinely
/// destructive/irreversible actions are never executed on a mere
/// instruction, confirmation included - they're refused outright, with
/// the reason stated plainly so the caller (the model, and whoever
/// reads the agent's transcript) understands exactly what was blocked
/// and why, rather than a silent no-op or an opaque error.
///
/// Deliberately a real, named denylist of genuinely destructive/
/// irreversible operations (delete, wipe, format, shut down, kill,
/// force-overwrite of remote git history) - not an attempt at a
/// complete sandbox (this agent's tools run with the same real Linux
/// permissions the host process itself has, stated as a known,
/// separate gap elsewhere in CLAUDE.md), but a real, meaningful first
/// line of defense against the most obviously harmful commands a
/// small, imperfect model might otherwise be talked into proposing.
/// `HostDb::execute`/`query` take a raw SQL string (no parameterized-
/// query API exists on the trait) - real, standard single-quote
/// doubling so agent-remembered content with a literal `'` in it can't
/// break the query's own syntax.
fn sql_escape(s: &str) -> String {
    s.replace('\'', "''")
}

fn destructive_command_reason(program: &str, args: &[String]) -> Option<String> {
    let prog = program.rsplit('/').next().unwrap_or(program).to_lowercase();
    let args_joined = args.join(" ").to_lowercase();

    let always_blocked = [
        "rm", "rmdir", "dd", "mkfs", "shutdown", "reboot", "halt", "poweroff", "kill", "killall",
        "pkill", "fdisk", "parted", "diskutil", "shred", "wipefs", "unlink",
    ];
    if always_blocked.iter().any(|b| prog == *b || prog.starts_with(&format!("{b}."))) {
        return Some(format!(
            "'{program}' विनाशकारी/अपरिवर्तनीय ठानिन्छ (फाइल/डिस्क मेट्ने, प्रणाली बन्द गर्ने, वा प्रक्रिया मार्ने)।"
        ));
    }
    if prog == "git" && (args_joined.contains("push") && args_joined.contains("--force")
        || args_joined.contains("push") && args_joined.contains("-f ")
        || args_joined.contains("reset --hard")
        || args_joined.contains("clean -f"))
    {
        return Some(
            "यो git आदेशले इतिहास/काम गरेको फाइल स्थायी रूपमा मेटाउन/अधिलेखन गर्न सक्छ।".to_string(),
        );
    }
    if args.iter().any(|a| {
        let a = a.to_lowercase();
        a == "-rf" || a == "-fr" || a == "--force" && (prog == "rm" || prog == "git")
    }) {
        return Some(format!(
            "'{program}' लाई विनाशकारी फ्ल्याग (जस्तै -rf/--force) सहित चलाउन खोजियो।"
        ));
    }
    None
}

/// Real preventive guardrail for `फाइल_लेख्नुहोस्`: writing into the
/// OS's own system directories (where this OS's real binaries,
/// libraries, and boot configuration live) could genuinely break the
/// running system - blocked outright, same "no confirmation would pass
/// this either" principle as `destructive_command_reason`. Writing
/// inside a normal user's own files/home directory - the agent's real,
/// intended working area - is untouched by this check.
fn system_path_write_reason(path: &str) -> Option<String> {
    const SYSTEM_PREFIXES: &[&str] = &[
        "/etc", "/boot", "/usr", "/bin", "/sbin", "/lib", "/lib64", "/sys", "/proc", "/dev",
        "/var/lib", "/root",
    ];
    let normalized = if path.starts_with('/') { path } else { return None };
    if SYSTEM_PREFIXES.iter().any(|p| normalized == *p || normalized.starts_with(&format!("{p}/"))) {
        return Some(format!(
            "'{path}' यस OS को प्रणाली डाइरेक्टरी भित्र पर्छ, जहाँ लेख्नाले वास्तविक प्रणाली बिगार्न सक्छ।"
        ));
    }
    None
}

fn values_equal(l: &Value, r: &Value) -> bool {
    match (l, r) {
        (Value::Number(a), Value::Number(b)) => a == b,
        (Value::Str(a), Value::Str(b)) => a == b,
        (Value::Bool(a), Value::Bool(b)) => a == b,
        (Value::Null, Value::Null) => true,
        (Value::Array(a), Value::Array(b)) => {
            // Structural equality (same length, equal elements pairwise),
            // not reference identity - matches how Str/Number/Bool
            // equality already works here, and is the less surprising
            // default (`[1,2] == [1,2]` reads as true to anyone who
            // hasn't been told this language uses reference semantics for
            // arrays internally).
            let a = a.borrow();
            let b = b.borrow();
            a.len() == b.len() && a.iter().zip(b.iter()).all(|(x, y)| values_equal(x, y))
        }
        _ => false,
    }
}

fn expect_array(v: &Value) -> EvalResult<Rc<RefCell<Vec<Value>>>> {
    match v {
        Value::Array(a) => Ok(a.clone()),
        other => Err(format!("'{}' is not an array", other.display())),
    }
}

fn expect_index(v: &Value, len: usize) -> EvalResult<usize> {
    match v {
        Value::Number(n) => {
            let i = *n as i64;
            // Not a whole number (1.9, NaN, infinity): an error, not a silent
            // truncation that reads the wrong element.
            if i as f64 != *n {
                return Err(format!(
                    "array index must be a whole number, got {}",
                    Value::Number(*n).display()
                ));
            }
            if i < 0 || i as usize >= len {
                Err(format!(
                    "array index {} out of bounds (length {})",
                    i, len
                ))
            } else {
                Ok(i as usize)
            }
        }
        other => Err(format!("array index must be a number, got {}", other.display())),
    }
}

/// A small set of native builtins - not user-declarable functions, and
/// deliberately not going through `env`/closures at all. These exist to
/// unblock real string/character inspection: without them, a `.nep`
/// program has no way to look at individual characters of a string, which
/// makes writing anything like a lexer *in* nepali (roadmap lang step 5,
/// self-hosting) impossible - there was nothing to index into text with.
/// Counted in Unicode scalar values (`char`s), not bytes, so indices work
/// correctly over multi-byte Devanagari text, not just ASCII.
pub const BUILTINS: &[&str] = &[
    "लम्बाइ",
    "अक्षर",
    "संकेत",
    "थप्नुहोस्",
    "ओएस_लेख्नुहोस्",
    "ओएस_पढ्नुहोस्",
    "ओएस_सूची",
    "नयाँ_प्रक्रिया",
    "प्रक्रिया_सूची",
    "नयाँ_च्यानल",
    "च्यानल_पठाउनुहोस्",
    "च्यानल_पाउनुहोस्",
    "डाटाबेस_चलाउनुहोस्",
    "डाटाबेस_सोध्नुहोस्",
    "पाइथन_चलाउनुहोस्",
    "रस्ट_चलाउनुहोस्",
    "गो_चलाउनुहोस्",
    "जेएस_चलाउनुहोस्",
    "टिएस_चलाउनुहोस्",
    "क्यास_राख्नुहोस्",
    "क्यास_ल्याउनुहोस्",
    "क्यास_हटाउनुहोस्",
    "एआई_सोध्नुहोस्",
    "सहायक_सोध्नुहोस्",
    "एआई_सुन्नुहोस्",
    "एआई_बोल्नुहोस्",
    "आदेश_चलाउनुहोस्",
    "एजेन्ट_चलाउनुहोस्",
];

pub fn is_builtin(name: &str) -> bool {
    BUILTINS.contains(&name)
}

fn is_host_fs_builtin(name: &str) -> bool {
    matches!(name, "ओएस_लेख्नुहोस्" | "ओएस_पढ्नुहोस्" | "ओएस_सूची")
}

fn is_host_process_builtin(name: &str) -> bool {
    matches!(name, "नयाँ_प्रक्रिया" | "प्रक्रिया_सूची")
}

fn is_host_channel_builtin(name: &str) -> bool {
    matches!(
        name,
        "नयाँ_च्यानल" | "च्यानल_पठाउनुहोस्" | "च्यानल_पाउनुहोस्"
    )
}

fn is_host_db_builtin(name: &str) -> bool {
    matches!(name, "डाटाबेस_चलाउनुहोस्" | "डाटाबेस_सोध्नुहोस्")
}

fn is_host_python_builtin(name: &str) -> bool {
    matches!(name, "पाइथन_चलाउनुहोस्")
}

fn is_host_rust_builtin(name: &str) -> bool {
    matches!(name, "रस्ट_चलाउनुहोस्" | "गो_चलाउनुहोस्")
}

fn is_host_js_builtin(name: &str) -> bool {
    matches!(name, "जेएस_चलाउनुहोस्" | "टिएस_चलाउनुहोस्")
}

fn is_host_cache_builtin(name: &str) -> bool {
    matches!(name, "क्यास_राख्नुहोस्" | "क्यास_ल्याउनुहोस्" | "क्यास_हटाउनुहोस्")
}

/// Small models often keep going after a complete answer, repeating a
/// block until the token limit. Stops at the first separator line, and at
/// a line that restarts the answer's first line or repeats a long line.
fn cut_repetition(answer: &str) -> String {
    let mut seen: Vec<&str> = Vec::new();
    let mut out: Vec<&str> = Vec::new();
    for line in answer.lines() {
        let l = line.trim();
        if l == "---" {
            break;
        }
        let restarts_block = out.len() >= 2 && seen.first() == Some(&l);
        if restarts_block || (l.chars().count() > 12 && seen.contains(&l)) {
            break;
        }
        if !l.is_empty() {
            seen.push(l);
        }
        out.push(line);
    }
    out.join("\n").trim_end().to_string()
}

/// Cuts an answer at the first sentence (ended by `।`, `.`, `?` or `!`) that repeats an
/// earlier one, so a model stuck in a loop stops after its first pass.
fn cut_repeated_sentences(answer: &str) -> String {
    let mut seen: Vec<&str> = Vec::new();
    let mut end = answer.len();
    let mut start = 0;
    for (i, c) in answer.char_indices() {
        if matches!(c, '।' | '.' | '?' | '!' | '\n') {
            let sent = answer[start..i].trim();
            if sent.chars().count() > 12 && seen.contains(&sent) {
                end = start;
                break;
            }
            if !sent.is_empty() {
                seen.push(sent);
            }
            start = i + c.len_utf8();
        }
    }
    answer[..end].trim_end().to_string()
}

fn is_host_ai_builtin(name: &str) -> bool {
    matches!(
        name,
        "एआई_सोध्नुहोस्" | "सहायक_सोध्नुहोस्" | "एआई_सुन्नुहोस्" | "एआई_बोल्नुहोस्"
    )
}

fn is_host_command_builtin(name: &str) -> bool {
    matches!(name, "आदेश_चलाउनुहोस्")
}

fn is_agent_builtin(name: &str) -> bool {
    matches!(name, "एजेन्ट_चलाउनुहोस्")
}

pub fn call_builtin(name: &str, args: &[Value]) -> EvalResult<Value> {
    match name {
        "लम्बाइ" => match args.first() {
            Some(Value::Str(s)) => Ok(Value::Number(s.chars().count() as f64)),
            Some(Value::Array(a)) => Ok(Value::Number(a.borrow().len() as f64)),
            Some(other) => Err(format!(
                "'{}' expects a string or array, got {}",
                name,
                other.display()
            )),
            None => Err(format!("'{}' expects an argument at position 1", name)),
        },
        "थप्नुहोस्" => {
            let arr = match args.first() {
                Some(Value::Array(a)) => a.clone(),
                Some(other) => {
                    return Err(format!(
                        "'{}' expects an array at argument 1, got {}",
                        name,
                        other.display()
                    ))
                }
                None => return Err(format!("'{}' expects an argument at position 1", name)),
            };
            let value = args
                .get(1)
                .cloned()
                .ok_or_else(|| format!("'{}' expects an argument at position 2", name))?;
            arr.borrow_mut().push(value);
            Ok(Value::Null)
        }
        "अक्षर" => {
            let s = expect_string(name, args, 0)?;
            let i = expect_number(name, args, 1)? as i64;
            if i < 0 {
                return Ok(Value::Str(String::new()));
            }
            match s.chars().nth(i as usize) {
                Some(c) => Ok(Value::Str(c.to_string())),
                None => Ok(Value::Str(String::new())),
            }
        }
        "संकेत" => {
            let s = expect_string(name, args, 0)?;
            let mut chars = s.chars();
            match (chars.next(), chars.next()) {
                (Some(c), None) => Ok(Value::Number(c as u32 as f64)),
                _ => Err(format!(
                    "'{}' expects a single-character string, got \"{}\"",
                    name, s
                )),
            }
        }
        other => Err(format!("unknown builtin '{}'", other)),
    }
}

fn expect_string(fn_name: &str, args: &[Value], idx: usize) -> EvalResult<String> {
    match args.get(idx) {
        Some(Value::Str(s)) => Ok(s.clone()),
        Some(other) => Err(format!(
            "'{}' expects a string at argument {}, got {}",
            fn_name,
            idx + 1,
            other.display()
        )),
        None => Err(format!("'{}' expects an argument at position {}", fn_name, idx + 1)),
    }
}

fn expect_number(fn_name: &str, args: &[Value], idx: usize) -> EvalResult<f64> {
    match args.get(idx) {
        Some(Value::Number(n)) => Ok(*n),
        Some(other) => Err(format!(
            "'{}' expects a number at argument {}, got {}",
            fn_name,
            idx + 1,
            other.display()
        )),
        None => Err(format!("'{}' expects an argument at position {}", fn_name, idx + 1)),
    }
}

#[cfg(test)]
mod agent_safety_tests {
    use super::*;

    #[test]
    fn repetition_is_cut_at_separator_and_at_repeated_lines() {
        assert_eq!(cut_repetition("a b\n---\nsecond"), "a b");
        assert_eq!(
            cut_repetition("राखौँ x = 1।\nभनौँ(x)।\nराखौँ x = 1।\nभनौँ(x)।"),
            "राखौँ x = 1।\nभनौँ(x)।"
        );
        assert_eq!(cut_repetition("भनौँ(1)।\nभनौँ(1)।"), "भनौँ(1)।\nभनौँ(1)।");
    }

    #[test]
    fn sandboxed_code_runs_real_programs() {
        assert_eq!(Interpreter::new().run_sandboxed_code("राखौँ a = 2; भनौँ(a * 21)"), "42");
    }

    #[test]
    fn sandboxed_infinite_loop_is_stopped_not_hung() {
        let r = Interpreter::new().run_sandboxed_code("भएसम्म सहि { राखौँ z = 1। }");
        assert!(r.contains("चरण सीमा"), "{r}");
    }

    #[test]
    fn sandboxed_runaway_recursion_is_stopped_not_a_stack_overflow() {
        let r = Interpreter::new().run_sandboxed_code("काम फ() { पठाउँ फ()। }\nफ()।");
        assert!(r.contains("कल गहिराइ"), "{r}");
    }

    #[test]
    fn sandboxed_code_has_no_host_access_even_if_the_agent_has_it() {
        struct Boom;
        impl HostCommand for Boom {
            fn run(&self, _: &str, _: &[String]) -> Result<(i32, String, String), String> {
                panic!("sandboxed code reached a real command");
            }
        }
        let mut agent = Interpreter::new();
        agent.set_host_command(Rc::new(Boom));
        let r = agent.run_sandboxed_code("आदेश_चलाउनुहोस्(\"echo\", \"hi\")।");
        assert!(r.contains("त्रुटि"), "{r}");
    }

    #[test]
    fn rm_is_always_blocked() {
        assert!(destructive_command_reason("rm", &["-rf".to_string(), "/tmp/x".to_string()]).is_some());
        assert!(destructive_command_reason("rm", &["/tmp/x".to_string()]).is_some());
    }

    #[test]
    fn dd_shutdown_kill_are_blocked() {
        assert!(destructive_command_reason("dd", &["if=/dev/zero".to_string()]).is_some());
        assert!(destructive_command_reason("shutdown", &["-h".to_string(), "now".to_string()]).is_some());
        assert!(destructive_command_reason("kill", &["-9".to_string(), "1".to_string()]).is_some());
        assert!(destructive_command_reason("mkfs.ext4", &["/dev/sda1".to_string()]).is_some());
    }

    #[test]
    fn git_force_push_and_hard_reset_are_blocked() {
        assert!(destructive_command_reason(
            "git",
            &["push".to_string(), "--force".to_string(), "origin".to_string(), "main".to_string()]
        )
        .is_some());
        assert!(destructive_command_reason(
            "git",
            &["reset".to_string(), "--hard".to_string()]
        )
        .is_some());
    }

    #[test]
    fn harmless_commands_are_not_blocked() {
        assert!(destructive_command_reason("echo", &["hello".to_string()]).is_none());
        assert!(destructive_command_reason("ls", &["-la".to_string()]).is_none());
        assert!(destructive_command_reason("git", &["status".to_string()]).is_none());
        assert!(destructive_command_reason("cargo", &["build".to_string()]).is_none());
    }

    #[test]
    fn writes_to_system_directories_are_blocked() {
        assert!(system_path_write_reason("/etc/passwd").is_some());
        assert!(system_path_write_reason("/usr/local/bin/nepali").is_some());
        assert!(system_path_write_reason("/boot/grub/grub.cfg").is_some());
    }

    #[test]
    fn writes_to_normal_paths_are_not_blocked() {
        assert!(system_path_write_reason("/home/nepali/notes.txt").is_none());
        assert!(system_path_write_reason("/tmp/scratch.txt").is_none());
        assert!(system_path_write_reason("relative/path.txt").is_none());
    }
}

#[cfg(test)]
mod repeated_sentence_tests {
    use super::cut_repeated_sentences;

    #[test]
    fn stops_at_the_first_repeated_sentence() {
        let looped = "पहिलो वाक्य यहाँ छ। दोस्रो वाक्य पनि यहाँ छ। पहिलो वाक्य यहाँ छ। दोस्रो वाक्य पनि यहाँ छ।";
        assert_eq!(cut_repeated_sentences(looped), "पहिलो वाक्य यहाँ छ। दोस्रो वाक्य पनि यहाँ छ।");
    }

    #[test]
    fn leaves_normal_text_and_short_repeats_alone() {
        let t = "हो। हो। यो एउटा साधारण उत्तर हो।";
        assert_eq!(cut_repeated_sentences(t), t);
    }
}
