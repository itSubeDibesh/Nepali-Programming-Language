//! Native window via wry+tao: opens a standalone native desktop WebView window showing Nepali Studio.
//! Runs cross-platform on macOS (WebKit), Linux (WebKitGTK), and Windows (WebView2).

use std::env;
use std::net::{SocketAddr, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, ExitCode};
use std::thread;
use std::time::Duration;
use tao::dpi::LogicalSize;
use tao::event::{Event, WindowEvent};
use tao::event_loop::{ControlFlow, EventLoopBuilder};
use tao::window::WindowBuilder;
use wry::WebViewBuilder;

fn is_port_open(port: u16) -> bool {
    let addr: SocketAddr = format!("127.0.0.1:{port}").parse().unwrap_or_else(|_| SocketAddr::from(([127, 0, 0, 1], port)));
    TcpStream::connect_timeout(&addr, Duration::from_millis(80)).is_ok()
}

fn find_node() -> Option<PathBuf> {
    let home = env::var("HOME").unwrap_or_default();
    let mut candidates = vec![
        format!("{home}/.local/share/tokless/node/bin/node"),
        format!("{home}/.local/bin/node"),
        "/opt/homebrew/bin/node".to_string(),
        "/usr/local/bin/node".to_string(),
        "/usr/bin/node".to_string(),
    ];

    // Check NVM paths
    let nvm_base = PathBuf::from(&home).join(".nvm/versions/node");
    if let Ok(entries) = std::fs::read_dir(nvm_base) {
        for entry in entries.flatten() {
            let p = entry.path().join("bin/node");
            if p.exists() {
                candidates.push(p.to_string_lossy().into_owned());
            }
        }
    }

    for c in &candidates {
        let p = PathBuf::from(c);
        if p.exists() {
            return Some(p);
        }
    }
    if let Ok(out) = Command::new("which").arg("node").output() {
        if out.status.success() {
            let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !s.is_empty() {
                return Some(PathBuf::from(s));
            }
        }
    }
    None
}

fn try_start_bundled_server(port: u16, exe_path: &Path) -> Option<Child> {
    let studio_server = exe_path
        .parent()?
        .join("../Resources/studio/server.js");

    if studio_server.exists() {
        if let Some(node) = find_node() {
            let studio_dir = studio_server.parent()?;
            let mut cmd = Command::new(&node);
            cmd.arg("server.js");
            cmd.current_dir(studio_dir);
            cmd.env("PORT", port.to_string());
            cmd.env("NODE_ENV", "production");
            cmd.env("NEPALI_BIN", exe_path);

            // Pass enriched PATH so node and nepali can find standard toolchains
            let home = env::var("HOME").unwrap_or_default();
            let node_dir = node.parent().map(|p| p.to_string_lossy().into_owned()).unwrap_or_default();
            let path_val = format!("{node_dir}:{home}/.cargo/bin:{home}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin");
            cmd.env("PATH", path_val);

            if let Ok(child) = cmd.spawn() {
                return Some(child);
            }
        }
    }
    None
}

pub fn run_window(port: u16, nepali_bin: Option<&str>) -> ExitCode {
    let exe = env::current_exe().unwrap_or_else(|_| PathBuf::from("nepali"));
    let mut server_process: Option<Child> = None;

    // 1. If modern studio server is not yet running on this port, spawn it
    if !is_port_open(port) {
        server_process = try_start_bundled_server(port, &exe);

        // Wait up to 2 seconds for server readiness
        for _ in 0..20 {
            if is_port_open(port) {
                break;
            }
            thread::sleep(Duration::from_millis(100));
        }

        // Fallback to embedded tiny_http if Next.js standalone not present
        if !is_port_open(port) {
            let bin_str = nepali_bin.map(|s| s.to_string());
            thread::spawn(move || {
                super::studio::run_studio(port, true, bin_str.as_deref());
            });
            thread::sleep(Duration::from_millis(250));
        }
    }

    let event_loop = EventLoopBuilder::new().build();

    let window = WindowBuilder::new()
        .with_title("नेपाली स्टुडियो (Nepali Studio IDE)")
        .with_inner_size(LogicalSize::new(1360.0, 880.0))
        .with_min_inner_size(LogicalSize::new(900.0, 600.0))
        .build(&event_loop)
        .expect("failed to create native nepali studio window");

    // Standard macOS shortcuts polyfill (Cmd+C, Cmd+V, Cmd+X, Cmd+A, Cmd+Z) for WebKit
    let init_script = r#"
        window.addEventListener('keydown', function(e) {
            if (e.metaKey) {
                var k = e.key.toLowerCase();
                if (k === 'c' && !window.getSelection().isCollapsed) {
                    document.execCommand('copy');
                } else if (k === 'x' && !window.getSelection().isCollapsed) {
                    document.execCommand('cut');
                } else if (k === 'a' && document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                    document.activeElement.select();
                }
            }
        }, true);
    "#;

    let studio_url = format!("http://127.0.0.1:{port}");
    let _webview = WebViewBuilder::new()
        .with_url(&studio_url)
        .with_initialization_script(init_script)
        .build(&window)
        .expect("failed to create native webview for nepali studio");

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        match event {
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => {
                if let Some(mut child) = server_process.take() {
                    let _ = child.kill();
                }
                *control_flow = ControlFlow::Exit;
            }
            _ => {}
        }
    });

    #[allow(unreachable_code)]
    ExitCode::SUCCESS
}
