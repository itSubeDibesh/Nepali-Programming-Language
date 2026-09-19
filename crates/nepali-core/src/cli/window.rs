//! Native window via wry+tao: opens a WebView showing the embedded Studio HTML.
//! Only compiles when the `gui` feature is enabled.

use std::fs;
use tao::event::{Event, WindowEvent};
use tao::event_loop::{ControlFlow, EventLoopBuilder};
use tao::dpi::LogicalSize;
use tao::window::WindowBuilder;
use wry::WebViewBuilder;

pub fn run_window(_port: u16) {
    let html_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../studio/index.html");
    let html = fs::read_to_string(&html_path)
        .unwrap_or_else(|e| panic!("failed to read {}: {e}", html_path.display()));

    let event_loop = EventLoopBuilder::new().build();
    let window = WindowBuilder::new()
        .with_title("नेपाली स्टुडियो")
        .with_inner_size(LogicalSize::new(1200.0, 800.0))
        .build(&event_loop)
        .expect("failed to create window");

    let _webview = WebViewBuilder::new()
        .with_html(html)
        .build(&window)
        .expect("failed to create webview");

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
