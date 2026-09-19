//! Real Linux-backed implementations of `nepali-core`'s host traits - no
//! FAT filesystem, no kernel-tracked process table to inject like the old
//! bare-metal kernel had, just real `std::fs` and a real SQLite database
//! (via `rusqlite`, bundled/statically-linked C SQLite - a real, audited
//! engine, not a hand-rolled one; see CLAUDE.md's non-goals).
use nepali_core::{HostCommand, HostFs, Value};
#[cfg(feature = "db")]
use nepali_core::HostDb;
use std::cell::RefCell;
use std::fs;
use std::process::Command;
use std::rc::Rc;
#[cfg(feature = "db")]
use std::sync::Mutex;

pub struct LinuxFs;

impl HostFs for LinuxFs {
    fn read_file(&self, path: &str) -> Result<String, String> {
        fs::read_to_string(path).map_err(|e| format!("{path}: {e}"))
    }

    fn write_file(&self, path: &str, contents: &str) -> Result<(), String> {
        fs::write(path, contents).map_err(|e| format!("{path}: {e}"))
    }

    fn list_dir(&self, path: &str) -> Result<Vec<String>, String> {
        let entries = fs::read_dir(path).map_err(|e| format!("{path}: {e}"))?;
        let mut names = Vec::new();
        for entry in entries {
            let entry = entry.map_err(|e| format!("{path}: {e}"))?;
            names.push(entry.file_name().to_string_lossy().into_owned());
        }
        names.sort();
        Ok(names)
    }
}

/// `rusqlite::Connection` isn't `Sync`, and `HostDb` is stored behind an
/// `Rc` (not `Arc`) the same way every other host trait already is here -
/// this interpreter is single-threaded, so a `Mutex` is only needed to
/// get `&self` (not `&mut self`) methods on the trait, not for real
/// concurrent access.
#[cfg(feature = "db")]
pub struct SqliteDb {
    conn: Mutex<rusqlite::Connection>,
}

#[cfg(feature = "db")]
impl SqliteDb {
    pub fn open(path: &str) -> Result<Self, String> {
        let conn = rusqlite::Connection::open(path)
            .map_err(|e| format!("failed to open database at {path}: {e}"))?;
        Ok(SqliteDb { conn: Mutex::new(conn) })
    }
}

#[cfg(feature = "db")]
impl HostDb for SqliteDb {
    fn execute(&self, sql: &str) -> Result<f64, String> {
        let conn = self.conn.lock().map_err(|_| "database lock poisoned".to_string())?;
        let affected = conn.execute(sql, []).map_err(|e| e.to_string())?;
        Ok(affected as f64)
    }

    fn query(&self, sql: &str) -> Result<Vec<Value>, String> {
        let conn = self.conn.lock().map_err(|_| "database lock poisoned".to_string())?;
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        let col_count = stmt.column_count();

        let rows = stmt
            .query_map([], |row| {
                let mut cols = Vec::with_capacity(col_count);
                for i in 0..col_count {
                    let value = match row.get_ref(i)? {
                        rusqlite::types::ValueRef::Null => Value::Null,
                        rusqlite::types::ValueRef::Integer(n) => Value::Number(n as f64),
                        rusqlite::types::ValueRef::Real(f) => Value::Number(f),
                        rusqlite::types::ValueRef::Text(t) => {
                            Value::Str(String::from_utf8_lossy(t).into_owned())
                        }
                        // A real, honest error - not silently mangled text
                        // or a dropped column - see the HostDb trait doc.
                        rusqlite::types::ValueRef::Blob(_) => {
                            return Err(rusqlite::Error::InvalidColumnType(
                                i,
                                "BLOB columns aren't supported by डाटाबेस_सोध्नुहोस् yet".into(),
                                rusqlite::types::Type::Blob,
                            ))
                        }
                    };
                    cols.push(value);
                }
                Ok(Value::Array(Rc::new(RefCell::new(cols))))
            })
            .map_err(|e| e.to_string())?;

        let mut out = Vec::new();
        for row in rows {
            out.push(row.map_err(|e| e.to_string())?);
        }
        Ok(out)
    }
}

/// Real command execution backing `आदेश_चलाउनुहोस्`/the agent loop, via
/// `std::process::Command` - a real argv array, never a shell string
/// (`Command::new(program).args(args)` doesn't invoke `/bin/sh` at all,
/// so shell metacharacters in `args` are inert literal argv entries,
/// not interpreted - see `HostCommand`'s trait doc for why that matters
/// for AI-driven callers).
pub struct RealCommand;

impl HostCommand for RealCommand {
    fn run(&self, program: &str, args: &[String]) -> Result<(i32, String, String), String> {
        let output = Command::new(program)
            .args(args)
            .output()
            .map_err(|e| format!("{program}: {e}"))?;
        let exit_code = output.status.code().unwrap_or(-1);
        let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
        let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
        Ok((exit_code, stdout, stderr))
    }
}

