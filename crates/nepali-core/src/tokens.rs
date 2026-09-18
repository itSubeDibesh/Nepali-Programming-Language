use alloc::string::String;

#[derive(Debug, Clone, PartialEq)]
pub enum TokenType {
    // Keywords
    Let,        // राखौँ
    Function,   // काम
    If,         // यदि
    Then,       // भए
    Else,       // नत्र
    While,      // भएसम्म
    Return,     // पठाउँ
    Print,      // भनौँ
    True,       // सहि
    False,      // गलत
    Null,       // केहीछैन
    Import,     // आयात

    // Identifiers & Literals
    Ident,      // नाम
    Number,     // अङ्क
    StringLit,  // कुरा

    // Operators
    Assign,     // =
    Plus,       // +
    Minus,      // -
    Multiply,   // *
    Divide,     // /
    Modulo,     // %
    Eq,         // ==
    NotEq,      // !=
    Lt,         // <
    Gt,         // >
    Lte,        // <=
    Gte,        // >=
    And,        // र / ra
    Or,         // वा / wa
    Not,        // होइन / hoina

    // Delimiters
    LParen,     // (
    RParen,     // )
    LBrace,     // {
    RBrace,     // }
    LBracket,   // [
    RBracket,   // ]
    Comma,      // ,
    Purnabiram, // ।
    Semicolon,  // ;

    // Special
    Eof,        // सकियो
    Illegal,    // नबुझिने
}

#[derive(Debug, Clone, PartialEq)]
pub struct Location {
    pub line: usize,
    pub col: usize,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Token {
    pub token_type: TokenType,
    pub literal: String,
    pub number_value: Option<f64>,
    pub string_value: Option<String>,
    pub bool_value: Option<bool>,
    pub location: Location,
}
