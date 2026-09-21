use nepali_core::{disassemble_program, dump_ast, HostInput, Interpreter, Mode, Parser, Resolver};
use std::cell::RefCell;
use std::rc::Rc;
use serde::{Deserialize, Serialize};


struct DesktopInput(RefCell<Vec<String>>);
impl HostInput for DesktopInput {
    fn read_line(&self, _prompt: &str) -> Result<String, String> {
        let mut inputs = self.0.borrow_mut();
        if inputs.is_empty() {
            Ok(String::new())
        } else {
            Ok(inputs.remove(0))
        }
    }
}

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
    interp.set_host_input(Rc::new(DesktopInput(RefCell::new(inputs.unwrap_or_default()))));

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

    let home = std::env::var("HOME").unwrap_or_default();
    let candidates = [
        format!("{home}/.cargo/bin/nepali"),
        format!("{home}/.local/bin/nepali"),
        "/usr/local/bin/nepali".to_string(),
        "/opt/homebrew/bin/nepali".to_string(),
        "crates/nepali-core/target/release/nepali-core-cli".to_string(),
        "crates/nepali-core/target/debug/nepali-core-cli".to_string(),
        "../crates/nepali-core/target/release/nepali-core-cli".to_string(),
        "../crates/nepali-core/target/debug/nepali-core-cli".to_string(),
    ];

    for bin in candidates {
        if std::path::Path::new(bin).exists() {
            if let Ok(out) = std::process::Command::new(bin).args(["ask", &prompt]).output() {
                if out.status.success() {
                    let text = String::from_utf8_lossy(&out.stdout).to_string();
                    let clean_text = text.trim();
                    let clean_prompt_echo = prompt.trim();
                    let is_echo = !clean_prompt_echo.is_empty() && clean_text == clean_prompt_echo;

                    if !clean_text.is_empty() && !is_echo {
                        return Ok(serde_json::json!({
                            "answer": clean_text,
                            "engine": "नेपाली नेटिभ एआई (स्थानीय Qwen GGUF मोडेल)",
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

#[derive(Debug, Serialize, Deserialize)]
pub struct NativeFileItem {
    pub id: String,
    pub name: String,
    pub content: String,
    #[serde(rename = "fullPath")]
    pub full_path: String,
    #[serde(rename = "isFolder")]
    pub is_folder: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NativeDirectoryResult {
    #[serde(rename = "rootPath")]
    pub root_path: String,
    #[serde(rename = "rootName")]
    pub root_name: String,
    pub files: Vec<NativeFileItem>,
}

fn scan_dir_recursive(root: &std::path::Path, current: &std::path::Path, files: &mut Vec<NativeFileItem>) {
    let Ok(entries) = std::fs::read_dir(current) else { return; };
    for entry in entries.flatten() {
        let path = entry.path();
        let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if file_name.starts_with('.') || file_name == "node_modules" || file_name == "target" || file_name == ".next" || file_name == "dist" {
            continue;
        }
        if path.is_dir() {
            scan_dir_recursive(root, &path, files);
        } else if path.is_file() {
            if let Ok(meta) = path.metadata() {
                if meta.len() < 2 * 1024 * 1024 {
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        if let Ok(rel) = path.strip_prefix(root) {
                            let rel_str = rel.to_string_lossy().replace('\\', "/");
                            files.push(NativeFileItem {
                                id: path.to_string_lossy().to_string(),
                                name: rel_str,
                                content,
                                full_path: path.to_string_lossy().to_string(),
                                is_folder: false,
                            });
                        }
                    }
                }
            }
        }
    }
}

fn prompt_native_folder_dialog() -> Result<std::path::PathBuf, String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let script = r#"POSIX path of (choose folder with prompt "नेपाली कोडिङ कार्यक्षेत्र फोल्डर चयन गर्नुहोस्:")"#;
        let out = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("Folder dialog error: {e}"))?;
        if out.status.success() {
            let p = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !p.is_empty() {
                return Ok(std::path::PathBuf::from(p));
            }
        }
        return Err("प्रयोगकर्ताले फोल्डर चयन रद्द गर्नुभयो (Cancelled)".into());
    }
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        if let Ok(out) = Command::new("zenity")
            .args(["--file-selection", "--directory", "--title=नेपाली कार्यक्षेत्र फोल्डर"])
            .output()
        {
            if out.status.success() {
                let p = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !p.is_empty() {
                    return Ok(std::path::PathBuf::from(p));
                }
            }
        }
        return Err("Linux folder dialog not available".into());
    }
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let ps_cmd = r#"[System.Reflection.Assembly]::LoadWithPartialName("System.windows.forms") | Out-Null; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = "Select Nepali Workspace Folder"; if ($f.ShowDialog() -eq "OK") { Write-Host -NoNewline $f.SelectedPath }"#;
        if let Ok(out) = Command::new("powershell").args(["-Command", ps_cmd]).output() {
            if out.status.success() {
                let p = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !p.is_empty() {
                    return Ok(std::path::PathBuf::from(p));
                }
            }
        }
        return Err("Windows folder dialog not available".into());
    }
    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        Err("Unsupported OS".into())
    }
}

#[tauri::command]
fn open_native_directory(path: Option<String>) -> Result<NativeDirectoryResult, String> {
    let dir_path = if let Some(p) = path {
        if !p.trim().is_empty() {
            std::path::PathBuf::from(p)
        } else {
            prompt_native_folder_dialog()?
        }
    } else {
        prompt_native_folder_dialog()?
    };

    if !dir_path.exists() || !dir_path.is_dir() {
        return Err("चयन गरिएको डाइरेक्टरी फेला परेन (Directory not found)".into());
    }

    let root_str = dir_path.to_string_lossy().to_string();
    let root_name = dir_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| root_str.clone());

    let mut files = Vec::new();
    scan_dir_recursive(&dir_path, &dir_path, &mut files);
    files.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(NativeDirectoryResult {
        root_path: root_str,
        root_name,
        files,
    })
}

#[tauri::command]
fn save_native_file(full_path: String, content: String) -> Result<(), String> {
    let p = std::path::Path::new(&full_path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("डिरेक्टरी सिर्जना त्रुटि: {e}"))?;
    }
    std::fs::write(p, content).map_err(|e| format!("फाइल बचत त्रुटि: {e}"))?;
    Ok(())
}

