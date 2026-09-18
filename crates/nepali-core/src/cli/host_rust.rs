//! Real, separately-compiled Rust plugins, `dlopen`ed at runtime via
//! `libloading` - the second of four planned real interop bridges
//! (Python (done), Rust (this), JS/TS, Go - see CLAUDE.md). Each plugin
//! is a real `cdylib` exporting `nepali_plugin_call`/
//! `nepali_plugin_free_string` with the exact signatures
//! `nepali-plugin-abi` defines (see `crates/nepali-example-plugin` for a
//! minimal real one, used to verify this bridge actually works).
use libloading::{Library, Symbol};
use nepali_core::{HostRust, Value};
use nepali_plugin_abi::{CValue, PluginCallFn, PluginFreeStringFn, TAG_BOOL, TAG_ERROR, TAG_NULL, TAG_NUMBER, TAG_STRING};
use std::cell::RefCell;
use std::collections::HashMap;
use std::ffi::{c_char, CStr, CString};

/// Caches loaded libraries by path - real reuse across multiple
/// `रस्ट_चलाउनुहोस्` calls in the same session, not a reload (and
/// re-`dlopen`) every time. `RefCell`, not `Mutex`: same single-threaded
/// reasoning as `SqliteDb`'s host_linux.rs.
pub struct RustPluginHost {
    loaded: RefCell<HashMap<String, Library>>,
}

impl RustPluginHost {
    pub fn new() -> Self {
        RustPluginHost { loaded: RefCell::new(HashMap::new()) }
    }
}

impl Default for RustPluginHost {
    fn default() -> Self {
        Self::new()
    }
}

impl HostRust for RustPluginHost {
    fn call(&self, lib_path: &str, fn_name: &str, args: &[Value]) -> Result<Value, String> {
        let mut loaded = self.loaded.borrow_mut();
        if !loaded.contains_key(lib_path) {
            // SAFETY: loading arbitrary native code is inherently unsafe -
            // the real trust boundary here is "whoever wrote the .nep
            // script chose this path", the same trust level as running
            // any other external program from the shell.
            let lib = unsafe { Library::new(lib_path) }
                .map_err(|e| format!("रस्ट_चलाउनुहोस्: '{lib_path}' लोड गर्न सकिएन: {e}"))?;
            loaded.insert(lib_path.to_string(), lib);
        }
        let lib = loaded.get(lib_path).expect("just inserted above");

        // SAFETY: the exact signatures nepali-plugin-abi::PluginCallFn/
        // PluginFreeStringFn specify - a real plugin (crates/
        // nepali-example-plugin) is built against the same shared crate,
        // so the ABI can't silently drift between host and plugin.
        let call_fn: Symbol<PluginCallFn> = unsafe { lib.get(b"nepali_plugin_call\0") }
            .map_err(|e| format!("रस्ट_चलाउनुहोस्: '{lib_path}' ले nepali_plugin_call export gardaina: {e}"))?;
        let free_fn: Symbol<PluginFreeStringFn> = unsafe { lib.get(b"nepali_plugin_free_string\0") }
            .map_err(|e| format!("रस्ट_चलाउनुहोस्: '{lib_path}' ले nepali_plugin_free_string export gardaina: {e}"))?;

        // Keeps every argument CString alive for the duration of the
        // call - CValue.string is just a borrowed raw pointer for an
        // argument (see nepali-plugin-abi's own doc), so the CString
        // backing it must outlive the actual FFI call below.
        let mut keepalive = Vec::with_capacity(args.len());
        let mut c_args = Vec::with_capacity(args.len());
        for v in args {
            c_args.push(value_to_cvalue(v, &mut keepalive)?);
        }

        let fn_name_c = CString::new(fn_name)
            .map_err(|_| "रस्ट_चलाउनुहोस्: function name मा null byte छ".to_string())?;

        // SAFETY: c_args is a real, valid slice for arg_count elements,
        // alive for the duration of this call (keepalive above); the
        // plugin contract says it must not retain the pointer past
        // returning.
        let result = unsafe { call_fn(fn_name_c.as_ptr(), c_args.as_ptr(), c_args.len()) };
        cvalue_to_value(result, &free_fn)
    }
}

fn value_to_cvalue(v: &Value, keepalive: &mut Vec<CString>) -> Result<CValue, String> {
    match v {
        Value::Number(n) => Ok(CValue::number(*n)),
        Value::Bool(b) => Ok(CValue::boolean(*b)),
        Value::Null => Ok(CValue::NULL),
        Value::Str(s) => {
            let c = CString::new(s.as_str())
                .map_err(|_| "रस्ट_चलाउनुहोस्: string argument मा null byte छ".to_string())?;
            let ptr = c.as_ptr();
            keepalive.push(c);
            Ok(CValue { tag: TAG_STRING, number: 0.0, boolean: false, string: ptr })
        }
        other => Err(format!(
            "रस्ट_चलाउनुहोस्: '{}' जस्तो मान रस्ट प्लगइनमा पठाउन सकिँदैन \
             (numbers, strings, bools, ra null matra samarthit cha)",
            other.display()
        )),
    }
}

