#!/bin/bash
set -e

echo "Building hello-plugin for wasm32-unknown-unknown..."
cargo build --release --target wasm32-unknown-unknown

echo "Copying WASM file..."
cp target/wasm32-unknown-unknown/release/hello_plugin.wasm .

echo "Build complete! Files:"
ls -la hello_plugin.wasm manifest.json

echo ""
echo "To install the plugin, run:"
echo "  ./install.sh"
