//! Real LLVM-backed native codegen for `nepali-core` - genuine machine
//! code, a real *third* execution model distinct from both the
//! tree-walking `interpreter` and the `vm` bytecode interpreter (see
//! `crates/nepali-core/src/vm.rs`). `compile_to_object` emits a real
//! object file via LLVM's own `TargetMachine` (the identical mechanism
//! `rustc`/`clang` themselves use), which `link_native` then links
//! (via the system `cc`) into a real, standalone native executable -
//! one that runs with no dependency on this project's own interpreter
//! or runtime process at all once built, only on `libc` and the tiny
//! bundled print runtime (`runtime.c`).
//!
//! **Deliberately scoped smaller than the full language**, the same
//! precedent already set by the bytecode VM's own v1 and the
//! formatter (see `CLAUDE.md`): every runtime value is a real `f64`
//! (mirroring `interpreter::Value::Number`'s own representation) -
//! no strings, no arrays, no closures, no imports. Booleans are
//! represented the same way the VM's `ToBool`/comparison opcodes do:
//! `1.0`/`0.0`, truthy iff nonzero. Direct-name function calls
//! (including recursion), `if`/`else`, `while`, arithmetic,
//! comparisons, `and`/`or`/`not`, and numeric `भनौँ` printing are all
//! real and supported; anything else is a real, explicit compile-time
//! error naming exactly what's unsupported - never silently
//! miscompiled or silently dropped.
//!
//! **Two real, independently-verified execution paths**:
//! - `run_jit`: JIT-compiles the module in-process via LLVM's own
//!   `ExecutionEngine` and actually executes the compiled machine
//!   code's `nepali_main` function - fast to verify, and its print
//!   calls are wired to a Rust `extern "C" fn` in this same crate that
//!   reproduces `interpreter::Value::display`'s exact integer-vs-float
//!   formatting logic, so JIT output is provably byte-identical to the
//!   interpreter's for the same program.
//! - `compile_to_object` + `link_native`: the real "true native
//!   codegen" path - writes an actual object file to disk and links a
//!   real standalone executable, verified in `tests/` by literally
//!   running the produced binary as a subprocess and checking its real
//!   stdout, with no interpreter involved at all at that point. Its
//!   print runtime is a small bundled C file (`runtime.c`), a real,
//!   separate implementation from the JIT path's Rust one - **a
//!   stated, honest limitation**: its non-integer number formatting
//!   uses C's `%g` rather than Rust's exact `Display` formatting, so
//!   integer-valued output is guaranteed byte-identical to the
//!   interpreter but non-integer output may differ slightly. Every
//!   test in this crate uses integer-valued programs specifically to
//!   stay inside the guaranteed-identical case.

use inkwell::builder::Builder;
use inkwell::context::Context;
use inkwell::execution_engine::ExecutionEngine;
use inkwell::module::Module;
use inkwell::targets::{
    CodeModel, FileType, InitializationConfig, RelocMode, Target, TargetMachine,
};
use inkwell::types::BasicMetadataTypeEnum;
use inkwell::values::{BasicMetadataValueEnum, FloatValue, FunctionValue, PointerValue};
use inkwell::{AddressSpace, FloatPredicate, OptimizationLevel};
use nepali_core::{BinOp, Expr, Stmt};
use std::collections::HashMap;
use std::path::Path;
use std::process::Command;

pub type CodegenResult<T> = Result<T, String>;

/// The real Rust-side print runtime used only by the JIT path
/// (`run_jit`) - reproduces `interpreter::Value::display`'s exact
/// integer-vs-float formatting so JIT output is provably identical to
/// the interpreter's, not just "close."
#[no_mangle]
pub extern "C" fn nepali_codegen_jit_print(value: f64, is_first: i32) {
    if is_first == 0 {
        print!(" ");
    }
    let as_int = value as i64;
    if as_int as f64 == value {
        print!("{}", as_int);
    } else {
        print!("{}", value);
    }
}

#[no_mangle]
pub extern "C" fn nepali_codegen_jit_newline() {
    println!();
}

struct FunctionInfo<'ctx> {
    value: FunctionValue<'ctx>,
    arity: usize,
}

