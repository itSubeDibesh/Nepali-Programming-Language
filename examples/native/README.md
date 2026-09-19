# Programs for the native compiler

Numeric programs that also compile to machine code with `crates/nepali-codegen`
(LLVM). The native compiler supports numbers only for now (no text, arrays or
closures), so these print numbers only; anything else is a compile error that
names what is unsupported.

```bash
cd crates/nepali-codegen
cargo run -- run   ../../examples/native/collatz.nep                    # JIT
cargo run -- build ../../examples/native/collatz.nep -o /tmp/collatz    # standalone binary
```

The interpreter, the JIT and the compiled binary print identical output for
all three programs (checked by hand; the interpreter side is covered by
`cargo test --test tour`): `55` and `75025`; `168`; `26623 307`.

On `collatz.nep` the compiled binary took about 0.4 s and the interpreter about
1.1 s on the dev machine. That is a rough single run, not a benchmark.
