use crate::tokens::{Location, Token, TokenType};
use alloc::string::{String, ToString};
use alloc::vec::Vec;

pub struct Lexer {
    chars: Vec<char>,
    pos: usize,
    line: usize,
    col: usize,
}

impl Lexer {
    pub fn new(input: &str) -> Self {
        Self {
            chars: input.chars().collect(),
            pos: 0,
            line: 1,
            col: 1,
        }
    }

    fn peek(&self) -> Option<char> {
        self.chars.get(self.pos).copied()
    }

    fn peek_next(&self) -> Option<char> {
        self.chars.get(self.pos + 1).copied()
    }

    fn advance(&mut self) -> Option<char> {
        if let Some(&ch) = self.chars.get(self.pos) {
            self.pos += 1;
            if ch == '\n' {
                self.line += 1;
                self.col = 1;
            } else {
                self.col += 1;
            }
            Some(ch)
        } else {
            None
        }
    }

    fn skip_whitespace_and_comments(&mut self) {
        while self.pos < self.chars.len() {
            let ch = match self.peek() {
                Some(c) => c,
                None => break,
            };

            if ch.is_whitespace() {
                self.advance();
                continue;
            }

            if ch == '/' && self.peek_next() == Some('/') {
                while self.pos < self.chars.len() && self.peek() != Some('\n') {
                    self.advance();
                }
                continue;
            }

            if ch == '/' && self.peek_next() == Some('*') {
                self.advance();
                self.advance();
                while self.pos < self.chars.len() {
                    if self.peek() == Some('*') && self.peek_next() == Some('/') {
                        self.advance();
                        self.advance();
                        break;
                    }
                    self.advance();
                }
                continue;
            }

            break;
        }
    }

    fn is_nepali_letter(c: char) -> bool {
        // Exclude the danda/double-danda (।॥, U+0964/U+0965): they fall inside
        // the Devanagari block but are statement punctuation, not letters -
        // without this, "n।" lexes as one identifier instead of `n` + `।`.
        (c.is_alphabetic() || ('\u{0900}'..='\u{097F}').contains(&c) || c == '_')
            && c != '।'
            && c != '॥'
    }

    fn is_nepali_digit(c: char) -> bool {
        c.is_ascii_digit() || ('०'..='९').contains(&c)
    }

    fn nepali_to_ascii_digit(c: char) -> char {
        match c {
            '०' => '0',
            '१' => '1',
            '२' => '2',
            '३' => '3',
            '४' => '4',
            '५' => '5',
            '६' => '6',
            '७' => '7',
            '८' => '8',
            '९' => '9',
            _ => c,
        }
    }

    fn read_identifier(&mut self, loc: Location) -> Token {
        let mut s = String::new();
        while let Some(ch) = self.peek() {
            if Self::is_nepali_letter(ch) || Self::is_nepali_digit(ch) {
                s.push(self.advance().unwrap());
            } else {
                break;
            }
        }

        // Romanized (Latin-script) spellings alongside the canonical
        // Devanagari keywords - a physical keyboard with no Devanagari
        // input method can't type राखौँ/भनौँ/etc. at all, which otherwise
        // locks the language out of any plain PS/2-keyboard context (e.g.
        // kernel/src/task/repl.rs, or just a dev's default keyboard
        // layout). Checked against the whole example/os/.nep corpus for
        // collisions with existing identifiers before adding - none.
        let (token_type, bool_val) = match s.as_str() {
            "राखौँ" | "rakha" => (TokenType::Let, None),
            "काम" | "kaam" => (TokenType::Function, None),
            "यदि" | "yadi" => (TokenType::If, None),
            "भए" | "bhaye" => (TokenType::Then, None),
            "नत्र" | "natra" => (TokenType::Else, None),
            "भएसम्म" | "bhayesamma" => (TokenType::While, None),
            "पठाउँ" | "pathau" => (TokenType::Return, None),
            "भनौँ" | "लेख्नुहोस्" | "bhana" => (TokenType::Print, None),
            "सहि" | "sahi" => (TokenType::True, Some(true)),
            "गलत" | "galat" => (TokenType::False, Some(false)),
            "केहीछैन" | "kehichaina" => (TokenType::Null, None),
            "आयात" | "aayat" => (TokenType::Import, None),
            "र" | "ra" => (TokenType::And, None),
            "वा" | "wa" => (TokenType::Or, None),
            "होइन" | "hoina" => (TokenType::Not, None),
            _ => (TokenType::Ident, None),
        };

        Token {
            token_type,
            literal: s,
            number_value: None,
            string_value: None,
            bool_value: bool_val,
            location: loc,
        }
    }

    fn read_number(&mut self, loc: Location) -> Token {
        let mut s = String::new();
        let mut has_dot = false;

        while let Some(ch) = self.peek() {
            if Self::is_nepali_digit(ch) {
                s.push(self.advance().unwrap());
            } else if ch == '.' && !has_dot {
                has_dot = true;
                s.push(self.advance().unwrap());
            } else {
                break;
            }
        }

        let ascii_str: String = s.chars().map(Self::nepali_to_ascii_digit).collect();
        let val = ascii_str.parse::<f64>().ok();

        Token {
            token_type: TokenType::Number,
            literal: s,
            number_value: val,
            string_value: None,
            bool_value: None,
            location: loc,
        }
    }

