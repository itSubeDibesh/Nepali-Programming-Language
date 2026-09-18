#![no_std]

extern crate alloc;
#[cfg(test)]
extern crate std;

pub mod ast;
pub mod bytecode;
pub mod interpreter;
pub mod lexer;
pub mod parser;
pub mod resolver;
pub mod tokens;
pub mod vm;

pub use ast::{BinOp, Expr, Stmt};
pub use bytecode::Compiler;
pub use interpreter::{
    HostAi, HostCache, HostChannel, HostCommand, HostDb, HostFs, HostJs, HostProcess, HostPython,
    HostRust, Interpreter, Value,
};
pub use lexer::Lexer;
pub use parser::Parser;
pub use resolver::Resolver;
pub use tokens::{Location, Token, TokenType};
pub use vm::Vm;

#[cfg(test)]
mod tests {
    use super::*;
    use alloc::string::{String, ToString};
    use alloc::vec::Vec;

    #[test]
    fn test_nepali_tokens() {
        let code = "राखौँ तलब = ५००००। भनौँ(\"नमस्ते\");";
        let mut lexer = Lexer::new(code);
        let tokens = lexer.tokenize();

        assert_eq!(tokens[0].token_type, TokenType::Let);
        assert_eq!(tokens[1].token_type, TokenType::Ident);
        assert_eq!(tokens[1].literal, "तलब");
        assert_eq!(tokens[3].token_type, TokenType::Number);
        assert_eq!(tokens[3].number_value, Some(50000.0));
        assert_eq!(tokens[4].token_type, TokenType::Purnabiram);
        assert_eq!(tokens[5].token_type, TokenType::Print);
    }

    #[test]
    fn test_parse_let_and_print() {
        let mut parser = Parser::new("राखौँ x = 5। भनौँ(x)।");
        let program = parser.parse_program().unwrap();
        assert_eq!(program.len(), 2);
        assert_eq!(program[0], Stmt::Let("x".into(), Expr::Number(5.0)));
        assert_eq!(program[1], Stmt::Print(alloc::vec![Expr::Ident("x".into())]));
    }

    #[test]
    fn test_parse_if_while_function() {
        let src = "काम add(a, b) { पठाउँ a + b। } राखौँ i = 0। भएसम्म i < 3 { यदि i == 1 { भनौँ(i)। } i = i + 1। }";
        let mut parser = Parser::new(src);
        let program = parser.parse_program().unwrap();
        assert_eq!(program.len(), 3);
        match &program[0] {
            Stmt::FunctionDecl(name, params, body) => {
                assert_eq!(name, "add");
                assert_eq!(params, &["a".to_string(), "b".to_string()]);
                assert_eq!(body.len(), 1);
            }
            other => panic!("expected FunctionDecl, got {:?}", other),
        }
        match &program[2] {
            Stmt::While(cond, body) => {
                assert_eq!(
                    *cond,
                    Expr::Binary(
                        BinOp::Lt,
                        alloc::boxed::Box::new(Expr::Ident("i".into())),
                        alloc::boxed::Box::new(Expr::Number(3.0))
                    )
                );
                assert_eq!(body.len(), 2);
            }
            other => panic!("expected While, got {:?}", other),
        }
    }

    fn run(src: &str) -> Vec<String> {
        let mut parser = Parser::new(src);
        let program = parser.parse_program().expect("parse error");
        Resolver::resolve(&program).expect("resolution error");
        let mut interp = Interpreter::new();
        interp.run(&program).expect("runtime error");
        interp.output
    }

    #[test]
    fn test_resolver_catches_undefined_variable() {
        let mut parser = Parser::new("भनौँ(x)।");
        let program = parser.parse_program().unwrap();
        let errors = Resolver::resolve(&program).unwrap_err();
        assert_eq!(errors, alloc::vec!["undefined variable 'x'".to_string()]);
    }

    #[test]
    fn test_resolver_catches_arity_mismatch() {
        let mut parser =
            Parser::new("काम add(a, b) { पठाउँ a + b। } भनौँ(add(1))।");
        let program = parser.parse_program().unwrap();
        let errors = Resolver::resolve(&program).unwrap_err();
        assert_eq!(
            errors,
            alloc::vec!["function 'add' expects 2 argument(s), got 1".to_string()]
        );
    }

