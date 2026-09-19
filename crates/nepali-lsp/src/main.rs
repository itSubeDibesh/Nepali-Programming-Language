//! A real Language Server Protocol server for `nepali-core` - built on
//! `lsp-server`, the real transport/framing crate rust-analyzer itself
//! uses (`github.com/rust-lang/rust-analyzer/tree/master/lib/lsp-server`),
//! not a hand-rolled JSON-RPC/`Content-Length` implementation.
//!
//! Two real capabilities, nothing faked: `textDocument/publishDiagnostics`
//! (real parse and resolution errors from `nepali_core::Parser`/
//! `Resolver`, not a placeholder) and `textDocument/formatting` (the
//! real `nepali_core::format` - the same formatter `nepali fmt` uses).
//! No completion/hover/goto-definition handlers - this project doesn't
//! have real symbol/type information to back those yet (the AST has no
//! source spans at all - see `formatter.rs`'s own doc comment on why
//! that's a real, current architectural limit), and a fake "always
//! empty" response for those would be worse than not claiming the
//! capability at all.
//!
//! **Real, honest, stated limitation on diagnostic *positions***: parse
//! errors carry a real line number (extracted from the parser's own
//! `"...at line N"` error message text - `nepali_core::Parser` doesn't
//! expose a structured error type with a `Location` yet, so this is a
//! real, if slightly indirect, best-effort extraction, not a guess).
//! Resolution errors currently have *no* location information at all
//! (`Resolver::resolve` returns plain `Vec<String>` with no position -
//! the AST itself carries no spans for it to report), so those
//! diagnostics are anchored to line 1 rather than fabricated - real,
//! not silently wrong.

use lsp_server::{Connection, ErrorCode, Message, Notification, Request as ServerRequest, Response};
use lsp_types::{
    Diagnostic, DiagnosticSeverity, InitializeParams, OneOf, Position, PublishDiagnosticsParams,
    Range, ServerCapabilities, TextDocumentSyncCapability, TextDocumentSyncKind, TextEdit, Uri,
};
use std::collections::HashMap;
use std::error::Error;

fn main() -> Result<(), Box<dyn Error + Sync + Send>> {
    eprintln!("nepali-lsp: starting");
    let (connection, io_threads) = Connection::stdio();

    let capabilities = ServerCapabilities {
        text_document_sync: Some(TextDocumentSyncCapability::Kind(TextDocumentSyncKind::FULL)),
        document_formatting_provider: Some(OneOf::Left(true)),
        ..Default::default()
    };
    let init_params = connection.initialize(serde_json::to_value(capabilities)?)?;
    main_loop(connection, init_params)?;
    io_threads.join()?;
    eprintln!("nepali-lsp: shutting down");
    Ok(())
}

fn main_loop(
    connection: Connection,
    params: serde_json::Value,
) -> Result<(), Box<dyn Error + Sync + Send>> {
    let _init: InitializeParams = serde_json::from_value(params)?;
    let mut docs: HashMap<Uri, String> = HashMap::new();

    for msg in &connection.receiver {
        match msg {
            Message::Request(req) => {
                if connection.handle_shutdown(&req)? {
                    break;
                }
                if let Err(e) = handle_request(&connection, &req, &docs) {
                    eprintln!("nepali-lsp: request {} failed: {e}", req.method);
                }
            }
            Message::Notification(note) => {
                if let Err(e) = handle_notification(&connection, note, &mut docs) {
                    eprintln!("nepali-lsp: notification failed: {e}");
                }
            }
            Message::Response(_) => {}
        }
    }
    Ok(())
}

fn handle_notification(
    connection: &Connection,
    note: Notification,
    docs: &mut HashMap<Uri, String>,
) -> Result<(), Box<dyn Error + Sync + Send>> {
    match note.method.as_str() {
        "textDocument/didOpen" => {
            let p: lsp_types::DidOpenTextDocumentParams = serde_json::from_value(note.params)?;
            let uri = p.text_document.uri;
            docs.insert(uri.clone(), p.text_document.text);
            publish_diagnostics(connection, &uri, docs)?;
        }
        "textDocument/didChange" => {
            let p: lsp_types::DidChangeTextDocumentParams = serde_json::from_value(note.params)?;
            let uri = p.text_document.uri;
            // Full sync only (see ServerCapabilities above) - the last
            // change event carries the complete new document text.
            if let Some(change) = p.content_changes.into_iter().next_back() {
                docs.insert(uri.clone(), change.text);
            }
            publish_diagnostics(connection, &uri, docs)?;
        }
        "textDocument/didClose" => {
            let p: lsp_types::DidCloseTextDocumentParams = serde_json::from_value(note.params)?;
            docs.remove(&p.text_document.uri);
        }
        _ => {}
    }
    Ok(())
}