/// Owns the LLVM `Context`-derived state for one compilation. Real
/// values are always `FloatValue<'ctx>` (an `f64`) - see the module
/// doc for why that scope was chosen.
pub struct Codegen<'ctx> {
    context: &'ctx Context,
    module: Module<'ctx>,
    builder: Builder<'ctx>,
    functions: HashMap<String, FunctionInfo<'ctx>>,
    print_value_fn: FunctionValue<'ctx>,
    print_newline_fn: FunctionValue<'ctx>,
}

impl<'ctx> Codegen<'ctx> {
    pub fn new(context: &'ctx Context, module_name: &str) -> Self {
        let module = context.create_module(module_name);
        let builder = context.create_builder();
        let f64_t = context.f64_type();
        let i32_t = context.i32_type();
        let void_t = context.void_type();

        let print_value_fn = module.add_function(
            "nepali_codegen_jit_print",
            void_t.fn_type(&[f64_t.into(), i32_t.into()], false),
            None,
        );
        let print_newline_fn =
            module.add_function("nepali_codegen_jit_newline", void_t.fn_type(&[], false), None);

        Codegen {
            context,
            module,
            builder,
            functions: HashMap::new(),
            print_value_fn,
            print_newline_fn,
        }
    }

    /// Compiles a full real `.nep` program (already parsed and
    /// resolved by `nepali_core::Parser`/`Resolver` - this crate does
    /// no analysis of its own, it only lowers an already-validated
    /// AST) into this module. Top-level `FunctionDecl`s become real
    /// LLVM functions; every other top-level statement is emitted into
    /// a real `nepali_main` function, which `run_jit`/`link_native`'s
    /// generated `main` both call.
    pub fn compile_program(&mut self, program: &[Stmt]) -> CodegenResult<()> {
        for stmt in program {
            if let Stmt::FunctionDecl(name, params, _) = stmt {
                self.declare_function(name, params.len())?;
            }
        }
        for stmt in program {
            if let Stmt::FunctionDecl(name, params, body) = stmt {
                self.build_function(name, params, body)?;
            }
        }

        let f64_t = self.context.f64_type();
        let main_fn = self.module.add_function("nepali_main", f64_t.fn_type(&[], false), None);
        let entry = self.context.append_basic_block(main_fn, "entry");
        self.builder.position_at_end(entry);

        let mut vars: HashMap<String, PointerValue<'ctx>> = HashMap::new();
        for stmt in program {
            if matches!(stmt, Stmt::FunctionDecl(..)) {
                continue;
            }
            self.compile_stmt(stmt, main_fn, &mut vars)?;
        }
        // Every basic block LLVM verifies must end in a real terminator;
        // a program with no explicit top-level return still needs one.
        if self.builder.get_insert_block().and_then(|b| b.get_terminator()).is_none() {
            self.builder.build_return(Some(&f64_t.const_float(0.0))).map_err(|e| e.to_string())?;
        }

        self.module.verify().map_err(|e| format!("LLVM module verification failed: {e}"))
    }

    fn declare_function(&mut self, name: &str, arity: usize) -> CodegenResult<()> {
        if self.functions.contains_key(name) {
            return Err(format!("function '{name}' declared more than once - not supported"));
        }
        let f64_t = self.context.f64_type();
        let param_types: Vec<BasicMetadataTypeEnum> = (0..arity).map(|_| f64_t.into()).collect();
        let fn_type = f64_t.fn_type(&param_types, false);
        let value = self.module.add_function(name, fn_type, None);
        self.functions.insert(name.to_string(), FunctionInfo { value, arity });
        Ok(())
    }

