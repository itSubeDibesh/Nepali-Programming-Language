#!/usr/bin/env bash
# ==============================================================================
# नेपाली प्रोग्रामिङ भाषा (Nepali Programming Language) — Complete OS Installer
# Sets up compiler binary, OS MIME associations, Desktop entry, and Editor integration
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN_NAME="nepali"
CORE_DIR="$SCRIPT_DIR/crates/nepali-core"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}======================================================================${NC}"
echo -e "${CYAN}${BOLD}   नेपाली प्रोग्रामिङ भाषा (Nepali Programming Language) — Installer   ${NC}"
echo -e "${BLUE}${BOLD}======================================================================${NC}"

# 1. Determine destination directory
if [ -w "/usr/local/bin" ]; then
    INSTALL_DIR="/usr/local/bin"
elif [ -d "$HOME/.local/bin" ]; then
    INSTALL_DIR="$HOME/.local/bin"
    mkdir -p "$INSTALL_DIR"
else
    mkdir -p "$HOME/.local/bin"
    INSTALL_DIR="$HOME/.local/bin"
fi

# 2. Build Release Binary
echo -e "\n${CYAN}==> [1/4] Building release binary with all native subsystems...${NC}"
export PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1
cargo build --manifest-path "$CORE_DIR/Cargo.toml" --release --bin nepali-core-cli

RELEASE_BIN="$CORE_DIR/target/release/nepali-core-cli"
if [ ! -f "$RELEASE_BIN" ]; then
    echo -e "${RED}त्रुटि: Release binary build failed.${NC}"
    exit 1
fi

# 3. Install Binary
echo -e "\n${CYAN}==> [2/4] Installing 'nepali' CLI binary to $INSTALL_DIR...${NC}"
cp -f "$RELEASE_BIN" "$INSTALL_DIR/$BIN_NAME"
chmod +x "$INSTALL_DIR/$BIN_NAME"
echo -e "${GREEN}✓ Binary installed: $INSTALL_DIR/$BIN_NAME${NC}"

# 4. OS Integration & MIME File Association (.nep / .nepali)
echo -e "\n${CYAN}==> [3/4] Registering OS File Associations and Icons (.nep, .nepali)...${NC}"

OS_TYPE="$(uname -s)"
if [ "$OS_TYPE" = "Darwin" ]; then
    # --- macOS Setup ---
    APP_DIR="$HOME/Applications/Nepali Studio.app"
    mkdir -p "$APP_DIR/Contents/MacOS"
    mkdir -p "$APP_DIR/Contents/Resources"
    
    # Build custom macOS Apple ICNS icons if not present
    if [ ! -f "$SCRIPT_DIR/os-integration/macos/AppIcon.icns" ] || [ ! -f "$SCRIPT_DIR/os-integration/macos/DocIcon.icns" ]; then
        swift "$SCRIPT_DIR/os-integration/macos/generate_icons.swift" "$SCRIPT_DIR/os-integration/macos" >/dev/null 2>&1 || true
    fi

    cp -f "$SCRIPT_DIR/os-integration/macos/Info.plist" "$APP_DIR/Contents/Info.plist"
    cp -f "$SCRIPT_DIR/os-integration/macos/nepali-studio-launcher" "$APP_DIR/Contents/MacOS/nepali-studio-launcher"
    chmod +x "$APP_DIR/Contents/MacOS/nepali-studio-launcher"

    if [ -f "$SCRIPT_DIR/os-integration/macos/AppIcon.icns" ]; then
        cp -f "$SCRIPT_DIR/os-integration/macos/AppIcon.icns" "$APP_DIR/Contents/Resources/AppIcon.icns"
    fi
    if [ -f "$SCRIPT_DIR/os-integration/macos/DocIcon.icns" ]; then
        cp -f "$SCRIPT_DIR/os-integration/macos/DocIcon.icns" "$APP_DIR/Contents/Resources/DocIcon.icns"
    fi
    
    # Register with macOS LaunchServices & CoreServices
    if [ -f "$SCRIPT_DIR/os-integration/macos/register_macos.swift" ]; then
        swift "$SCRIPT_DIR/os-integration/macos/register_macos.swift" >/dev/null 2>&1 || true
    fi
    LSREGISTER="/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister"
    if [ -f "$LSREGISTER" ]; then
        "$LSREGISTER" -f -R "$APP_DIR" >/dev/null 2>&1 || true
        echo -e "${GREEN}✓ macOS LaunchServices registered for .nep, .nepali, and .नेपाली${NC}"
    fi
    echo -e "${GREEN}✓ Created macOS application bundle with custom icons: $APP_DIR${NC}"

