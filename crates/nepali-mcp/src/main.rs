//! A real MCP (Model Context Protocol) server exposing this project's
//! real capabilities - running `.nep` scripts, asking the local AI, and
//! running the AI agent loop - as real MCP tools, over the real stdio
//! transport the official `rmcp` SDK provides. Not a hand-rolled JSON-RPC
//! framing implementation.
//!
//! Deliberately reuses the already-built, already-verified `nepali`
//! binary via a real subprocess for every tool, rather than
//! re-implementing the interpreter/AI/agent machinery a second time in
//! this crate: `nepali-core`'s `Host*` implementations
//! (`LinuxFs`/`RealCommand`/`SqliteDb`/`LocalAi`) live as private
//! modules inside `nepali-core-cli`'s own binary target, not as a
//! reusable library surface, so duplicating them here would mean two
//! separately-maintained copies of real, already-tested code drifting
//! apart - a worse outcome than one real process-per-call subprocess
//! hop. Real, honest cost of this choice: each tool call is a fresh
//! `nepali` process, so a model that needs loading (`एआई्सोध्नुहोस्`/
//! `एजेन्ट्_चलाउनुहोस्`) reloads its weights from disk on every single
//! call - real, stated, not hidden.

use rmcp::{
    handler::server::wrapper::Parameters,
    model::{Implementation, ServerCapabilities, ServerConfig},
    schemars, tool, tool_handler, tool_router,
    transport::stdio,
    ServerHandler, ServiceExt,
};
use serde::Deserialize;
use std::env;
use std::io::Write;
use std::process::Command;

/// The real `nepali` binary this server shells out to - configurable via
/// `NEPALI_BIN` (e.g. pointing at a specific build during development),
/// defaulting to whatever `nepali` resolves to on `$PATH` (the real,
/// normal case once `install.sh` or the Docker image has put it there).
fn nepali_bin() -> String {
    env::var("NEPALI_BIN").unwrap_or_else(|_| "nepali".to_string())
}

/// Writes `code` to a real temp `.nep` file and runs it through the
/// real `nepali` binary, returning real combined stdout+stderr (stderr
/// included deliberately - a `.nep` runtime error is real, useful
/// information for whoever's calling this tool, not something to
/// silently swallow).
fn run_nepali_source(code: &str) -> anyhow::Result<String> {
    let mut tmp = tempfile_path();
    tmp.push_str(".nep");
    std::fs::File::create(&tmp)?.write_all(code.as_bytes())?;
    let output = Command::new(nepali_bin()).arg("--mode").arg("sandbox").arg(&tmp).output();
    let _ = std::fs::remove_file(&tmp);
    let output = output?;
    let mut combined = String::from_utf8_lossy(&output.stdout).into_owned();
    let stderr = String::from_utf8_lossy(&output.stderr);
    if !stderr.trim().is_empty() {
        if !combined.is_empty() {
            combined.push('\n');
        }
        combined.push_str(&stderr);
    }
    Ok(combined)
}

fn tempfile_path() -> String {
    let dir = std::env::temp_dir();
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    dir.join(format!("nepali-mcp-{nanos}")).to_string_lossy().into_owned()
}

/// Escapes `s` for safe interpolation inside a real `.nep` string
/// literal (the lexer's own real string syntax - see `lexer.rs::
/// read_string`) - real, minimal escaping (backslash and double-quote),
/// not a full sanitizer, but enough that arbitrary MCP-tool-call text
/// can't break out of the generated script's string literal.
fn nep_string_literal(s: &str) -> String {
    let escaped = s.replace('\\', "\\\\").replace('"', "\\\"");
    format!("\"{escaped}\"")
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
struct RunScriptParams {
    /// Real `.nep` source code to run.
    code: String,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
struct AskAiParams {
    /// The question/prompt to send to the real local AI
    /// (`एआई्सोध्नुहोस्`) - needs `NEPALI_AI_MODEL_PATH`/
    /// `NEPALI_AI_TOKENIZER_PATH` set in this server's environment.
    prompt: String,
}

#[derive(Debug, Deserialize, schemars::JsonSchema)]
struct RunAgentParams {
    /// The goal to give the real AI agent loop
    /// (`एजेन्ट्_चलाउनुहोस्`) - it can read/write files, run real
    /// commands, and check OS state, subject to the same real
    /// destructive-action guardrails as any other agent run.
    goal: String,
    /// Maximum agent steps before giving up (default 6, same default
    /// `एजेन्ट्_चलाउनुहोस्` itself uses).
    max_steps: Option<u32>,
}

#[derive(Clone)]
struct NepaliServer;

#[tool_router]
impl NepaliServer {
    #[tool(description = "Runs real Nepali-language (.nep) source code through the real nepali-core interpreter and returns its real output.")]
    fn run_script(
        &self,
        Parameters(RunScriptParams { code }): Parameters<RunScriptParams>,
    ) -> String {
        match run_nepali_source(&code) {
            Ok(out) => out,
            Err(e) => format!("त्रुटि: {e}"),
        }
    }

    #[tool(description = "Asks the real local AI (एआई्सोध्नुहोस्) a question and returns its real answer.")]
    fn ask_ai(&self, Parameters(AskAiParams { prompt }): Parameters<AskAiParams>) -> String {
        let script = format!("bhana(एआई_सोध्नुहोस्({}))", nep_string_literal(&prompt));
        match run_nepali_source(&script) {
            Ok(out) => out,
            Err(e) => format!("त्रुटि: {e}"),
        }
    }

    #[tool(description = "Runs the real AI agent loop (एजेन्ट्_चलाउनुहोस्) on a goal - it can read/write files and run real commands, subject to real preventive destructive-action guardrails.")]
    fn run_agent(
        &self,
        Parameters(RunAgentParams { goal, max_steps }): Parameters<RunAgentParams>,
    ) -> String {
        let steps = max_steps.unwrap_or(6);
        let script = format!(
            "bhana(एजेन्ट_चलाउनुहोस्({}, {steps}))",
            nep_string_literal(&goal)
        );
        match run_nepali_source(&script) {
            Ok(out) => out,
            Err(e) => format!("त्रुटि: {e}"),
        }
    }
}

#[tool_handler]
impl ServerHandler for NepaliServer {
    fn get_info(&self) -> ServerConfig {
        ServerConfig::new(ServerCapabilities::builder().enable_tools().build())
            .with_server_info(Implementation::new("nepali-mcp", env!("CARGO_PKG_VERSION")))
            .with_instructions(
                "Real MCP server for नेपाली OS's language, local AI, and AI agent - \
                 see run_script/ask_ai/run_agent.",
            )
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let service = NepaliServer.serve(stdio()).await?;
    service.waiting().await?;
    Ok(())
}
