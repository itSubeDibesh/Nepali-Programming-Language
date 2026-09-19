//! WP1 acceptance tests: sandbox mode denies OS builtins, OS mode allows
//! them, and pure programs work in both modes.

use std::process::Command;
use std::sync::atomic::{AtomicUsize, Ordering};

static COUNTER: AtomicUsize = AtomicUsize::new(0);

fn nepali() -> Command {
    Command::new(env!("CARGO_BIN_EXE_nepali-core-cli"))
}

fn run_sandbox(code: &str) -> (bool, String, String) {
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    let tmp = std::env::temp_dir().join(format!("nepali-sandbox-test-{id}-{}.nep", std::process::id()));
    std::fs::write(&tmp, code).unwrap();
    let out = nepali()
        .arg("--mode").arg("sandbox")
        .arg(&tmp)
        .env("NEPALI_DB", std::env::temp_dir().join(format!("nepali-sandbox-{}.db", std::process::id())))
        .output()
        .unwrap();
    let _ = std::fs::remove_file(&tmp);
    (
        out.status.success(),
        String::from_utf8_lossy(&out.stdout).into_owned(),
        String::from_utf8_lossy(&out.stderr).into_owned(),
    )
}

fn run_os(code: &str) -> (bool, String, String) {
    let id = COUNTER.fetch_add(1, Ordering::Relaxed);
    let tmp = std::env::temp_dir().join(format!("nepali-os-test-{id}-{}.nep", std::process::id()));
    std::fs::write(&tmp, code).unwrap();
    let out = nepali()
        .arg("--mode").arg("os")
        .arg(&tmp)
        .env("NEPALI_DB", std::env::temp_dir().join(format!("nepali-os-{}.db", std::process::id())))
        .output()
        .unwrap();
    let _ = std::fs::remove_file(&tmp);
    (
        out.status.success(),
        String::from_utf8_lossy(&out.stdout).into_owned(),
        String::from_utf8_lossy(&out.stderr).into_owned(),
    )
}

// --- Sandbox denies OS builtins ---

#[test]
fn sandbox_denies_command_execution() {
    let (ok, _, err) = run_sandbox("आदेश_चलाउनुहोस्(\"echo\", [\"hi\"])।");
    assert!(!ok);
    assert!(err.contains("नेपाली OS मा मात्र चल्छ"), "stderr: {err}");
}

#[test]
fn sandbox_denies_file_write() {
    let (ok, _, err) = run_sandbox("ओएस_लेख्नुहोस्(\"/tmp/sandbox-test.txt\", \"data\")।");
    assert!(!ok);
    assert!(err.contains("नेपाली OS मा मात्र चल्छ"), "stderr: {err}");
}

#[test]
fn sandbox_denies_file_read() {
    let (ok, _, err) = run_sandbox("ओएस_पढ्नुहोस्(\"/etc/hostname\")।");
    assert!(!ok);
    assert!(err.contains("नेपाली OS मा मात्र चल्छ"), "stderr: {err}");
}

#[test]
fn sandbox_denies_database() {
    let (ok, _, err) = run_sandbox("डाटाबेस_चलाउनुहोस्(\"CREATE TABLE t(x)\")।");
    assert!(!ok);
    assert!(err.contains("नेपाली OS मा मात्र चल्छ"), "stderr: {err}");
}

#[test]
fn sandbox_denies_python() {
    let (ok, _, err) = run_sandbox("पाइथन_चलाउनुहोस्(\"x = 1\")।");
    assert!(!ok);
    assert!(err.contains("नेपाली OS मा मात्र चल्छ"), "stderr: {err}");
}

#[test]
fn sandbox_denies_rust_plugin() {
    let (ok, _, err) = run_sandbox("रस्ट_चलाउनुहोस्(\"lib.so\", \"f\")।");
    assert!(!ok);
    assert!(err.contains("नेपाली OS मा मात्र चल्छ"), "stderr: {err}");
}

