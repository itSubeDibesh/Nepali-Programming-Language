use crate::ast::{BinOp, Expr, Stmt};
use crate::lexer::Lexer;
use crate::tokens::{Token, TokenType};
use alloc::boxed::Box;
use alloc::format;
use alloc::string::String;
use alloc::vec::Vec;

pub struct Parser {
    tokens: Vec<Token>,
    pos: usize,
}

pub type ParseResult<T> = Result<T, String>;

impl Parser {
    pub fn new(input: &str) -> Self {
        let mut lexer = Lexer::new(input);
        let tokens = lexer.tokenize();
        Parser { tokens, pos: 0 }
    }

    fn peek(&self) -> &Token {
        &self.tokens[self.pos.min(self.tokens.len() - 1)]
    }

    fn peek_type(&self) -> &TokenType {
        &self.peek().token_type
    }

    fn advance(&mut self) -> Token {
        let tok = self.peek().clone();
        if self.pos < self.tokens.len() - 1 {
            self.pos += 1;
        }
        tok
    }

    fn check(&self, tt: &TokenType) -> bool {
        self.peek_type() == tt
    }

    fn matches(&mut self, tt: &TokenType) -> bool {
        if self.check(tt) {
            self.advance();
            true
        } else {
            false
        }
    }

    fn expect(&mut self, tt: TokenType) -> ParseResult<Token> {
        if self.check(&tt) {
            Ok(self.advance())
        } else {
            Err(format!(
                "expected {:?}, found {:?} ({:?}) at line {}",
                tt,
                self.peek_type(),
                self.peek().literal,
                self.peek().location.line
            ))
        }
    }

    fn skip_terminators(&mut self) {
        while self.check(&TokenType::Purnabiram) || self.check(&TokenType::Semicolon) {
            self.advance();
        }
    }

    pub fn parse_program(&mut self) -> ParseResult<Vec<Stmt>> {
        let mut stmts = Vec::new();
        self.skip_terminators();
        while !self.check(&TokenType::Eof) {
            stmts.push(self.parse_stmt()?);
            self.skip_terminators();
        }
        Ok(stmts)
    }

    fn parse_block(&mut self) -> ParseResult<Vec<Stmt>> {
        self.expect(TokenType::LBrace)?;
        let mut stmts = Vec::new();
        self.skip_terminators();
        while !self.check(&TokenType::RBrace) && !self.check(&TokenType::Eof) {
            stmts.push(self.parse_stmt()?);
            self.skip_terminators();
        }
        self.expect(TokenType::RBrace)?;
        Ok(stmts)
    }

    fn parse_stmt(&mut self) -> ParseResult<Stmt> {
        match self.peek_type() {
            TokenType::Let => self.parse_let(),
            TokenType::Print => self.parse_print(),
            TokenType::If => self.parse_if(),
            TokenType::While => self.parse_while(),
            TokenType::Function => self.parse_function_decl(),
            TokenType::Return => self.parse_return(),
            TokenType::Import => self.parse_import(),
            _ => {
                let expr = self.parse_expr()?;
                Ok(Stmt::ExprStmt(expr))
            }
        }
    }

    fn parse_import(&mut self) -> ParseResult<Stmt> {
        self.expect(TokenType::Import)?;
        let path_tok = self.expect(TokenType::StringLit)?;
        Ok(Stmt::Import(path_tok.string_value.unwrap_or_default()))
    }

    fn parse_let(&mut self) -> ParseResult<Stmt> {
        self.expect(TokenType::Let)?;
        let name_tok = self.expect(TokenType::Ident)?;
        self.expect(TokenType::Assign)?;
        let value = self.parse_expr()?;
        Ok(Stmt::Let(name_tok.literal, value))
    }

    fn parse_print(&mut self) -> ParseResult<Stmt> {
        self.expect(TokenType::Print)?;
        let mut args = Vec::new();
        if self.matches(&TokenType::LParen) {
            if !self.check(&TokenType::RParen) {
                loop {
                    args.push(self.parse_expr()?);
                    if !self.matches(&TokenType::Comma) {
                        break;
                    }
                }
            }
            self.expect(TokenType::RParen)?;
        } else {
            // Natural form without parentheses: भनौँ a, b।
            loop {
                args.push(self.parse_expr()?);
                if !self.matches(&TokenType::Comma) {
                    break;
                }
            }
        }
        Ok(Stmt::Print(args))
    }

