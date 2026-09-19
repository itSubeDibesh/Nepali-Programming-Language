/* Real, tiny print runtime linked into every native binary
 * `link_native` produces (see lib.rs's module doc for why this exists
 * as a separate real implementation from the JIT path's Rust one, and
 * the stated non-integer-formatting divergence that implies). Compiled
 * and linked in the same `cc` invocation that consumes the LLVM-
 * emitted object file - no separate build step, no static library. */
#include <stdio.h>

void nepali_codegen_jit_print(double value, int is_first) {
    if (!is_first) {
        fputc(' ', stdout);
    }
    long long as_int = (long long)value;
    if ((double)as_int == value) {
        printf("%lld", as_int);
    } else {
        printf("%g", value);
    }
}

void nepali_codegen_jit_newline(void) {
    fputc('\n', stdout);
}

/* The real, only `main` a `link_native`-produced binary has - the
 * LLVM-emitted object file only exports `nepali_main` (an `f64`-
 * returning function, not a real process entry point), so this is the
 * actual, minimal C entry point that calls into it. */
extern double nepali_main(void);

int main(void) {
    nepali_main();
    return 0;
}
