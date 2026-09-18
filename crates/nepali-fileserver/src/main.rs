//! A real, minimal HTTP fileserver - upload (PUT/POST), download (GET),
//! and listing (GET /) - built on `tiny_http` (a real, small HTTP/1.1
//! server, not a hand-rolled socket parser). First of the paused
//! services roadmap items in CLAUDE.md, resumed after the four real
//! language-interop bridges landed.
//!
//! **Deliberately flat, single-level filenames only** - same honestly-
//! scoped simplicity as `HostFs`'s own "plain filenames in the current
//! directory, not full paths" contract. A request path containing `/`
//! or `..` is rejected outright (real path-traversal protection, not an
//! afterthought) rather than trying to support real subdirectories here.
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use tiny_http::{Header, Method, Response, Server, StatusCode};

fn main() {
    let port = env::var("NEPALI_FILESERVER_PORT").unwrap_or_else(|_| "8080".to_string());
    let root = env::var("NEPALI_FILES_DIR").unwrap_or_else(|_| "./files".to_string());
    let root = PathBuf::from(root);
    fs::create_dir_all(&root).unwrap_or_else(|e| {
        eprintln!("nepali-fileserver: couldn't create files dir {}: {e}", root.display());
        std::process::exit(1);
    });
    let root = fs::canonicalize(&root).unwrap_or(root);

    let addr = format!("0.0.0.0:{port}");
    let server = Server::http(&addr).unwrap_or_else(|e| {
        eprintln!("nepali-fileserver: couldn't bind {addr}: {e}");
        std::process::exit(1);
    });
    println!("nepali-fileserver: sunirakheko {addr}, files {}", root.display());

    for mut request in server.incoming_requests() {
        let method = request.method().clone();
        let url = request.url().to_string();
        let name = url.trim_start_matches('/');

        let response = match (&method, name) {
            (Method::Get, "") => list_dir(&root),
            (Method::Get, name) => match safe_path(&root, name) {
                Some(path) => serve_file(&path),
                None => bad_request(),
            },
            (Method::Put, name) | (Method::Post, name) => match safe_path(&root, name) {
                Some(path) => {
                    let mut body = Vec::new();
                    if let Err(e) = request.as_reader().read_to_end(&mut body) {
                        text_response(500, format!("read error: {e}"))
                    } else {
                        match fs::write(&path, &body) {
                            Ok(()) => text_response(200, format!("saved: {name} ({} byte(s))", body.len())),
                            Err(e) => text_response(500, format!("write error: {e}")),
                        }
                    }
                }
                None => bad_request(),
            },
            _ => text_response(405, "method not allowed".to_string()),
        };

        let _ = request.respond(response);
    }
}

/// Rejects anything containing `/` or `..` (path traversal), and an
/// empty name - real protection, checked before ever touching the
/// filesystem, not implied by "well the OS will probably reject it".
fn safe_path(root: &Path, name: &str) -> Option<PathBuf> {
    if name.is_empty() || name.contains('/') || name.contains("..") {
        return None;
    }
    Some(root.join(name))
}

fn serve_file(path: &Path) -> Response<std::io::Cursor<Vec<u8>>> {
    match fs::read(path) {
        Ok(contents) => Response::from_data(contents),
        Err(_) => text_response(404, "not found".to_string()),
    }
}

fn list_dir(root: &Path) -> Response<std::io::Cursor<Vec<u8>>> {
    let mut lines = Vec::new();
    if let Ok(entries) = fs::read_dir(root) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    lines.push(format!("{}\t{}", entry.file_name().to_string_lossy(), meta.len()));
                }
            }
        }
    }
    lines.sort();
    text_response(200, lines.join("\n"))
}

fn bad_request() -> Response<std::io::Cursor<Vec<u8>>> {
    text_response(400, "invalid filename (no '/' or '..' allowed)".to_string())
}

fn text_response(status: u16, body: String) -> Response<std::io::Cursor<Vec<u8>>> {
    let header = Header::from_bytes(&b"Content-Type"[..], &b"text/plain; charset=utf-8"[..]).unwrap();
    Response::from_data(body.into_bytes())
        .with_status_code(StatusCode(status))
        .with_header(header)
}
