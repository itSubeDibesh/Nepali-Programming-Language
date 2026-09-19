use crate::ast::{BinOp, Expr, Stmt};
use alloc::rc::Rc;
use alloc::string::String;
use alloc::vec::Vec;

/// A flat, linear instruction sequence - the actual point of a bytecode
/// VM: dispatching over `OpCode` values in a loop is a fundamentally
/// different execution model from `interpreter::Interpreter`, which
/// recursively pattern-matches the `Expr`/`Stmt` tree itself on every
/// evaluation. This is scoped deliberately smaller than the tree-walker
/// for now - see the module doc on `VM` for exactly what's missing
/// (closures, real stack-slot locals) and why.
#[derive(Debug, Clone, PartialEq)]
pub enum OpCode {
    ConstNumber(f64),
    ConstString(String),
    ConstBool(bool),
    ConstNull,
    Add,
    Sub,
    Mul,
    Div,
    Mod,
    Neg,
    Eq,
    NotEq,
    Lt,
    Gt,
    Lte,
    Gte,
    Pop,
    /// Real logical negation - pops one value, pushes its boolean
    /// negation (truthiness-aware, same rule `Value::is_truthy` already
    /// uses everywhere else in this VM).
    Not,
    /// Pops one value, pushes `Bool(v.is_truthy())` - the coercion
    /// `र`/`वा` (and/or) codegen needs for their non-short-circuited
    /// operand, matching `interpreter::Interpreter`'s exact rule that
    /// the *result* of `and`/`or` is always a real bool, not whichever
    /// operand value happened to decide it.
    ToBool,
    Print(usize),
    GetVar(String),
    SetVar(String),
    DefineVar(String),
    /// Jump target is an absolute index into the same chunk's `code`.
    JumpIfFalse(usize),
    Jump(usize),
    Call(String, usize),
    Return,
    /// Pops the top `n` stack values (in source order) and pushes one
    /// real array value built from them - `[१, २, ३]` compiles to
    /// pushing each element then one `MakeArray(3)`, matching how every
    /// other multi-value construct here (`Print(n)`, `Call(name, n)`)
    /// already encodes its arity inline in the opcode.
    MakeArray(usize),
    /// Pops an index then an array, pushes the real element at that
    /// index - a real, explicit bounds-checked runtime error (matching
    /// `interpreter::Interpreter`'s `expect_index`), not a panic.
    Index,
    /// Pops a value, an index, then an array; mutates the array in
    /// place (arrays are reference types here, same as the
    /// tree-walker's `Value::Array(Rc<RefCell<...>>)`) and pushes the
    /// assigned value back - matches `Expr::IndexAssign` evaluating to
    /// the value that was assigned.
    IndexAssign,
    /// Instantiates a real closure from function template `idx` (see
    /// `Compiler::templates`), capturing whichever frame is executing
    /// *right now* as its lexical parent, and pushes the resulting
    /// function value - the real mechanism that makes
    /// `काम बनाउ(x) { काम थप्नु(y) { पठाउँ x + y। } पठाउँ थप्नु। }` work:
    /// every time `बनाउ` runs, a *fresh* `थप्नु` closure is made,
    /// capturing that specific call's `x`, not a single global function
    /// sharing one static binding.
    MakeClosure(usize),
    /// Pops `argc` arguments then one callee value off the stack and
    /// calls through it, whatever expression produced it - the general
    /// path `OpCode::Call(name, argc)` doesn't cover (calling through a
    /// non-identifier expression, e.g. a function returned directly
    /// from another call). Plain by-name calls still use `Call` - most
    /// calls are that shape, and it can look the callee up directly in
    /// the frame chain without a separate `GetVar` instruction first.
    CallValue(usize),
}

#[derive(Debug, Clone, Default)]
pub struct Chunk {
    pub code: Vec<OpCode>,
}

/// One compiled function body, shared (via `Rc`) across every closure
/// instance `OpCode::MakeClosure` creates from it - the bytecode itself
/// never changes between calls, only the captured frame does. Looked up
/// by index (`MakeClosure(usize)`) rather than by name, since nested
/// function declarations can shadow/re-declare the same name across
/// different calls, and each occurrence needs its own real template.
#[derive(Debug)]
pub struct FunctionTemplate {
    pub name: String,
    pub params: Vec<String>,
    pub chunk: Rc<Chunk>,
}

/// Compiles a program into a top-level `Chunk` plus every function
/// template declared anywhere in it (including nested inside other
/// functions) - `Stmt::FunctionDecl` compiles to real runtime
/// instructions (`MakeClosure` + `DefineVar`), not a separate
/// compile-time-only registration table, so declaring a function is a
/// real closure-creating *action* each time it runs, matching
/// `interpreter::Interpreter::exec_stmt`'s `Stmt::FunctionDecl` case
/// exactly (`Value::Function(Rc::new(FunctionValue { closure: env.clone(), .. }))`).
pub struct Compiler {
    pub templates: Vec<Rc<FunctionTemplate>>,
}