    #[test]
    fn test_resolver_accepts_recursion_and_forward_use_within_function() {
        let mut parser = Parser::new(
            "काम fib(n) { यदि n < 2 { पठाउँ n। } पठाउँ fib(n - 1) + fib(n - 2)। } भनौँ(fib(5))।",
        );
        let program = parser.parse_program().unwrap();
        assert_eq!(Resolver::resolve(&program), Ok(()));
    }

    #[test]
    fn test_if_else_actually_executes() {
        let out = run("यदि गलत { भनौँ(\"a\")। } नत्र { भनौँ(\"b\")। }");
        assert_eq!(out, alloc::vec!["b".to_string()]);
    }

    #[test]
    fn test_while_actually_executes() {
        let out = run(
            "राखौँ i = 0। भएसम्म i < 3 { भनौँ(i)। i = i + 1। }",
        );
        assert_eq!(out, alloc::vec!["0".to_string(), "1".to_string(), "2".to_string()]);
    }

    #[test]
    fn test_recursive_fibonacci() {
        let out = run(
            "काम fib(n) { यदि n < 2 { पठाउँ n। } पठाउँ fib(n - 1) + fib(n - 2)। } भनौँ(fib(10))।",
        );
        assert_eq!(out, alloc::vec!["55".to_string()]);
    }

    #[test]
    fn test_romanized_keywords_are_fully_typeable_ascii() {
        // Every statement keyword this test exercises has no Devanagari
        // anywhere in it - real usability for a plain physical keyboard
        // (e.g. the live kernel REPL), not just an internal convenience.
        let out = run(
            "kaam fib(n) { yadi n < 2 bhaye { pathau n; } pathau fib(n - 1) + fib(n - 2); } \
             rakha i = 0; bhayesamma i < 3 { bhana(i); i = i + 1; } bhana(fib(6));",
        );
        assert_eq!(
            out,
            alloc::vec!["0".to_string(), "1".to_string(), "2".to_string(), "8".to_string()]
        );
    }

    #[test]
    fn test_romanized_keywords_do_not_break_devanagari_identifier_usage() {
        // "rakha" being a keyword must not stop "राखौँ" (its Devanagari
        // form, unrelated bytes) from working exactly as before.
        let out = run("राखौँ x = sahi; yadi x bhaye { bhana(\"ok\"); }");
        assert_eq!(out, alloc::vec!["ok".to_string()]);
    }

    #[test]
    fn test_closures_capture_outer_scope() {
        let out = run(
            "काम बनाउ(x) { काम थप्नु(y) { पठाउँ x + y। } पठाउँ थप्नु। } राखौँ जोड_५ = बनाउ(5)। भनौँ(जोड_५(3))।",
        );
        assert_eq!(out, alloc::vec!["8".to_string()]);
    }

    fn run_vm(src: &str) -> Vec<String> {
        let mut parser = Parser::new(src);
        let program = parser.parse_program().expect("parse error");
        Resolver::resolve(&program).expect("resolution error");
        let (chunk, functions) = bytecode::Compiler::compile(&program);
        let mut vm = Vm::new(functions);
        vm.run(&chunk).expect("VM runtime error");
        vm.output
    }

    #[test]
    fn test_vm_if_else() {
        let out = run_vm("यदि गलत { भनौँ(\"a\")। } नत्र { भनौँ(\"b\")। }");
        assert_eq!(out, alloc::vec!["b".to_string()]);
    }

    #[test]
    fn test_vm_while_loop() {
        let out = run_vm("राखौँ i = 0। भएसम्म i < 3 { भनौँ(i)। i = i + 1। }");
        assert_eq!(out, alloc::vec!["0".to_string(), "1".to_string(), "2".to_string()]);
    }

    #[test]
    fn test_vm_recursive_fibonacci() {
        let out = run_vm(
            "काम fib(n) { यदि n < 2 { पठाउँ n। } पठाउँ fib(n - 1) + fib(n - 2)। } भनौँ(fib(10))।",
        );
        assert_eq!(out, alloc::vec!["55".to_string()]);
    }