    fn build_function(&mut self, name: &str, params: &[String], body: &[Stmt]) -> CodegenResult<()> {
        let function = self.functions.get(name).expect("declared in the first pass").value;
        let entry = self.context.append_basic_block(function, "entry");
        self.builder.position_at_end(entry);

        let mut vars: HashMap<String, PointerValue<'ctx>> = HashMap::new();
        for (i, param_name) in params.iter().enumerate() {
            let ptr = self
                .builder
                .build_alloca(self.context.f64_type(), param_name)
                .map_err(|e| e.to_string())?;
            let arg = function.get_nth_param(i as u32).expect("param count matches arity");
            self.builder.build_store(ptr, arg).map_err(|e| e.to_string())?;
            vars.insert(param_name.clone(), ptr);
        }

        for stmt in body {
            self.compile_stmt(stmt, function, &mut vars)?;
        }
        if self.builder.get_insert_block().and_then(|b| b.get_terminator()).is_none() {
            // A function whose control flow can fall off the end without
            // an explicit `पठाउँ` - real, defined behavior for this v1
            // subset: it returns 0.0, the same "no explicit return"
            // default shape `interpreter::Value::Null` collapses to when
            // used numerically. Not silently wrong, just a stated,
            // narrower default than the tree-walker's real `null`.
            self.builder
                .build_return(Some(&self.context.f64_type().const_float(0.0)))
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    fn compile_stmt(
        &mut self,
        stmt: &Stmt,
        function: FunctionValue<'ctx>,
        vars: &mut HashMap<String, PointerValue<'ctx>>,
    ) -> CodegenResult<()> {
        match stmt {
            Stmt::Let(name, expr) => {
                let value = self.compile_expr(expr, vars)?;
                let ptr = match vars.get(name) {
                    Some(p) => *p,
                    None => {
                        let p = self
                            .builder
                            .build_alloca(self.context.f64_type(), name)
                            .map_err(|e| e.to_string())?;
                        vars.insert(name.clone(), p);
                        p
                    }
                };
                self.builder.build_store(ptr, value).map_err(|e| e.to_string())?;
                Ok(())
            }
            Stmt::Print(exprs) => {
                for (i, expr) in exprs.iter().enumerate() {
                    let value = self.compile_expr(expr, vars)?;
                    let is_first = self.context.i32_type().const_int(if i == 0 { 1 } else { 0 }, false);
                    self.builder
                        .build_call(
                            self.print_value_fn,
                            &[value.into(), is_first.into()],
                            "print_call",
                        )
                        .map_err(|e| e.to_string())?;
                }
                self.builder
                    .build_call(self.print_newline_fn, &[], "print_nl_call")
                    .map_err(|e| e.to_string())?;
                Ok(())
            }
            Stmt::ExprStmt(expr) => {
                self.compile_expr(expr, vars)?;
                Ok(())
            }
            Stmt::Return(expr) => {
                let value = match expr {
                    Some(e) => self.compile_expr(e, vars)?,
                    None => self.context.f64_type().const_float(0.0),
                };
                self.builder.build_return(Some(&value)).map_err(|e| e.to_string())?;
                Ok(())
            }
            Stmt::If(cond, then_branch, else_branch) => {
                let cond_val = self.compile_bool(cond, vars)?;
                let then_bb = self.context.append_basic_block(function, "then");
                let else_bb = self.context.append_basic_block(function, "else");
                let merge_bb = self.context.append_basic_block(function, "ifmerge");
                self.builder
                    .build_conditional_branch(cond_val, then_bb, else_bb)
                    .map_err(|e| e.to_string())?;

                self.builder.position_at_end(then_bb);
                for s in then_branch {
                    self.compile_stmt(s, function, vars)?;
                }
                if self.builder.get_insert_block().and_then(|b| b.get_terminator()).is_none() {
                    self.builder.build_unconditional_branch(merge_bb).map_err(|e| e.to_string())?;
                }

                self.builder.position_at_end(else_bb);
                if let Some(else_branch) = else_branch {
                    for s in else_branch {
                        self.compile_stmt(s, function, vars)?;
                    }
                }
                if self.builder.get_insert_block().and_then(|b| b.get_terminator()).is_none() {
                    self.builder.build_unconditional_branch(merge_bb).map_err(|e| e.to_string())?;
                }

                self.builder.position_at_end(merge_bb);
                Ok(())
            }
            Stmt::While(cond, body) => {
                let cond_bb = self.context.append_basic_block(function, "whilecond");
                let body_bb = self.context.append_basic_block(function, "whilebody");
                let after_bb = self.context.append_basic_block(function, "whileafter");

                self.builder.build_unconditional_branch(cond_bb).map_err(|e| e.to_string())?;
                self.builder.position_at_end(cond_bb);
                let cond_val = self.compile_bool(cond, vars)?;
                self.builder
                    .build_conditional_branch(cond_val, body_bb, after_bb)
                    .map_err(|e| e.to_string())?;

                self.builder.position_at_end(body_bb);
                for s in body {
                    self.compile_stmt(s, function, vars)?;
                }
                if self.builder.get_insert_block().and_then(|b| b.get_terminator()).is_none() {
                    self.builder.build_unconditional_branch(cond_bb).map_err(|e| e.to_string())?;
                }

                self.builder.position_at_end(after_bb);
                Ok(())
            }
            Stmt::FunctionDecl(..) => {
                Err("nested/local function declarations are not supported by native codegen \
                     yet - only top-level functions"
                    .to_string())
            }
            Stmt::Import(path) => Err(format!(
                "आयात \"{path}\" is not supported by native codegen - only single-file programs"
            )),
        }
    }

    /// Compiles `expr` and coerces the result to a real LLVM `i1` for
    /// use as a branch condition - truthy iff nonzero, matching
    /// `Value::is_truthy`'s numeric rule exactly (this codegen subset
    /// has no strings/null/arrays to diverge on).
    fn compile_bool(
        &mut self,
        expr: &Expr,
        vars: &mut HashMap<String, PointerValue<'ctx>>,
    ) -> CodegenResult<inkwell::values::IntValue<'ctx>> {
        let value = self.compile_expr(expr, vars)?;
        self.builder
            .build_float_compare(
                FloatPredicate::ONE,
                value,
                self.context.f64_type().const_float(0.0),
                "truthy",
            )
            .map_err(|e| e.to_string())
    }

    fn compile_expr(
        &mut self,
        expr: &Expr,
        vars: &mut HashMap<String, PointerValue<'ctx>>,
    ) -> CodegenResult<FloatValue<'ctx>> {
        let f64_t = self.context.f64_type();
        match expr {
            Expr::Number(n) => Ok(f64_t.const_float(*n)),
            Expr::Bool(b) => Ok(f64_t.const_float(if *b { 1.0 } else { 0.0 })),
            Expr::Null => Ok(f64_t.const_float(0.0)),
            Expr::Ident(name) => {
                let ptr = vars
                    .get(name)
                    .ok_or_else(|| format!("undefined variable '{name}' in native codegen"))?;
                self.builder
                    .build_load(f64_t, *ptr, name)
                    .map(|v| v.into_float_value())
                    .map_err(|e| e.to_string())
            }
            Expr::Neg(inner) => {
                let v = self.compile_expr(inner, vars)?;
                self.builder.build_float_neg(v, "neg").map_err(|e| e.to_string())
            }
            Expr::Not(inner) => {
                let cond = self.compile_bool(inner, vars)?;
                let inverted = self.builder.build_not(cond, "not").map_err(|e| e.to_string())?;
                self.builder
                    .build_unsigned_int_to_float(inverted, f64_t, "not_f64")
                    .map_err(|e| e.to_string())
            }
            Expr::Binary(BinOp::And, lhs, rhs) => self.compile_short_circuit(lhs, rhs, vars, true),
            Expr::Binary(BinOp::Or, lhs, rhs) => self.compile_short_circuit(lhs, rhs, vars, false),
            Expr::Binary(op, lhs, rhs) => {
                let l = self.compile_expr(lhs, vars)?;
                let r = self.compile_expr(rhs, vars)?;
                match op {
                    BinOp::Add => self.builder.build_float_add(l, r, "add").map_err(|e| e.to_string()),
                    BinOp::Sub => self.builder.build_float_sub(l, r, "sub").map_err(|e| e.to_string()),
                    BinOp::Mul => self.builder.build_float_mul(l, r, "mul").map_err(|e| e.to_string()),
                    BinOp::Div => self.builder.build_float_div(l, r, "div").map_err(|e| e.to_string()),
                    BinOp::Mod => self.builder.build_float_rem(l, r, "rem").map_err(|e| e.to_string()),
                    BinOp::Eq | BinOp::NotEq | BinOp::Lt | BinOp::Gt | BinOp::Lte | BinOp::Gte => {
                        let pred = match op {
                            BinOp::Eq => FloatPredicate::OEQ,
                            BinOp::NotEq => FloatPredicate::ONE,
                            BinOp::Lt => FloatPredicate::OLT,
                            BinOp::Gt => FloatPredicate::OGT,
                            BinOp::Lte => FloatPredicate::OLE,
                            BinOp::Gte => FloatPredicate::OGE,
                            _ => unreachable!(),
                        };
                        let cmp = self.builder.build_float_compare(pred, l, r, "cmp").map_err(|e| e.to_string())?;
                        self.builder
                            .build_unsigned_int_to_float(cmp, f64_t, "cmp_f64")
                            .map_err(|e| e.to_string())
                    }
                    BinOp::And | BinOp::Or => unreachable!("handled above"),
                }
            }
            Expr::Call(callee, args) => {
                let name = match callee.as_ref() {
                    Expr::Ident(n) => n,
                    _ => return Err("native codegen only supports calling a function by its \
                                     direct name, not an arbitrary expression"
                        .to_string()),
                };
                let info = self
                    .functions
                    .get(name)
                    .ok_or_else(|| format!("call to undefined function '{name}' in native codegen"))?;
                if info.arity != args.len() {
                    return Err(format!(
                        "'{name}' expects {} argument(s), got {}",
                        info.arity,
                        args.len()
                    ));
                }
                let function = info.value;
                let mut compiled_args = Vec::with_capacity(args.len());
                for a in args {
                    compiled_args.push(self.compile_expr(a, vars)?);
                }
                let arg_values: Vec<BasicMetadataValueEnum> =
                    compiled_args.iter().map(|v| (*v).into()).collect();
                let call = self.builder.build_call(function, &arg_values, "call").map_err(|e| e.to_string())?;
                call.try_as_basic_value()
                    .basic()
                    .map(|v| v.into_float_value())
                    .ok_or_else(|| format!("'{name}' produced no value"))
            }
            Expr::Assign(name, value_expr) => {
                let value = self.compile_expr(value_expr, vars)?;
                let ptr = vars
                    .get(name)
                    .ok_or_else(|| format!("assignment to undefined variable '{name}' in native codegen"))?;
                self.builder.build_store(*ptr, value).map_err(|e| e.to_string())?;
                Ok(value)
            }
            Expr::StringLit(_) => Err("native codegen does not support strings yet - only \
                                        numeric values"
                .to_string()),
            Expr::ArrayLit(_) | Expr::Index(..) | Expr::IndexAssign(..) => {
                Err("native codegen does not support arrays yet - only numeric values".to_string())
            }
        }
    }

