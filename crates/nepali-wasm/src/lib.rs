use nepali_core::{disassemble_program, dump_ast, HostInput, Interpreter, Parser, Resolver, Vm};
use wasm_bindgen::prelude::*;
use std::cell::RefCell;
use std::rc::Rc;

struct WasmInput {
    inputs: RefCell<Vec<String>>,
}

impl HostInput for WasmInput {
    fn read_line(&self, _prompt: &str) -> Result<String, String> {
        let mut inputs = self.inputs.borrow_mut();
        if inputs.is_empty() {
            Ok(String::new())
        } else {
            Ok(inputs.remove(0))
        }
    }
}

/// Run a Nepali program using Tree-walker interpreter and return stdout.
#[wasm_bindgen]
pub fn run(code: &str) -> Result<String, JsError> {
    run_with_inputs_internal(code, Vec::new())
}

/// Run a Nepali program with an array of predefined interactive user inputs.
#[wasm_bindgen]
pub fn run_with_inputs(code: &str, inputs: js_sys::Array) -> Result<String, JsError> {
    let mut input_vec = Vec::new();
    for i in 0..inputs.length() {
        if let Some(s) = inputs.get(i).as_string() {
            input_vec.push(s);
        }
    }
    run_with_inputs_internal(code, input_vec)
}

fn run_with_inputs_internal(code: &str, inputs: Vec<String>) -> Result<String, JsError> {
    let mut parser = Parser::new(code);
    let program = parser
        .parse_program()
        .map_err(|e| JsError::new(&format!("parse error: {e}")))?;

    if let Err(errors) = Resolver::resolve(&program) {
        let msg = errors.join("\n");
        return Err(JsError::new(&msg));
    }

    let mut interp = Interpreter::new();
    interp.set_host_input(Rc::new(WasmInput {
        inputs: RefCell::new(inputs),
    }));
    interp.run(&program).map_err(|e| JsError::new(&e))?;
    Ok(interp.output.join("\n"))
}

/// Run a Nepali program using the Bytecode Stack VM and return stdout.
#[wasm_bindgen]
pub fn run_vm(code: &str) -> Result<String, JsError> {
    let mut parser = Parser::new(code);
    let program = parser
        .parse_program()
        .map_err(|e| JsError::new(&format!("parse error: {e}")))?;

    if let Err(errors) = Resolver::resolve(&program) {
        let msg = errors.join("\n");
        return Err(JsError::new(&msg));
    }

    let (chunk, templates) = nepali_core::Compiler::compile(&program);
    let mut vm = Vm::new(templates);
    vm.run(&chunk).map_err(|e| JsError::new(&e))?;
    Ok(vm.output.join("\n"))
}

/// Disassemble a Nepali program into human-readable bytecode instructions.
#[wasm_bindgen]
pub fn disassemble(code: &str) -> Result<String, JsError> {
    let mut parser = Parser::new(code);
    let program = parser
        .parse_program()
        .map_err(|e| JsError::new(&format!("parse error: {e}")))?;

    Ok(disassemble_program(&program))
}

/// Dump the Abstract Syntax Tree (AST) of a Nepali program as an indented tree.
#[wasm_bindgen]
pub fn ast_dump(code: &str) -> Result<String, JsError> {
    let mut parser = Parser::new(code);
    let program = parser
        .parse_program()
        .map_err(|e| JsError::new(&format!("parse error: {e}")))?;

    Ok(dump_ast(&program))
}

/// Parse a program and return diagnostics (for editor integration).
#[wasm_bindgen]
pub fn check(code: &str) -> String {
    let mut parser = Parser::new(code);
    match parser.parse_program() {
        Ok(program) => match Resolver::resolve(&program) {
            Ok(()) => String::new(),
            Err(errors) => errors.join("\n"),
        },
        Err(e) => format!("{e}"),
    }
}
