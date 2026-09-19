//! A real, deliberately conservative source formatter: re-indents every
//! existing line to match real brace/paren/bracket nesting depth,
//! computed from the real token stream (`lexer::Lexer`) - it never
//! rewrites any line's actual content, only its leading whitespace.
//!
//! **Why this scope, not a full re-flowing pretty-printer**: this
//! language keeps both Devanagari and romanized keyword spellings as a
//! real, deliberate feature (see `lexer.rs`), and `Token::literal`
//! preserves whichever one the user actually typed - a full AST-based
//! pretty-printer that re-serializes from the parsed tree would either
//! have to invent a canonical spelling (silently overriding the user's
//! own keyboard-accessibility choice) or thread that choice through the
//! AST (real, but substantially more work). A pure re-indentation pass
//! sidesteps that question entirely while still fixing the most common
//! real formatting complaint (inconsistent indentation) - real, useful,
//! safe progress, not the full formatter this could eventually become.
//!
//! **Comments survive formatting for real, verified, not assumed**:
//! since this never touches line content, and `Lexer::comments` (a
//! real, additive side-channel - see its own doc) captures comment
//! spans so they correctly contribute to (well, deliberately *don't*
//! affect) depth tracking without needing special-casing, a `//` or
//! `/* */` comment is exactly as safe here as any other line.

use crate::lexer::{Comment, Lexer};
use crate::tokens::{Token, TokenType};
use alloc::collections::BTreeMap;
use alloc::string::String;
use alloc::vec::Vec;

/// Spaces per indent level. A real, stated, currently-fixed choice, not
/// configurable yet.
const INDENT_WIDTH: usize = 4;

enum Item<'a> {
    Token(&'a Token),
    Comment(&'a Comment),
}

impl Item<'_> {
    fn line(&self) -> usize {
        match self {
            Item::Token(t) => t.location.line,
            Item::Comment(c) => c.line,
        }
    }
    fn col(&self) -> usize {
        match self {
            Item::Token(t) => t.location.col,
            Item::Comment(c) => c.col,
        }
    }
}

