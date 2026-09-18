use crate::ast::{BinOp, Expr, Stmt};
use alloc::collections::BTreeMap;
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
    Print(usize),
    GetVar(String),
    SetVar(String),
    DefineVar(String),
    /// Jump target is an absolute index into the same chunk's `code`.
    JumpIfFalse(usize),
    Jump(usize),
    Call(String, usize),
    Return,
}

#[derive(Debug, Clone, Default)]
pub struct Chunk {
    pub code: Vec<OpCode>,
}

#[derive(Debug)]
pub struct FunctionChunk {
    pub params: Vec<String>,
    pub chunk: Chunk,
}

/// Compiles a program into a top-level `Chunk` plus one `FunctionChunk`
/// per declared function, called by name via `OpCode::Call`.
pub struct Compiler {
    pub functions: BTreeMap<String, Rc<FunctionChunk>>,
}

impl Compiler {
    pub fn new() -> Self {
        Compiler {
            functions: BTreeMap::new(),
        }
    }

    pub fn compile(program: &[Stmt]) -> (Chunk, BTreeMap<String, Rc<FunctionChunk>>) {
        let mut compiler = Compiler::new();
        let mut chunk = Chunk::default();
        compiler.compile_stmts(program, &mut chunk);
        (chunk, compiler.functions)
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
                self.functions.insert(
                    name.clone(),
                    Rc::new(FunctionChunk {
                        params: params.clone(),
                        chunk: fn_chunk,
                    }),
                );
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
            Expr::Not(_) => {
                panic!("bytecode compiler: होइन/'not' is not supported yet (tree-walking Interpreter supports it - see ROADMAP.md)");
            }
            Expr::Assign(name, value) => {
                self.compile_expr(value, chunk);
                chunk.code.push(OpCode::SetVar(name.clone()));
            }
            Expr::Binary(BinOp::And, _, _) | Expr::Binary(BinOp::Or, _, _) => {
                // Short-circuiting needs real jump codegen (evaluate
                // left, branch around right entirely) - same kind of gap
                // as arrays and closures-through-value calls: explicit,
                // not silently wrong. See ROADMAP.md.
                panic!("bytecode compiler: र/वा ('and'/'or') are not supported yet (tree-walking Interpreter supports them - see ROADMAP.md)");
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
            Expr::ArrayLit(_) | Expr::Index(_, _) | Expr::IndexAssign(_, _, _) => {
                // Not supported by this bytecode VM yet - same kind of
                // explicit, deliberate gap as calling through a non-name
                // expression below (closures), not a silent
                // miscompilation. See ROADMAP.md.
                panic!("bytecode compiler: arrays are not supported yet (tree-walking Interpreter supports them - see ROADMAP.md)");
            }
            Expr::Call(callee, args) => {
                for arg in args {
                    self.compile_expr(arg, chunk);
                }
                // Only calls to a plain name compile - see the VM module
                // doc for why calling through a value (closures) isn't
                // supported by this bytecode compiler yet.
                if let Expr::Ident(name) = callee.as_ref() {
                    chunk.code.push(OpCode::Call(name.clone(), args.len()));
                } else {
                    panic!("bytecode compiler: calling a non-identifier expression is not supported yet (no closures in the VM - see ROADMAP.md)");
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
