//! A stack-based bytecode VM - executes the flat `OpCode` sequences
//! `bytecode::Compiler` produces, instead of recursively pattern-matching
//! the AST like `interpreter::Interpreter` does. This is real progress
//! toward "native codegen" (roadmap lang step 3 - a bytecode VM is the
//! usual stepping stone before compiling to actual machine code), but
//! it's deliberately scoped smaller than the tree-walking interpreter:
//!
//! - **No closures / first-class functions.** `OpCode::Call` calls a
//!   function *by name* only; there's no function *value* a variable can
//!   hold, so `काम बनाउ(x) { काम थप्नु(y) {...} पठाउँ थप्नु। }` (which
//!   `interpreter::Interpreter` runs correctly - see its
//!   `test_closures_capture_outer_scope`) can't compile here. Fixing this
//!   needs an upvalue mechanism (roughly what clox/Lua do); real, but
//!   substantial future work.
//! - **Variables are name-keyed per frame, not stack-slot indices.** A
//!   real bytecode VM usually resolves locals to array slots at compile
//!   time for speed; this one uses a small map per call frame instead,
//!   trading performance for a much smaller/safer implementation. Still a
//!   genuinely different execution model from the tree-walker (explicit
//!   frames + instruction dispatch, not recursive AST evaluation) - just
//!   not yet the fully-optimized version real bytecode VMs end up as.

use crate::bytecode::{Chunk, FunctionChunk, OpCode};
use alloc::collections::BTreeMap;
use alloc::format;
use alloc::rc::Rc;
use alloc::string::{String, ToString};
use alloc::vec::Vec;

pub type VmResult<T> = Result<T, String>;

#[derive(Debug, Clone)]
pub enum Value {
    Number(f64),
    Str(String),
    Bool(bool),
    Null,
}

impl Value {
    fn is_truthy(&self) -> bool {
        match self {
            Value::Bool(b) => *b,
            Value::Null => false,
            Value::Number(n) => *n != 0.0,
            Value::Str(s) => !s.is_empty(),
        }
    }

    pub fn display(&self) -> String {
        match self {
            Value::Number(n) => {
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
        }
    }
}

fn values_equal(l: &Value, r: &Value) -> bool {
    match (l, r) {
        (Value::Number(a), Value::Number(b)) => a == b,
        (Value::Str(a), Value::Str(b)) => a == b,
        (Value::Bool(a), Value::Bool(b)) => a == b,
        (Value::Null, Value::Null) => true,
        _ => false,
    }
}

struct Frame {
    vars: BTreeMap<String, Value>,
}

pub struct Vm {
    functions: BTreeMap<String, Rc<FunctionChunk>>,
    pub output: Vec<String>,
}

impl Vm {
    pub fn new(functions: BTreeMap<String, Rc<FunctionChunk>>) -> Self {
        Vm {
            functions,
            output: Vec::new(),
        }
    }

    pub fn run(&mut self, chunk: &Chunk) -> VmResult<()> {
        let mut frame = Frame {
            vars: BTreeMap::new(),
        };
        self.run_chunk(chunk, &mut frame)?;
        Ok(())
    }