/// Formats real `.nep` source, returning the reformatted text. Never
/// fails on valid input - even source with a lexer error (an
/// `Illegal` token) still gets consistently re-indented, since
/// indentation depth only depends on real bracket tokens, which lex
/// correctly independent of any later illegal character.
pub fn format(source: &str) -> String {
    let mut lexer = Lexer::new(source);
    let tokens = lexer.tokenize();
    let comments = &lexer.comments;

    let mut items: Vec<Item> = Vec::with_capacity(tokens.len() + comments.len());
    for t in &tokens {
        if t.token_type != TokenType::Eof {
            items.push(Item::Token(t));
        }
    }
    for c in comments {
        items.push(Item::Comment(c));
    }
    items.sort_by_key(|i| (i.line(), i.col()));

    let mut line_indent: BTreeMap<usize, i32> = BTreeMap::new();
    let mut depth: i32 = 0;
    let mut current_line = 0usize;

    for item in &items {
        let line = item.line();
        if line != current_line {
            current_line = line;
            let mut indent = depth;
            if let Item::Token(t) = item {
                if matches!(
                    t.token_type,
                    TokenType::RBrace | TokenType::RParen | TokenType::RBracket
                ) {
                    indent -= 1;
                }
            }
            line_indent.insert(line, indent.max(0));
        }
        if let Item::Token(t) = item {
            match t.token_type {
                TokenType::LBrace | TokenType::LParen | TokenType::LBracket => depth += 1,
                TokenType::RBrace | TokenType::RParen | TokenType::RBracket => depth -= 1,
                _ => {}
            }
        }
    }

    let mut out = String::with_capacity(source.len());
    for (i, line) in source.lines().enumerate() {
        let line_no = i + 1;
        let trimmed = line.trim_end();
        let content = trimmed.trim_start();
        if !content.is_empty() {
            let indent = line_indent.get(&line_no).copied().unwrap_or(0).max(0) as usize;
            for _ in 0..indent {
                for _ in 0..INDENT_WIDTH {
                    out.push(' ');
                }
            }
        }
        out.push_str(content);
        out.push('\n');
    }
    // A real, deliberate trim: `source.lines()` drops any trailing
    // newline already, and the loop above always appends one - this
    // just avoids doubling it if the real source already ended in one,
    // so formatting is genuinely idempotent (formatting output again
    // produces byte-identical output).
    if !source.ends_with('\n') && out.ends_with('\n') {
        out.pop();
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use alloc::string::ToString;
    use alloc::vec;

    #[test]
    fn reindents_a_nested_if_block() {
        let src = "काम क(अ) {\nयदि अ > 0 {\nभनौँ(अ)।\n}\n}";
        let formatted = format(src);
        assert_eq!(
            formatted,
            "काम क(अ) {\n    यदि अ > 0 {\n        भनौँ(अ)।\n    }\n}"
        );
    }

    #[test]
    fn fixes_wrong_existing_indentation() {
        let src = "काम क() {\n        भनौँ(1)।\nभनौँ(2)।\n}";
        let formatted = format(src);
        assert_eq!(formatted, "काम क() {\n    भनौँ(1)।\n    भनौँ(2)।\n}");
    }

    #[test]
    fn formatting_is_idempotent() {
        let src = "काम क(अ) {\nयदि अ > 0 {\nभनौँ(अ)।\n}\n}";
        let once = format(src);
        let twice = format(&once);
        assert_eq!(once, twice);
    }

    #[test]
    fn line_comments_survive_and_are_indented_with_their_line() {
        let src = "काम क() {\n// a real comment\nभनौँ(1)। // trailing\n}";
        let formatted = format(src);
        assert!(formatted.contains("    // a real comment"));
        assert!(formatted.contains("    भनौँ(1)। // trailing"));
    }

    #[test]
    fn block_comments_survive() {
        let src = "काम क() {\n/* block\ncomment */\nभनौँ(1)।\n}";
        let formatted = format(src);
        assert!(formatted.contains("/* block"));
        assert!(formatted.contains("comment */"));
    }

    #[test]
    fn braces_inside_string_literals_do_not_affect_indentation() {
        // A real, meaningful correctness check: "{" inside a string
        // must never be mistaken for a real brace token.
        let src = "काम क() {\nराखौँ पाठ = \"{ not a real brace\"।\nभनौँ(पाठ)।\n}";
        let formatted = format(src);
        assert_eq!(
            formatted,
            "काम क() {\n    राखौँ पाठ = \"{ not a real brace\"।\n    भनौँ(पाठ)।\n}"
        );
    }

    #[test]
    fn braces_inside_comments_do_not_affect_indentation() {
        let src = "काम क() {\n// look at this { brace\nभनौँ(1)।\n}";
        let formatted = format(src);
        assert_eq!(
            formatted,
            "काम क() {\n    // look at this { brace\n    भनौँ(1)।\n}"
        );
    }

    #[test]
    fn formatted_output_still_parses_to_the_same_behavior() {
        // The real, load-bearing correctness property: formatting must
        // never change what the program actually does.
        let src = "काम फिबो(अ) {\nयदि अ < 2 {\nपठाउँ अ।\n}\nपठाउँ फिबो(अ - 1) + फिबो(अ - 2)।\n}\nभनौँ(फिबो(10))।";
        let formatted = format(src);

        let run = |s: &str| -> Vec<String> {
            let mut parser = crate::parser::Parser::new(s);
            let program = parser.parse_program().expect("parse error");
            crate::resolver::Resolver::resolve(&program).expect("resolution error");
            let mut interp = crate::interpreter::Interpreter::new();
            interp.run(&program).expect("runtime error");
            interp.output
        };

        assert_eq!(run(src), run(&formatted));
        assert_eq!(run(src), vec!["55".to_string()]);
    }

    #[test]
    fn blank_lines_stay_blank() {
        let src = "काम क() {\n\nभनौँ(1)।\n}";
        let formatted = format(src);
        assert_eq!(formatted, "काम क() {\n\n    भनौँ(1)।\n}");
    }
}
