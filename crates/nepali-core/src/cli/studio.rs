use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tiny_http::{Method, Response, Server, StatusCode};

/// Embedded assets (built at compile time).
const INDEX_HTML: &[u8] = include_bytes!("../../../../studio/index.html");
const TRANSLIT_JS: &[u8] = include_bytes!("../../../../studio/translit.js");

struct Config {
    _port: u16,
    token: String,
    workdir: PathBuf,
    examples_dir: PathBuf,
}

impl Config {
    fn load_token() -> String {
        let path = dirs_path().join("studio-token");
        if let Ok(tok) = fs::read_to_string(&path) {
            let tok = tok.trim().to_string();
            if tok.len() >= 16 {
                return tok;
            }
        }
        let tok = generate_token();
        let _ = fs::create_dir_all(path.parent().unwrap());
        let _ = fs::write(&tok_path(), &tok);
        tok
    }
}

fn dirs_path() -> PathBuf {
    dirs_home().join(".nepali")
}

fn dirs_home() -> PathBuf {
    env::var("HOME")
        .or_else(|_| env::var("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
}

fn tok_path() -> PathBuf {
    dirs_path().join("studio-token")
}

fn generate_token() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let t = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{t:032x}")
}

fn host_ok(headers: &[(String, String)]) -> bool {
    for (k, v) in headers {
        if k.eq_ignore_ascii_case("Host") {
            let host = v.split(':').next().unwrap_or("");
            return host == "127.0.0.1" || host == "localhost";
        }
    }
    false
}

fn authed(headers: &[(String, String)], token: &str) -> bool {
    for (k, v) in headers {
        if k.eq_ignore_ascii_case("X-Token") {
            return v == token;
        }
    }
    false
}

fn example_title(path: &Path) -> String {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| {
            s.lines()
                .next()
                .map(|l| l.trim_start_matches("// ").trim().to_string())
        })
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| path.file_name().unwrap_or_default().to_string_lossy().into_owned())
}

fn run_nepali(nepali_bin: &Path, args: &[&str], _timeout: Duration, cwd: &Path) -> String {
    let mut cmd = std::process::Command::new(nepali_bin);
    cmd.arg("--mode").arg("sandbox");
    cmd.args(args);
    cmd.current_dir(cwd);
    cmd.env("NEPALI_SCRIPT", "devanagari");
    cmd.env("NEPALI_DIGITS", "devanagari");

    match cmd.output() {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).into_owned();
            let stderr = String::from_utf8_lossy(&out.stderr).into_owned();
            let rc = out.status.code().unwrap_or(-1);
            format!(
                "{{\"stdout\":{},\"stderr\":{},\"rc\":{rc}}}",
                escape_json(&stdout),
                escape_json(&stderr)
            )
        }
        Err(e) => {
            let msg = format!("nepali चलाउन सकिएन: {e}");
            format!(
                "{{\"stdout\":\"\",\"stderr\":{},\"rc\":127}}",
                escape_json(&msg)
            )
        }
    }
}

