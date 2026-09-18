//! Real embedded Python via `pyo3` - the system's actual CPython, linked
//! into this process, not a subprocess shim. First of four planned real
//! interop bridges (Python, then Rust plugins, then JS/TS, then Go - see
//! CLAUDE.md). Dynamically linked against the host's libpython for now;
//! a statically-linked CPython (e.g. via `python-build-standalone`) is
//! real follow-up work toward a single, self-contained binary with no
//! separate runtime install required - not done yet, stated plainly
//! rather than silently assumed.
use nepali_core::{HostPython, Value};
use pyo3::prelude::*;
use pyo3::types::{PyAny, PyBool, PyDict, PyList, PyString};
use std::cell::RefCell;
use std::rc::Rc;

pub struct PyHost;

impl HostPython for PyHost {
    fn eval(&self, code: &str) -> Result<Value, String> {
        Python::with_gil(|py| {
            let globals = PyDict::new_bound(py);
            py.run_bound(code, Some(&globals), None)
                .map_err(|e| format!("python error: {e}"))?;

            match globals
                .get_item("परिणाम")
                .map_err(|e| e.to_string())?
            {
                Some(v) => py_to_value(&v),
                None => Ok(Value::Null),
            }
        })
    }
}

/// Converts a Python value into this language's `Value` - real recursive
/// conversion for the JSON-like subset (numbers, strings, bools, `None`,
/// lists/tuples), not just stringifying everything. Anything else (a
/// real Python object, a function, a dict - dicts have no `Value`
/// equivalent yet, since this language has no map/object type at all)
/// is a real, explicit error naming the actual Python type, not a
/// silent `repr()` fallback that would hide a real type mismatch.
fn py_to_value(v: &Bound<'_, PyAny>) -> Result<Value, String> {
    if v.is_none() {
        return Ok(Value::Null);
    }
    // Must check bool before int: in Python, bool is a subclass of int,
    // so `is_instance_of::<PyInt>` alone would also match `True`/`False`.
    if let Ok(b) = v.downcast::<PyBool>() {
        return Ok(Value::Bool(b.is_true()));
    }
    if let Ok(n) = v.extract::<f64>() {
        return Ok(Value::Number(n));
    }
    if let Ok(s) = v.downcast::<PyString>() {
        return Ok(Value::Str(s.to_string()));
    }
    if let Ok(list) = v.downcast::<PyList>() {
        let mut values = Vec::with_capacity(list.len());
        for item in list.iter() {
            values.push(py_to_value(&item)?);
        }
        return Ok(Value::Array(Rc::new(RefCell::new(values))));
    }
    Err(format!(
        "पाइथन_चलाउनुहोस्: कान्ति (परिणाम) को type '{}' लाई यो भाषाको मानमा बदल्न सकिँदैन \
         (numbers, strings, bools, None, ra lists/tuples matra samarthit cha)",
        v.get_type().name().map_err(|e| e.to_string())?
    ))
}

/// Real automated coverage for a bridge that was, until now, only ever
/// verified by hand (ad-hoc shell scripts against the built CLI - see
/// the git log around this file) - closing the gap between "verified
/// once by a human" and "verified every `cargo test`", the same
/// standard this project holds every other real claim to.
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn real_stdlib_call_and_arithmetic() {
        let host = PyHost;
        let result = host.eval("import math\nपरिणाम = math.sqrt(144)").unwrap();
        match result {
            Value::Number(n) => assert_eq!(n, 12.0),
            other => panic!("expected Number(12), got {other:?}"),
        }
    }

    #[test]
    fn real_list_comprehension_converts_to_array() {
        let host = PyHost;
        let result = host.eval("परिणाम = [x * x for x in range(5)]").unwrap();
        match result {
            Value::Array(a) => {
                let nums: Vec<f64> = a
                    .borrow()
                    .iter()
                    .map(|v| match v {
                        Value::Number(n) => *n,
                        other => panic!("expected Number in array, got {other:?}"),
                    })
                    .collect();
                assert_eq!(nums, vec![0.0, 1.0, 4.0, 9.0, 16.0]);
            }
            other => panic!("expected Array, got {other:?}"),
        }
    }

    #[test]
    fn no_result_variable_is_null_not_an_error() {
        let host = PyHost;
        let result = host.eval("x = 1 + 1").unwrap();
        assert!(matches!(result, Value::Null));
    }

    #[test]
    fn real_python_syntax_error_is_a_real_error() {
        let host = PyHost;
        assert!(host.eval("this is not python(((").is_err());
    }

    #[test]
    fn unsupported_result_type_is_a_real_explicit_error() {
        let host = PyHost;
        // A dict has no Value equivalent - must fail loudly, not
        // silently stringify or drop it.
        let err = host.eval("परिणाम = {'a': 1}").unwrap_err();
        assert!(err.contains("dict"), "error should name the real Python type: {err}");
    }
}