    #[test]
    fn test_vm_multi_arg_print_and_arithmetic() {
        let out = run_vm("राखौँ x = 4। राखौँ y = 5। भनौँ(\"x*y=\", x * y)।");
        assert_eq!(out, alloc::vec!["x*y= 20".to_string()]);
    }

    #[test]
    fn test_builtin_string_functions_interpreter() {
        let out = run(
            "राखौँ s = \"काठमाडौं\"। भनौँ(लम्बाइ(s))। भनौँ(अक्षर(s, 0))। भनौँ(संकेत(अक्षर(s, 0)))।",
        );
        assert_eq!(out.len(), 3);
        // "काठमाडौं" is 8 Devanagari scalar values, not 8 UTF-8 bytes -
        // लम्बाइ counts chars, matching what अक्षर can actually index.
        assert_eq!(out[0], "8");
        assert_eq!(out[1], "क");
        let expected_code = 'क' as u32;
        assert_eq!(out[2], alloc::format!("{}", expected_code));
    }

    #[test]
    fn test_builtin_string_functions_vm() {
        let out = run_vm("भनौँ(लम्बाइ(\"hello\"))। भनौँ(अक्षर(\"hello\", 1))।");
        assert_eq!(out, alloc::vec!["5".to_string(), "e".to_string()]);
    }

    #[test]
    fn test_builtin_out_of_range_returns_empty_string() {
        let out = run("भनौँ(अक्षर(\"hi\", 99))।");
        assert_eq!(out, alloc::vec!["".to_string()]);
    }

    #[test]
    fn test_resolver_catches_arithmetic_type_mismatch() {
        let mut parser = Parser::new("राखौँ x = 5 - सहि।");
        let program = parser.parse_program().unwrap();
        let errors = Resolver::resolve(&program).unwrap_err();
        assert_eq!(
            errors,
            alloc::vec!["arithmetic (-) on non-number types: number and boolean".to_string()]
        );
    }

    #[test]
    fn test_resolver_catches_comparison_type_mismatch() {
        let mut parser = Parser::new("राखौँ x = \"hi\" < 5।");
        let program = parser.parse_program().unwrap();
        let errors = Resolver::resolve(&program).unwrap_err();
        assert_eq!(
            errors,
            alloc::vec!["comparison (<) on non-number types: string and number".to_string()]
        );
    }

    #[test]
    fn test_resolver_allows_add_with_string_concat_fallback() {
        // Add never errors - it's the interpreter/VM's string-concat
        // fallback path, not a type error, whenever either side isn't a
        // number.
        let mut parser = Parser::new("राखौँ x = \"n = \" + 5।");
        let program = parser.parse_program().unwrap();
        assert_eq!(Resolver::resolve(&program), Ok(()));
    }

    #[test]
    fn test_resolver_does_not_flag_unknown_typed_function_params() {
        // A function parameter's type is never known statically (no type
        // annotations exist), so arithmetic on it must never be flagged -
        // even though the body looks exactly like the confirmed-mismatch
        // case above with `x` swapped for a literal.
        let mut parser = Parser::new("काम f(x) { पठाउँ x - 1। } भनौँ(f(5))।");
        let program = parser.parse_program().unwrap();
        assert_eq!(Resolver::resolve(&program), Ok(()));
    }

    #[test]
    fn test_resolver_widens_type_after_reassignment_to_avoid_false_positive() {
        // x starts as a number, then gets reassigned a string - a real,
        // legal dynamic-typing move. The checker must not use x's stale
        // "number" type for the later comparison against a string.
        let mut parser = Parser::new("राखौँ x = 5। x = \"hi\"। भनौँ(x == \"hi\")।");
        let program = parser.parse_program().unwrap();
        assert_eq!(Resolver::resolve(&program), Ok(()));
    }

    #[test]
    fn test_resolver_allows_builtin_calls() {
        let mut parser = Parser::new("भनौँ(लम्बाइ(\"hi\"))।");
        let program = parser.parse_program().unwrap();
        assert_eq!(Resolver::resolve(&program), Ok(()));
    }

