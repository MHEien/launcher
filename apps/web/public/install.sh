#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Launcher Installer for Linux ===${NC}"

# Check for required tools
echo -e "\n${BLUE}[1/5] Checking dependencies...${NC}"

check_cmd() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}Error: $1 is required but not installed.${NC}"
        return 1
    fi
}

# Check basic build tools
check_cmd git || exit 1
check_cmd curl || exit 1
check_cmd cargo || { echo -e "${RED}Rust is not installed. Please install it from https://rustup.rs${NC}"; exit 1; }
check_cmd bun || { echo -e "${RED}Bun is not installed. Please install it from https://bun.sh${NC}"; exit 1; }

# Distro detection and dependency check
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    echo -e "Detected OS: $OS"
    
    if [[ "$OS" == *"Arch"* ]] || [[ "$OS" == *"EndeavourOS"* ]] || [[ "$OS" == *"Manjaro"* ]]; then
        echo "Checking Arch Linux dependencies..."
        if ! pacman -Qi webkit2gtk-4.1 &> /dev/null; then
            echo -e "${YELLOW}Warning: webkit2gtk-4.1 might be missing. You may need to install 'webkit2gtk'${NC}"
        fi
        if ! pacman -Qi libappindicator-gtk3 &> /dev/null; then
            echo -e "${YELLOW}Warning: libappindicator-gtk3 might be missing.${NC}"
        fi
    elif [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]] || [[ "$OS" == *"Pop!_OS"* ]]; then
        echo "Checking Debian/Ubuntu dependencies..."
        echo -e "${YELLOW}Note: Ensure you have 'libwebkit2gtk-4.1-dev' and 'libappindicator3-dev' installed.${NC}"
    elif [[ "$OS" == *"Fedora"* ]]; then
        echo "Checking Fedora dependencies..."
        echo -e "${YELLOW}Note: Ensure you have 'webkit2gtk4.1-devel' and 'libappindicator-gtk3-devel' installed.${NC}"
    fi
fi

# Clone repository
echo -e "\n${BLUE}[2/5] Cloning repository...${NC}"
TEMP_DIR=$(mktemp -d)
echo "Working in $TEMP_DIR"
git clone https://github.com/MHEien/launcher.git "$TEMP_DIR/launcher"

# Install dependencies
echo -e "\n${BLUE}[3/5] Installing dependencies...${NC}"
cd "$TEMP_DIR/launcher"
bun install

# Build
echo -e "\n${BLUE}[4/5] Building Launcher...${NC}"
cd apps/launcher
bun run tauri build

# Install
echo -e "\n${BLUE}[5/5] Installing...${NC}"
INSTALL_DIR="$HOME/.local/bin"
ICON_DIR="$HOME/.local/share/icons/hicolor/128x128/apps"
DESKTOP_DIR="$HOME/.local/share/applications"

mkdir -p "$INSTALL_DIR"
mkdir -p "$ICON_DIR"
mkdir -p "$DESKTOP_DIR"

# Copy binary
cp src-tauri/target/release/launcher "$INSTALL_DIR/launcher"
chmod +x "$INSTALL_DIR/launcher"

# Copy icon
cp src-tauri/icons/128x128.png "$ICON_DIR/launcher.png"

# Create desktop entry
cat > "$DESKTOP_DIR/launcher.desktop" << EOF
[Desktop Entry]
Type=Application
Name=Launcher
Comment=A modern application launcher
Exec=$INSTALL_DIR/launcher
Icon=launcher
Terminal=false
Categories=Utility;
EOF

# Cleanup
rm -rf "$TEMP_DIR"

echo -e "\n${GREEN}=== Installation Complete! ===${NC}"
echo "Launcher has been installed to $INSTALL_DIR/launcher"
echo "You can launch it from your application menu."
echo -e "${YELLOW}Note: You may need to log out and back in for the desktop entry to appear.${NC}"
