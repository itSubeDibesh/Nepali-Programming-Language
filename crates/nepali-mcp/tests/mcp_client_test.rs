//! Real, live end-to-end verification: spawns the actual built
//! `nepali-mcp` binary as a real child process and speaks real MCP
//! protocol to it over real stdio, via the official SDK's client side -
//! not a mocked transport, not a unit test calling the tool functions
//! directly in-process.

use rmcp::{
    model::CallToolRequestParams,
    transport::{ConfigureCommandExt, TokioChildProcess},
    ServiceExt,
};
use serde_json::json;

fn nepali_mcp_binary() -> std::path::PathBuf {
    // Cargo sets this automatically for integration tests in a package
    // that also has a binary target - the real, reliable way to find
    // it, not path-guessing relative to the test binary's own location.
    std::path::PathBuf::from(env!("CARGO_BIN_EXE_nepali-mcp"))
}

#[tokio::test]
async fn real_mcp_server_lists_and_runs_a_real_script() {
    let bin = nepali_mcp_binary();
    assert!(bin.exists(), "nepali-mcp binary not built at {bin:?}");

    let transport = TokioChildProcess::new(tokio::process::Command::new(&bin).configure(|_| {}))
        .expect("spawn nepali-mcp");
    let client = ().serve(transport).await.expect("MCP handshake");

    let tools = client.list_all_tools().await.expect("tools/list");
    let names: Vec<&str> = tools.iter().map(|t| t.name.as_ref()).collect();
    assert!(names.contains(&"run_script"), "tools: {names:?}");
    assert!(names.contains(&"ask_ai"), "tools: {names:?}");
    assert!(names.contains(&"run_agent"), "tools: {names:?}");

    let mut args = serde_json::Map::new();
    args.insert(
        "code".to_string(),
        json!("भनौँ(\"hello from real mcp\")।"),
    );
    let result = client
        .call_tool(CallToolRequestParams::new("run_script").with_arguments(args))
        .await
        .expect("tools/call run_script");

    let text = result
        .content
        .iter()
        .filter_map(|c| c.as_text())
        .map(|t| t.text.clone())
        .collect::<Vec<_>>()
        .join("\n");
    assert!(
        text.contains("hello from real mcp"),
        "real script output missing from MCP response: {text:?}"
    );

    client.cancel().await.expect("clean shutdown");
}

/// Only runs when a real local model is configured (same env vars
/// एआई्सोध्नुहोस् itself needs) - skips cleanly otherwise rather than
/// failing CI/default `cargo test` runs that don't have gigabytes of
/// model weights on hand.
#[tokio::test]
async fn real_mcp_server_asks_the_real_local_ai() {
    if std::env::var("NEPALI_AI_MODEL_PATH").is_err() {
        eprintln!("skipping: NEPALI_AI_MODEL_PATH not set");
        return;
    }

    let bin = nepali_mcp_binary();
    let transport = TokioChildProcess::new(tokio::process::Command::new(&bin).configure(|_| {}))
        .expect("spawn nepali-mcp");
    let client = ().serve(transport).await.expect("MCP handshake");

    let mut args = serde_json::Map::new();
    args.insert(
        "prompt".to_string(),
        json!("What is the capital of Nepal? Answer in one sentence."),
    );
    let result = client
        .call_tool(CallToolRequestParams::new("ask_ai").with_arguments(args))
        .await
        .expect("tools/call ask_ai");

    let text = result
        .content
        .iter()
        .filter_map(|c| c.as_text())
        .map(|t| t.text.clone())
        .collect::<Vec<_>>()
        .join("\n");
    assert!(
        text.to_lowercase().contains("kathmandu"),
        "real AI answer via MCP missing expected content: {text:?}"
    );

    client.cancel().await.expect("clean shutdown");
}