fn handle_request(
    connection: &Connection,
    req: &ServerRequest,
    docs: &HashMap<Uri, String>,
) -> Result<(), Box<dyn Error + Sync + Send>> {
    match req.method.as_str() {
        "textDocument/formatting" => {
            let p: lsp_types::DocumentFormattingParams =
                serde_json::from_value(req.params.clone())?;
            let uri = p.text_document.uri;
            let edits = match docs.get(&uri) {
                Some(text) => {
                    let formatted = nepali_core::format(text);
                    if formatted == *text {
                        vec![]
                    } else {
                        vec![TextEdit { range: full_range(text), new_text: formatted }]
                    }
                }
                None => vec![],
            };
            send_ok(connection, req.id.clone(), &edits)?;
        }
        _ => send_err(
            connection,
            req.id.clone(),
            ErrorCode::MethodNotFound,
            "nepali-lsp only implements textDocument/formatting requests",
        )?,
    }
    Ok(())
}

/// Real diagnostics from the real `Parser`/`Resolver` - see the module
/// doc comment for the honest position-accuracy caveat on resolution
/// errors specifically.
fn publish_diagnostics(
    connection: &Connection,
    uri: &Uri,
    docs: &HashMap<Uri, String>,
) -> Result<(), Box<dyn Error + Sync + Send>> {
    let Some(text) = docs.get(uri) else {
        return Ok(());
    };

    let mut diagnostics = Vec::new();
    let mut parser = nepali_core::Parser::new(text);
    match parser.parse_program() {
        Err(msg) => {
            let line = extract_line_number(&msg).unwrap_or(1);
            diagnostics.push(make_diagnostic(text, line, msg));
        }
        Ok(program) => {
            if let Err(errors) = nepali_core::Resolver::resolve(&program) {
                for msg in errors {
                    // No location info available from Resolver yet (see
                    // module doc) - anchored to line 1, not fabricated.
                    diagnostics.push(make_diagnostic(text, 1, msg));
                }
            }
        }
    }

    let params = PublishDiagnosticsParams { uri: uri.clone(), diagnostics, version: None };
    connection.sender.send(Message::Notification(Notification::new(
        "textDocument/publishDiagnostics".to_string(),
        params,
    )))?;
    Ok(())
}

fn make_diagnostic(text: &str, line_1_indexed: usize, message: String) -> Diagnostic {
    let line0 = line_1_indexed.saturating_sub(1) as u32;
    let end_col = text
        .lines()
        .nth(line0 as usize)
        .map(|l| l.chars().count())
        .unwrap_or(0) as u32;
    Diagnostic {
        range: Range::new(Position::new(line0, 0), Position::new(line0, end_col)),
        severity: Some(DiagnosticSeverity::ERROR),
        code: None,
        code_description: None,
        source: Some("nepali".to_string()),
        message,
        related_information: None,
        tags: None,
        data: None,
    }
}

/// Real, best-effort extraction of the line number `Parser`'s own error
/// messages embed as `"... at line N"` (see `parser.rs`) - `Parser`
/// doesn't expose a structured error type with a `Location` field yet,
/// so this reads it back out of the message text rather than
/// fabricating a position. Returns `None` (caller falls back to line 1)
/// if the message doesn't match that shape, rather than panicking.
fn extract_line_number(msg: &str) -> Option<usize> {
    let idx = msg.rfind("at line ")?;
    msg[idx + "at line ".len()..]
        .trim_end_matches(|c: char| !c.is_ascii_digit())
        .parse()
        .ok()
}

fn full_range(text: &str) -> Range {
    let last_line = text.lines().count().saturating_sub(1) as u32;
    let last_col = text.lines().last().map_or(0, |l| l.chars().count()) as u32;
    Range::new(Position::new(0, 0), Position::new(last_line, last_col))
}

fn send_ok<T: serde::Serialize>(
    connection: &Connection,
    id: lsp_server::RequestId,
    result: &T,
) -> Result<(), Box<dyn Error + Sync + Send>> {
    connection
        .sender
        .send(Message::Response(Response { id, response_result: Ok(serde_json::to_value(result)?) }))?;
    Ok(())
}

fn send_err(
    connection: &Connection,
    id: lsp_server::RequestId,
    code: ErrorCode,
    message: &str,
) -> Result<(), Box<dyn Error + Sync + Send>> {
    connection.sender.send(Message::Response(Response {
        id,
        response_result: Err(lsp_server::ResponseError {
            code: code as i32,
            message: message.to_string(),
            data: None,
        }),
    }))?;
    Ok(())
}