fn cvalue_to_value(c: CValue, free_fn: &Symbol<PluginFreeStringFn>) -> Result<Value, String> {
    match c.tag {
        TAG_NULL => Ok(Value::Null),
        TAG_NUMBER => Ok(Value::Number(c.number)),
        TAG_BOOL => Ok(Value::Bool(c.boolean)),
        TAG_STRING => Ok(Value::Str(take_owned_string(c.string, free_fn))),
        TAG_ERROR => Err(take_owned_string(c.string, free_fn)),
        other => Err(format!("रस्ट_चलाउनुहोस्: प्लगइनले अपरिचित tag {other} फर्कायो")),
    }
}

/// Reads an owned string the plugin returned (see `CValue`'s own doc for
/// the ownership contract), then hands the pointer back to the plugin's
/// own `nepali_plugin_free_string` - never `free()`d directly, since the
/// plugin and host may not share an allocator.
fn take_owned_string(ptr: *const c_char, free_fn: &Symbol<PluginFreeStringFn>) -> String {
    if ptr.is_null() {
        return String::new();
    }
    let s = unsafe { CStr::from_ptr(ptr) }.to_string_lossy().into_owned();
    unsafe { free_fn(ptr as *mut c_char) };
    s
}

/// Real automated coverage for the Rust plugin bridge - same reasoning
/// as `host_python.rs`'s tests, against the real `nepali-example-plugin`
/// `cdylib` (built separately - see `find_example_plugin` for exactly
/// where this looks and what to run first if it's missing).
#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    /// The example plugin lives in a sibling crate with its own build
    /// output, not something `cargo test` here builds automatically -
    /// panics with the exact command to run first rather than silently
    /// skipping (a silently-skipped test that always "passes" would
    /// hide a real regression in this bridge, not just an unbuilt
    /// fixture).
    fn find_example_plugin() -> PathBuf {
        let manifest_dir = env!("CARGO_MANIFEST_DIR");
        let base = PathBuf::from(manifest_dir).join("../nepali-example-plugin/target");
        for profile in ["debug", "release"] {
            for ext in ["so", "dylib"] {
                let candidate = base.join(profile).join(format!("libnepali_example_plugin.{ext}"));
                if candidate.exists() {
                    return candidate;
                }
            }
        }
        panic!(
            "nepali-example-plugin isn't built - run `cargo build --manifest-path \
             ../nepali-example-plugin/Cargo.toml` first (searched under {})",
            base.display()
        );
    }

    #[test]
    fn real_plugin_number_call() {
        let plugin = find_example_plugin();
        let host = RustPluginHost::new();
        let result = host.call(&plugin.to_string_lossy(), "double", &[Value::Number(21.0)]).unwrap();
        match result {
            Value::Number(n) => assert_eq!(n, 42.0),
            other => panic!("expected Number(42), got {other:?}"),
        }
    }

    #[test]
    fn real_plugin_string_round_trip_with_devanagari() {
        let plugin = find_example_plugin();
        let host = RustPluginHost::new();
        let result = host
            .call(&plugin.to_string_lossy(), "greet", &[Value::Str("साथी".to_string())])
            .unwrap();
        match result {
            Value::Str(s) => assert!(s.contains("साथी"), "expected greeting to contain साथी, got: {s}"),
            other => panic!("expected Str, got {other:?}"),
        }
    }

    #[test]
    fn real_plugin_reuses_loaded_library_across_calls() {
        let plugin = find_example_plugin();
        let host = RustPluginHost::new();
        // Two calls against the same path - if reuse were broken (e.g.
        // a double-dlopen crash), the second call would fail or panic.
        let a = host.call(&plugin.to_string_lossy(), "add", &[Value::Number(1.0), Value::Number(2.0)]).unwrap();
        let b = host.call(&plugin.to_string_lossy(), "add", &[Value::Number(10.0), Value::Number(20.0)]).unwrap();
        assert!(matches!(a, Value::Number(n) if n == 3.0));
        assert!(matches!(b, Value::Number(n) if n == 30.0));
    }

    #[test]
    fn real_plugin_unknown_function_is_a_real_error() {
        let plugin = find_example_plugin();
        let host = RustPluginHost::new();
        let err = host.call(&plugin.to_string_lossy(), "does_not_exist", &[]).unwrap_err();
        assert!(err.contains("does_not_exist"), "error should name the missing function: {err}");
    }

    #[test]
    fn missing_library_path_is_a_real_error() {
        let host = RustPluginHost::new();
        assert!(host.call("/no/such/plugin.so", "double", &[Value::Number(1.0)]).is_err());
    }
}