#[test]
fn sandbox_denies_cache() {
    let (ok, _, err) = run_sandbox("क्यास_राख्नुहोस्(\"k\", \"v\")।");
    assert!(!ok);
    assert!(err.contains("नेपाली OS मा मात्र चल्छ"), "stderr: {err}");
}

#[test]
fn sandbox_denies_agent() {
    let (ok, _, err) = run_sandbox("एजेन्ट_चलाउनुहोस्(\"do something\")।");
    assert!(!ok);
    assert!(err.contains("नेपाली OS मा मात्र चल्छ"), "stderr: {err}");
}

#[test]
fn sandbox_denies_process_list() {
    let (ok, _, err) = run_sandbox("भनौँ(प्रक्रिया_सूची())।");
    assert!(!ok);
    assert!(err.contains("नेपाली OS मा मात्र चल्छ"), "stderr: {err}");
}

// --- Sandbox ALLOWS safe builtins ---

#[test]
fn sandbox_allows_pure_language() {
    let (ok, out, _) = run_sandbox("राखौँ x = 5। भनौँ(x * 3)।");
    assert!(ok);
    assert_eq!(out.trim(), "15");
}

#[test]
fn sandbox_allows_js() {
    // QuickJS has no host access — allowed in sandbox.
    #[cfg(feature = "js-interop")]
    {
        let (ok, out, _) = run_sandbox("भनौँ(जेएस_चलाउनुहोस्(\"2 + 3\"))।");
        assert!(ok, "JS should be allowed in sandbox");
        assert_eq!(out.trim(), "5");
    }
}

#[test]
fn sandbox_allows_ai_question() {
    // AI inference doesn't need OS access — allowed in sandbox.
    // (Will fail with "no model" error if NEPALI_AI_MODEL_PATH isn't set,
    // but the point is it's NOT a "sandbox denied" error.)
    let (ok, _, err) = run_sandbox("एआई_सोध्नुहोस्(\"test\")।");
    // If it fails, it should be about the model, not about sandbox.
    if !ok {
        assert!(!err.contains("OS मा मात्र चल्छ"), "AI should not be sandbox-denied: {err}");
    }
}

// --- OS mode allows everything ---

#[test]
fn os_mode_allows_command_execution() {
    let (ok, out, _) = run_os("भनौँ(आदेश_चलाउनुहोस्(\"echo\", [\"hello\"])[1])।");
    assert!(ok);
    assert_eq!(out.trim(), "hello");
}

#[test]
fn os_mode_allows_file_write_and_read() {
    let path = format!("/tmp/nepali-os-test-{}.txt", std::process::id());
    let code = format!("ओएस_लेख्नुहोस्(\"{path}\", \"test data\")। भनौँ(ओएस_पढ्नुहोस्(\"{path}\"))।");
    let (ok, out, _) = run_os(&code);
    let _ = std::fs::remove_file(&path);
    assert!(ok);
    assert_eq!(out.trim(), "test data");
}

#[test]
fn os_mode_allows_database() {
    let (ok, _, _) = run_os("डाटाबेस_चलाउनुहोस्(\"CREATE TABLE IF NOT EXISTS sandbox_test(x)\")।");
    assert!(ok);
}

// --- NEPALI_MODE env var works ---

#[test]
fn nepali_mode_env_var_controls_sandbox() {
    let tmp = std::env::temp_dir().join(format!("nepali-env-test-{}.nep", std::process::id()));
    std::fs::write(&tmp, "आदेश_चलाउनुहोस्(\"echo\", [\"hi\"])।").unwrap();
    let out = nepali()
        .arg(&tmp)
        .env("NEPALI_MODE", "sandbox")
        .env("NEPALI_DB", std::env::temp_dir().join(format!("nepali-env-{}.db", std::process::id())))
        .output()
        .unwrap();
    let _ = std::fs::remove_file(&tmp);
    let stderr = String::from_utf8_lossy(&out.stderr);
    assert!(!out.status.success());
    assert!(stderr.contains("OS मा मात्र चल्छ"), "stderr: {stderr}");
}
