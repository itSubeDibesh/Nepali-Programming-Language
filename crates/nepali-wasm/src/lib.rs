use nepali_core::{Interpreter, Parser, Resolver};
use wasm_bindgen::prelude::*;

/// Run a Nepali program and return its stdout as a string.
/// Only pure language features work (no filesystem, no processes).
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