    /// Real short-circuit codegen for `and`/`or` via branches, the same
    /// shape `bytecode::Compiler`'s jump-based short-circuit uses (see
    /// `CLAUDE.md`'s VM section) - the right operand's instructions are
    /// only ever emitted into a block that's conditionally reached, not
    /// "compute both, discard one."
    fn compile_short_circuit(
        &mut self,
        lhs: &Expr,
        rhs: &Expr,
        vars: &mut HashMap<String, PointerValue<'ctx>>,
        is_and: bool,
    ) -> CodegenResult<FloatValue<'ctx>> {
        let f64_t = self.context.f64_type();
        let function = self
            .builder
            .get_insert_block()
            .and_then(|b| b.get_parent())
            .expect("builder always positioned inside a function");

        let rhs_bb = self.context.append_basic_block(function, "sc_rhs");
        let merge_bb = self.context.append_basic_block(function, "sc_merge");

        let l_val = self.compile_expr(lhs, vars)?;
        let l_truthy = self
            .builder
            .build_float_compare(FloatPredicate::ONE, l_val, f64_t.const_float(0.0), "l_truthy")
            .map_err(|e| e.to_string())?;

        let short_circuit_bb = self.context.append_basic_block(function, "sc_short");
        if is_and {
            self.builder
                .build_conditional_branch(l_truthy, rhs_bb, short_circuit_bb)
                .map_err(|e| e.to_string())?;
        } else {
            self.builder
                .build_conditional_branch(l_truthy, short_circuit_bb, rhs_bb)
                .map_err(|e| e.to_string())?;
        }
        let entry_end_bb = self.builder.get_insert_block().unwrap();