fn escape_json(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if c < '\x20' => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

/// Body is a JSON object; extract the "code" or "q" field.
fn extract_json_field(body: &[u8], field: &str) -> String {
    let s = String::from_utf8_lossy(body);
    let key = format!("\"{field}\"");
    if let Some(start) = s.find(&key) {
        let rest = &s[start + key.len()..];
        // Find the colon after the key.
        if let Some(colon) = rest.find(':') {
            let val = &rest[colon + 1..].trim_start();
            if val.starts_with('"') {
                // Find the closing quote, handling escapes.
                let mut chars = val[1..].chars();
                let mut escaped = false;
                let mut result = String::new();
                for c in chars.by_ref() {
                    if escaped {
                        match c {
                            'n' => result.push('\n'),
                            'r' => result.push('\r'),
                            't' => result.push('\t'),
                            '"' => result.push('"'),
                            '\\' => result.push('\\'),
                            _ => {
                                result.push('\\');
                                result.push(c);
                            }
                        }
                        escaped = false;
                    } else if c == '\\' {
                        escaped = true;
                    } else if c == '"' {
                        return result;
                    } else {
                        result.push(c);
                    }
                }
                return result;
            }
        }
    }
    String::new()
}

pub fn run_studio(port: u16, no_open: bool, nepali_bin: Option<&str>) {
    let bin = nepali_bin
        .map(PathBuf::from)
        .or_else(|| env::var("NEPALI_BIN").ok().map(PathBuf::from))
        .or_else(|| env::current_exe().ok())
        .filter(|p| p.exists())
        .and_then(|p| fs::canonicalize(p).ok())
        .unwrap_or_else(|| {
            eprintln!("nepali studio: binary not found (--nepali or NEPALI_BIN)");
            std::process::exit(1);
        });

    let token = Config::load_token();
    let examples_dir = find_examples();
    let workdir = env::temp_dir().join("nepali-studio");
    let _ = fs::create_dir_all(&workdir);

    let server = Server::http(format!("127.0.0.1:{port}"))
        .expect("nepali studio: could not start server");

    let url = format!("http://127.0.0.1:{port}#{token}");
    println!("Nepali Studio: {url}\n(Ctrl+C to stop)");

    if !no_open {
        let _ = webbrowser_open(&url);
    }

    let config = Config {
        _port: port,
        token,
        workdir,
        examples_dir,
    };

    for mut request in server.incoming_requests() {
        let method = request.method().clone();
        let url = request.url().to_string();
        let headers: Vec<(String, String)> = request
            .headers()
            .iter()
            .map(|h| (h.field.to_string(), h.value.to_string()))
            .collect();

        let mut body = Vec::new();
        let _ = request.as_reader().read_to_end(&mut body);

        let resp = handle_request(&config, &bin, &method, &url, &headers, &body);
        let _ = request.respond(resp);
    }
}

fn handle_request(
    config: &Config,
    bin: &Path,
    method: &Method,
    url: &str,
    headers: &[(String, String)],
    body: &[u8],
) -> Response<std::io::Cursor<Vec<u8>>> {
    // Host check.
    if !host_ok(headers) {
        return json_response(403, r#"{"error":"bad host"}"#);
    }

    let path = url.split('?').next().unwrap_or(url);

    match method {
        Method::Get if path == "/" => Response::from_data(INDEX_HTML)
            .with_header(tiny_http::Header::from_bytes("Content-Type", "text/html; charset=utf-8").unwrap()),
        Method::Get if path == "/translit.js" => Response::from_data(TRANSLIT_JS)
            .with_header(tiny_http::Header::from_bytes("Content-Type", "text/javascript; charset=utf-8").unwrap()),
        Method::Get if !authed(headers, &config.token) => json_response(403, r#"{"error":"bad token"}"#),
        Method::Get if path == "/api/examples" => {
            let items = list_examples(&config.examples_dir);
            json_response(200, &items)
        }
        Method::Get if path == "/api/example" => {
            let name = url
                .split('?')
                .nth(1)
                .and_then(|q| {
                    q.split('&')
                        .find(|p| p.starts_with("name="))
                        .map(|p| &p[5..])
                })
                .unwrap_or("");
            let name = name.split('/').last().unwrap_or(name);
            if name.ends_with(".nep") || name.ends_with(".nepali") || name.ends_with(".नेपाली") || name.ends_with(".नेप") {
                let p = config.examples_dir.join(name);
                if p.exists() {
                    if let Ok(code) = fs::read_to_string(&p) {
                        return json_response(
                            200,
                            &format!("{{\"code\":{}}}", escape_json(&code)),
                        );
                    }
                }
            }
            json_response(404, r#"{"error":"not found"}"#)
        }
        Method::Get => json_response(404, r#"{"error":"not found"}"#),
        Method::Post if !authed(headers, &config.token) => json_response(403, r#"{"error":"bad token"}"#),
        Method::Post if path == "/api/run" => {
            let code = extract_json_field(body, "code");
            let run_file = config.workdir.join("run.nep");
            let _ = fs::write(&run_file, &code);
            let result = run_nepali(
                bin,
                &[run_file.to_str().unwrap_or("")],
                Duration::from_secs(120),
                &config.examples_dir,
            );
            json_response(200, &result)
        }
        Method::Post if path == "/api/ask" => {
            let q = extract_json_field(body, "q");
            if q.trim().is_empty() {
                return json_response(400, r#"{"error":"empty question"}"#);
            }
            let result = run_nepali(bin, &["ask", &q], Duration::from_secs(900), &config.workdir);
            json_response(200, &result)
        }
        Method::Post => json_response(404, r#"{"error":"not found"}"#),
        _ => json_response(405, r#"{"error":"method not allowed"}"#),
    }
}

fn json_response(code: u16, body: &str) -> Response<std::io::Cursor<Vec<u8>>> {
    let data = body.as_bytes().to_vec();
    Response::from_data(data)
        .with_status_code(StatusCode(code))
        .with_header(tiny_http::Header::from_bytes("Content-Type", "application/json; charset=utf-8").unwrap())
        .with_header(tiny_http::Header::from_bytes("Cache-Control", "no-store").unwrap())
}

fn list_examples(dir: &Path) -> String {
    let mut items: Vec<String> = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        let mut paths: Vec<PathBuf> = entries
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| {
                p.file_name()
                    .and_then(|n| n.to_str())
                    .map(|n| n.starts_with(char::is_numeric) && (n.ends_with(".nep") || n.ends_with(".nepali") || n.ends_with(".नेपाली") || n.ends_with(".नेप")))
                    .unwrap_or(false)
            })
            .collect();
        paths.sort();
        for p in paths {
            let name = p.file_name().unwrap().to_string_lossy().into_owned();
            let title = example_title(&p);
            items.push(format!(
                "{{\"name\":{},\"title\":{}}}",
                escape_json(&name),
                escape_json(&title)
            ));
        }
    }
    format!("[{}]", items.join(","))
}

fn find_examples() -> PathBuf {
    // Check relative to the binary's location (dev builds and installed).
    if let Ok(exe) = env::current_exe() {
        if let Some(dir) = exe.parent() {
            // Dev build: target/debug/nepali-core-cli -> repo/examples
            let dev = dir.join("../../../../examples");
            if dev.exists() {
                return dev;
            }
            // Installed: /usr/local/bin/nepali -> /usr/local/share/nepali/examples
            let installed = dir.join("../share/nepali/examples");
            if installed.exists() {
                return installed;
            }
        }
    }
    // Fallback: walk up from CWD to find examples/.
    let mut dir = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    loop {
        let candidate = dir.join("examples");
        if candidate.exists() {
            return candidate;
        }
        if !dir.pop() {
            break;
        }
    }
    PathBuf::from("examples")
}

fn webbrowser_open(url: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(url)
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "macos"))]
    #[cfg(not(target_os = "linux"))]
    {
        Ok(())
    }
}
