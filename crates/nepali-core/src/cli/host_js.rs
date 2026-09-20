
//! Real embedded JavaScript/TypeScript - `rquickjs` (a real, bundled
//! QuickJS engine, statically compiled C sources, not a dynamically-
//! linked system library the way `pyo3`'s Python bridge currently is)
//! for real execution, `swc` (a real, proven compiler - not a hand-
//! rolled type-annotation stripper) for real TS->JS transpilation. Third
//! of four planned real interop bridges (Python, Rust done, JS/TS this,
//! Go done - see CLAUDE.md).
use nepali_core::{HostJs, Value};
use rquickjs::{Context, Runtime};
use std::cell::RefCell;
use std::rc::Rc;
use swc_core::common::sync::Lrc;
use swc_core::common::{FileName, Globals, Mark, SourceMap, GLOBALS};
use swc_core::ecma::ast::{Pass, Program};
use swc_core::ecma::codegen::text_writer::JsWriter;
use swc_core::ecma::codegen::{Config as CodegenConfig, Emitter};
use swc_core::ecma::parser::{lexer::Lexer, Parser, StringInput, Syntax, TsSyntax};
use swc_core::ecma::transforms::base::resolver;
use swc_core::ecma::transforms::typescript::strip;

fn devanagari_to_ascii_digits(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            '०' => '0',
            '१' => '1',
            '२' => '2',
            '३' => '3',
            '४' => '4',
            '५' => '5',
            '६' => '6',
            '७' => '7',
            '८' => '8',
            '९' => '9',
            other => other,
        })
        .collect()
}

pub struct QuickJsHost;

impl HostJs for QuickJsHost {
    fn eval(&self, code: &str) -> Result<Value, String> {
        eval_js(code, "जेएस_चलाउनुहोस्")
    }

    fn eval_ts(&self, code: &str) -> Result<Value, String> {
        let js = transpile_ts(code)?;
        eval_js(&js, "टिएस_चलाउनुहोस्")
    }
}

/// A fresh Runtime/Context per call, deliberately - same no-cross-call-
/// state convention as HostPython's fresh globals dict each time, so the
/// "run foreign code" builtins behave predictably the same way rather
/// than one silently persisting state and the other not.
fn eval_js(raw_code: &str, builtin_name: &str) -> Result<Value, String> {
    let normalized = devanagari_to_ascii_digits(raw_code);
    let code = normalized.as_str();
    let rt = Runtime::new().map_err(|e| format!("{builtin_name}: runtime सुरु गर्न सकिएन: {e}"))?;
    let ctx = Context::full(&rt).map_err(|e| format!("{builtin_name}: context सुरु गर्न सकिएन: {e}"))?;

    ctx.with(|ctx| {
        let result: rquickjs::Result<rquickjs::Value> = ctx.eval(code);
        match result {
            Ok(v) => js_to_value(&v),
            Err(e) => Err(format!("javascript error: {e}")),
        }
    })
}

/// Real TypeScript -> JavaScript transpilation via `swc`: parses `code`
/// as real TS syntax (type annotations, `interface`, `enum`, `as` casts,
/// generics, ...), strips the type-only constructs with swc's own real
/// TS-stripping transform (not a regex or hand-rolled stripper - real
/// type positions are understood structurally), and re-emits real JS
/// text for the QuickJS engine to run.
fn transpile_ts(code: &str) -> Result<String, String> {
    let cm: Lrc<SourceMap> = Default::default();
    let fm = cm.new_source_file(Lrc::new(FileName::Custom("input.ts".into())), code.to_string());

    let lexer = Lexer::new(
        Syntax::Typescript(TsSyntax::default()),
        Default::default(),
        StringInput::from(&*fm),
        None,
    );
    let mut parser = Parser::new_from(lexer);
    let module = parser
        .parse_module()
        .map_err(|e| format!("टिएस_चलाउनुहोस्: parse error: {e:?}"))?;

    let globals = Globals::new();
    GLOBALS.set(&globals, || {
        let unresolved_mark = Mark::new();
        let top_level_mark = Mark::new();
        let mut program = Program::Module(module);
        resolver(unresolved_mark, top_level_mark, true).process(&mut program);
        strip(unresolved_mark, top_level_mark).process(&mut program);
        let module = match program {
            Program::Module(m) => m,
            Program::Script(_) => unreachable!("parsed as a module above, never a script"),
        };

        let mut buf = Vec::new();
        {
            let writer = JsWriter::new(cm.clone(), "\n", &mut buf, None);
            let mut emitter = Emitter {
                cfg: CodegenConfig::default(),
                cm: cm.clone(),
                comments: None,
                wr: writer,
            };
            emitter
                .emit_module(&module)
                .map_err(|e| format!("टिएस_चलाउनुहोस्: codegen error: {e}"))?;
        }
        String::from_utf8(buf).map_err(|e| format!("टिएस_चलाउनुहोस्: generated JS wasn't valid UTF-8: {e}"))
    })
}

