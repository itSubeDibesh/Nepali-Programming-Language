//! Native window via wry+tao: opens a standalone native desktop WebView window showing Nepali Studio.
//! Runs cross-platform on macOS (WebKit), Linux (WebKitGTK), and Windows (WebView2).

use std::net::{SocketAddr, TcpStream};
use std::thread;
use std::time::Duration;
use tao::event::{Event, WindowEvent};
use tao::event_loop::{ControlFlow, EventLoopBuilder};
use tao::dpi::LogicalSize;
use tao::window::WindowBuilder;
use wry::WebViewBuilder;

fn is_port_open(port: u16) -> bool {
    let addr: SocketAddr = format!("127.0.0.1:{port}").parse().unwrap_or_else(|_| SocketAddr::from(([127, 0, 0, 1], port)));
    TcpStream::connect_timeout(&addr, Duration::from_millis(80)).is_ok()
}

pub fn run_window(port: u16, nepali_bin: Option<&str>) {
    let bin_str = nepali_bin.map(|s| s.to_string());
    
    // If modern studio server is not yet running on this port, spawn embedded runner
    if !is_port_open(port) {
        thread::spawn(move || {
            super::studio::run_studio(port, true, bin_str.as_deref());
        });
        thread::sleep(Duration::from_millis(250));
    }

    let event_loop = EventLoopBuilder::new().build();
    let window = WindowBuilder::new()
        .with_title("नेपाली स्टुडियो (Nepali Studio IDE)")
        .with_inner_size(LogicalSize::new(1360.0, 880.0))
        .with_min_inner_size(LogicalSize::new(900.0, 600.0))
        .build(&event_loop)
        .expect("failed to create native nepali studio window");

    let studio_url = format!("http://127.0.0.1:{port}");
    let _webview = WebViewBuilder::new()
        .with_url(&studio_url)
        .build(&window)
        .expect("failed to create native webview for nepali studio");

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        match event {
            Event::WindowEvent { event: WindowEvent::CloseRequested, .. } => {
                *control_flow = ControlFlow::Exit;
            }
            _ => {}
        }
    });
}
