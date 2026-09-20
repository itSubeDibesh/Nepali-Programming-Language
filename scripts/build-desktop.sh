#!/usr/bin/env bash
# ==============================================================================
# Cross-Platform Desktop IDE Build & Packaging Script
# Packages modern Next.js Studio + Rust compiler into standalone native apps
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

# 1. Build Modern Studio Standalone Bundle
echo "==> [1/3] Building Modern Studio Next.js standalone bundle..."
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
    mkdir -p "$APP_BUNDLE/Contents/Resources/studio"
    
    # Copy Native Binary & Launcher
    cp -f "$RELEASE_BIN" "$APP_BUNDLE/Contents/MacOS/nepali"
    cp -f "$ROOT_DIR/os-integration/macos/nepali-studio-launcher" "$APP_BUNDLE/Contents/MacOS/nepali-studio-launcher"
    cp -f "$ROOT_DIR/os-integration/macos/Info.plist" "$APP_BUNDLE/Contents/Info.plist"
    chmod +x "$APP_BUNDLE/Contents/MacOS/nepali-studio-launcher" "$APP_BUNDLE/Contents/MacOS/nepali"
    
    # Copy Icons
    if [ -f "$ROOT_DIR/os-integration/macos/AppIcon.icns" ]; then
        cp -f "$ROOT_DIR/os-integration/macos/AppIcon.icns" "$APP_BUNDLE/Contents/Resources/AppIcon.icns"
        # .nep / .nepali files show the same न icon as the app — copy AppIcon as DocIcon
        cp -f "$ROOT_DIR/os-integration/macos/AppIcon.icns" "$APP_BUNDLE/Contents/Resources/DocIcon.icns"
    elif [ -f "$ROOT_DIR/os-integration/macos/DocIcon.icns" ]; then
        cp -f "$ROOT_DIR/os-integration/macos/DocIcon.icns" "$APP_BUNDLE/Contents/Resources/DocIcon.icns"
    fi
    
    # Bundle Modern Studio Standalone Server & Static Chunks
    if [ -d "$STUDIO_DIR/.next/standalone" ]; then
        cp -a "$STUDIO_DIR/.next/standalone/." "$APP_BUNDLE/Contents/Resources/studio/"
        mkdir -p "$APP_BUNDLE/Contents/Resources/studio/.next"
        if [ -d "$STUDIO_DIR/.next/static" ]; then
            cp -a "$STUDIO_DIR/.next/static" "$APP_BUNDLE/Contents/Resources/studio/.next/"
        fi
        if [ -d "$STUDIO_DIR/public" ]; then
            cp -a "$STUDIO_DIR/public" "$APP_BUNDLE/Contents/Resources/studio/"
        fi
    fi
    
    # Ad-hoc code sign to satisfy macOS Gatekeeper
    if command -v codesign >/dev/null 2>&1; then
        echo "==> Signing application bundle (ad-hoc)..."
        codesign --force --deep --sign - "$APP_BUNDLE" 2>/dev/null || true
    fi

    # Register & install to ~/Applications
    mkdir -p "$HOME/Applications"
    rm -rf "$HOME/Applications/Nepali Studio.app"
    cp -rf "$APP_BUNDLE" "$HOME/Applications/"
    
    LSREGISTER="/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister"
    if [ -f "$LSREGISTER" ]; then
        "$LSREGISTER" -f -R "$HOME/Applications/Nepali Studio.app" >/dev/null 2>&1 || true
    fi
    
    echo "✓ Built and installed modern macOS Application: ~/Applications/Nepali Studio.app"

    # ── Remove raw .app from dist/ — .dmg is the distributable artifact ──
    rm -rf "$APP_BUNDLE"

    # ── Build macOS .dmg installer (uses hdiutil, bundled with every macOS) ──
    DMG_NAME="Nepali Studio-1.0.0-macOS.dmg"
    DMG_OUT="$OUTPUT_DIR/$DMG_NAME"
    DMG_STAGING="$(mktemp -d)"

    echo "==> Creating macOS .dmg installer..."
    cp -r "$HOME/Applications/Nepali Studio.app" "$DMG_STAGING/Nepali Studio.app"
    ln -s /Applications "$DMG_STAGING/Applications"

    # Optional background image
    if [ -f "$ROOT_DIR/os-integration/macos/dmg-background.png" ]; then
        mkdir -p "$DMG_STAGING/.background"
        cp "$ROOT_DIR/os-integration/macos/dmg-background.png" "$DMG_STAGING/.background/background.png"
    fi

    # Use diskutil (macOS 15+) if available, else fall back to hdiutil
    if command -v diskutil >/dev/null 2>&1 && diskutil image create --help >/dev/null 2>&1; then
        diskutil image create from-folder "$DMG_STAGING" \
            --volumeName "Nepali Studio" \
            --format UDZO \
            --output "$DMG_OUT" >/dev/null 2>&1 || \
        hdiutil create -volname "Nepali Studio" -srcfolder "$DMG_STAGING" -ov -format UDZO "$DMG_OUT" >/dev/null 2>&1
    else
        hdiutil create -volname "Nepali Studio" -srcfolder "$DMG_STAGING" -ov -format UDZO "$DMG_OUT" >/dev/null 2>&1
    fi

    rm -rf "$DMG_STAGING"

    if [ -f "$DMG_OUT" ]; then
        echo "✓ macOS .dmg installer: $DMG_OUT"
    else
        echo "⚠ DMG creation failed. .app bundle still in dist/"
    fi

elif [ "$OS_NAME" = "Linux" ]; then
    # Linux Package
    LINUX_DIST="$OUTPUT_DIR/nepali-studio-linux-x64"
    rm -rf "$LINUX_DIST"
    mkdir -p "$LINUX_DIST/bin" "$LINUX_DIST/share/nepali-studio" "$LINUX_DIST/share/applications" "$LINUX_DIST/share/icons"
    
    cp -f "$RELEASE_BIN" "$LINUX_DIST/bin/nepali"
    cp -a "$STUDIO_DIR/.next/standalone/." "$LINUX_DIST/share/nepali-studio/"
    mkdir -p "$LINUX_DIST/share/nepali-studio/.next"
    if [ -d "$STUDIO_DIR/.next/static" ]; then
        cp -a "$STUDIO_DIR/.next/static" "$LINUX_DIST/share/nepali-studio/.next/"
    fi
    if [ -d "$STUDIO_DIR/public" ]; then
        cp -a "$STUDIO_DIR/public" "$LINUX_DIST/share/nepali-studio/"
    fi
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
echo "  Build Completed Successfully! Standalone IDE ready in dist/"
echo "======================================================================"
