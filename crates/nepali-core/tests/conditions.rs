//! Every program in `examples/conditions/` is run through the real CLI.
//!
//! - `C*.nep`: must exit 0 and print exactly the neighbouring `.out`.
//! - `errors/E*.nep`: must exit 1, print exactly `.out` on stdout (anything
//!   printed before a runtime error; nothing for parse/analysis errors), and
//!   every line of the `.err` file must appear in stderr.

use std::path::{Path, PathBuf};
use std::process::{Command, Output};

fn dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../examples/conditions")
}

fn nep_files(dir: &Path) -> Vec<PathBuf> {
    let mut files: Vec<PathBuf> = std::fs::read_dir(dir)
        .unwrap_or_else(|e| panic!("cannot read {}: {e}", dir.display()))
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.extension().is_some_and(|x| x == "nep"))
        .collect();
    files.sort();
    files
}

fn run(file: &Path) -> Output {
    let db = std::env::temp_dir().join(format!("nepali-cond-{}.db", std::process::id()));
    Command::new(env!("CARGO_BIN_EXE_nepali-core-cli"))
        .arg("--mode").arg("os")
        .arg(file)
        .current_dir(file.parent().unwrap())
        .env("NEPALI_DB", db)
        .output()
        .expect("run nepali-core-cli")
}

fn expected(file: &Path, ext: &str) -> String {
    let p = file.with_extension(ext);
    std::fs::read_to_string(&p).unwrap_or_else(|_| panic!("missing {}", p.display()))
}

#[test]
fn every_condition_example_prints_exactly_its_expected_output() {
    let files = nep_files(&dir());
    assert!(files.len() >= 7, "condition examples went missing: {files:?}");
    for file in files {
        let out = run(&file);
        assert!(
            out.status.success(),
            "{} failed: {}",
            file.display(),
            String::from_utf8_lossy(&out.stderr)
        );
        assert_eq!(
            String::from_utf8_lossy(&out.stdout),
            expected(&file, "out"),
            "wrong output for {}",
            file.display()
        );
    }
}

#[test]
fn every_error_example_fails_with_exit_1_and_the_documented_message() {
    let files = nep_files(&dir().join("errors"));
    assert!(files.len() >= 15, "error examples went missing: {files:?}");
    for file in files {
        let out = run(&file);
        let stderr = String::from_utf8_lossy(&out.stderr);
        assert_eq!(out.status.code(), Some(1), "{} should exit 1", file.display());
        assert_eq!(
            String::from_utf8_lossy(&out.stdout),
            expected(&file, "out"),
            "wrong stdout for {}",
            file.display()
        );
        for line in expected(&file, "err").lines().filter(|l| !l.trim().is_empty()) {
            assert!(
                stderr.contains(line),
                "{}: stderr does not contain {line:?}\nstderr was: {stderr}",
                file.display()
            );
        }
    }
}
