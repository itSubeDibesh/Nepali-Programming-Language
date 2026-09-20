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

use alloc::format;

pub fn dump_ast(stmts: &[Stmt]) -> String {
    let mut out = String::new();
    out.push_str("Program (AST Root)\n");
    for (i, stmt) in stmts.iter().enumerate() {
        let is_last = i == stmts.len() - 1;
        dump_stmt(stmt, &mut out, "", is_last);
    }
    out
}

fn dump_stmt(stmt: &Stmt, out: &mut String, prefix: &str, is_last: bool) {
    let branch = if is_last { "└── " } else { "├── " };
    let child_prefix = if is_last { format!("{}    ", prefix) } else { format!("{}│   ", prefix) };

    match stmt {
        Stmt::Let(name, expr) => {
            out.push_str(&format!("{}{}[Let] राखौँ {}\n", prefix, branch, name));
            dump_expr(expr, out, &child_prefix, true);
        }
        Stmt::Print(exprs) => {
            out.push_str(&format!("{}{}[Print] भनौँ ({} args)\n", prefix, branch, exprs.len()));
            for (i, e) in exprs.iter().enumerate() {
                dump_expr(e, out, &child_prefix, i == exprs.len() - 1);
            }
        }
        Stmt::ExprStmt(expr) => {
            out.push_str(&format!("{}{}[ExprStmt]\n", prefix, branch));
            dump_expr(expr, out, &child_prefix, true);
        }
        Stmt::If(cond, then_b, else_b) => {
            out.push_str(&format!("{}{}[If] यदि\n", prefix, branch));
            out.push_str(&format!("{}├── [Condition]\n", child_prefix));
            dump_expr(cond, out, &format!("{}│   ", child_prefix), true);
            out.push_str(&format!("{}├── [Then Branch] ({} stmts)\n", child_prefix, then_b.len()));
            for (i, s) in then_b.iter().enumerate() {
                dump_stmt(s, out, &format!("{}│   ", child_prefix), i == then_b.len() - 1);
            }
            if let Some(else_stmts) = else_b {
                out.push_str(&format!("{}└── [Else Branch] ({} stmts)\n", child_prefix, else_stmts.len()));
                for (i, s) in else_stmts.iter().enumerate() {
                    dump_stmt(s, out, &format!("{}    ", child_prefix), i == else_stmts.len() - 1);
                }
            }
        }
        Stmt::While(cond, body) => {
            out.push_str(&format!("{}{}[While] भएसम्म\n", prefix, branch));
            out.push_str(&format!("{}├── [Condition]\n", child_prefix));
            dump_expr(cond, out, &format!("{}│   ", child_prefix), true);
            out.push_str(&format!("{}└── [Body] ({} stmts)\n", child_prefix, body.len()));
            for (i, s) in body.iter().enumerate() {
                dump_stmt(s, out, &format!("{}    ", child_prefix), i == body.len() - 1);
            }
        }
        Stmt::FunctionDecl(name, params, body) => {
            out.push_str(&format!("{}{}[FunctionDecl] काम {}({})\n", prefix, branch, name, params.join(", ")));
            out.push_str(&format!("{}└── [Body] ({} stmts)\n", child_prefix, body.len()));
            for (i, s) in body.iter().enumerate() {
                dump_stmt(s, out, &format!("{}    ", child_prefix), i == body.len() - 1);
            }
        }
        Stmt::Return(expr) => {
            out.push_str(&format!("{}{}[Return] पठाउँ\n", prefix, branch));
            if let Some(e) = expr {
                dump_expr(e, out, &child_prefix, true);
            }
        }
        Stmt::Import(path) => {
            out.push_str(&format!("{}{}[Import] आयात \"{}\"\n", prefix, branch, path));
        }
    }
}

fn dump_expr(expr: &Expr, out: &mut String, prefix: &str, is_last: bool) {
    let branch = if is_last { "└── " } else { "├── " };
    let child_prefix = if is_last { format!("{}    ", prefix) } else { format!("{}│   ", prefix) };

    match expr {
        Expr::Number(n) => {
            out.push_str(&format!("{}{}[Number] {}\n", prefix, branch, n));
        }
        Expr::StringLit(s) => {
            out.push_str(&format!("{}{}[StringLit] {:?}\n", prefix, branch, s));
        }
        Expr::Bool(b) => {
            out.push_str(&format!("{}{}[Bool] {}\n", prefix, branch, if *b { "सहि" } else { "गलत" }));
        }
        Expr::Null => {
            out.push_str(&format!("{}{}[Null] केहीछैन\n", prefix, branch));
        }
        Expr::Ident(name) => {
            out.push_str(&format!("{}{}[Ident] {}\n", prefix, branch, name));
        }
        Expr::Binary(op, left, right) => {
            let op_str = match op {
                BinOp::Add => "+",
                BinOp::Sub => "-",
                BinOp::Mul => "*",
                BinOp::Div => "/",
                BinOp::Mod => "%",
                BinOp::Eq => "==",
                BinOp::NotEq => "!=",
                BinOp::Lt => "<",
                BinOp::Gt => ">",
                BinOp::Lte => "<=",
                BinOp::Gte => ">=",
                BinOp::And => "र (and)",
                BinOp::Or => "वा (or)",
            };
            out.push_str(&format!("{}{}[Binary] {}\n", prefix, branch, op_str));
            dump_expr(left, out, &child_prefix, false);
            dump_expr(right, out, &child_prefix, true);
        }
        Expr::Neg(inner) => {
            out.push_str(&format!("{}{}[Neg] -\n", prefix, branch));
            dump_expr(inner, out, &child_prefix, true);
        }
        Expr::Not(inner) => {
            out.push_str(&format!("{}{}[Not] होइन\n", prefix, branch));
            dump_expr(inner, out, &child_prefix, true);
        }
        Expr::Assign(name, val) => {
            out.push_str(&format!("{}{}[Assign] {} =\n", prefix, branch, name));
            dump_expr(val, out, &child_prefix, true);
        }
        Expr::Call(callee, args) => {
            out.push_str(&format!("{}{}[Call] ({} args)\n", prefix, branch, args.len()));
            dump_expr(callee, out, &child_prefix, args.is_empty());
            for (i, a) in args.iter().enumerate() {
                dump_expr(a, out, &child_prefix, i == args.len() - 1);
            }
        }
        Expr::ArrayLit(elements) => {
            out.push_str(&format!("{}{}[ArrayLit] ({} items)\n", prefix, branch, elements.len()));
            for (i, e) in elements.iter().enumerate() {
                dump_expr(e, out, &child_prefix, i == elements.len() - 1);
            }
        }
        Expr::Index(obj, idx) => {
            out.push_str(&format!("{}{}[Index] []\n", prefix, branch));
            dump_expr(obj, out, &child_prefix, false);
            dump_expr(idx, out, &child_prefix, true);
        }
        Expr::IndexAssign(obj, idx, val) => {
            out.push_str(&format!("{}{}[IndexAssign] []=\n", prefix, branch));
            dump_expr(obj, out, &child_prefix, false);
            dump_expr(idx, out, &child_prefix, false);
            dump_expr(val, out, &child_prefix, true);
        }
    }
}