    #[test]
    fn test_array_literal_and_index_read() {
        let out = run("राखौँ x = [10, 20, 30]। भनौँ(x[0])। भनौँ(x[2])।");
        assert_eq!(out, alloc::vec!["10".to_string(), "30".to_string()]);
    }

    #[test]
    fn test_array_index_assignment_mutates_in_place() {
        // Arrays are reference types here (Rc<RefCell<..>>) - assigning
        // through one binding must be visible through another that refers
        // to the same array, not just the one it was assigned through.
        let out = run("राखौँ x = [1, 2, 3]। राखौँ y = x। y[1] = 99। भनौँ(x[1])।");
        assert_eq!(out, alloc::vec!["99".to_string()]);
    }

    #[test]
    fn test_array_length_and_push_builtins() {
        let out = run(
            "राखौँ x = [1, 2]। भनौँ(लम्बाइ(x))। थप्नुहोस्(x, 3)। भनौँ(लम्बाइ(x))। भनौँ(x[2])।",
        );
        assert_eq!(
            out,
            alloc::vec!["2".to_string(), "3".to_string(), "3".to_string()]
        );
    }

    #[test]
    fn test_array_out_of_bounds_is_a_real_runtime_error() {
        let mut parser = Parser::new("राखौँ x = [1, 2]। भनौँ(x[5])।");
        let program = parser.parse_program().unwrap();
        let mut interp = Interpreter::new();
        let err = interp.run(&program).unwrap_err();
        assert_eq!(err, "array index 5 out of bounds (length 2)");
    }

    #[test]
    fn test_array_while_loop_iteration() {
        let out = run(
            "राखौँ x = [5, 6, 7]। राखौँ i = 0। भएसम्म i < लम्बाइ(x) { भनौँ(x[i])। i = i + 1। }",
        );
        assert_eq!(
            out,
            alloc::vec!["5".to_string(), "6".to_string(), "7".to_string()]
        );
    }

    #[test]
    fn test_resolver_allows_array_indexing() {
        let mut parser = Parser::new("राखौँ x = [1, 2, 3]। राखौँ i = 0। भनौँ(x[i])। x[i] = 9।");
        let program = parser.parse_program().unwrap();
        assert_eq!(Resolver::resolve(&program), Ok(()));
    }

    #[test]
    fn test_logical_and_or_not() {
        let out = run(
            "भनौँ(सहि र सहि)। भनौँ(सहि र गलत)। भनौँ(गलत वा सहि)। \
             भनौँ(गलत वा गलत)। भनौँ(होइन सहि)। भनौँ(होइन गलत)।",
        );
        assert_eq!(
            out,
            alloc::vec![
                "सहि".to_string(),
                "गलत".to_string(),
                "सहि".to_string(),
                "गलत".to_string(),
                "गलत".to_string(),
                "सहि".to_string(),
            ]
        );
    }

    #[test]
    fn test_logical_and_or_short_circuit_real_side_effects() {
        // Not just "produces the right boolean" - the right operand must
        // never actually run once the left side already decides the
        // result. A function call is used specifically because it has an
        // observable side effect (a print) that would show up in `out`
        // if short-circuiting weren't real.
        let out = run(
            "काम se() { भनौँ(\"called\")। पठाउँ सहि। } \
             भनौँ(गलत र se())। भनौँ(सहि वा se())।",
        );
        assert_eq!(out, alloc::vec!["गलत".to_string(), "सहि".to_string()]);
    }

    #[test]
    fn test_and_has_lower_precedence_than_comparison() {
        let out = run("राखौँ x = 5। यदि x > 0 र x < 10 { भनौँ(\"in range\")। }");
        assert_eq!(out, alloc::vec!["in range".to_string()]);
    }

    #[test]
    fn test_romanized_logical_keywords() {
        let out = run("bhana(sahi ra galat)। bhana(hoina galat)।");
        assert_eq!(out, alloc::vec!["गलत".to_string(), "सहि".to_string()]);
    }

    #[test]
    fn test_resolver_allows_logical_operators() {
        let mut parser = Parser::new("भनौँ((सहि र गलत) वा (होइन गलत))।");
        let program = parser.parse_program().unwrap();
        assert_eq!(Resolver::resolve(&program), Ok(()));
    }