#[tauri::command]
fn create_native_file(root_path: String, relative_path: String) -> Result<NativeFileItem, String> {
    let full = std::path::Path::new(&root_path).join(&relative_path);
    if let Some(parent) = full.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("डिरेक्टरी सिर्जना त्रुटि: {e}"))?;
    }
    if !full.exists() {
        std::fs::write(&full, "").map_err(|e| format!("फाइल सिर्जना त्रुटि: {e}"))?;
    }
    let content = std::fs::read_to_string(&full).unwrap_or_default();
    Ok(NativeFileItem {
        id: full.to_string_lossy().to_string(),
        name: relative_path.replace('\\', "/"),
        content,
        full_path: full.to_string_lossy().to_string(),
        is_folder: false,
    })
}

#[tauri::command]
fn create_native_folder(root_path: String, relative_path: String) -> Result<(), String> {
    let full = std::path::Path::new(&root_path).join(&relative_path);
    std::fs::create_dir_all(&full).map_err(|e| format!("फोल्डर सिर्जना त्रुटि: {e}"))?;
    Ok(())
}

#[tauri::command]
fn delete_native_item(full_path: String) -> Result<(), String> {
    let p = std::path::Path::new(&full_path);
    if p.is_dir() {
        std::fs::remove_dir_all(p).map_err(|e| format!("फोल्डर मेटाउन त्रुटि: {e}"))?;
    } else if p.is_file() {
        std::fs::remove_file(p).map_err(|e| format!("फाइल मेटाउन त्रुटि: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
fn rename_native_item(old_path: String, new_path: String) -> Result<(), String> {
    let old = std::path::Path::new(&old_path);
    let new = std::path::Path::new(&new_path);
    if let Some(parent) = new.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("डिरेक्टरी त्रुटि: {e}"))?;
    }
    std::fs::rename(old, new).map_err(|e| format!("नाम परिवर्तन त्रुटि: {e}"))?;
    Ok(())
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
            ask_nepali_ai,
            open_native_directory,
            save_native_file,
            create_native_file,
            create_native_folder,
            delete_native_item,
            rename_native_item
        ])
        .run(tauri::generate_context!())
        .expect("error while running nepali studio application");
}
