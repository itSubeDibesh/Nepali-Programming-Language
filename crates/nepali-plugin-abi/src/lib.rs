//! The stable C-ABI contract between `nepali-core`'s host process and a
//! real, separately-compiled Rust plugin it `dlopen`s at runtime (the
//! second of four planned real interop bridges - Python (done), Rust
//! (this), JS/TS, Go - see CLAUDE.md). Both the host
//! (`nepali-core/src/cli/host_rust.rs`) and every plugin depend on this
//! one crate, so the struct layout can never silently drift out of sync
//! between them - that would be a real, silent memory-corruption bug,
//! not a hypothetical one.
//!
//! **Deliberately not a Rust `enum`-with-data across the FFI boundary**:
//! even though `#[repr(C)]` enums have a defined layout since stable
//! Rust, a hand-written tag byte + plain fields is more foolproof against
//! any future edition/compiler skew between the host and a plugin built
//! at a different time - the whole point of a stable ABI is to not have
//! to trust "should be fine" here.
use std::ffi::{c_char, CString};

pub const TAG_NULL: u8 = 0;
pub const TAG_NUMBER: u8 = 1;
pub const TAG_STRING: u8 = 2;
pub const TAG_BOOL: u8 = 3;
/// A real, explicit "this plugin call failed" tag - distinct from
/// `TAG_NULL`, so a plugin can report a real error message (via the
/// `string` field) instead of the host having no way to distinguish
/// "returned null" from "something went wrong".
pub const TAG_ERROR: u8 = 4;

/// One value crossing the FFI boundary in either direction. `string` is
/// only meaningful when `tag` is `TAG_STRING` or `TAG_ERROR`, and is
/// always a real null-terminated C string - either borrowed for the
/// duration of one call (an argument, host -> plugin) or owned and
/// requiring a matching `nepali_plugin_free_string` call (a return
/// value, plugin -> host) - see each direction's own doc below.
#[repr(C)]
#[derive(Clone, Copy)]
pub struct CValue {
    pub tag: u8,
    pub number: f64,
    pub boolean: bool,
    /// Null when unused. When `tag == TAG_STRING` or `TAG_ERROR` on a
    /// *return* value, this pointer was allocated by the plugin (via
    /// `CString::into_raw`) and the host must pass it to
    /// `nepali_plugin_free_string` exactly once - not `free()` directly,
    /// since the plugin and host may not share an allocator.
    pub string: *const c_char,
}

impl CValue {
    pub const NULL: CValue = CValue { tag: TAG_NULL, number: 0.0, boolean: false, string: std::ptr::null() };

    pub const fn number(n: f64) -> CValue {
        CValue { tag: TAG_NUMBER, number: n, boolean: false, string: std::ptr::null() }
    }

    pub const fn boolean(b: bool) -> CValue {
        CValue { tag: TAG_BOOL, number: 0.0, boolean: b, string: std::ptr::null() }
    }

    /// Takes ownership of `s`, leaking it across the FFI boundary as a
    /// raw pointer the host is contractually required to hand back to
    /// `nepali_plugin_free_string` - see the struct doc.
    pub fn owned_string(s: String) -> CValue {
        let c = CString::new(s).unwrap_or_default();
        CValue { tag: TAG_STRING, number: 0.0, boolean: false, string: c.into_raw() }
    }

    /// Same ownership contract as `owned_string`, but tagged as a real
    /// error rather than a successful string result.
    pub fn error(msg: String) -> CValue {
        let c = CString::new(msg).unwrap_or_default();
        CValue { tag: TAG_ERROR, number: 0.0, boolean: false, string: c.into_raw() }
    }
}

/// The exact signature every plugin must export as
/// `nepali_plugin_call`. `args`/`arg_count` describe a borrowed slice
/// valid only for the duration of the call - a plugin must not retain
/// the pointer past returning. The return value follows `CValue`'s own
/// ownership rules (see its doc).
pub type PluginCallFn = unsafe extern "C" fn(
    name: *const c_char,
    args: *const CValue,
    arg_count: usize,
) -> CValue;

/// The exact signature every plugin must export as
/// `nepali_plugin_free_string`, freeing a `CValue.string` the plugin
/// itself allocated and returned - never called on a *borrowed* string
/// (an argument the host passed in).
pub type PluginFreeStringFn = unsafe extern "C" fn(ptr: *mut c_char);

/// Convenience for a plugin's own `nepali_plugin_free_string` export -
/// reconstructs the `CString` `CValue::owned_string`/`CValue::error`
/// leaked via `into_raw`, and lets it drop for real, matching allocators
/// on both sides of the call (the plugin's own).
///
/// # Safety
/// `ptr` must be exactly a pointer this same plugin previously returned
/// via `CValue::owned_string`/`CValue::error`, and must not be freed
/// more than once.
pub unsafe fn free_owned_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        drop(unsafe { CString::from_raw(ptr) });
    }
}
