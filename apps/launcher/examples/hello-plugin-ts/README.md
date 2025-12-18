# Hello Plugin (TypeScript)

A simple example plugin that demonstrates how to build Launcher plugins using TypeScript.

## Building

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Install locally for testing
npm run dev
```

## How it Works

This plugin demonstrates:

1. **Initialization** - The `init()` function is called when the plugin loads
2. **Search** - The `search()` function is called for every keystroke
3. **Results** - Returns `SearchResult[]` with title, subtitle, icon, and actions
4. **Actions** - Shows how to open URLs and copy to clipboard
5. **Shutdown** - The `shutdown()` function is called when the plugin unloads

## Usage

1. Build and install the plugin
2. Open Launcher (Alt+Space or Super+Space)
3. Type "hello" to see the plugin's results
4. Click a result to execute its action

## Project Structure

```
hello-plugin-ts/
├── manifest.json     # Plugin metadata
├── package.json      # NPM dependencies
├── tsconfig.json     # TypeScript config
├── src/
│   └── index.ts      # Plugin source code
└── plugin.wasm       # Compiled WASM (after build)
```

## Learn More

See the [@launcher/plugin-sdk](../../../../packages/plugin-sdk-ts/) package for full API documentation.


