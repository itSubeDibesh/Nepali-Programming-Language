use nepali_core::{Parser, Stmt};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

/// Reads `entry_path`, recursively resolving every `आयात "..."` statement
/// (paths are relative to the importing file's own directory) into a
/// single flattened statement list - imported files' top-level statements
/// come first, in first-import order, followed by the entry file's own
/// statements. There's one shared global scope (matching how the
/// interpreter's Environment already works): an imported file's functions
/// and top-level variables become visible to whatever imports it.
///
/// Supports .nep, .nepali, .नेपाली, and .नेप extensions automatically.
///
/// Importing the same (canonicalized) file twice is a no-op the second
/// time - this also breaks import cycles, rather than recursing forever.
pub fn load(entry_path: &Path) -> Result<Vec<Stmt>, String> {
    let mut visited = HashSet::new();
    let mut out = Vec::new();
    load_into(entry_path, &mut visited, &mut out)?;
    Ok(out)
}

fn resolve_import_path(base_dir: &Path, import_str: &str) -> PathBuf {
    let direct = base_dir.join(import_str);
    if direct.exists() {
        return direct;
    }

    // Try alternative Nepali file extensions if no extension or file not found directly
    let candidate_extensions = [".nep", ".nepali", ".नेपाली", ".नेप"];
    for ext in &candidate_extensions {
        let with_ext = base_dir.join(format!("{}{}", import_str, ext));
        if with_ext.exists() {
            return with_ext;
        }
    }

    direct
}

fn load_into(
    path: &Path,
    visited: &mut HashSet<PathBuf>,
    out: &mut Vec<Stmt>,
) -> Result<(), String> {
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("cannot resolve {}: {e}", path.display()))?;

    if !visited.insert(canonical.clone()) {
        return Ok(()); // already imported (or a cycle) - skip silently
    }

    let src = fs::read_to_string(&canonical)
        .map_err(|e| format!("cannot read {}: {e}", canonical.display()))?;

    let mut parser = Parser::new(&src);
    let program = parser
        .parse_program()
        .map_err(|e| format!("{}: parse error: {e}", canonical.display()))?;

    let dir = canonical
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from("."));

    for stmt in program {
        match stmt {
            Stmt::Import(import_path) => {
                let resolved = resolve_import_path(&dir, &import_path);
                load_into(&resolved, visited, out)?;
            }
            other => out.push(other),
        }
    }

    Ok(())
}