    fn run_chunk(&mut self, chunk: &Chunk, frame: &mut Frame) -> VmResult<Value> {
        let mut stack: Vec<Value> = Vec::new();
        let mut ip = 0usize;

        while ip < chunk.code.len() {
            let op = &chunk.code[ip];
            ip += 1;
            match op {
                OpCode::ConstNumber(n) => stack.push(Value::Number(*n)),
                OpCode::ConstString(s) => stack.push(Value::Str(s.clone())),
                OpCode::ConstBool(b) => stack.push(Value::Bool(*b)),
                OpCode::ConstNull => stack.push(Value::Null),
                OpCode::Neg => {
                    let v = pop(&mut stack)?;
                    match v {
                        Value::Number(n) => stack.push(Value::Number(-n)),
                        other => return Err(format!("cannot negate {}", other.display())),
                    }
                }
                OpCode::Add => {
                    let b = pop(&mut stack)?;
                    let a = pop(&mut stack)?;
                    match (&a, &b) {
                        (Value::Number(x), Value::Number(y)) => stack.push(Value::Number(x + y)),
                        _ => stack.push(Value::Str(format!("{}{}", a.display(), b.display()))),
                    }
                }
                OpCode::Sub | OpCode::Mul | OpCode::Div | OpCode::Mod => {
                    let b = pop(&mut stack)?;
                    let a = pop(&mut stack)?;
                    let (x, y) = match (&a, &b) {
                        (Value::Number(x), Value::Number(y)) => (*x, *y),
                        _ => {
                            return Err(format!(
                                "arithmetic on non-numbers: {} and {}",
                                a.display(),
                                b.display()
                            ))
                        }
                    };
                    stack.push(Value::Number(match op {
                        OpCode::Sub => x - y,
                        OpCode::Mul => x * y,
                        OpCode::Div => x / y,
                        OpCode::Mod => x % y,
                        _ => unreachable!(),
                    }));
                }
                OpCode::Eq | OpCode::NotEq => {
                    let b = pop(&mut stack)?;
                    let a = pop(&mut stack)?;
                    let eq = values_equal(&a, &b);
                    stack.push(Value::Bool(if matches!(op, OpCode::Eq) { eq } else { !eq }));
                }
                OpCode::Lt | OpCode::Gt | OpCode::Lte | OpCode::Gte => {
                    let b = pop(&mut stack)?;
                    let a = pop(&mut stack)?;
                    let (x, y) = match (&a, &b) {
                        (Value::Number(x), Value::Number(y)) => (*x, *y),
                        _ => {
                            return Err(format!(
                                "comparison on non-numbers: {} and {}",
                                a.display(),
                                b.display()
                            ))
                        }
                    };
                    let result = match op {
                        OpCode::Lt => x < y,
                        OpCode::Gt => x > y,
                        OpCode::Lte => x <= y,
                        OpCode::Gte => x >= y,
                        _ => unreachable!(),
                    };
                    stack.push(Value::Bool(result));
                }
                OpCode::Pop => {
                    pop(&mut stack)?;
                }
                OpCode::Print(n) => {
                    let mut parts = Vec::with_capacity(*n);
                    for _ in 0..*n {
                        parts.push(pop(&mut stack)?);
                    }
                    parts.reverse();
                    let line = parts
                        .iter()
                        .map(Value::display)
                        .collect::<Vec<_>>()
                        .join(" ");
                    self.output.push(line);
                }
                OpCode::DefineVar(name) => {
                    let v = pop(&mut stack)?;
                    frame.vars.insert(name.clone(), v);
                }
                OpCode::SetVar(name) => {
                    let v = pop(&mut stack)?;
                    if !frame.vars.contains_key(name) {
                        return Err(format!("assignment to undefined variable '{}'", name));
                    }
                    frame.vars.insert(name.clone(), v.clone());
                    stack.push(v);
                }
                OpCode::GetVar(name) => {
                    let v = frame
                        .vars
                        .get(name)
                        .cloned()
                        .ok_or_else(|| format!("undefined variable '{}'", name))?;
                    stack.push(v);
                }
                OpCode::JumpIfFalse(target) => {
                    let v = pop(&mut stack)?;
                    if !v.is_truthy() {
                        ip = *target;
                    }
                }
                OpCode::Jump(target) => {
                    ip = *target;
                }
                OpCode::Call(name, argc) if crate::interpreter::is_builtin(name) => {
                    let mut args = Vec::with_capacity(*argc);
                    for _ in 0..*argc {
                        args.push(pop(&mut stack)?);
                    }
                    args.reverse();
                    stack.push(call_builtin(name, &args)?);
                }
                OpCode::Call(name, argc) => {
                    let func = self
                        .functions
                        .get(name)
                        .cloned()
                        .ok_or_else(|| format!("undefined function '{}'", name))?;
                    if func.params.len() != *argc {
                        return Err(format!(
                            "function '{}' expects {} argument(s), got {}",
                            name,
                            func.params.len(),
                            argc
                        ));
                    }
                    let mut args = Vec::with_capacity(*argc);
                    for _ in 0..*argc {
                        args.push(pop(&mut stack)?);
                    }
                    args.reverse();

                    let mut call_frame = Frame {
                        vars: BTreeMap::new(),
                    };
                    for (param, arg) in func.params.iter().zip(args.into_iter()) {
                        call_frame.vars.insert(param.clone(), arg);
                    }
                    let ret = self.run_chunk(&func.chunk, &mut call_frame)?;
                    stack.push(ret);
                }
                OpCode::Return => {
                    let v = pop(&mut stack)?;
                    return Ok(v);
                }
            }
        }

        Ok(stack.pop().unwrap_or(Value::Null))
    }
}

fn pop(stack: &mut Vec<Value>) -> VmResult<Value> {
    stack.pop().ok_or_else(|| "stack underflow (VM bug)".to_string())
}

/// Mirrors `interpreter::call_builtin` for `vm::Value` instead of
/// `interpreter::Value` - small enough that duplicating it here beats
/// converting between two structurally-identical-but-distinct Value enums
/// on every builtin call.
fn call_builtin(name: &str, args: &[Value]) -> VmResult<Value> {
    match name {
        "लम्बाइ" => {
            let s = expect_string(name, args, 0)?;
            Ok(Value::Number(s.chars().count() as f64))
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

fn expect_string(fn_name: &str, args: &[Value], idx: usize) -> VmResult<String> {
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

fn expect_number(fn_name: &str, args: &[Value], idx: usize) -> VmResult<f64> {
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
