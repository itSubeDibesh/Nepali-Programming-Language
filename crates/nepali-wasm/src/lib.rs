use nepali_core::{disassemble_program, dump_ast, Interpreter, Parser, Resolver, Vm};
use wasm_bindgen::prelude::*;

/// Run a Nepali program using Tree-walker interpreter and return stdout.
#[wasm_bindgen]
pub fn run(code: &str) -> Result<String, JsError> {
    let mut parser = Parser::new(code);
    let program = parser
        .parse_program()
        .map_err(|e| JsError::new(&format!("parse error: {e}")))?;

    if let Err(errors) = Resolver::resolve(&program) {
        let msg = errors.join("\n");
        return Err(JsError::new(&msg));
    }

    let mut interp = Interpreter::new();
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

