//! A stack-based bytecode VM - executes the flat `OpCode` sequences
//! `bytecode::Compiler` produces, instead of recursively pattern-matching
//! the AST like `interpreter::Interpreter` does. This is real progress
//! toward "native codegen" (roadmap lang step 3 - a bytecode VM is the
//! usual stepping stone before compiling to actual machine code), but
//! it's deliberately scoped smaller than the tree-walking interpreter:
//!
//! - **Arrays, logical `र`/`वा`/`होइन` (and/or/not) - done.** Real
//!   `Value::Array(Rc<RefCell<Vec<Value>>>)`, the same reference-type
//!   representation the tree-walker uses (`test_vm_arrays_are_reference_
//!   types_across_bindings` verifies mutation is visible through a
//!   second binding, same as `interpreter::Value::Array`), real
//!   bounds-checked indexing, real `लम्बाइ`/`थप्नुहोस्` on arrays. `र`/
//!   `वा` are real short-circuit jump codegen, not "evaluate both and
//!   discard one" - `test_vm_and_or_short_circuit_real_side_effect`
//!   verifies the right operand's bytecode genuinely never runs, the
//!   same technique the tree-walker's own short-circuit test uses.
//! - **Closures / first-class functions - done.** Function declarations
//!   compile to a real runtime `MakeClosure` instruction, not a
//!   compile-time-only registration table - every time
//!   `काम बनाउ(x) { काम थप्नु(y) { पठाउँ x + y। } पठाउँ थप्नु। }` runs,
//!   a *fresh* `थप्नु` closure captures that call's own `x`. Frames are
//!   now `Rc<RefCell<FrameData>>` with a real parent chain (the same
//!   linked-scope shape `interpreter::Env` uses), not a plain map that
//!   dies when its call returns - `test_vm_closures_capture_outer_scope`
//!   runs the exact same program `interpreter::Interpreter`'s own
//!   `test_closures_capture_outer_scope` does. Not upvalues in the
//!   clox/Lua sense (those close over individual *stack slots*; this
//!   closes over a whole frame by reference) - a real, working, simpler
//!   mechanism that fits this VM's existing name-keyed-frame design
//!   rather than requiring a stack-slot rewrite first.
//! - **Variables are name-keyed per frame, not stack-slot indices.** A
//!   real bytecode VM usually resolves locals to array slots at compile
//!   time for speed; this one uses a small map per call frame instead,
//!   trading performance for a much smaller/safer implementation. Still a
//!   genuinely different execution model from the tree-walker (explicit
//!   frames + instruction dispatch, not recursive AST evaluation) - just
//!   not yet the fully-optimized version real bytecode VMs end up as.

use crate::bytecode::{Chunk, FunctionTemplate, OpCode};
use alloc::collections::BTreeMap;
use alloc::format;
use alloc::rc::Rc;
use alloc::string::{String, ToString};
use alloc::vec::Vec;
use core::cell::RefCell;

pub type VmResult<T> = Result<T, String>;

#[derive(Debug, Clone)]
pub enum Value {
    Number(f64),
    Str(String),
    Bool(bool),
    Null,
    /// `Rc<RefCell<..>>`, not a plain `Vec` - real reference-type
    /// arrays, same reasoning and same representation as
    /// `interpreter::Value::Array`: `x[i] = v` must be visible through
    /// every other binding referring to the same array.
    Array(Rc<RefCell<Vec<Value>>>),
    /// A real closure value - see `VmFunctionValue` below.
    Function(Rc<VmFunctionValue>),
}

impl Value {
    fn is_truthy(&self) -> bool {
        match self {
            Value::Bool(b) => *b,
            Value::Null => false,
            Value::Number(n) => *n != 0.0,
            Value::Str(s) => !s.is_empty(),
            Value::Array(a) => !a.borrow().is_empty(),
            Value::Function(_) => true,
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
            Value::Array(a) => {
                let items: Vec<String> = a.borrow().iter().map(Value::display).collect();
                format!("[{}]", items.join(", "))
            }
            Value::Function(f) => format!("<function {}>", f.name),
        }
    }
}

