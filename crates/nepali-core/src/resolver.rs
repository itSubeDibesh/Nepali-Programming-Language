use crate::ast::{BinOp, Expr, Stmt};
use alloc::collections::BTreeMap;
use alloc::format;
use alloc::string::String;
use alloc::vec::Vec;

/// A conservative static type, tracked per variable/expression during
/// resolution. `Unknown` means "could be anything at runtime" (a function
/// parameter, since there are no type annotations; a variable reassigned
/// with a different type than it was declared with) - the checker never
/// flags an error involving `Unknown`, so every error it does report is a
/// *confirmed* mismatch, not a guess. That makes this sound but
/// incomplete: it won't catch every type error a full inference pass
/// would, but it never cries wolf on legitimately dynamic code either.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Type {
    Number,
    Str,
    Bool,
    Null,
    Unknown,
}

/// A static analysis pass over the AST, run before interpretation. It
/// catches three classes of bug at "compile time" instead of at runtime:
///
/// - references to undefined variables (and assignment to them),
/// - calling a statically-known function with the wrong number of
///   arguments,
/// - arithmetic (`- * / %`) or ordering comparison (`< > <= >=`) where an
///   operand's type is *confirmed* to be non-numeric (see `Type::Unknown`
///   above for what "confirmed" excludes).
///
/// The first two mirror the interpreter's own dynamic semantics (its env
/// chain and arity check) performed ahead of time; the third is new
/// static type checking, not just scope resolution - see ROADMAP.md for
/// what's still missing (real type annotations in the AST/syntax, and
/// checking through values that flow via function returns or closures).
pub struct Resolver {
    scopes: Vec<BTreeMap<String, Type>>,
    arities: BTreeMap<String, usize>,
    errors: Vec<String>,
}

impl Resolver {
    pub fn new() -> Self {
        Resolver {
            scopes: alloc::vec![BTreeMap::new()],
            arities: BTreeMap::new(),
            errors: Vec::new(),
        }
    }

    pub fn resolve(program: &[Stmt]) -> Result<(), Vec<String>> {
        let mut resolver = Resolver::new();
        resolver.resolve_stmts(program);
        if resolver.errors.is_empty() {
            Ok(())
        } else {
            Err(resolver.errors)
        }
    }

    fn push_scope(&mut self) {
        self.scopes.push(BTreeMap::new());
    }

    fn pop_scope(&mut self) {
        self.scopes.pop();
    }

    fn declare(&mut self, name: &str, ty: Type) {
        self.scopes
            .last_mut()
            .expect("resolver always has at least the global scope")
            .insert(name.into(), ty);
    }

    fn is_declared(&self, name: &str) -> bool {
        self.scopes.iter().rev().any(|scope| scope.contains_key(name))
    }

    fn type_of(&self, name: &str) -> Type {
        self.scopes
            .iter()
            .rev()
            .find_map(|scope| scope.get(name).copied())
            .unwrap_or(Type::Unknown)
    }

    /// Reassignment can legitimately change a dynamically-typed variable's
    /// runtime type - rather than falsely flag that later, widen the
    /// tracked type to `Unknown` the moment an assignment's type disagrees
    /// with what's on record, in whichever scope actually owns `name`.
    fn widen_on_assign(&mut self, name: &str, assigned_ty: Type) {
        for scope in self.scopes.iter_mut().rev() {
            if let Some(existing) = scope.get_mut(name) {
                if *existing != assigned_ty {
                    *existing = Type::Unknown;
                }
                return;
            }
        }
    }

    fn resolve_stmts(&mut self, stmts: &[Stmt]) {
        for stmt in stmts {
            self.resolve_stmt(stmt);
        }
    }

    fn resolve_stmt(&mut self, stmt: &Stmt) {
        match stmt {
            Stmt::Let(name, expr) => {
                let ty = self.resolve_expr(expr);
                self.declare(name, ty);
            }
            Stmt::Print(exprs) => {
                for expr in exprs {
                    self.resolve_expr(expr);
                }
            }
            Stmt::ExprStmt(expr) => {
                self.resolve_expr(expr);
            }
            Stmt::If(cond, then_branch, else_branch) => {
                self.resolve_expr(cond);
                self.push_scope();
                self.resolve_stmts(then_branch);
                self.pop_scope();
                if let Some(else_branch) = else_branch {
                    self.push_scope();
                    self.resolve_stmts(else_branch);
                    self.pop_scope();
                }
            }
            Stmt::While(cond, body) => {
                self.resolve_expr(cond);
                self.push_scope();
                self.resolve_stmts(body);
                self.pop_scope();
            }
            Stmt::FunctionDecl(name, params, body) => {
                self.arities.insert(name.clone(), params.len());
                self.declare(name, Type::Unknown);
                self.push_scope();
                for param in params {
                    // No type annotations exist in the syntax, so a
                    // parameter's type is unknown until proven otherwise
                    // inside the body - never flagged, only ever excluded
                    // from checks, per Type::Unknown's contract above.
                    self.declare(param, Type::Unknown);
                }
                self.resolve_stmts(body);
                self.pop_scope();
            }
            Stmt::Return(expr) => {
                if let Some(expr) = expr {
                    self.resolve_expr(expr);
                }
            }
            // Nothing to resolve here: a correctly-run pipeline strips
            // Import statements out during loading, before either the
            // resolver or interpreter ever sees the program. If one
            // reaches the interpreter anyway, it errors there instead.
            Stmt::Import(_) => {}
        }
    }