impl Compiler {
    pub fn new() -> Self {
        Compiler {
            templates: Vec::new(),
        }
    }

    pub fn compile(program: &[Stmt]) -> (Chunk, Vec<Rc<FunctionTemplate>>) {
        let mut compiler = Compiler::new();
        let mut chunk = Chunk::default();
        compiler.compile_stmts(program, &mut chunk);
        (chunk, compiler.templates)
    }

    fn compile_stmts(&mut self, stmts: &[Stmt], chunk: &mut Chunk) {
        for stmt in stmts {
            self.compile_stmt(stmt, chunk);
        }
    }

    fn compile_stmt(&mut self, stmt: &Stmt, chunk: &mut Chunk) {
        match stmt {
            Stmt::Let(name, expr) => {
                self.compile_expr(expr, chunk);
                chunk.code.push(OpCode::DefineVar(name.clone()));
            }
            Stmt::Print(exprs) => {
                for expr in exprs {
                    self.compile_expr(expr, chunk);
                }
                chunk.code.push(OpCode::Print(exprs.len()));
            }
            Stmt::ExprStmt(expr) => {
                self.compile_expr(expr, chunk);
                chunk.code.push(OpCode::Pop);
            }
            Stmt::If(cond, then_branch, else_branch) => {
                self.compile_expr(cond, chunk);
                let jump_if_false_idx = chunk.code.len();
                chunk.code.push(OpCode::JumpIfFalse(usize::MAX)); // patched below
                self.compile_stmts(then_branch, chunk);

                if let Some(else_branch) = else_branch {
                    let jump_over_else_idx = chunk.code.len();
                    chunk.code.push(OpCode::Jump(usize::MAX));
                    let else_start = chunk.code.len();
                    chunk.code[jump_if_false_idx] = OpCode::JumpIfFalse(else_start);
                    self.compile_stmts(else_branch, chunk);
                    let after_else = chunk.code.len();
                    chunk.code[jump_over_else_idx] = OpCode::Jump(after_else);
                } else {
                    let after_then = chunk.code.len();
                    chunk.code[jump_if_false_idx] = OpCode::JumpIfFalse(after_then);
                }
            }
            Stmt::While(cond, body) => {
                let loop_start = chunk.code.len();
                self.compile_expr(cond, chunk);
                let jump_if_false_idx = chunk.code.len();
                chunk.code.push(OpCode::JumpIfFalse(usize::MAX));
                self.compile_stmts(body, chunk);
                chunk.code.push(OpCode::Jump(loop_start));
                let after_loop = chunk.code.len();
                chunk.code[jump_if_false_idx] = OpCode::JumpIfFalse(after_loop);
            }
            Stmt::FunctionDecl(name, params, body) => {
                let mut fn_chunk = Chunk::default();
                self.compile_stmts(body, &mut fn_chunk);
                // Functions without an explicit trailing return implicitly
                // return null - mirrors interpreter::Interpreter's Signal::Normal
                // case in `call`.
                fn_chunk.code.push(OpCode::ConstNull);
                fn_chunk.code.push(OpCode::Return);
                let idx = self.templates.len();
                self.templates.push(Rc::new(FunctionTemplate {
                    name: name.clone(),
                    params: params.clone(),
                    chunk: Rc::new(fn_chunk),
                }));
                // A real runtime action, not a compile-time-only
                // registration: every time this statement executes, a
                // fresh closure is made (capturing whatever frame is
                // live right now) and bound to `name` in it - exactly
                // `interpreter::Interpreter`'s `Stmt::FunctionDecl` case.
                chunk.code.push(OpCode::MakeClosure(idx));
                chunk.code.push(OpCode::DefineVar(name.clone()));
            }
            Stmt::Return(expr) => {
                match expr {
                    Some(e) => self.compile_expr(e, chunk),
                    None => chunk.code.push(OpCode::ConstNull),
                }
                chunk.code.push(OpCode::Return);
            }
            Stmt::Import(_) => {
                // Same contract as interpreter::Interpreter: a host loader
                // resolves these before compilation ever sees them.
            }
        }
    }

