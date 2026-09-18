use alloc::boxed::Box;
use alloc::string::String;
use alloc::vec::Vec;

#[derive(Debug, Clone, PartialEq)]
pub enum BinOp {
    Add,
    Sub,
    Mul,
    Div,
    Mod,
    Eq,
    NotEq,
    Lt,
    Gt,
    Lte,
    Gte,
    /// Short-circuiting - see `interpreter::Interpreter::eval_expr` and
    /// `vm::Vm`'s handling of `Expr::Binary` with this op: the right
    /// operand is only ever evaluated when the left doesn't already
    /// decide the result, same as every other language's `&&`/`||`.
    And,
    Or,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Expr {
    Number(f64),
    StringLit(String),
    Bool(bool),
    Null,
    Ident(String),
    Binary(BinOp, Box<Expr>, Box<Expr>),
    Neg(Box<Expr>),
    /// `होइन x` - logical negation. A separate node from `Neg` (numeric
    /// negation), not reusing it - "not" coerces to boolean via
    /// `Value::is_truthy`, "-" only ever makes sense on a number.
    Not(Box<Expr>),
    Assign(String, Box<Expr>),
    Call(Box<Expr>, Vec<Expr>),
    /// `[a, b, c]` - a real array value, not a builtin-function stand-in.
    ArrayLit(Vec<Expr>),
    /// `x[i]` - reads element `i` of array `x`.
    Index(Box<Expr>, Box<Expr>),
    /// `x[i] = value` - a distinct node from `Assign` (which only ever
    /// targets a bare identifier) since the assignment target here is
    /// itself an expression (the array) plus an index, not a name to look
    /// up in an environment.
    IndexAssign(Box<Expr>, Box<Expr>, Box<Expr>),
}

#[derive(Debug, Clone, PartialEq)]
pub enum Stmt {
    Let(String, Expr),
    Print(Vec<Expr>),
    ExprStmt(Expr),
    If(Expr, Vec<Stmt>, Option<Vec<Stmt>>),
    While(Expr, Vec<Stmt>),
    FunctionDecl(String, Vec<String>, Vec<Stmt>),
    Return(Option<Expr>),
    /// आयात "path"। - resolved by a host loader (see nepali-core-cli's
    /// `loader` module) before interpretation, since nepali-core itself is
    /// no_std and can't do file I/O. An Import statement reaching the
    /// interpreter unresolved is a runtime error, not silently ignored.
    Import(String),
}
