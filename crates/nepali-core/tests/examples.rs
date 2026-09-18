use nepali_core::{Interpreter, Parser, Resolver};

fn run(src: &str) -> Vec<String> {
    let mut parser = Parser::new(src);
    let program = parser.parse_program().expect("parse error");
    Resolver::resolve(&program).expect("resolution error");
    let mut interp = Interpreter::new();
    interp.run(&program).expect("runtime error");
    interp.output
}

#[test]
fn hello_nep_prints_greeting() {
    let src = include_str!("../examples/hello.nep");
    let out = run(src);
    assert_eq!(out, vec!["नमस्ते संसार!".to_string()]);
}

#[test]
fn fibonacci_nep_prints_series() {
    let src = include_str!("../examples/fibonacci.nep");
    let out = run(src);

    // Series header, then 11 lines (पद 0..=10) reporting each fib(n).
    assert_eq!(out[0], "--- फिबोनाची शृङ्खला (Fibonacci Series) ---");
    assert_eq!(out.len(), 12);

    let expected_fib = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
    for (n, fib) in expected_fib.iter().enumerate() {
        assert_eq!(out[n + 1], format!("पद {} को मान = {}", n, fib));
    }
}

#[test]
fn self_hosted_lexer_nep_tokenizes_correctly() {
    let src = include_str!("../examples/self_hosted_lexer.nep");
    let out = run(src);
    assert_eq!(
        out,
        vec![
            "NUMBER 0 .. 2".to_string(),
            "SYMBOL +".to_string(),
            "NUMBER 5 .. 6".to_string(),
        ]
    );
}

// examples/namaste.nep is intentionally not ported here: it declares
// variables with "मान" instead of "राखौँ". "मान" can't be added as a Let
// keyword alias without breaking fibonacci.nep, which uses मान as an
// ordinary identifier (राखौँ मान = ...) - a real naming collision in the
// existing example corpus, not just a missing feature. See ROADMAP.md.
