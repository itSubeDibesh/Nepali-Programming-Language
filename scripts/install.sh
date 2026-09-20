#!/usr/bin/env bash
# ==============================================================================
# Nepali Programming Language — One-Line CLI Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/itSubeDibesh/Nepali-Programming-Language/main/scripts/install.sh | bash
# ==============================================================================
set -euo pipefail

REPO="itSubeDibesh/Nepali-Programming-Language"
INSTALL_DIR="/usr/local/bin"
BIN_NAME="nepali"

echo "======================================================================"
echo "  Installing Nepali Programming Language (नेपाली प्रोग्रामिङ भाषा)"
echo "  Repository: https://github.com/$REPO"
echo "======================================================================"

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
    x86_64|amd64) ARCH="x86_64" ;;
    arm64|aarch64) ARCH="aarch64" ;;
    *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

echo "==> Detected OS: $OS ($ARCH)"

# If Cargo is installed, we can compile directly for maximum optimization
if command -v cargo >/dev/null 2>&1; then
    echo "==> Rust/Cargo found. Installing via cargo from git repository..."
    export PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1
    cargo install --git "https://github.com/$REPO.git" --bin nepali-core-cli --root /tmp/nepali_install_root
    
    if [ -w "$INSTALL_DIR" ]; then
        cp -f /tmp/nepali_install_root/bin/nepali-core-cli "$INSTALL_DIR/$BIN_NAME"
    else
        sudo cp -f /tmp/nepali_install_root/bin/nepali-core-cli "$INSTALL_DIR/$BIN_NAME"
    fi
    rm -rf /tmp/nepali_install_root
else
    echo "==> Downloading latest release binary from GitHub..."
    LATEST_TAG="$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' || echo "v1.0.0")"
    DOWNLOAD_URL="https://github.com/$REPO/releases/download/$LATEST_TAG/nepali-$OS-$ARCH"
    
    TMP_FILE="$(mktemp)"
    if curl -fsSL "$DOWNLOAD_URL" -o "$TMP_FILE" 2>/dev/null; then
        chmod +x "$TMP_FILE"
        if [ -w "$INSTALL_DIR" ]; then
            mv "$TMP_FILE" "$INSTALL_DIR/$BIN_NAME"
        else
            sudo mv "$TMP_FILE" "$INSTALL_DIR/$BIN_NAME"
        fi
    else
        echo "Pre-built binary for $OS-$ARCH not available for direct download."
        echo "Please install Rust (https://rustup.rs) and run this script again,"
        echo "or download the Desktop App from https://github.com/$REPO/releases"
        rm -f "$TMP_FILE"
        exit 1
    fi
fi

sudo chmod +x "$INSTALL_DIR/$BIN_NAME" 2>/dev/null || chmod +x "$INSTALL_DIR/$BIN_NAME"

echo ""
echo "✓ Successfully installed $BIN_NAME to $INSTALL_DIR/$BIN_NAME"
echo ""
echo "Test your installation:"
echo "  nepali --version"
echo "  nepali -e 'भनौँ(\"नमस्ते, नेपाल !\")।'"
echo "======================================================================"