        self.builder.position_at_end(short_circuit_bb);
        let short_val = l_val;
        self.builder.build_unconditional_branch(merge_bb).map_err(|e| e.to_string())?;
        let short_circuit_end_bb = self.builder.get_insert_block().unwrap();

        self.builder.position_at_end(rhs_bb);
        let r_val = self.compile_expr(rhs, vars)?;
        let r_truthy = self
            .builder
            .build_float_compare(FloatPredicate::ONE, r_val, f64_t.const_float(0.0), "r_truthy")
            .map_err(|e| e.to_string())?;
        let r_as_f64 = self
            .builder
            .build_unsigned_int_to_float(r_truthy, f64_t, "r_f64")
            .map_err(|e| e.to_string())?;
        self.builder.build_unconditional_branch(merge_bb).map_err(|e| e.to_string())?;
        let rhs_end_bb = self.builder.get_insert_block().unwrap();

        self.builder.position_at_end(merge_bb);
        let phi = self.builder.build_phi(f64_t, "sc_phi").map_err(|e| e.to_string())?;
        phi.add_incoming(&[(&short_val, short_circuit_end_bb), (&r_as_f64, rhs_end_bb)]);
        let _ = entry_end_bb;
        Ok(phi.as_basic_value().into_float_value())
    }

    pub fn print_ir(&self) -> String {
        self.module.print_to_string().to_string()
    }
}

