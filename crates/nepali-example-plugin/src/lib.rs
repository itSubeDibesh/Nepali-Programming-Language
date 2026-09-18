//! A real, minimal example plugin - exists to verify `nepali-core`'s
//! Rust interop bridge actually works (number args/returns, string
//! args/returns with real ownership handoff, and a real error path),
//! not as a feature anyone would use for real. See CLAUDE.md.
use nepali_plugin_abi::{CValue, TAG_NUMBER, TAG_STRING};
use std::ffi::{c_char, CStr};
use std::slice;

#[no_mangle]
pub unsafe extern "C" fn nepali_plugin_call(
    name: *const c_char,
    args: *const CValue,
    arg_count: usize,
) -> CValue {
    let name = match unsafe { CStr::from_ptr(name) }.to_str() {
        Ok(s) => s,
        Err(_) => return CValue::error("function name wasn't valid UTF-8".to_string()),
    };
    let args = unsafe { slice::from_raw_parts(args, arg_count) };

    match name {
        "double" => match args {
            [a] if a.tag == TAG_NUMBER => CValue::number(a.number * 2.0),
            _ => CValue::error("double(n) needs exactly one number argument".to_string()),
        },
        "add" => match args {
            [a, b] if a.tag == TAG_NUMBER && b.tag == TAG_NUMBER => {
                CValue::number(a.number + b.number)
            }
            _ => CValue::error("add(a, b) needs exactly two number arguments".to_string()),
        },
        "greet" => match args {
            [a] if a.tag == TAG_STRING => {
                let s = unsafe { CStr::from_ptr(a.string) }.to_string_lossy();
                CValue::owned_string(format!("नमस्ते, {s}! (from a real compiled Rust plugin)"))
            }
            _ => CValue::error("greet(name) needs exactly one string argument".to_string()),
        },
        other => CValue::error(format!("no such plugin function: '{other}'")),
    }
}

#[no_mangle]
pub unsafe extern "C" fn nepali_plugin_free_string(ptr: *mut c_char) {
    unsafe { nepali_plugin_abi::free_owned_string(ptr) };
}
