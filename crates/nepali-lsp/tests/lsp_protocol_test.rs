//! Real, live end-to-end verification: spawns the actual built
//! `nepali-lsp` binary as a real child process and speaks real LSP
//! protocol (`Content-Length`-framed JSON-RPC) to it over real stdio -
//! not a mocked transport, not calling the handler functions directly
//! in-process.

use serde_json::{json, Value};
use std::io::{BufReader, Read, Write};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};

struct Client {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

impl Client {
    fn spawn() -> Self {
        let bin = env!("CARGO_BIN_EXE_nepali-lsp");
        let mut child = Command::new(bin)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("spawn nepali-lsp");
        let stdin = child.stdin.take().unwrap();
        let stdout = BufReader::new(child.stdout.take().unwrap());
        Client { child, stdin, stdout }
    }

    fn send(&mut self, msg: Value) {
        let body = serde_json::to_vec(&msg).unwrap();
        write!(self.stdin, "Content-Length: {}\r\n\r\n", body.len()).unwrap();
        self.stdin.write_all(&body).unwrap();
        self.stdin.flush().unwrap();
    }

    fn read_one(&mut self) -> Value {
        let mut header = Vec::new();
        let mut byte = [0u8; 1];
        loop {
            self.stdout.read_exact(&mut byte).unwrap();
            header.push(byte[0]);
            if header.ends_with(b"\r\n\r\n") {
                break;
            }
        }
        let header = String::from_utf8(header).unwrap();
        let len: usize = header
            .split("Content-Length:")
            .nth(1)
            .unwrap()
            .split("\r\n")
            .next()
            .unwrap()
            .trim()
            .parse()
            .unwrap();
        let mut body = vec![0u8; len];
        self.stdout.read_exact(&mut body).unwrap();
        serde_json::from_slice(&body).unwrap()
    }
}

impl Drop for Client {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

fn initialize(client: &mut Client) {
    client.send(json!({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"capabilities": {}}}));
    client.read_one();
    client.send(json!({"jsonrpc": "2.0", "method": "initialized", "params": {}}));
}

#[test]
fn real_diagnostics_for_a_real_syntax_error() {
    let mut client = Client::spawn();
    initialize(&mut client);

    client.send(json!({
        "jsonrpc": "2.0",
        "method": "textDocument/didOpen",
        "params": {
            "textDocument": {
                "uri": "file:///tmp/bad.nep",
                "languageId": "nepali",
                "version": 1,
                "text": "काम f(x) { यदि x > 0"
            }
        }
    }));
    let diag = client.read_one();
    assert_eq!(diag["method"], "textDocument/publishDiagnostics");
    let diagnostics = diag["params"]["diagnostics"].as_array().unwrap();
    assert_eq!(diagnostics.len(), 1, "expected exactly one real diagnostic: {diag:#?}");
    assert!(diagnostics[0]["message"].as_str().unwrap().contains("LBrace"));
}

#[test]
fn real_diagnostics_clear_for_valid_code_and_flag_undefined_variables() {
    let mut client = Client::spawn();
    initialize(&mut client);

    let good = "काम फिबो(अ) { यदि अ < 2 { पठाउँ अ। } पठाउँ फिबो(अ - 1) + फिबो(अ - 2)। } भनौँ(फिबो(5))।";
    client.send(json!({
        "jsonrpc": "2.0",
        "method": "textDocument/didOpen",
        "params": {"textDocument": {"uri": "file:///tmp/good.nep", "languageId": "nepali", "version": 1, "text": good}}
    }));
    let diag = client.read_one();
    assert_eq!(diag["params"]["diagnostics"].as_array().unwrap().len(), 0);

    client.send(json!({
        "jsonrpc": "2.0",
        "method": "textDocument/didChange",
        "params": {
            "textDocument": {"uri": "file:///tmp/good.nep", "version": 2},
            "contentChanges": [{"text": "भनौँ(नभएको_चर)।"}]
        }
    }));
    let diag2 = client.read_one();
    let diagnostics = diag2["params"]["diagnostics"].as_array().unwrap();
    assert_eq!(diagnostics.len(), 1);
    assert!(diagnostics[0]["message"].as_str().unwrap().contains("नभएको_चर"));
}

#[test]
fn real_formatting_request_returns_the_real_reindented_text() {
    let mut client = Client::spawn();
    initialize(&mut client);

    let messy = "काम क() {\n        भनौँ(1)।\nभनौँ(2)।\n}";
    client.send(json!({
        "jsonrpc": "2.0",
        "method": "textDocument/didOpen",
        "params": {"textDocument": {"uri": "file:///tmp/messy.nep", "languageId": "nepali", "version": 1, "text": messy}}
    }));
    client.read_one(); // diagnostics notification

    client.send(json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "textDocument/formatting",
        "params": {"textDocument": {"uri": "file:///tmp/messy.nep"}, "options": {"tabSize": 4, "insertSpaces": true}}
    }));
    let resp = client.read_one();
    let edits = resp["result"].as_array().unwrap();
    assert_eq!(edits.len(), 1);
    assert_eq!(
        edits[0]["newText"].as_str().unwrap(),
        "काम क() {\n    भनौँ(1)।\n    भनौँ(2)।\n}"
    );
}