/// Real automated coverage for the filesystem/database bridges - same
/// reasoning as `host_python.rs`'s tests. Each test uses its own
/// distinct temp path (no shared fixture) so `cargo test`'s default
/// parallel execution can't race two tests against the same file.
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn real_write_then_read_round_trips_devanagari_content() {
        let path = std::env::temp_dir().join("nepali_core_test_fs_roundtrip.txt");
        let path = path.to_string_lossy().into_owned();
        let fs = LinuxFs;
        fs.write_file(&path, "नमस्ते संसार!").unwrap();
        assert_eq!(fs.read_file(&path).unwrap(), "नमस्ते संसार!");
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn real_list_dir_finds_a_real_written_file() {
        let dir = std::env::temp_dir().join("nepali_core_test_fs_listdir");
        std::fs::create_dir_all(&dir).unwrap();
        let file_path = dir.join("marker.txt");
        std::fs::write(&file_path, "x").unwrap();

        let fs = LinuxFs;
        let entries = fs.list_dir(&dir.to_string_lossy()).unwrap();
        assert!(entries.contains(&"marker.txt".to_string()));

        let _ = std::fs::remove_file(&file_path);
        let _ = std::fs::remove_dir(&dir);
    }

    #[test]
    fn read_file_missing_path_is_a_real_error() {
        let fs = LinuxFs;
        assert!(fs.read_file("/definitely/does/not/exist.txt").is_err());
    }

    #[cfg(feature = "db")]
    #[test]
    fn real_sqlite_create_insert_select_round_trip() {
        let path = std::env::temp_dir().join("nepali_core_test_db.sqlite");
        let _ = std::fs::remove_file(&path);
        let db = SqliteDb::open(&path.to_string_lossy()).unwrap();

        db.execute("CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)").unwrap();
        let affected = db.execute("INSERT INTO t (name) VALUES ('sita')").unwrap();
        assert_eq!(affected, 1.0);

        let rows = db.query("SELECT id, name FROM t").unwrap();
        assert_eq!(rows.len(), 1);
        match &rows[0] {
            Value::Array(cols) => {
                let cols = cols.borrow();
                match (&cols[0], &cols[1]) {
                    (Value::Number(id), Value::Str(name)) => {
                        assert_eq!(*id, 1.0);
                        assert_eq!(name, "sita");
                    }
                    other => panic!("unexpected row shape: {other:?}"),
                }
            }
            other => panic!("expected a row Array, got {other:?}"),
        }

        let _ = std::fs::remove_file(&path);
    }

    #[cfg(feature = "db")]
    #[test]
    fn real_sqlite_persists_across_reopening_the_same_file() {
        let path = std::env::temp_dir().join("nepali_core_test_db_persist.sqlite");
        let _ = std::fs::remove_file(&path);

        {
            let db = SqliteDb::open(&path.to_string_lossy()).unwrap();
            db.execute("CREATE TABLE t (name TEXT)").unwrap();
            db.execute("INSERT INTO t (name) VALUES ('persisted')").unwrap();
        } // connection dropped - real durability means this survives

        let db = SqliteDb::open(&path.to_string_lossy()).unwrap();
        let rows = db.query("SELECT name FROM t").unwrap();
        assert_eq!(rows.len(), 1);

        let _ = std::fs::remove_file(&path);
    }

    #[cfg(feature = "db")]
    #[test]
    fn invalid_sql_is_a_real_error() {
        let path = std::env::temp_dir().join("nepali_core_test_db_badsql.sqlite");
        let _ = std::fs::remove_file(&path);
        let db = SqliteDb::open(&path.to_string_lossy()).unwrap();
        assert!(db.execute("THIS IS NOT SQL").is_err());
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn real_command_captures_stdout_and_exit_code() {
        let cmd = RealCommand;
        let (code, stdout, _stderr) = cmd.run("echo", &["hello".to_string()]).unwrap();
        assert_eq!(code, 0);
        assert_eq!(stdout.trim(), "hello");
    }

    #[test]
    fn real_command_shell_metacharacters_are_inert() {
        // A real, meaningful security property: since this never goes
        // through `sh -c`, an argv entry that LOOKS like shell syntax is
        // passed through literally, not interpreted.
        let cmd = RealCommand;
        let (code, stdout, _stderr) = cmd
            .run("echo", &["$(whoami); rm -rf /tmp/nonexistent".to_string()])
            .unwrap();
        assert_eq!(code, 0);
        assert_eq!(stdout.trim(), "$(whoami); rm -rf /tmp/nonexistent");
    }

    #[test]
    fn real_command_nonzero_exit_is_reported_not_an_error() {
        let cmd = RealCommand;
        let (code, _stdout, _stderr) = cmd.run("false", &[]).unwrap();
        assert_ne!(code, 0);
    }

    #[test]
    fn real_command_missing_program_is_a_real_error() {
        let cmd = RealCommand;
        assert!(cmd.run("definitely-not-a-real-binary-xyz", &[]).is_err());
    }
}
