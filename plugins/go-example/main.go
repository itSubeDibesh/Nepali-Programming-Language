// A real, minimal example Go plugin for nepali-core's native-plugin
// interop bridge (रस्ट_चलाउनुहोस्/गो_चलाउनुहोस् - see CLAUDE.md). Exists to
// verify that a real `go build -buildmode=c-shared` binary can satisfy
// the exact same C-ABI contract (nepali-plugin-abi's CValue struct and
// nepali_plugin_call/nepali_plugin_free_string signatures) a real Rust
// plugin does - one host-side loader (host_rust.rs), two real source
// languages producing a compatible shared library, not two separate
// mechanisms pretending to be one.
package main

/*
#include <stdint.h>
#include <stdbool.h>
#include <stdlib.h>

typedef struct {
	uint8_t tag;
	double number;
	_Bool boolean;
	const char *string;
} CValue;

static CValue make_number(double n) {
	CValue v = {1, n, false, NULL};
	return v;
}
static CValue make_bool(_Bool b) {
	CValue v = {3, 0, b, NULL};
	return v;
}
static CValue make_string(const char *s) {
	CValue v = {2, 0, false, s};
	return v;
}
static CValue make_error(const char *s) {
	CValue v = {4, 0, false, s};
	return v;
}
*/
import "C"
import (
	"fmt"
	"unsafe"
)

const (
	tagNull   = 0
	tagNumber = 1
	tagString = 2
	tagBool   = 3
)

//export nepali_plugin_call
func nepali_plugin_call(name *C.char, args *C.CValue, argCount C.size_t) C.CValue {
	fnName := C.GoString(name)
	n := int(argCount)
	argSlice := unsafe.Slice(args, n)

	switch fnName {
	case "double":
		if n != 1 || argSlice[0].tag != tagNumber {
			return C.make_error(C.CString("double(n) needs exactly one number argument"))
		}
		return C.make_number(C.double(float64(argSlice[0].number) * 2))

	case "add":
		if n != 2 || argSlice[0].tag != tagNumber || argSlice[1].tag != tagNumber {
			return C.make_error(C.CString("add(a, b) needs exactly two number arguments"))
		}
		return C.make_number(C.double(float64(argSlice[0].number) + float64(argSlice[1].number)))

	case "greet":
		if n != 1 || argSlice[0].tag != tagString {
			return C.make_error(C.CString("greet(name) needs exactly one string argument"))
		}
		who := C.GoString(argSlice[0].string)
		msg := fmt.Sprintf("नमस्ते, %s! (from a real compiled Go plugin)", who)
		return C.make_string(C.CString(msg))

	default:
		return C.make_error(C.CString(fmt.Sprintf("no such plugin function: '%s'", fnName)))
	}
}

//export nepali_plugin_free_string
func nepali_plugin_free_string(ptr *C.char) {
	C.free(unsafe.Pointer(ptr))
}

func main() {}