fn values_equal(l: &Value, r: &Value) -> bool {
    match (l, r) {
        (Value::Number(a), Value::Number(b)) => a == b,
        (Value::Str(a), Value::Str(b)) => a == b,
        (Value::Bool(a), Value::Bool(b)) => a == b,
        (Value::Null, Value::Null) => true,
        (Value::Array(a), Value::Array(b)) => {
            // Structural equality, matching interpreter::values_equal's
            // exact reasoning - same less-surprising default as every
            // other Value comparison here, not reference identity.
            let a = a.borrow();
            let b = b.borrow();
            a.len() == b.len() && a.iter().zip(b.iter()).all(|(x, y)| values_equal(x, y))
        }
        _ => false,
    }
}

fn expect_array(v: &Value) -> VmResult<Rc<RefCell<Vec<Value>>>> {
    match v {
        Value::Array(a) => Ok(a.clone()),
        other => Err(format!("'{}' is not an array", other.display())),
    }
}

fn expect_index(v: &Value, len: usize) -> VmResult<usize> {
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
                Err(format!("array index {} out of bounds (length {})", i, len))
            } else {
                Ok(i as usize)
            }
        }
        other => Err(format!("array index must be a number, got {}", other.display())),
    }
}

/// A real closure/call frame with an optional parent - the same
/// linked-scope shape `interpreter::Env` (`Rc<RefCell<Scope>>` with a
/// `parent: Option<Env>`) already uses, and for the same reason: a
/// closure captured mid-call must keep its enclosing frame alive and
/// reachable *after* that call returns (a plain stack-allocated map,
/// dropped when its call frame pops, can't do that - this is exactly
/// the change that makes real closures possible here).
#[derive(Debug)]
struct FrameData {
    vars: BTreeMap<String, Value>,
    parent: Option<Frame>,
}
type Frame = Rc<RefCell<FrameData>>;

fn new_frame(parent: Option<Frame>) -> Frame {
    Rc::new(RefCell::new(FrameData {
        vars: BTreeMap::new(),
        parent,
    }))
}

fn frame_get(frame: &Frame, name: &str) -> Option<Value> {
    let f = frame.borrow();
    if let Some(v) = f.vars.get(name) {
        return Some(v.clone());
    }
    let parent = f.parent.clone();
    drop(f);
    match parent {
        Some(p) => frame_get(&p, name),
        None => None,
    }
}

fn frame_define(frame: &Frame, name: String, value: Value) {
    frame.borrow_mut().vars.insert(name, value);
}

fn frame_set(frame: &Frame, name: &str, value: Value) -> VmResult<()> {
    let mut f = frame.borrow_mut();
    if f.vars.contains_key(name) {
        f.vars.insert(name.to_string(), value);
        return Ok(());
    }
    let parent = f.parent.clone();
    drop(f);
    match parent {
        Some(p) => frame_set(&p, name, value),
        None => Err(format!("assignment to undefined variable '{}'", name)),
    }
}

/// A real, callable closure value - `params`/`chunk` are the compiled
/// function body (shared, via `Rc<Chunk>`, across every instance made
/// from the same `bytecode::FunctionTemplate`), `closure` is the
/// specific frame *this* instance captured when its `MakeClosure`
/// instruction ran. Two closures made from the same template in two
/// different calls are genuinely different values with different
/// captured state - not the same shared function object every real
/// closure implementation avoids being.
#[derive(Debug)]
pub struct VmFunctionValue {
    name: String,
    params: Vec<String>,
    chunk: Rc<Chunk>,
    closure: Frame,
}

pub struct Vm {
    templates: Vec<Rc<FunctionTemplate>>,
    pub output: Vec<String>,
}

impl Vm {
    pub fn new(templates: Vec<Rc<FunctionTemplate>>) -> Self {
        Vm {
            templates,
            output: Vec::new(),
        }
    }