    #[test]
    fn test_host_fs_builtins_fail_clearly_without_a_host() {
        // No set_host_fs call - the exact situation nepali-core-cli or
        // any test harness is in unless it opts in, and the situation
        // any .nep program run without a real disk mounted is in inside
        // the kernel too. Must fail with a real, specific error, not
        // panic and not silently pretend to succeed.
        let mut parser = Parser::new("भनौँ(ओएस_पढ्नुहोस्(\"x.txt\"))।");
        let program = parser.parse_program().unwrap();
        let mut interp = Interpreter::new();
        let err = interp.run(&program).unwrap_err();
        assert!(err.contains("needs a host filesystem"), "unexpected error: {}", err);
    }

    /// A tiny in-memory `HostFs` - not the kernel's real FAT filesystem
    /// (that's `kernel/src/fs.rs`, tested separately, live, in QEMU) but
    /// enough to prove `Interpreter::set_host_fs` and the three
    /// `ओएस_*` builtins actually reach whatever implementation is handed
    /// to them, correctly, without needing a whole kernel to test that.
    struct FakeFs {
        files: core::cell::RefCell<alloc::collections::BTreeMap<String, String>>,
    }

    impl HostFs for FakeFs {
        fn read_file(&self, path: &str) -> Result<String, String> {
            self.files
                .borrow()
                .get(path)
                .cloned()
                .ok_or_else(|| alloc::format!("no such file: {}", path))
        }
        fn write_file(&self, path: &str, contents: &str) -> Result<(), String> {
            self.files
                .borrow_mut()
                .insert(path.to_string(), contents.to_string());
            Ok(())
        }
        fn list_dir(&self, _path: &str) -> Result<Vec<String>, String> {
            Ok(self.files.borrow().keys().cloned().collect())
        }
    }

    #[test]
    fn test_host_fs_builtins_with_a_real_host_round_trip() {
        let mut parser = Parser::new(
            "ओएस_लेख्नुहोस्(\"a.txt\", \"hello\")। भनौँ(ओएस_पढ्नुहोस्(\"a.txt\"))।",
        );
        let program = parser.parse_program().unwrap();
        let mut interp = Interpreter::new();
        interp.set_host_fs(alloc::rc::Rc::new(FakeFs {
            files: core::cell::RefCell::new(alloc::collections::BTreeMap::new()),
        }));
        interp.run(&program).expect("runtime error");
        assert_eq!(interp.output, alloc::vec!["hello".to_string()]);
    }

    #[test]
    fn test_host_process_builtins_fail_clearly_without_a_host() {
        let mut parser = Parser::new("नयाँ_प्रक्रिया(\"x\")।");
        let program = parser.parse_program().unwrap();
        let mut interp = Interpreter::new();
        let err = interp.run(&program).unwrap_err();
        assert!(err.contains("needs a host process manager"), "unexpected error: {}", err);
    }

    /// A tiny in-memory `HostProcess` - proves the language-level
    /// mechanism (dispatch, argument passing, return values) is correct
    /// on its own, independent of `kernel/src/process.rs`'s real
    /// preemptible-process machinery, which is tested separately, live,
    /// in QEMU.
    struct FakeProcess {
        names: core::cell::RefCell<Vec<String>>,
    }

    impl HostProcess for FakeProcess {
        fn spawn(&self, name: &str) -> Result<f64, String> {
            let mut names = self.names.borrow_mut();
            let pid = names.len() as f64;
            names.push(name.to_string());
            Ok(pid)
        }
        fn list(&self) -> Result<Vec<String>, String> {
            Ok(self.names.borrow().clone())
        }
    }

    #[test]
    fn test_host_process_builtins_with_a_real_host() {
        let mut parser = Parser::new(
            "राखौँ pid1 = नयाँ_प्रक्रिया(\"a\")। राखौँ pid2 = नयाँ_प्रक्रिया(\"b\")। \
             भनौँ(pid1)। भनौँ(pid2)। राखौँ names = प्रक्रिया_सूची()। भनौँ(लम्बाइ(names))। \
             भनौँ(names[0])। भनौँ(names[1])।",
        );
        let program = parser.parse_program().unwrap();
        let mut interp = Interpreter::new();
        interp.set_host_process(alloc::rc::Rc::new(FakeProcess {
            names: core::cell::RefCell::new(Vec::new()),
        }));
        interp.run(&program).expect("runtime error");
        assert_eq!(
            interp.output,
            alloc::vec![
                "0".to_string(),
                "1".to_string(),
                "2".to_string(),
                "a".to_string(),
                "b".to_string(),
            ]
        );
    }

