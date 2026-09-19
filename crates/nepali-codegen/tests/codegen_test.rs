//! Real, end-to-end verification of both execution paths this crate
//! provides - not calling `Codegen`'s internal methods directly, but
//! going through the same public entry points a real user would:
//! `run_jit` (in-process JIT execution, stdout captured via a real
//! subprocess so it can be asserted on) and `compile_source_to_native_binary`
//! + actually running the produced real executable as a real
//! subprocess.

use std::process::Command;

fn nepali_codegen_bin() -> &'static str {
    env!("CARGO_BIN_EXE_nepali-codegen")
}

fn write_source(dir: &std::path::Path, name: &str, source: &str) -> std::path::PathBuf {
    let path = dir.join(name);
    std::fs::write(&path, source).unwrap();
    path
}

#[test]
fn real_jit_run_prints_correct_recursive_fibonacci() {
    let dir = tempfile::tempdir().unwrap();
    let src = write_source(
        dir.path(),
        "fib.nep",
        "काम फिबो(अ) {\n\
         यदि अ < 2 {\n\
         पठाउँ अ।\n\
         }\n\
         पठाउँ फिबो(अ - 1) + फिबो(अ - 2)।\n\
         }\n\
         भनौँ(फिबो(10))।",
    );

    let output = Command::new(nepali_codegen_bin())
        .arg("run")
        .arg(&src)
        .output()
        .expect("run nepali-codegen");
    assert!(output.status.success(), "stderr: {}", String::from_utf8_lossy(&output.stderr));
    assert_eq!(String::from_utf8_lossy(&output.stdout).trim(), "55");
}

#[test]
fn real_jit_run_handles_if_while_and_or_and_multiple_print_args() {
    let dir = tempfile::tempdir().unwrap();
    let src = write_source(
        dir.path(),
        "loop.nep",
        "राखौँ क = 0।\n\
         राखौँ योग = 0।\n\
         भएसम्म क < 5 {\n\
         योग = योग + क।\n\
         क = क + 1।\n\
         }\n\
         भनौँ(योग, क)।\n\
         यदि योग > 5 र क == 5 {\n\
         भनौँ(1)।\n\
         } नत्र {\n\
         भनौँ(0)।\n\
         }",
    );

    let output = Command::new(nepali_codegen_bin())
        .arg("run")
        .arg(&src)
        .output()
        .expect("run nepali-codegen");
    assert!(output.status.success(), "stderr: {}", String::from_utf8_lossy(&output.stderr));
    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.lines().collect();
    assert_eq!(lines, vec!["10 5", "1"]);
}

#[test]
fn real_native_build_produces_a_standalone_executable_that_runs_correctly() {
    let dir = tempfile::tempdir().unwrap();
    let src = write_source(
        dir.path(),
        "fib.nep",
        "काम फिबो(अ) {\n\
         यदि अ < 2 {\n\
         पठाउँ अ।\n\
         }\n\
         पठाउँ फिबो(अ - 1) + फिबो(अ - 2)।\n\
         }\n\
         भनौँ(फिबो(10))।",
    );
    let out_bin = dir.path().join("fib_native");

    let build_output = Command::new(nepali_codegen_bin())
        .arg("build")
        .arg(&src)
        .arg("-o")
        .arg(&out_bin)
        .output()
        .expect("run nepali-codegen build");
    assert!(
        build_output.status.success(),
        "stderr: {}",
        String::from_utf8_lossy(&build_output.stderr)
    );
    assert!(out_bin.exists(), "real native executable was not written to disk");

    // The real, load-bearing check: run the produced binary as its own
    // real subprocess - no `nepali-codegen`/interpreter involved at
    // all at this point, just the standalone machine code this crate
    // compiled.
    let run_output = Command::new(&out_bin).output().expect("run the real native binary");
    assert!(run_output.status.success());
    assert_eq!(String::from_utf8_lossy(&run_output.stdout).trim(), "55");
}

#[test]
fn real_compile_error_for_unsupported_string_literal_is_explicit_not_silent() {
    let dir = tempfile::tempdir().unwrap();
    let src = write_source(dir.path(), "bad.nep", "भनौँ(\"hello\")।");

    let output = Command::new(nepali_codegen_bin())
        .arg("run")
        .arg(&src)
        .output()
        .expect("run nepali-codegen");
    assert!(!output.status.success());
    assert!(String::from_utf8_lossy(&output.stderr).contains("string"));
}