    fn parse_if(&mut self) -> ParseResult<Stmt> {
        self.expect(TokenType::If)?;
        let cond = self.parse_expr()?;
        self.matches(&TokenType::Then);
        let then_branch = self.parse_block()?;
        let else_branch = if self.matches(&TokenType::Else) {
            if self.check(&TokenType::If) {
                Some(alloc::vec![self.parse_if()?])
            } else {
                Some(self.parse_block()?)
            }
        } else {
            None
        };
        Ok(Stmt::If(cond, then_branch, else_branch))
    }

    fn parse_while(&mut self) -> ParseResult<Stmt> {
        self.expect(TokenType::While)?;
        let cond = self.parse_expr()?;
        let body = self.parse_block()?;
        Ok(Stmt::While(cond, body))
    }

    fn parse_function_decl(&mut self) -> ParseResult<Stmt> {
        self.expect(TokenType::Function)?;
        let name_tok = self.expect(TokenType::Ident)?;
        self.expect(TokenType::LParen)?;
        let mut params = Vec::new();
        if !self.check(&TokenType::RParen) {
            loop {
                let p = self.expect(TokenType::Ident)?;
                params.push(p.literal);
                if !self.matches(&TokenType::Comma) {
                    break;
                }
            }
        }
        self.expect(TokenType::RParen)?;
        let body = self.parse_block()?;
        Ok(Stmt::FunctionDecl(name_tok.literal, params, body))
    }

    fn parse_return(&mut self) -> ParseResult<Stmt> {
        self.expect(TokenType::Return)?;
        if self.check(&TokenType::Purnabiram)
            || self.check(&TokenType::Semicolon)
            || self.check(&TokenType::RBrace)
            || self.check(&TokenType::Eof)
        {
            Ok(Stmt::Return(None))
        } else {
            let expr = self.parse_expr()?;
            Ok(Stmt::Return(Some(expr)))
        }
    }

    // Expression parsing: precedence climbing.
    fn parse_expr(&mut self) -> ParseResult<Expr> {
        self.parse_assignment()
    }

    fn parse_assignment(&mut self) -> ParseResult<Expr> {
        let expr = self.parse_or()?;
        if self.matches(&TokenType::Assign) {
            let value = self.parse_assignment()?;
            match expr {
                Expr::Ident(name) => return Ok(Expr::Assign(name, Box::new(value))),
                Expr::Index(object, index) => {
                    return Ok(Expr::IndexAssign(object, index, Box::new(value)))
                }
                _ => return Err("invalid assignment target".into()),
            }
        }
        Ok(expr)
    }

    fn parse_or(&mut self) -> ParseResult<Expr> {
        let mut expr = self.parse_and()?;
        while self.matches(&TokenType::Or) {
            let right = self.parse_and()?;
            expr = Expr::Binary(BinOp::Or, Box::new(expr), Box::new(right));
        }
        Ok(expr)
    }

    fn parse_and(&mut self) -> ParseResult<Expr> {
        let mut expr = self.parse_equality()?;
        while self.matches(&TokenType::And) {
            let right = self.parse_equality()?;
            expr = Expr::Binary(BinOp::And, Box::new(expr), Box::new(right));
        }
        Ok(expr)
    }

    fn parse_equality(&mut self) -> ParseResult<Expr> {
        let mut expr = self.parse_comparison()?;
        loop {
            let op = match self.peek_type() {
                TokenType::Eq => BinOp::Eq,
                TokenType::NotEq => BinOp::NotEq,
                _ => break,
            };
            self.advance();
            let right = self.parse_comparison()?;
            expr = Expr::Binary(op, Box::new(expr), Box::new(right));
        }
        Ok(expr)
    }

