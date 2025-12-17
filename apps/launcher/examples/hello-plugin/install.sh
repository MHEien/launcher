#!/bin/bash
set -e

PLUGINS_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/launcher/plugins/hello-plugin"

echo "Installing hello-plugin to $PLUGINS_DIR..."
mkdir -p "$PLUGINS_DIR"
cp manifest.json "$PLUGINS_DIR/"
cp hello_plugin.wasm "$PLUGINS_DIR/"

echo "Plugin installed successfully!"
echo ""
echo "Restart the launcher to load the plugin."
