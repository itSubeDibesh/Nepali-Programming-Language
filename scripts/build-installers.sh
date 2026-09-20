#!/usr/bin/env bash
# ==============================================================================
# Nepali Studio — Cross-Platform Native Installer Builder
# Produces: macOS .dmg, Linux .deb + .AppImage, Windows .msi + .exe
# Uses Tauri v2 CLI for all bundling/signing/packaging.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DESKTOP_DIR="$ROOT_DIR/desktop"
STUDIO_DIR="$ROOT_DIR/studio"
OUTPUT_DIR="$ROOT_DIR/dist"

mkdir -p "$OUTPUT_DIR"

echo "======================================================================"
echo "  Nepali Studio — Native Installer Build"
echo "======================================================================"

# ── 1. Ensure Rust + Tauri CLI are available ──────────────────────────────
echo "==> [1/4] Checking build dependencies..."
command -v cargo >/dev/null 2>&1 || { echo "ERROR: Cargo not found. Install Rust from https://rustup.rs"; exit 1; }
command -v node  >/dev/null 2>&1 || { echo "ERROR: Node.js not found."; exit 1; }
command -v npm   >/dev/null 2>&1 || { echo "ERROR: npm not found."; exit 1; }

if ! cargo tauri --version >/dev/null 2>&1; then
  echo "Installing tauri-cli v2..."
  cargo install tauri-cli --version "^2" --locked
fi

# ── 2. Generate icons from SVG (requires rsvg-convert or Inkscape + ImageMagick) ─
echo "==> [2/4] Generating platform icons..."
SVG_SRC="$ROOT_DIR/os-integration/icons/nepali.svg"
ICON_DIR="$DESKTOP_DIR/icons"
mkdir -p "$ICON_DIR"

if command -v rsvg-convert >/dev/null 2>&1; then
  CONVERT=rsvg-convert
  rsvg_convert() { rsvg-convert -w "$1" -h "$1" "$SVG_SRC" -o "$ICON_DIR/${2}"; }
  rsvg_convert 32  "32x32.png"
  rsvg_convert 128 "128x128.png"
  rsvg_convert 256 "128x128@2x.png"
  rsvg_convert 256 "256x256.png"
  rsvg_convert 512 "512x512.png"
  echo "  ✓ PNG icons generated"
elif command -v convert >/dev/null 2>&1; then
  for size in 32 128 256 512; do
    convert -background none "$SVG_SRC" -resize "${size}x${size}" "$ICON_DIR/${size}x${size}.png" 2>/dev/null || true
  done
  cp "$ICON_DIR/256x256.png" "$ICON_DIR/128x128@2x.png" 2>/dev/null || true
  echo "  ✓ PNG icons generated via ImageMagick"
else
  echo "  ⚠ Neither rsvg-convert nor convert found — copying fallback icons from os-integration"
  # Fall back to existing icons if they exist
  for src in "$ROOT_DIR/os-integration/macos/AppIcon.icns" \
             "$ROOT_DIR/desktop/icons/"*.png; do
    [ -f "$src" ] && cp -f "$src" "$ICON_DIR/" 2>/dev/null || true
  done
fi

# macOS .icns from PNGs
if command -v iconutil >/dev/null 2>&1 && [ -f "$ICON_DIR/512x512.png" ]; then
  ICONSET="$ICON_DIR/icon.iconset"
  mkdir -p "$ICONSET"
  cp "$ICON_DIR/32x32.png"   "$ICONSET/icon_32x32.png"
  cp "$ICON_DIR/128x128.png" "$ICONSET/icon_128x128.png"
  cp "$ICON_DIR/256x256.png" "$ICONSET/icon_128x128@2x.png"
  cp "$ICON_DIR/256x256.png" "$ICONSET/icon_256x256.png"
  cp "$ICON_DIR/512x512.png" "$ICONSET/icon_256x256@2x.png"
  cp "$ICON_DIR/512x512.png" "$ICONSET/icon_512x512.png"
  iconutil -c icns "$ICONSET" -o "$ICON_DIR/icon.icns"
  rm -rf "$ICONSET"
  echo "  ✓ macOS .icns generated"
