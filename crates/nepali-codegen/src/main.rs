//! CLI for `nepali-codegen`: `nepali-codegen build <file.nep> -o <out>`
//! compiles to a real native standalone executable; `nepali-codegen run
//! <file.nep>` JIT-compiles and runs it in-process. See `lib.rs`'s
//! module doc for the real, stated scope of what this subset of the
//! language supports.

use inkwell::context::Context;
use nepali_codegen::{compile_to_object, link_native, run_jit, Codegen};
use std::env;
use std::path::PathBuf;
use std::process::ExitCode;

fn main() -> ExitCode {
    let args: Vec<String> = env::args().collect();
    match args.get(1).map(String::as_str) {
        Some("run") => match args.get(2) {
            Some(path) => run_cmd(path),
            None => usage(),
        },
        Some("build") => {
            let path = args.get(2);
            let out = args
                .iter()
                .position(|a| a == "-o")
                .and_then(|i| args.get(i + 1));
            match (path, out) {
                (Some(path), Some(out)) => build_cmd(path, out),
                _ => usage(),
            }
        }
        _ => usage(),
    }
}

fn usage() -> ExitCode {
    eprintln!("usage:");
    eprintln!("  nepali-codegen run <file.nep>              # JIT-compile and run");
    eprintln!("  nepali-codegen build <file.nep> -o <out>   # emit a real native executable");
    ExitCode::FAILURE
}

fn run_cmd(path: &str) -> ExitCode {
    let source = match std::fs::read_to_string(path) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("nepali-codegen: failed to read {path}: {e}");
            return ExitCode::FAILURE;
        }
    };
    let mut parser = nepali_core::Parser::new(&source);
    let program = match parser.parse_program() {
        Ok(p) => p,
        Err(e) => {
            eprintln!("nepali-codegen: parse error: {e}");
            return ExitCode::FAILURE;
        }
    };
    if let Err(errs) = nepali_core::Resolver::resolve(&program) {
        eprintln!("nepali-codegen: resolution error(s): {}", errs.join("; "));
        return ExitCode::FAILURE;
    }

    let context = Context::create();
    let mut codegen = Codegen::new(&context, "nepali_module");
    if let Err(e) = codegen.compile_program(&program) {
        eprintln!("nepali-codegen: codegen error: {e}");
        return ExitCode::FAILURE;
    }
    match run_jit(&codegen) {
        Ok(_) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("nepali-codegen: JIT execution error: {e}");
            ExitCode::FAILURE
        }
    }
}

fn build_cmd(path: &str, out: &str) -> ExitCode {
    let source = match std::fs::read_to_string(path) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("nepali-codegen: failed to read {path}: {e}");
            return ExitCode::FAILURE;
        }
    };
    let mut parser = nepali_core::Parser::new(&source);
    let program = match parser.parse_program() {
        Ok(p) => p,
        Err(e) => {
            eprintln!("nepali-codegen: parse error: {e}");
            return ExitCode::FAILURE;
        }
    };
    if let Err(errs) = nepali_core::Resolver::resolve(&program) {
        eprintln!("nepali-codegen: resolution error(s): {}", errs.join("; "));
        return ExitCode::FAILURE;
    }

    let context = Context::create();
    let mut codegen = Codegen::new(&context, "nepali_module");
    if let Err(e) = codegen.compile_program(&program) {
        eprintln!("nepali-codegen: codegen error: {e}");
        return ExitCode::FAILURE;
    }

    let out_path = PathBuf::from(out);
    let object_path = out_path.with_extension("o");
    if let Err(e) = compile_to_object(&codegen, &object_path) {
        eprintln!("nepali-codegen: object emission error: {e}");
        return ExitCode::FAILURE;
    }
    if let Err(e) = link_native(&object_path, &out_path) {
        eprintln!("nepali-codegen: link error: {e}");
        return ExitCode::FAILURE;
    }
    let _ = std::fs::remove_file(&object_path);
    println!("nepali-codegen: wrote real native executable to {out}");
    ExitCode::SUCCESS
}