    fn parse_comparison(&mut self) -> ParseResult<Expr> {
        let mut expr = self.parse_term()?;
        loop {
            let op = match self.peek_type() {
                TokenType::Lt => BinOp::Lt,
                TokenType::Gt => BinOp::Gt,
                TokenType::Lte => BinOp::Lte,
                TokenType::Gte => BinOp::Gte,
                _ => break,
            };
            self.advance();
            let right = self.parse_term()?;
            expr = Expr::Binary(op, Box::new(expr), Box::new(right));
        }
        Ok(expr)
    }

    fn parse_term(&mut self) -> ParseResult<Expr> {
        let mut expr = self.parse_factor()?;
        loop {
            let op = match self.peek_type() {
                TokenType::Plus => BinOp::Add,
                TokenType::Minus => BinOp::Sub,
                _ => break,
            };
            self.advance();
            let right = self.parse_factor()?;
            expr = Expr::Binary(op, Box::new(expr), Box::new(right));
        }
        Ok(expr)
    }

    fn parse_factor(&mut self) -> ParseResult<Expr> {
        let mut expr = self.parse_unary()?;
        loop {
            let op = match self.peek_type() {
                TokenType::Multiply => BinOp::Mul,
                TokenType::Divide => BinOp::Div,
                TokenType::Modulo => BinOp::Mod,
                _ => break,
            };
            self.advance();
            let right = self.parse_unary()?;
            expr = Expr::Binary(op, Box::new(expr), Box::new(right));
        }
        Ok(expr)
    }

    fn parse_unary(&mut self) -> ParseResult<Expr> {
        if self.matches(&TokenType::Minus) {
            let expr = self.parse_unary()?;
            return Ok(Expr::Neg(Box::new(expr)));
        }
        if self.matches(&TokenType::Not) {
            let expr = self.parse_unary()?;
            return Ok(Expr::Not(Box::new(expr)));
        }
        self.parse_call()
    }

    fn parse_call(&mut self) -> ParseResult<Expr> {
        let mut expr = self.parse_primary()?;
        loop {
            if self.matches(&TokenType::LParen) {
                let mut args = Vec::new();
                if !self.check(&TokenType::RParen) {
                    loop {
                        args.push(self.parse_expr()?);
                        if !self.matches(&TokenType::Comma) {
                            break;
                        }
                    }
                }
                self.expect(TokenType::RParen)?;
                expr = Expr::Call(Box::new(expr), args);
            } else if self.matches(&TokenType::LBracket) {
                let index = self.parse_expr()?;
                self.expect(TokenType::RBracket)?;
                expr = Expr::Index(Box::new(expr), Box::new(index));
            } else {
                break;
            }
        }
        Ok(expr)
    }

    fn parse_primary(&mut self) -> ParseResult<Expr> {
        let tok = self.peek().clone();
        match tok.token_type {
            TokenType::Number => {
                self.advance();
                Ok(Expr::Number(tok.number_value.unwrap_or(0.0)))
            }
            TokenType::StringLit => {
                self.advance();
                Ok(Expr::StringLit(tok.string_value.unwrap_or_default()))
            }
            TokenType::True => {
                self.advance();
                Ok(Expr::Bool(true))
            }
            TokenType::False => {
                self.advance();
                Ok(Expr::Bool(false))
            }
            TokenType::Null => {
                self.advance();
                Ok(Expr::Null)
            }
            TokenType::Ident => {
                self.advance();
                Ok(Expr::Ident(tok.literal))
            }
            TokenType::LParen => {
                self.advance();
                let expr = self.parse_expr()?;
                self.expect(TokenType::RParen)?;
                Ok(expr)
            }
            TokenType::LBracket => {
                self.advance();
                let mut elements = Vec::new();
                if !self.check(&TokenType::RBracket) {
                    loop {
                        elements.push(self.parse_expr()?);
                        if !self.matches(&TokenType::Comma) {
                            break;
                        }
                    }
                }
                self.expect(TokenType::RBracket)?;
                Ok(Expr::ArrayLit(elements))
            }
            other => Err(format!(
                "unexpected token {:?} ({:?}) at line {}",
                other, tok.literal, tok.location.line
            )),
        }
    }
}
