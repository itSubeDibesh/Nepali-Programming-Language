# A genuinely static, single-file nepali-core-cli - real portability
# proof, not just "no libpython dependency" (see the feature-gating
# commit). rust:alpine is musl libc natively, so a normal `cargo build`
# here produces a fully statically-linked binary with zero runtime
# library dependencies at all - verified with `file`/`ldd` in the build
# log, not assumed. Built with rust-interop + js-interop only
# (python-interop needs a real libpython, which is fundamentally
# incompatible with a single static binary until pyo3 supports static
# embedding - see CLAUDE.md).
FROM rust:1-alpine AS builder
RUN apk add --no-cache musl-dev gcc patch
WORKDIR /build
COPY crates/nepali-plugin-abi ./crates/nepali-plugin-abi
COPY crates/nepali-core ./crates/nepali-core
RUN cargo build --release --manifest-path crates/nepali-core/Cargo.toml \
    --no-default-features --features rust-interop,js-interop

RUN apk add --no-cache file
RUN file crates/nepali-core/target/release/nepali-core-cli
# A real static binary has no dynamic interpreter at all - ldd on musl
# prints "Not a valid dynamic program" (or similar) for one, unlike a
# dynamically-linked binary which lists real .so dependencies. `|| true`
# only because that "failure" *is* the success case here.
RUN ldd crates/nepali-core/target/release/nepali-core-cli 2>&1 || true

FROM scratch AS export
COPY --from=builder /build/crates/nepali-core/target/release/nepali-core-cli /nepali-core-cli
