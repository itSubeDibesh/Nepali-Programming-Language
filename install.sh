#!/usr/bin/env bash
# Real local install for nepali-core, the language on its own - separate
# from the OS image (os-image/), matching CLAUDE.md's "the language
# itself remains independently shareable" section. Builds from source
# (Cargo, real - no prebuilt binaries fetched from anywhere) and installs
# the resulting `nepali` binary onto $PATH.
#
# By default builds with every interop bridge (matching the OS image's
# default feature set). For a genuinely dependency-free build (no
# libpython requirement - see CLAUDE.md's portability section), run:
#   NEPALI_FEATURES="--no-default-features --features rust-interop,js-interop" ./install.sh
#
# Deliberately does NOT include ai-interop by default, and even with
# NEPALI_FEATURES="--features ai-interop" this script never downloads or
# bakes in any model weights - that's the real split the user asked for:
# the language, installed this way, works standalone with zero AI unless
# you separately supply your own NEPALI_AI_MODEL_PATH/etc pointing at
# real model files you got yourself. The full nepali-os Docker image
# (see the repo's Dockerfile) is the other half of that split - it bakes
# real model weights in directly, so booting/running that OS gives
# working AI (एआई_सोध्नुहोस्/एआई_सुन्नुहोस्/एआई_बोल्नुहोस्/एजेन्ट_चलाउनुहोस्)
# with zero extra setup, which this standalone-language route never does.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="${NEPALI_INSTALL_DIR:-$HOME/.local/bin}"
FEATURES="${NEPALI_FEATURES:-}"

if ! command -v cargo >/dev/null 2>&1; then
    echo "error: cargo (Rust) isn't installed - get it from https://rustup.rs first" >&2
    exit 1
fi

echo "Building nepali-core-cli from source (release, this takes a minute)..."
# cd into the crate dir first, not just --manifest-path from the repo
# root: cargo resolves .cargo/config.toml (which pins PYO3_PYTHON to a
# version pyo3 actually supports - see that file's own comment) by
# walking up from the *current directory*, not from --manifest-path -
# a real, reproduced bug found running this script from the repo root:
# it silently picked up the system's newer, unsupported Python instead.
cd "$REPO_ROOT/crates/nepali-core"
# shellcheck disable=SC2086
cargo build --release $FEATURES

BIN_SRC="$REPO_ROOT/crates/nepali-core/target/release/nepali-core-cli"
if [ ! -f "$BIN_SRC" ]; then
    echo "error: build didn't produce $BIN_SRC - see the cargo output above" >&2
    exit 1
fi

mkdir -p "$INSTALL_DIR"
cp "$BIN_SRC" "$INSTALL_DIR/nepali"
chmod +x "$INSTALL_DIR/nepali"

echo "Installed: $INSTALL_DIR/nepali"
case ":$PATH:" in
    *":$INSTALL_DIR:"*) ;;
    *)
        echo "note: $INSTALL_DIR isn't on your \$PATH - add this to your shell profile:"
        echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
        ;;
esac
echo "Run it: nepali                 # real interactive shell"
echo "     or: nepali path/to/file.nep  # run a script"
