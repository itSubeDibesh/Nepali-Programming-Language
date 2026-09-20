use nepali_core::{Interpreter, Mode, Parser, Resolver};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub stdout: Vec<String>,
    pub stderr: Option<String>,
    #[serde(rename = "exitCode")]
    pub exit_code: i32,
}

#[tauri::command]
pub fn run_nepali_code(
    code: String,
    mode: String,
    inputs: Option<Vec<String>>,
) -> Result<ExecutionResult, String> {
    let run_mode = match mode.as_str() {
        "sandbox" => Mode::Sandbox,
        _ => Mode::Os,
    };

    let mut parser = Parser::new(&code);
    let program = match parser.parse_program() {
        Ok(p) => p,
        Err(e) => {
            return Ok(ExecutionResult {
                stdout: Vec::new(),
                stderr: Some(format!("व्याकरण त्रुटि (Syntax Error): {e}")),
                exit_code: 1,
            });
        }
    };

    if let Err(errors) = Resolver::resolve(&program) {
        let err_msg = errors.join("\n");
        return Ok(ExecutionResult {
            stdout: Vec::new(),
            stderr: Some(format!("विश्लेषण त्रुटि (Resolution Error):\n{err_msg}")),
            exit_code: 1,
        });
    }

    let mut interp = Interpreter::new();
    interp.set_mode(run_mode);

    if let Err(e) = interp.run(&program) {
        return Ok(ExecutionResult {
            stdout: interp.output,
            stderr: Some(format!("कार्यान्वयन त्रुटि (Runtime Error): {e}")),
            exit_code: 1,
        });
    }

    Ok(ExecutionResult {
        stdout: interp.output,
        stderr: None,
        exit_code: 0,
    })
}

#[tauri::command]
pub fn get_platform_info() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "version": "1.0.0",
        "engine": "Nepali Native Core Engine",
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![run_nepali_code, get_platform_info])
        .run(tauri::generate_context!())
        .expect("error while running nepali studio application");
}
