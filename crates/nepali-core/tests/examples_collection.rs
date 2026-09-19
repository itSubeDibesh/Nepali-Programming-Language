//! Runs every learn-by-example program in the repo-root `examples/`
//! directory through the real `nepali-core-cli` binary and compares its
//! stdout with the sibling `.expected` file.
//!
//! - Only top-level `examples/*.nep` files are programs; helper modules live
//!   in subdirectories (e.g. `examples/lib/`) and are pulled in via `आयात`.
//! - A `.nep` without a `.expected` (or the reverse) fails the test, so the
//!   collection can never silently grow untested programs.
//! - `NEPALI_DB` and `HOME` point at a throwaway temp directory so nothing
//!   touches the developer's real database or home directory.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

fn examples_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../examples")
}

fn files_with_extension(dir: &Path, ext: &str) -> Vec<PathBuf> {
    let mut v: Vec<PathBuf> = fs::read_dir(dir)
        .unwrap_or_else(|e| panic!("cannot read {}: {e}", dir.display()))
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.is_file() && p.extension().and_then(|x| x.to_str()) == Some(ext))
        .collect();
    v.sort();
    v
}

#[test]
fn every_example_prints_exactly_its_expected_output() {
    let dir = examples_dir();
    let programs = files_with_extension(&dir, "nep");
    assert!(
        programs.len() >= 20,
        "expected at least 20 example programs in {}, found {}",
        dir.display(),
        programs.len()
    );

    let scratch = std::env::temp_dir().join(format!("nepali-examples-{}", std::process::id()));
    fs::create_dir_all(&scratch).unwrap();
    let db = scratch.join("examples.db");
    let home = scratch.join("home");
    fs::create_dir_all(&home).unwrap();

    let mut failures: Vec<String> = Vec::new();

    for program in &programs {
        let name = program.file_name().unwrap().to_string_lossy().to_string();
        let expected_path = program.with_extension("expected");

        let expected = match fs::read_to_string(&expected_path) {
            Ok(s) => s,
            Err(_) => {
                failures.push(format!(
                    "{name}: missing {} (every .nep needs a verified .expected)",
                    expected_path.file_name().unwrap().to_string_lossy()
                ));
                continue;
            }
        };

        let out = Command::new(env!("CARGO_BIN_EXE_nepali-core-cli"))
            .arg(&name)
            .current_dir(&dir)
            .env("NEPALI_DB", &db)
            .env("HOME", &home)
            .output()
            .unwrap_or_else(|e| panic!("cannot run nepali-core-cli for {name}: {e}"));

        let stdout = String::from_utf8_lossy(&out.stdout);
        if !out.status.success() {
            failures.push(format!(
                "{name}: exited with {}\n--- stderr ---\n{}\n--- stdout ---\n{}",
                out.status,
                String::from_utf8_lossy(&out.stderr),
                stdout
            ));
        } else if stdout != expected {
            failures.push(format!(
                "{name}: stdout differs from {}\n--- expected ---\n{expected}\n--- actual ---\n{stdout}",
                expected_path.file_name().unwrap().to_string_lossy()
            ));
        }
    }

    // A stale .expected whose program was renamed/deleted is also a mistake.
    for expected in files_with_extension(&dir, "expected") {
        if !expected.with_extension("nep").exists() {
            failures.push(format!(
                "{}: .expected file has no matching .nep program",
                expected.file_name().unwrap().to_string_lossy()
            ));
        }
    }

    let _ = fs::remove_dir_all(&scratch);

    assert!(
        failures.is_empty(),
        "{} example problem(s):\n\n{}",
        failures.len(),
        failures.join("\n\n")
    );
}