elif [ "$OS_TYPE" = "Linux" ]; then
    # --- Linux FreeDesktop Setup ---
    USER_MIME_DIR="$HOME/.local/share/mime/packages"
    USER_DESK_DIR="$HOME/.local/share/applications"
    USER_ICON_DIR="$HOME/.local/share/icons/hicolor/scalable/apps"
    USER_MIME_ICON_DIR="$HOME/.local/share/icons/hicolor/scalable/mimetypes"
    
    mkdir -p "$USER_MIME_DIR" "$USER_DESK_DIR" "$USER_ICON_DIR" "$USER_MIME_ICON_DIR"
    
    # Install MIME definition
    cp -f "$SCRIPT_DIR/os-integration/mime/nepali.xml" "$USER_MIME_DIR/nepali.xml"
    if command -v update-mime-database >/dev/null 2>&1; then
        update-mime-database "$HOME/.local/share/mime" >/dev/null 2>&1 || true
        echo -e "${GREEN}✓ FreeDesktop MIME database updated (text/x-nepali)${NC}"
    fi
    
    # Install Icons
    cp -f "$SCRIPT_DIR/os-integration/icons/nepali.svg" "$USER_ICON_DIR/nepali.svg"
    cp -f "$SCRIPT_DIR/os-integration/icons/text-x-nepali.svg" "$USER_MIME_ICON_DIR/text-x-nepali.svg"
    
    # Install Desktop launcher
    cp -f "$SCRIPT_DIR/os-integration/desktop/nepali-studio.desktop" "$USER_DESK_DIR/nepali-studio.desktop"
    cp -f "$SCRIPT_DIR/os-integration/desktop/nepali-runner.desktop" "$USER_DESK_DIR/nepali-runner.desktop"
    
    if command -v update-desktop-database >/dev/null 2>&1; then
        update-desktop-database "$USER_DESK_DIR" >/dev/null 2>&1 || true
    fi
    
    # Set default association
    if command -v xdg-mime >/dev/null 2>&1; then
        xdg-mime default nepali-studio.desktop text/x-nepali >/dev/null 2>&1 || true
        echo -e "${GREEN}✓ xdg-mime default set to nepali-studio.desktop${NC}"
    fi
fi

# 5. Editor Syntax Highlighting Setup (VS Code / Cursor)
echo -e "\n${CYAN}==> [4/4] Installing editor syntax highlighting...${NC}"
VSCODE_EXT_DIR="$HOME/.vscode/extensions/nepali-language"
CURSOR_EXT_DIR="$HOME/.cursor/extensions/nepali-language"

for EXT_TARGET in "$VSCODE_EXT_DIR" "$CURSOR_EXT_DIR"; do
    PARENT="$(dirname "$EXT_TARGET")"
    if [ -d "$PARENT" ]; then
        mkdir -p "$EXT_TARGET/syntaxes"
        cp -rf "$SCRIPT_DIR/plugins/vscode-nepali/"* "$EXT_TARGET/"
        echo -e "${GREEN}✓ Installed syntax extension to $EXT_TARGET${NC}"
    fi
done

echo -e "\n${BLUE}${BOLD}======================================================================${NC}"
echo -e "${GREEN}${BOLD}  बधाई छ! नेपाली प्रोग्रामिङ भाषा सफलतापूर्वक इन्स्टल भयो।${NC}"
echo -e "  परीक्षण गर्न कमान्डहरू:"
echo -e "    ${CYAN}nepali${NC}                      — Interactive Nepali Shell / REPL"
echo -e "    ${CYAN}nepali script.nep${NC}           — Run a Nepali source program"
echo -e "    ${CYAN}nepali studio${NC}               — Launch interactive Nepali Studio IDE"
echo -e "${BLUE}${BOLD}======================================================================${NC}"