    fn read_string(&mut self, loc: Location) -> Token {
        let quote = self.advance().unwrap();
        let mut s = String::new();

        while let Some(ch) = self.peek() {
            if ch == quote {
                break;
            }
            // A literal newline is real content, not a terminator - real
            // multi-line source for another language (Python/Go/JS/Rust
            // interop, see CLAUDE.md) is exactly the case this matters
            // for: `पाइथन_चलाउनुहोस्("...")` needs its argument to be able
            // to span real lines, not force everything onto one line
            // with `;` separators. `advance()` already tracks line/col
            // correctly across an embedded '\n' (see its own body), so
            // nothing else here needs to change to support this.
            if ch == '\\' && self.peek_next().is_some() {
                self.advance();
                let escaped = self.advance().unwrap();
                match escaped {
                    'n' => s.push('\n'),
                    't' => s.push('\t'),
                    'r' => s.push('\r'),
                    '"' => s.push('"'),
                    '\'' => s.push('\''),
                    '\\' => s.push('\\'),
                    other => s.push(other),
                }
                continue;
            }
            s.push(self.advance().unwrap());
        }

        if self.peek() == Some(quote) {
            self.advance();
        }

        Token {
            token_type: TokenType::StringLit,
            literal: s.clone(),
            number_value: None,
            string_value: Some(s),
            bool_value: None,
            location: loc,
        }
    }

    pub fn next_token(&mut self) -> Token {
        self.skip_whitespace_and_comments();

        let loc = Location {
            line: self.line,
            col: self.col,
        };

        let ch = match self.peek() {
            Some(c) => c,
            None => {
                return Token {
                    token_type: TokenType::Eof,
                    literal: String::new(),
                    number_value: None,
                    string_value: None,
                    bool_value: None,
                    location: loc,
                }
            }
        };

        let next = self.peek_next();

        // 2-character operators
        if ch == '=' && next == Some('=') {
            self.advance(); self.advance();
            return Token { token_type: TokenType::Eq, literal: "==".into(), number_value: None, string_value: None, bool_value: None, location: loc };
        }
        if ch == '!' && next == Some('=') {
            self.advance(); self.advance();
            return Token { token_type: TokenType::NotEq, literal: "!=".into(), number_value: None, string_value: None, bool_value: None, location: loc };
        }
        if ch == '<' && next == Some('=') {
            self.advance(); self.advance();
            return Token { token_type: TokenType::Lte, literal: "<=".into(), number_value: None, string_value: None, bool_value: None, location: loc };
        }
        if ch == '>' && next == Some('=') {
            self.advance(); self.advance();
            return Token { token_type: TokenType::Gte, literal: ">=".into(), number_value: None, string_value: None, bool_value: None, location: loc };
        }

        // Single characters
        match ch {
            '।' => { self.advance(); Token { token_type: TokenType::Purnabiram, literal: "।".into(), number_value: None, string_value: None, bool_value: None, location: loc } }
            ';' => { self.advance(); Token { token_type: TokenType::Semicolon, literal: ";".into(), number_value: None, string_value: None, bool_value: None, location: loc } }
            '=' => { self.advance(); Token { token_type: TokenType::Assign, literal: "=".into(), number_value: None, string_value: None, bool_value: None, location: loc } }
            '+' => { self.advance(); Token { token_type: TokenType::Plus, literal: "+".into(), number_value: None, string_value: None, bool_value: None, location: loc } }
            '-' => { self.advance(); Token { token_type: TokenType::Minus, literal: "-".into(), number_value: None, string_value: None, bool_value: None, location: loc } }
            '*' => { self.advance(); Token { token_type: TokenType::Multiply, literal: "*".into(), number_value: None, string_value: None, bool_value: None, location: loc } }
            '/' => { self.advance(); Token { token_type: TokenType::Divide, literal: "/".into(), number_value: None, string_value: None, bool_value: None, location: loc } }
            '%' => { self.advance(); Token { token_type: TokenType::Modulo, literal: "%".into(), number_value: None, string_value: None, bool_value: None, location: loc } }
            '<' => { self.advance(); Token { token_type: TokenType::Lt, literal: "<".into(), number_value: None, string_value: None, bool_value: None, location: loc } }
            '>' => { self.advance(); Token { token_type: TokenType::Gt, literal: ">".into(), number_value: None, string_value: None, bool_value: None, location: loc } }
            '(' => { self.advance(); Token { token_type: TokenType::LParen, literal: "(".into(), number_value: None, string_value: None, bool_value: None, location: loc } }
            ')' => { self.advance(); Token { token_type: TokenType::RParen, literal: ")".into(), number_value: None, string_value: None, bool_value: None, location: loc } }
            '{' => { self.advance(); Token { token_type: TokenType::LBrace, literal: "{".into(), number_value: None, string_value: None, bool_value: None, location: loc } }
            '}' => { self.advance(); Token { token_type: TokenType::RBrace, literal: "}".into(), number_value: None, string_value: None, bool_value: None, location: loc } }
            '[' => { self.advance(); Token { token_type: TokenType::LBracket, literal: "[".into(), number_value: None, string_value: None, bool_value: None, location: loc } }
            ']' => { self.advance(); Token { token_type: TokenType::RBracket, literal: "]".into(), number_value: None, string_value: None, bool_value: None, location: loc } }
            ',' => { self.advance(); Token { token_type: TokenType::Comma, literal: ",".into(), number_value: None, string_value: None, bool_value: None, location: loc } }
            '"' | '\'' => self.read_string(loc),
            _ if Self::is_nepali_digit(ch) => self.read_number(loc),
            _ if Self::is_nepali_letter(ch) => self.read_identifier(loc),
            _ => {
                let ch_str = self.advance().unwrap().to_string();
                Token { token_type: TokenType::Illegal, literal: ch_str, number_value: None, string_value: None, bool_value: None, location: loc }
            }
        }
    }

    pub fn tokenize(&mut self) -> Vec<Token> {
        let mut tokens = Vec::new();
        loop {
            let tok = self.next_token();
            let is_eof = tok.token_type == TokenType::Eof;
            tokens.push(tok);
            if is_eof {
                break;
            }
        }
        tokens
    }
}
