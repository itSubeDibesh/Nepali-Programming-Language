use nepali_core::{disassemble_program, dump_ast, Interpreter, Mode, Parser, Resolver};
use serde::{Deserialize, Serialize};

pub const APP_VERSION: &str = "1.1.0";

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub stdout: Vec<String>,
    pub stderr: Option<String>,
    #[serde(rename = "exitCode")]
    pub exit_code: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCheckResult {
    #[serde(rename = "hasUpdate")]
    pub has_update: bool,
    #[serde(rename = "updateType")]
    pub update_type: Option<String>, // "patch" | "minor" | "major"
    #[serde(rename = "currentVersion")]
    pub current_version: String,
    #[serde(rename = "latestVersion")]
    pub latest_version: String,
    #[serde(rename = "releaseName")]
    pub release_name: String,
    #[serde(rename = "releaseNotes")]
    pub release_notes: String,
    #[serde(rename = "downloadUrl")]
    pub download_url: String,
    #[serde(rename = "publishedAt")]
    pub published_at: Option<String>,
}

#[tauri::command]
fn run_nepali_code(
    code: String,
    mode: String,
    _inputs: Option<Vec<String>>,
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
fn disassemble_nepali_code(code: String) -> Result<String, String> {
    let mut parser = Parser::new(&code);
    let program = parser
        .parse_program()
        .map_err(|e| format!("व्याकरण त्रुटि: {e}"))?;

    Ok(disassemble_program(&program))
}

#[tauri::command]
fn get_ast_dump(code: String) -> Result<String, String> {
    let mut parser = Parser::new(&code);
    let program = parser
        .parse_program()
        .map_err(|e| format!("व्याकरण त्रुटि: {e}"))?;

    Ok(dump_ast(&program))
}

#[tauri::command]
fn get_platform_info() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "version": APP_VERSION,
        "engine": "Nepali Native Core Engine",
    }))
}

#[tauri::command]
fn get_app_version() -> Result<String, String> {
    Ok(APP_VERSION.to_string())
}

/// Helper to parse semver "1.2.3" -> (1, 2, 3)
fn parse_semver(v: &str) -> (u32, u32, u32) {
    let clean = v.trim().trim_start_matches('v');
    let parts: Vec<&str> = clean.split('.').collect();
    let major = parts.get(0).and_then(|p| p.parse().ok()).unwrap_or(0);
    let minor = parts.get(1).and_then(|p| p.parse().ok()).unwrap_or(0);
    let patch = parts.get(2).and_then(|p| p.split('-').next().unwrap_or("0").parse().ok()).unwrap_or(0);
    (major, minor, patch)
}

#[tauri::command]
fn check_for_updates(remote_version: Option<String>, notes: Option<String>) -> Result<UpdateCheckResult, String> {
    let current = APP_VERSION;
    let (cur_maj, cur_min, cur_pat) = parse_semver(current);

    // If client supplied remote version or fallback
    let target_version = remote_version.unwrap_or_else(|| "1.1.0".to_string());
    let (tgt_maj, tgt_min, tgt_pat) = parse_semver(&target_version);

    let (has_update, update_type) = if tgt_maj > cur_maj {
        (true, Some("major".to_string()))
    } else if tgt_maj == cur_maj && tgt_min > cur_min {
        (true, Some("minor".to_string()))
    } else if tgt_maj == cur_maj && tgt_min == cur_min && tgt_pat > cur_pat {
        (true, Some("patch".to_string()))
    } else {
        (false, None)
    };

    let release_notes = notes.unwrap_or_else(|| {
        if has_update {
            format!("नयाँ संस्करण {} उपलब्ध छ। स्थिरता सुधार र नयाँ सुविधाहरू समावेश गरिएको छ।", target_version)
        } else {
            "तपाईंको नेपाली स्टुडियो नवीनतम संस्करणमा अद्यावधिक छ।".to_string()
        }
    });

    let release_name = format!("Nepali Studio v{}", target_version);
    Ok(UpdateCheckResult {
        has_update,
        update_type,
        current_version: current.to_string(),
        latest_version: target_version,
        release_name,
        release_notes,
        download_url: "https://github.com/itSubeDibesh/Nepali-Programming-Language/releases".to_string(),
        published_at: None,
    })
}

#[tauri::command]
fn write_to_clipboard(text: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use std::io::Write;
        use std::process::{Command, Stdio};
        if let Ok(mut child) = Command::new("pbcopy").stdin(Stdio::piped()).spawn() {
            if let Some(mut stdin) = child.stdin.take() {
                let _ = stdin.write_all(text.as_bytes());
            }
            let _ = child.wait();
            return Ok(());
        }
    }
    #[cfg(target_os = "linux")]
    {
        use std::io::Write;
        use std::process::{Command, Stdio};
        if let Ok(mut child) = Command::new("xclip").arg("-selection").arg("clipboard").stdin(Stdio::piped()).spawn() {
            if let Some(mut stdin) = child.stdin.take() {
                let _ = stdin.write_all(text.as_bytes());
            }
            let _ = child.wait();
            return Ok(());
        }
    }
    Ok(())
}

#[tauri::command]
fn read_from_clipboard() -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        if let Ok(out) = Command::new("pbpaste").output() {
            if let Ok(s) = String::from_utf8(out.stdout) {
                return Ok(s);
            }
        }
    }
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        if let Ok(out) = Command::new("xclip").arg("-selection").arg("clipboard").arg("-o").output() {
            if let Ok(s) = String::from_utf8(out.stdout) {
                return Ok(s);
            }
        }
    }
    Ok(String::new())
}

#[tauri::command]
fn ask_nepali_ai(
    question: String,
    code_context: Option<String>,
    active_file: Option<String>,
) -> Result<serde_json::Value, String> {
    let mut prompt = question.clone();
    if let Some(ctx) = code_context {
        if !ctx.trim().is_empty() {
            let file_label = active_file.as_deref().unwrap_or("active.nep");
            prompt = format!("फाइल `{file_label}`:\n```nepali\n{ctx}\n```\n\nप्रश्न: {question}");
        }
    }

    let candidates = [
        "/Users/dibeshrajsubedi/.local/bin/nepali",
        "/usr/local/bin/nepali",
        "/opt/homebrew/bin/nepali",
    ];

    for bin in candidates {
        if std::path::Path::new(bin).exists() {
            if let Ok(out) = std::process::Command::new(bin).args(["ask", &prompt]).output() {
                if out.status.success() {
                    let text = String::from_utf8_lossy(&out.stdout).to_string();
                    if !text.trim().is_empty() {
                        return Ok(serde_json::json!({
                            "answer": text.trim(),
                            "engine": "नेपाली नेटिभ एआई (Native Engine)",
                        }));
                    }
                }
            }
        }
    }

    Ok(serde_json::json!({
        "answer": "",
        "fallback": true
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            run_nepali_code,
            disassemble_nepali_code,
            get_ast_dump,
            get_platform_info,
            get_app_version,
            check_for_updates,
            write_to_clipboard,
            read_from_clipboard,
            ask_nepali_ai
        ])
        .run(tauri::generate_context!())
        .expect("error while running nepali studio application");
}