    fn resolve_expr(&mut self, expr: &Expr) -> Type {
        match expr {
            Expr::Number(_) => Type::Number,
            Expr::StringLit(_) => Type::Str,
            Expr::Bool(_) => Type::Bool,
            Expr::Null => Type::Null,
            Expr::Ident(name) => {
                if !self.is_declared(name) {
                    self.errors.push(format!("undefined variable '{}'", name));
                    Type::Unknown
                } else {
                    self.type_of(name)
                }
            }
            Expr::Neg(inner) => {
                let ty = self.resolve_expr(inner);
                if ty != Type::Unknown && ty != Type::Number {
                    self.errors
                        .push(format!("cannot negate a {}", describe(ty)));
                }
                Type::Number
            }
            Expr::Not(inner) => {
                // Unlike Neg, this never errors - `is_truthy` (what "not"
                // coerces through at runtime) is defined for every value
                // type, not just numbers.
                self.resolve_expr(inner);
                Type::Bool
            }
            Expr::Assign(name, value) => {
                let ty = self.resolve_expr(value);
                if !self.is_declared(name) {
                    self.errors
                        .push(format!("assignment to undefined variable '{}'", name));
                } else {
                    self.widen_on_assign(name, ty);
                }
                ty
            }
            Expr::Binary(op, left, right) => {
                let lt = self.resolve_expr(left);
                let rt = self.resolve_expr(right);
                self.check_binary(op.clone(), lt, rt)
            }
            Expr::ArrayLit(elements) => {
                // Not tracked as a distinct "array of T" type - Unknown
                // is always safe (never flags a false positive), and this
                // resolver doesn't have an element-type slot to put a
                // real answer in yet.
                for e in elements {
                    self.resolve_expr(e);
                }
                Type::Unknown
            }
            Expr::Index(object, index) => {
                self.resolve_expr(object);
                self.resolve_expr(index);
                Type::Unknown
            }
            Expr::IndexAssign(object, index, value) => {
                self.resolve_expr(object);
                self.resolve_expr(index);
                self.resolve_expr(value)
            }
            Expr::Call(callee, args) => {
                // Builtins (crate::interpreter::BUILTINS) aren't declared
                // variables - resolving callee as an Ident would otherwise
                // flag e.g. `लम्बाइ(x)` as calling an undefined variable.
                let is_builtin_call = matches!(
                    callee.as_ref(),
                    Expr::Ident(name) if crate::interpreter::is_builtin(name)
                );
                if !is_builtin_call {
                    self.resolve_expr(callee);
                }
                for arg in args {
                    self.resolve_expr(arg);
                }
                // Only statically checkable when calling a plain name that
                // resolves to a known function declaration - a call through
                // an arbitrary expression (e.g. a closure stored in a
                // variable) isn't tracked here, since that needs real value
                // types, not just scope resolution.
                if let Expr::Ident(name) = callee.as_ref() {
                    if let Some(&expected) = self.arities.get(name) {
                        if expected != args.len() {
                            self.errors.push(format!(
                                "function '{}' expects {} argument(s), got {}",
                                name,
                                expected,
                                args.len()
                            ));
                        }
                    }
                }
                // Return type of a call is never tracked - functions have
                // no declared return type, and the resolver doesn't infer
                // through function bodies.
                Type::Unknown
            }
        }
    }

    fn check_binary(&mut self, op: BinOp, lt: Type, rt: Type) -> Type {
        use BinOp::*;
        match op {
            // Add accepts any combination - the interpreter/VM fall back
            // to string concatenation whenever either side isn't a
            // number, so there's no type combination that's actually an
            // error here.
            Add => {
                if lt == Type::Number && rt == Type::Number {
                    Type::Number
                } else {
                    Type::Str
                }
            }
            Sub | Mul | Div | Mod => {
                if is_confirmed_non_number(lt) || is_confirmed_non_number(rt) {
                    self.errors.push(format!(
                        "arithmetic ({}) on non-number types: {} and {}",
                        op_symbol(op),
                        describe(lt),
                        describe(rt)
                    ));
                }
                Type::Number
            }
            Eq | NotEq => Type::Bool,
            // Never an error - is_truthy is defined for every value type,
            // so unlike arithmetic/comparison there's no non-number type
            // to confirm-and-flag here.
            And | Or => Type::Bool,
            Lt | Gt | Lte | Gte => {
                if is_confirmed_non_number(lt) || is_confirmed_non_number(rt) {
                    self.errors.push(format!(
                        "comparison ({}) on non-number types: {} and {}",
                        op_symbol(op),
                        describe(lt),
                        describe(rt)
                    ));
                }
                Type::Bool
            }
        }
    }
}

fn is_confirmed_non_number(ty: Type) -> bool {
    matches!(ty, Type::Str | Type::Bool | Type::Null)
}

fn describe(ty: Type) -> &'static str {
    match ty {
        Type::Number => "number",
        Type::Str => "string",
        Type::Bool => "boolean",
        Type::Null => "null",
        Type::Unknown => "unknown",
    }
}

fn op_symbol(op: BinOp) -> &'static str {
    use BinOp::*;
    match op {
        Add => "+",
        Sub => "-",
        Mul => "*",
        Div => "/",
        Mod => "%",
        Eq => "==",
        NotEq => "!=",
        Lt => "<",
        Gt => ">",
        Lte => "<=",
        Gte => ">=",
        And => "र",
        Or => "वा",
    }
}

impl Default for Resolver {
    fn default() -> Self {
        Self::new()
    }
}