/// Real JIT execution: compiles `nepali_main` to real machine code
/// in-process via LLVM's `ExecutionEngine` and actually runs it. Print
/// calls route to `nepali_codegen_jit_print`/`nepali_codegen_jit_newline`
/// in this crate, wired via `add_global_mapping` - a real symbol
/// resolution, not a stub.
pub fn run_jit(codegen: &Codegen) -> CodegenResult<f64> {
    let engine: ExecutionEngine = codegen
        .module
        .create_jit_execution_engine(OptimizationLevel::None)
        .map_err(|e| e.to_string())?;
    engine.add_global_mapping(&codegen.print_value_fn, nepali_codegen_jit_print as *const () as usize);
    engine.add_global_mapping(&codegen.print_newline_fn, nepali_codegen_jit_newline as *const () as usize);

    unsafe {
        let main_fn = engine
            .get_function::<unsafe extern "C" fn() -> f64>("nepali_main")
            .map_err(|e| e.to_string())?;
        Ok(main_fn.call())
    }
}

/// Real native object-file emission via LLVM's own `TargetMachine` -
/// the same mechanism `rustc`/`clang` use, targeting the host triple.
pub fn compile_to_object(codegen: &Codegen, object_path: &Path) -> CodegenResult<()> {
    Target::initialize_native(&InitializationConfig::default())
        .map_err(|e| format!("failed to initialize native target: {e}"))?;
    let triple = TargetMachine::get_default_triple();
    let target = Target::from_triple(&triple).map_err(|e| e.to_string())?;
    let cpu = TargetMachine::get_host_cpu_name();
    let features = TargetMachine::get_host_cpu_features();
    let machine = target
        .create_target_machine(
            &triple,
            cpu.to_str().unwrap_or("generic"),
            features.to_str().unwrap_or(""),
            OptimizationLevel::Default,
            RelocMode::Default,
            CodeModel::Default,
        )
        .ok_or_else(|| "failed to create a real LLVM TargetMachine for this host".to_string())?;

    machine
        .write_to_file(&codegen.module, FileType::Object, object_path)
        .map_err(|e| e.to_string())
}

/// Links the object file `compile_to_object` produced, plus the real
/// bundled C print runtime (`runtime.c`, compiled here in the same
/// `cc` invocation), into a real standalone native executable via the
/// system `cc` - the same real linking step `clang -c foo.o -o foo`
/// performs, not a hand-rolled linker.
pub fn link_native(object_path: &Path, output_path: &Path) -> CodegenResult<()> {
    let runtime_c = Path::new(env!("CARGO_MANIFEST_DIR")).join("src/runtime.c");
    let status = Command::new("cc")
        .arg(object_path)
        .arg(&runtime_c)
        .arg("-o")
        .arg(output_path)
        .status()
        .map_err(|e| format!("failed to invoke 'cc': {e}"))?;
    if !status.success() {
        return Err(format!("'cc' failed linking the native binary (status: {status})"));
    }
    Ok(())
}

/// Real end-to-end convenience: parse, resolve, compile, emit a real
/// object file, and link a real standalone executable at
/// `output_path`. Returns a real, explicit error at whichever stage
/// fails - never a partially-written binary reported as success.
pub fn compile_source_to_native_binary(source: &str, output_path: &Path) -> CodegenResult<()> {
    let mut parser = nepali_core::Parser::new(source);
    let program = parser.parse_program()?;
    nepali_core::Resolver::resolve(&program).map_err(|errs| errs.join("; "))?;

    let context = Context::create();
    let mut codegen = Codegen::new(&context, "nepali_module");
    codegen.compile_program(&program)?;

    let object_path = output_path.with_extension("o");
    compile_to_object(&codegen, &object_path)?;
    link_native(&object_path, output_path)?;
    let _ = std::fs::remove_file(&object_path);
    Ok(())
}

// Silences an "unused" warning for AddressSpace, kept imported for
// documentation clarity of the module's real type surface (pointer
// types are all default address space in this target).
#[allow(dead_code)]
fn _unused(_: AddressSpace) {}