elif [ -f "$ROOT_DIR/os-integration/macos/AppIcon.icns" ]; then
  cp "$ROOT_DIR/os-integration/macos/AppIcon.icns" "$ICON_DIR/icon.icns"
  echo "  ✓ macOS .icns copied from os-integration"
fi

# Windows .ico from PNG (requires ImageMagick convert)
if command -v convert >/dev/null 2>&1 && [ -f "$ICON_DIR/256x256.png" ]; then
  convert "$ICON_DIR/32x32.png" "$ICON_DIR/128x128.png" "$ICON_DIR/256x256.png" \
    "$ICON_DIR/icon.ico" 2>/dev/null && echo "  ✓ Windows .ico generated" || true
elif [ ! -f "$ICON_DIR/icon.ico" ]; then
  echo "  ⚠ Windows .ico not generated (install ImageMagick for automatic conversion)"
fi

# ── 3. Build Studio (static export for Tauri) ─────────────────────────────
echo "==> [3/4] Building Studio (static export for Tauri)..."
cd "$STUDIO_DIR"
npm ci 2>/dev/null || npm install
NEXT_EXPORT=true npm run build
echo "  ✓ Studio static export ready in studio/out/"

# ── 4. Tauri Build → native bundles ───────────────────────────────────────
echo "==> [4/4] Building native desktop bundles with Tauri..."
cd "$DESKTOP_DIR"
export PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1
cargo tauri build

# Collect outputs
OS_NAME="$(uname -s)"
echo ""
echo "======================================================================"
echo "  Build Complete — Installer artifacts:"
echo "======================================================================"

if [ "$OS_NAME" = "Darwin" ]; then
  DMG=$(find "$DESKTOP_DIR/target/release/bundle/dmg" -name "*.dmg" 2>/dev/null | head -1)
  APP=$(find "$DESKTOP_DIR/target/release/bundle/macos" -name "*.app" -maxdepth 1 2>/dev/null | head -1)
  [ -n "$DMG" ] && cp -f "$DMG" "$OUTPUT_DIR/" && echo "  macOS .dmg  → $OUTPUT_DIR/$(basename "$DMG")"
  [ -n "$APP" ] && cp -rf "$APP" "$OUTPUT_DIR/" && echo "  macOS .app  → $OUTPUT_DIR/$(basename "$APP")"

elif [ "$OS_NAME" = "Linux" ]; then
  DEB=$(find "$DESKTOP_DIR/target/release/bundle/deb" -name "*.deb" 2>/dev/null | head -1)
  APPI=$(find "$DESKTOP_DIR/target/release/bundle/appimage" -name "*.AppImage" 2>/dev/null | head -1)
  [ -n "$DEB" ]  && cp -f "$DEB"  "$OUTPUT_DIR/" && echo "  Linux .deb       → $OUTPUT_DIR/$(basename "$DEB")"
  [ -n "$APPI" ] && cp -f "$APPI" "$OUTPUT_DIR/" && echo "  Linux .AppImage  → $OUTPUT_DIR/$(basename "$APPI")"

else
  MSI=$(find "$DESKTOP_DIR/target/release/bundle/msi" -name "*.msi" 2>/dev/null | head -1)
  NSIS=$(find "$DESKTOP_DIR/target/release/bundle/nsis" -name "*.exe" 2>/dev/null | head -1)
  [ -n "$MSI" ]  && cp -f "$MSI"  "$OUTPUT_DIR/" && echo "  Windows .msi → $OUTPUT_DIR/$(basename "$MSI")"
  [ -n "$NSIS" ] && cp -f "$NSIS" "$OUTPUT_DIR/" && echo "  Windows .exe → $OUTPUT_DIR/$(basename "$NSIS")"
fi

echo ""
echo "  All artifacts are in: $OUTPUT_DIR/"
echo "======================================================================"
