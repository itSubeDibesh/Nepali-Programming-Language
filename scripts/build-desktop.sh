#!/usr/bin/env bash
# ==============================================================================
# Cross-Platform Desktop IDE Build & Packaging Script
# Targets: macOS (.app/.dmg), Linux (.deb/AppImage), Windows (.exe/.msi)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CORE_DIR="$ROOT_DIR/crates/nepali-core"
STUDIO_DIR="$ROOT_DIR/studio"
OUTPUT_DIR="$ROOT_DIR/dist"

mkdir -p "$OUTPUT_DIR"

echo "======================================================================"
echo "  Building Nepali Programming Language — Standalone Desktop IDE"
echo "======================================================================"

# 1. Build Studio Frontend Assets
echo "==> [1/3] Building Studio frontend assets..."
cd "$STUDIO_DIR"
npm ci || npm install
npm run build

# 2. Build Native Engine Binary with GUI feature
echo "==> [2/3] Building Native Engine with embedded WebKit/WebView2 GUI..."
cd "$ROOT_DIR"
export PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1
cargo build --manifest-path "$CORE_DIR/Cargo.toml" --release --bin nepali-core-cli

RELEASE_BIN="$CORE_DIR/target/release/nepali-core-cli"

# 3. Platform-Specific Bundling
OS_NAME="$(uname -s)"
echo "==> [3/3] Packaging for host platform: $OS_NAME..."

if [ "$OS_NAME" = "Darwin" ]; then
    # macOS Bundle
    APP_BUNDLE="$OUTPUT_DIR/Nepali Studio.app"
    rm -rf "$APP_BUNDLE"
    mkdir -p "$APP_BUNDLE/Contents/MacOS"
    mkdir -p "$APP_BUNDLE/Contents/Resources"
    
    cp -f "$RELEASE_BIN" "$APP_BUNDLE/Contents/MacOS/nepali"
    cp -f "$ROOT_DIR/os-integration/macos/nepali-studio-launcher" "$APP_BUNDLE/Contents/MacOS/nepali-studio-launcher"
    cp -f "$ROOT_DIR/os-integration/macos/Info.plist" "$APP_BUNDLE/Contents/Info.plist"
    chmod +x "$APP_BUNDLE/Contents/MacOS/nepali-studio-launcher" "$APP_BUNDLE/Contents/MacOS/nepali"
    
    if [ -f "$ROOT_DIR/os-integration/macos/AppIcon.icns" ]; then
        cp -f "$ROOT_DIR/os-integration/macos/AppIcon.icns" "$APP_BUNDLE/Contents/Resources/AppIcon.icns"
    fi
    if [ -f "$ROOT_DIR/os-integration/macos/DocIcon.icns" ]; then
        cp -f "$ROOT_DIR/os-integration/macos/DocIcon.icns" "$APP_BUNDLE/Contents/Resources/DocIcon.icns"
    fi
    
    # Also copy to ~/Applications
    mkdir -p "$HOME/Applications"
    cp -rf "$APP_BUNDLE" "$HOME/Applications/"
    echo "✓ Built macOS Application: $APP_BUNDLE (and installed to ~/Applications/)"

elif [ "$OS_NAME" = "Linux" ]; then
    # Linux Package
    LINUX_DIST="$OUTPUT_DIR/nepali-studio-linux-x64"
    rm -rf "$LINUX_DIST"
    mkdir -p "$LINUX_DIST/bin" "$LINUX_DIST/share/applications" "$LINUX_DIST/share/icons"
    
    cp -f "$RELEASE_BIN" "$LINUX_DIST/bin/nepali"
    cp -f "$ROOT_DIR/os-integration/desktop/nepali-studio.desktop" "$LINUX_DIST/share/applications/"
    cp -f "$ROOT_DIR/os-integration/icons/nepali.svg" "$LINUX_DIST/share/icons/"
    
    tar -czf "$OUTPUT_DIR/nepali-studio-linux-x64.tar.gz" -C "$OUTPUT_DIR" "nepali-studio-linux-x64"
    echo "✓ Built Linux Package: $OUTPUT_DIR/nepali-studio-linux-x64.tar.gz"

else
    # Windows
    cp -f "$RELEASE_BIN" "$OUTPUT_DIR/nepali-studio.exe"
    echo "✓ Built Windows Binary: $OUTPUT_DIR/nepali-studio.exe"
fi

echo "======================================================================"
echo "  Build Completed Successfully! Outputs located in $OUTPUT_DIR"
echo "======================================================================"