    fn compile_expr(&mut self, expr: &Expr, chunk: &mut Chunk) {
        match expr {
            Expr::Number(n) => chunk.code.push(OpCode::ConstNumber(*n)),
            Expr::StringLit(s) => chunk.code.push(OpCode::ConstString(s.clone())),
            Expr::Bool(b) => chunk.code.push(OpCode::ConstBool(*b)),
            Expr::Null => chunk.code.push(OpCode::ConstNull),
            Expr::Ident(name) => chunk.code.push(OpCode::GetVar(name.clone())),
            Expr::Neg(inner) => {
                self.compile_expr(inner, chunk);
                chunk.code.push(OpCode::Neg);
            }
            Expr::Not(inner) => {
                self.compile_expr(inner, chunk);
                chunk.code.push(OpCode::Not);
            }
            Expr::Assign(name, value) => {
                self.compile_expr(value, chunk);
                chunk.code.push(OpCode::SetVar(name.clone()));
            }
            // Real short-circuiting, matching interpreter::Interpreter's
            // exact semantics: AND never evaluates the right operand's
            // bytecode at all if the left is already falsy (jumps clean
            // over it, not "computes both and discards one"), and the
            // overall result is always a real bool, never whichever
            // operand's raw value happened to decide it - `ToBool`
            // performs that final coercion on the non-short-circuited
            // side, same as `Value::is_truthy` does in the tree-walker.
            Expr::Binary(BinOp::And, left, right) => {
                self.compile_expr(left, chunk);
                let jump_if_false_idx = chunk.code.len();
                chunk.code.push(OpCode::JumpIfFalse(usize::MAX));
                self.compile_expr(right, chunk);
                chunk.code.push(OpCode::ToBool);
                let jump_over_false_idx = chunk.code.len();
                chunk.code.push(OpCode::Jump(usize::MAX));
                let false_branch = chunk.code.len();
                chunk.code[jump_if_false_idx] = OpCode::JumpIfFalse(false_branch);
                chunk.code.push(OpCode::ConstBool(false));
                let after = chunk.code.len();
                chunk.code[jump_over_false_idx] = OpCode::Jump(after);
            }
            Expr::Binary(BinOp::Or, left, right) => {
                self.compile_expr(left, chunk);
                let jump_if_false_idx = chunk.code.len();
                chunk.code.push(OpCode::JumpIfFalse(usize::MAX));
                chunk.code.push(OpCode::ConstBool(true));
                let jump_over_right_idx = chunk.code.len();
                chunk.code.push(OpCode::Jump(usize::MAX));
                let right_branch = chunk.code.len();
                chunk.code[jump_if_false_idx] = OpCode::JumpIfFalse(right_branch);
                self.compile_expr(right, chunk);
                chunk.code.push(OpCode::ToBool);
                let after = chunk.code.len();
                chunk.code[jump_over_right_idx] = OpCode::Jump(after);
            }
            Expr::Binary(op, left, right) => {
                self.compile_expr(left, chunk);
                self.compile_expr(right, chunk);
                chunk.code.push(match op {
                    BinOp::Add => OpCode::Add,
                    BinOp::Sub => OpCode::Sub,
                    BinOp::Mul => OpCode::Mul,
                    BinOp::Div => OpCode::Div,
                    BinOp::Mod => OpCode::Mod,
                    BinOp::Eq => OpCode::Eq,
                    BinOp::NotEq => OpCode::NotEq,
                    BinOp::Lt => OpCode::Lt,
                    BinOp::Gt => OpCode::Gt,
                    BinOp::Lte => OpCode::Lte,
                    BinOp::Gte => OpCode::Gte,
                    BinOp::And | BinOp::Or => unreachable!("handled above"),
                });
            }
            Expr::ArrayLit(elements) => {
                for e in elements {
                    self.compile_expr(e, chunk);
                }
                chunk.code.push(OpCode::MakeArray(elements.len()));
            }
            Expr::Index(object, index) => {
                self.compile_expr(object, chunk);
                self.compile_expr(index, chunk);
                chunk.code.push(OpCode::Index);
            }
            Expr::IndexAssign(object, index, value) => {
                self.compile_expr(object, chunk);
                self.compile_expr(index, chunk);
                self.compile_expr(value, chunk);
                chunk.code.push(OpCode::IndexAssign);
            }
            Expr::Call(callee, args) => {
                // A plain-name callee (the overwhelming common case, and
                // the only shape a real closure call needs - see the
                // closure test) resolves directly in the VM's frame
                // chain via `Call(name, argc)`, without needing a
                // separate `GetVar` first. Any other callee expression
                // (e.g. calling a function value returned directly from
                // another call) compiles the callee generically and
                // calls through the resulting value with `CallValue`.
                if let Expr::Ident(name) = callee.as_ref() {
                    for arg in args {
                        self.compile_expr(arg, chunk);
                    }
                    chunk.code.push(OpCode::Call(name.clone(), args.len()));
                } else {
                    self.compile_expr(callee, chunk);
                    for arg in args {
                        self.compile_expr(arg, chunk);
                    }
                    chunk.code.push(OpCode::CallValue(args.len()));
                }
            }
        }
    }
}

impl Default for Compiler {
    fn default() -> Self {
        Self::new()
    }
}
