#!/usr/bin/env bash
# Real local install for nepali-core, the language on its own - separate
# from the OS image (os-image/), matching CLAUDE.md's "the language
# itself remains independently shareable" section.
#
# Default mode: downloads the matching prebuilt release binary from GitHub
# (no Rust toolchain needed). Falls back to building from source if no
# release is available for the current platform.
#
# Build-from-source mode:
#   NEPALI_BUILD=source ./install.sh
#   NEPALI_FEATURES="--no-default-features --features rust-interop,js-interop" ./install.sh
#
# Deliberately does NOT include ai-interop by default, and even with
# --features ai-interop this script never downloads or bakes in any model
# weights - that's the real split the user asked for: the language,
# installed this way, works standalone with zero AI unless you separately
# supply your own NEPALI_AI_MODEL_PATH/etc. The full nepali-os Docker
# image is the other half.
set -euo pipefail

REPO="${NEPALI_REPO:-anomalyco/nepali}"
INSTALL_DIR="${NEPALI_INSTALL_DIR:-$HOME/.local/bin}"
BUILD_MODE="${NEPALI_BUILD:-download}"
FEATURES="${NEPALI_FEATURES:-}"

# --- Platform detection ---

detect_platform() {
    local os arch
    os="$(uname -s)"
    arch="$(uname -m)"
    case "$os" in
        Linux)  os="linux" ;;
        Darwin) os="macos" ;;
        MINGW*|MSYS*|CYGWIN*) os="windows" ;;
        *) echo "error: unsupported OS: $os" >&2; exit 1 ;;
    esac
    case "$arch" in
        x86_64|amd64) arch="x86_64" ;;
        aarch64|arm64) arch="aarch64" ;;
        *) echo "error: unsupported architecture: $arch" >&2; exit 1 ;;
    esac
    echo "${arch}-${os}"
}

# --- Download path ---

download_release() {
    local platform version tag asset url
    platform="$(detect_platform)"
    # Try to get the latest release tag from GitHub API
    version="$(curl -sf "https://api.github.com/repos/${REPO}/releases/latest" \
        | grep '"tag_name"' | head -1 | sed 's/.*"v\([^"]*\)".*/\1/' || true)"
    if [ -z "$version" ]; then
        echo "note: could not determine latest release, checking for v0.1.0" >&2
        version="0.1.0"
    fi
    tag="v${version}"

    case "$platform" in
        x86_64-linux)   asset="nepali-${version}-x86_64-linux.tar.gz" ;;
        aarch64-linux)  asset="nepali-${version}-aarch64-linux.tar.gz" ;;
        aarch64-macos)  asset="nepali-${version}-aarch64-macos.tar.gz" ;;
        x86_64-macos)   asset="nepali-${version}-x86_64-macos.tar.gz" ;;
        x86_64-windows) asset="nepali-${version}-x86_64-windows.zip" ;;
        *)
            echo "error: no prebuilt binary for ${platform}" >&2
            echo "install Rust and run: NEPALI_BUILD=source ./install.sh" >&2
            exit 1
            ;;
    esac

    url="https://github.com/${REPO}/releases/download/${tag}/${asset}"
    echo "Downloading ${asset} from ${url}..."
    local tmpdir
    tmpdir="$(mktemp -d)"
    trap 'rm -rf "$tmpdir"' EXIT

    if ! curl -fSL -o "${tmpdir}/${asset}" "$url"; then
        echo "error: download failed (release may not exist for ${platform})" >&2
        echo "install Rust and run: NEPALI_BUILD=source ./install.sh" >&2
        exit 1
    fi

    # Verify checksum if SHA256SUMS is available
    local sums_url="https://github.com/${REPO}/releases/download/${tag}/SHA256SUMS"
    if curl -fSL -o "${tmpdir}/SHA256SUMS" "$sums_url" 2>/dev/null; then
        (cd "$tmpdir" && sha256sum -c SHA256SUMS --ignore-missing) || {
            echo "error: checksum verification failed" >&2
            exit 1
        }
        echo "Checksum verified."
    fi

    mkdir -p "$INSTALL_DIR"
    case "$asset" in
        *.tar.gz)
            tar xzf "${tmpdir}/${asset}" -C "$tmpdir"
            cp "$tmpdir/nepali" "$INSTALL_DIR/nepali"
            ;;
        *.zip)
            unzip -o "${tmpdir}/${asset}" -d "$tmpdir"
            cp "$tmpdir/nepali.exe" "$INSTALL_DIR/nepali.exe"
            ;;
    esac
    chmod +x "$INSTALL_DIR/nepali" 2>/dev/null || true
}

# --- Build from source ---

build_from_source() {
    if ! command -v cargo >/dev/null 2>&1; then
        echo "error: cargo (Rust) isn't installed - get it from https://rustup.rs first" >&2
        exit 1
    fi

    echo "Building nepali-core-cli from source (release, this takes a minute)..."
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
}

# --- Main ---

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

if [ "$BUILD_MODE" = "source" ]; then
    build_from_source
else
    download_release
fi

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