/// Converts a QuickJS value into this language's `Value` - real
/// recursive conversion for the JSON-like subset (numbers, strings,
/// bools, `null`/`undefined`, arrays), matching `host_python.rs`'s
/// `py_to_value` in scope and reasoning. A real JS object or function is
/// a real, explicit error naming the actual JS type, not a silent
/// stringify.
fn js_to_value(v: &rquickjs::Value) -> Result<Value, String> {
    if v.is_null() || v.is_undefined() {
        return Ok(Value::Null);
    }
    if v.is_bool() {
        return Ok(Value::Bool(v.as_bool().unwrap()));
    }
    if v.is_number() {
        return Ok(Value::Number(v.as_number().unwrap()));
    }
    if v.is_string() {
        return Ok(Value::Str(
            v.as_string().unwrap().to_string().map_err(|e| e.to_string())?,
        ));
    }
    if v.is_array() {
        let arr = v.as_array().unwrap();
        let mut values = Vec::with_capacity(arr.len());
        for item in arr.iter::<rquickjs::Value>() {
            let item = item.map_err(|e| e.to_string())?;
            values.push(js_to_value(&item)?);
        }
        return Ok(Value::Array(Rc::new(RefCell::new(values))));
    }
    Err(format!(
        "परिणामको type '{}' लाई यो भाषाको मानमा बदल्न सकिँदैन \
         (numbers, strings, bools, null/undefined, ra arrays matra samarthit cha)",
        v.type_name()
    ))
}

/// Real automated coverage for the JS/TS bridge - same reasoning as
/// `host_python.rs`'s tests: this was only ever verified by hand until
/// now.
#[cfg(test)]
mod tests {
    use super::*;

    fn number(v: Value) -> f64 {
        match v {
            Value::Number(n) => n,
            other => panic!("expected Number, got {other:?}"),
        }
    }

    #[test]
    fn real_js_arithmetic() {
        let host = QuickJsHost;
        assert_eq!(number(host.eval("1 + 2 * 3").unwrap()), 7.0);
    }

    #[test]
    fn real_js_function_with_map_returns_array() {
        let host = QuickJsHost;
        let result = host.eval("[0,1,2,3].map(x => x * x)").unwrap();
        match result {
            Value::Array(a) => {
                let nums: Vec<f64> = a.borrow().iter().map(|v| number(v.clone())).collect();
                assert_eq!(nums, vec![0.0, 1.0, 4.0, 9.0]);
            }
            other => panic!("expected Array, got {other:?}"),
        }
    }

    #[test]
    fn js_syntax_error_is_a_real_error() {
        let host = QuickJsHost;
        assert!(host.eval("this is not { valid js (((").is_err());
    }

    #[test]
    fn js_object_result_is_a_real_explicit_error() {
        let host = QuickJsHost;
        let err = host.eval("({a: 1})").unwrap_err();
        assert!(err.contains("object"), "error should name the real JS type: {err}");
    }

    #[test]
    fn real_ts_interface_and_typed_function() {
        let host = QuickJsHost;
        let ts = "interface Point { x: number; y: number; } \
                  function dist(a: Point, b: Point): number { \
                    return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2); \
                  } \
                  dist({x:0,y:0}, {x:3,y:4})";
        assert_eq!(number(host.eval_ts(ts).unwrap()), 5.0);
    }

    #[test]
    fn real_ts_enum_compiles_to_real_reverse_mapping() {
        // Not just "strip the word enum" - a real TS enum compiles to an
        // object with both forward AND reverse mappings, which only a
        // real compiler pass (not a type-annotation regex) produces.
        let host = QuickJsHost;
        let ts = "enum Direction { Up, Down } \
                  Direction[Direction.Up]";
        match host.eval_ts(ts).unwrap() {
            Value::Str(s) => assert_eq!(s, "Up"),
            other => panic!("expected Str(\"Up\"), got {other:?}"),
        }
    }

    #[test]
    fn real_ts_generic_function() {
        let host = QuickJsHost;
        let ts = "function identity<T>(x: T): T { return x; } identity<string>('ok')";
        match host.eval_ts(ts).unwrap() {
            Value::Str(s) => assert_eq!(s, "ok"),
            other => panic!("expected Str(\"ok\"), got {other:?}"),
        }
    }

    #[test]
    fn ts_type_error_at_parse_time_is_a_real_error() {
        let host = QuickJsHost;
        // Genuinely malformed TS syntax (unterminated interface), not
        // just a type mismatch swc doesn't check anyway.
        assert!(host.eval_ts("interface Broken {").is_err());
    }
}