    pub fn run(&mut self, chunk: &Chunk) -> VmResult<()> {
        let frame = new_frame(None);
        self.run_chunk(chunk, &frame)?;
        Ok(())
    }

    /// Calls a real closure value with `args`, creating a fresh call
    /// frame whose *parent* is the closure's own `captured` frame - not
    /// the caller's frame. That's the actual mechanism that makes
    /// closures work: `थप्नु`'s body can see `बनाउ`'s `x` because its
    /// frame chain leads back to the frame `बनाउ` was running in when
    /// `थप्नु` was made, regardless of who calls `थप्नु` or from where.
    fn call_value(&mut self, callee: Value, args: Vec<Value>) -> VmResult<Value> {
        let func = match callee {
            Value::Function(f) => f,
            other => return Err(format!("'{}' is not callable", other.display())),
        };
        if func.params.len() != args.len() {
            return Err(format!(
                "function '{}' expects {} argument(s), got {}",
                func.name,
                func.params.len(),
                args.len()
            ));
        }
        let call_frame = new_frame(Some(func.closure.clone()));
        for (param, arg) in func.params.iter().zip(args.into_iter()) {
            frame_define(&call_frame, param.clone(), arg);
        }
        self.run_chunk(&func.chunk, &call_frame)
    }

    fn run_chunk(&mut self, chunk: &Chunk, frame: &Frame) -> VmResult<Value> {
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
                OpCode::Not => {
                    let v = pop(&mut stack)?;
                    stack.push(Value::Bool(!v.is_truthy()));
                }
                OpCode::ToBool => {
                    let v = pop(&mut stack)?;
                    stack.push(Value::Bool(v.is_truthy()));
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
                    frame_define(frame, name.clone(), v);
                }
                OpCode::SetVar(name) => {
                    let v = pop(&mut stack)?;
                    frame_set(frame, name, v.clone())?;
                    stack.push(v);
                }
                OpCode::GetVar(name) => {
                    let v = frame_get(frame, name)
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
                OpCode::MakeClosure(idx) => {
                    let template = self.templates[*idx].clone();
                    stack.push(Value::Function(Rc::new(VmFunctionValue {
                        name: template.name.clone(),
                        params: template.params.clone(),
                        chunk: template.chunk.clone(),
                        closure: frame.clone(),
                    })));
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
                    let callee = frame_get(frame, name)
                        .ok_or_else(|| format!("undefined function '{}'", name))?;
                    let mut args = Vec::with_capacity(*argc);
                    for _ in 0..*argc {
                        args.push(pop(&mut stack)?);
                    }
                    args.reverse();
                    let ret = self.call_value(callee, args)?;
                    stack.push(ret);
                }
                OpCode::CallValue(argc) => {
                    let mut args = Vec::with_capacity(*argc);
                    for _ in 0..*argc {
                        args.push(pop(&mut stack)?);
                    }
                    args.reverse();
                    let callee = pop(&mut stack)?;
                    let ret = self.call_value(callee, args)?;
                    stack.push(ret);
                }
                OpCode::Return => {
                    let v = pop(&mut stack)?;
                    return Ok(v);
                }
                OpCode::MakeArray(n) => {
                    let mut items = Vec::with_capacity(*n);
                    for _ in 0..*n {
                        items.push(pop(&mut stack)?);
                    }
                    items.reverse();
                    stack.push(Value::Array(Rc::new(RefCell::new(items))));
                }
                OpCode::Index => {
                    let idx = pop(&mut stack)?;
                    let obj = pop(&mut stack)?;
                    let arr = expect_array(&obj)?;
                    let i = expect_index(&idx, arr.borrow().len())?;
                    let v = arr.borrow()[i].clone();
                    stack.push(v);
                }
                OpCode::IndexAssign => {
                    let value = pop(&mut stack)?;
                    let idx = pop(&mut stack)?;
                    let obj = pop(&mut stack)?;
                    let arr = expect_array(&obj)?;
                    let i = expect_index(&idx, arr.borrow().len())?;
                    arr.borrow_mut()[i] = value.clone();
                    stack.push(value);
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
