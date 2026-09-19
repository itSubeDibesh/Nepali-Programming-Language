//! Runs every program in `examples/tour/` through the real CLI binary and
//! compares stdout with the neighbouring `.out` file, so the tutorial
//! examples can never silently rot. `examples/tour/ai/` needs downloaded
//! models, so those files are only checked to parse and resolve.

use std::path::{Path, PathBuf};
use std::process::Command;

fn tour_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../examples/tour")
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

#[test]
fn every_tour_example_prints_exactly_its_expected_output() {
    let files = nep_files(&tour_dir());
    assert!(files.len() >= 13, "tour examples went missing: {files:?}");

    let db_dir = std::env::temp_dir().join(format!("nepali-tour-{}", std::process::id()));
    std::fs::create_dir_all(&db_dir).unwrap();

    for file in files {
        let expected_path = file.with_extension("out");
        let expected = std::fs::read_to_string(&expected_path)
            .unwrap_or_else(|_| panic!("missing expected output {}", expected_path.display()));

        let output = Command::new(env!("CARGO_BIN_EXE_nepali-core-cli"))
            .arg(&file)
            .current_dir(tour_dir())
            .env("NEPALI_DB", db_dir.join("tour.db"))
            .output()
            .expect("run nepali-core-cli");

        assert!(
            output.status.success(),
            "{} failed: {}",
            file.display(),
            String::from_utf8_lossy(&output.stderr)
        );
        assert_eq!(
            String::from_utf8_lossy(&output.stdout),
            expected,
            "wrong output for {}",
            file.display()
        );
    }
    let _ = std::fs::remove_dir_all(&db_dir);
}

#[test]
fn model_needing_examples_at_least_parse_and_resolve() {
    let files = nep_files(&tour_dir().join("ai"));
    assert!(!files.is_empty());
    for file in files {
        let src = std::fs::read_to_string(&file).unwrap();
        let program = nepali_core::Parser::new(&src)
            .parse_program()
            .unwrap_or_else(|e| panic!("{} does not parse: {e}", file.display()));
        nepali_core::Resolver::resolve(&program)
            .unwrap_or_else(|e| panic!("{} does not resolve: {e:?}", file.display()));
    }
}

#[test]
fn native_examples_run_in_the_interpreter_with_known_answers() {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../examples/native");
    let expect = [
        ("fibonacci.nep", "55\n75025\n"),
        ("primes.nep", "168\n"),
        ("collatz.nep", "26623 307\n"),
    ];
    for (name, out) in expect {
        let output = Command::new(env!("CARGO_BIN_EXE_nepali-core-cli"))
            .arg(dir.join(name))
            .output()
            .expect("run nepali-core-cli");
        assert!(output.status.success(), "{name}: {}", String::from_utf8_lossy(&output.stderr));
        assert_eq!(String::from_utf8_lossy(&output.stdout), out, "{name}");
    }
}
