#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Launcher Installer for Linux ===${NC}"

# Configuration
REPO="MHEien/launcher"
VERSION="${LAUNCHER_VERSION:-latest}"

# Check for required tools
echo -e "\n${BLUE}[1/4] Checking dependencies...${NC}"

check_cmd() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}Error: $1 is required but not installed.${NC}"
        return 1
    fi
}

# Check basic tools
check_cmd curl || exit 1

# Check for jq (required for JSON parsing)
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}jq is not installed. Attempting to install...${NC}"
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y jq
    elif command -v yum &> /dev/null; then
        sudo yum install -y jq
    elif command -v pacman &> /dev/null; then
        sudo pacman -S --noconfirm jq
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y jq
    else
        echo -e "${RED}Error: Could not install jq automatically. Please install jq manually and try again.${NC}"
        exit 1
    fi
fi

# Distro detection and runtime dependency check
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    echo -e "Detected OS: $OS"
    
    if [[ "$OS" == *"Arch"* ]] || [[ "$OS" == *"EndeavourOS"* ]] || [[ "$OS" == *"Manjaro"* ]]; then
        echo "Checking Arch Linux runtime dependencies..."
        if ! pacman -Qi webkit2gtk-4.1 &> /dev/null; then
            echo -e "${YELLOW}Warning: webkit2gtk-4.1 might be missing. You may need to install 'webkit2gtk'${NC}"
        fi
        if ! pacman -Qi libappindicator-gtk3 &> /dev/null; then
            echo -e "${YELLOW}Warning: libappindicator-gtk3 might be missing.${NC}"
        fi
    elif [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]] || [[ "$OS" == *"Pop!_OS"* ]]; then
        echo "Checking Debian/Ubuntu runtime dependencies..."
        echo -e "${YELLOW}Note: Ensure you have 'libwebkit2gtk-4.1-0' and 'libappindicator3-1' installed.${NC}"
    elif [[ "$OS" == *"Fedora"* ]]; then
        echo "Checking Fedora runtime dependencies..."
        echo -e "${YELLOW}Note: Ensure you have 'webkit2gtk4.1' and 'libappindicator-gtk3' installed.${NC}"
    fi
fi

# Fetch release information
echo -e "\n${BLUE}[2/4] Fetching release information...${NC}"
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

if [ "$VERSION" = "latest" ]; then
    RELEASE_URL="https://api.github.com/repos/$REPO/releases/latest"
    echo "Fetching latest stable release..."
else
    RELEASE_URL="https://api.github.com/repos/$REPO/releases/tags/v$VERSION"
    echo "Fetching release v$VERSION..."
fi

RELEASE_JSON=$(curl -s "$RELEASE_URL")
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to fetch release information. Check your internet connection.${NC}"
    exit 1
fi

# Check if release exists (GitHub API returns error message in JSON)
if echo "$RELEASE_JSON" | jq -e '.message' 2>/dev/null | grep -q "Not Found"; then
    echo -e "${RED}Error: Release not found.${NC}"
    exit 1
fi

# Verify we got valid JSON with tag_name
if ! echo "$RELEASE_JSON" | jq -e '.tag_name' > /dev/null 2>&1; then
    echo -e "${RED}Error: Invalid response from GitHub API.${NC}"
    exit 1
fi

RELEASE_VERSION=$(echo "$RELEASE_JSON" | jq -r '.tag_name' | sed 's/^v//')
echo -e "${GREEN}Found release: v$RELEASE_VERSION${NC}"

# Find binary and icon assets
BINARY_ASSET=$(echo "$RELEASE_JSON" | jq -r '.assets[] | select(.name | contains("launcher_x86_64_bin")) | .browser_download_url' | head -n 1)
ICON_ASSET=$(echo "$RELEASE_JSON" | jq -r '.assets[] | select(.name | contains("launcher_icon_128x128.png")) | .browser_download_url' | head -n 1)

if [ -z "$BINARY_ASSET" ] || [ "$BINARY_ASSET" = "null" ]; then
    echo -e "${RED}Error: Binary asset not found in release.${NC}"
    exit 1
fi

if [ -z "$ICON_ASSET" ] || [ "$ICON_ASSET" = "null" ]; then
    echo -e "${YELLOW}Warning: Icon asset not found. Installation will continue without icon.${NC}"
fi

# Download assets
echo -e "\n${BLUE}[3/4] Downloading assets...${NC}"
echo "Downloading binary..."
curl -L -o "$TEMP_DIR/launcher" "$BINARY_ASSET" || { echo -e "${RED}Error: Failed to download binary.${NC}"; exit 1; }

if [ -n "$ICON_ASSET" ] && [ "$ICON_ASSET" != "null" ]; then
    echo "Downloading icon..."
    curl -L -o "$TEMP_DIR/launcher_icon_128x128.png" "$ICON_ASSET" || { echo -e "${YELLOW}Warning: Failed to download icon.${NC}"; }
fi

# Verify binary
if [ ! -f "$TEMP_DIR/launcher" ]; then
    echo -e "${RED}Error: Binary file not found after download.${NC}"
    exit 1
fi

chmod +x "$TEMP_DIR/launcher"

# Install
echo -e "\n${BLUE}[4/4] Installing...${NC}"
INSTALL_DIR="$HOME/.local/bin"
ICON_DIR="$HOME/.local/share/icons/hicolor/128x128/apps"
DESKTOP_DIR="$HOME/.local/share/applications"

mkdir -p "$INSTALL_DIR"
mkdir -p "$ICON_DIR"
mkdir -p "$DESKTOP_DIR"

# Copy binary
echo "Installing binary to $INSTALL_DIR/launcher..."
cp "$TEMP_DIR/launcher" "$INSTALL_DIR/launcher"
chmod +x "$INSTALL_DIR/launcher"

# Copy icon if available
if [ -f "$TEMP_DIR/launcher_icon_128x128.png" ]; then
    echo "Installing icon to $ICON_DIR/launcher.png..."
    cp "$TEMP_DIR/launcher_icon_128x128.png" "$ICON_DIR/launcher.png"
fi

# Create or update desktop entry
echo "Creating desktop entry..."
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

# Refresh desktop database if available
if command -v update-desktop-database &> /dev/null; then
    echo "Refreshing desktop database..."
    update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

# Cleanup
rm -rf "$TEMP_DIR"

echo -e "\n${GREEN}=== Installation Complete! ===${NC}"
echo "Launcher v$RELEASE_VERSION has been installed to $INSTALL_DIR/launcher"
echo "You can launch it from your application menu or by running: launcher"
if command -v update-desktop-database &> /dev/null; then
    echo -e "${GREEN}Desktop entry has been refreshed. The app should appear in your menu immediately.${NC}"
else
    echo -e "${YELLOW}Note: You may need to log out and back in for the desktop entry to appear.${NC}"
fi