    #[test]
    fn test_host_channel_builtins_fail_clearly_without_a_host() {
        let mut parser = Parser::new("नयाँ_च्यानल()।");
        let program = parser.parse_program().unwrap();
        let mut interp = Interpreter::new();
        let err = interp.run(&program).unwrap_err();
        assert!(err.contains("needs a host channel manager"), "unexpected error: {}", err);
    }

    /// A tiny in-memory `HostChannel` (a `BTreeMap<id, VecDeque<String>>`)
    /// - proves the language-level mechanism (dispatch, argument passing,
    /// non-blocking empty-queue behavior) is correct on its own, independent
    /// of `kernel/src/channel.rs`'s real kernel-state version, which is
    /// tested separately, live, in QEMU.
    struct FakeChannel {
        queues: core::cell::RefCell<Vec<alloc::collections::VecDeque<String>>>,
    }

    impl HostChannel for FakeChannel {
        fn create(&self) -> Result<f64, String> {
            let mut queues = self.queues.borrow_mut();
            let id = queues.len() as f64;
            queues.push(alloc::collections::VecDeque::new());
            Ok(id)
        }
        fn send(&self, id: f64, msg: &str) -> Result<(), String> {
            let mut queues = self.queues.borrow_mut();
            let queue = queues
                .get_mut(id as usize)
                .ok_or_else(|| alloc::format!("no such channel: {}", id))?;
            queue.push_back(msg.to_string());
            Ok(())
        }
        fn recv(&self, id: f64) -> Result<Option<String>, String> {
            let mut queues = self.queues.borrow_mut();
            let queue = queues
                .get_mut(id as usize)
                .ok_or_else(|| alloc::format!("no such channel: {}", id))?;
            Ok(queue.pop_front())
        }
    }

    #[test]
    fn test_host_channel_builtins_with_a_real_host() {
        let mut parser = Parser::new(
            "राखौँ ch = नयाँ_च्यानल()। \
             भनौँ(च्यानल_पाउनुहोस्(ch))। \
             च्यानल_पठाउनुहोस्(ch, \"halo\")। \
             च्यानल_पठाउनुहोस्(ch, \"pheri\")। \
             भनौँ(च्यानल_पाउनुहोस्(ch))। \
             भनौँ(च्यानल_पाउनुहोस्(ch))। \
             भनौँ(च्यानल_पाउनुहोस्(ch))।",
        );
        let program = parser.parse_program().unwrap();
        let mut interp = Interpreter::new();
        interp.set_host_channel(alloc::rc::Rc::new(FakeChannel {
            queues: core::cell::RefCell::new(Vec::new()),
        }));
        interp.run(&program).expect("runtime error");
        assert_eq!(
            interp.output,
            alloc::vec![
                "केहीछैन".to_string(),
                "halo".to_string(),
                "pheri".to_string(),
                "केहीछैन".to_string(),
            ]
        );
    }

    #[test]
    fn test_host_fs_list_dir_returns_a_real_array() {
        let mut parser = Parser::new(
            "ओएस_लेख्नुहोस्(\"a.txt\", \"1\")। ओएस_लेख्नुहोस्(\"b.txt\", \"2\")। \
             राखौँ files = ओएस_सूची(\".\")। भनौँ(लम्बाइ(files))।",
        );
        let program = parser.parse_program().unwrap();
        let mut interp = Interpreter::new();
        interp.set_host_fs(alloc::rc::Rc::new(FakeFs {
            files: core::cell::RefCell::new(alloc::collections::BTreeMap::new()),
        }));
        interp.run(&program).expect("runtime error");
        assert_eq!(interp.output, alloc::vec!["2".to_string()]);
    }
}
