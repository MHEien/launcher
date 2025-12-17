import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

// Plugin registry data (in production, this would be in a database)
interface RegistryPlugin {
  id: string;
  name: string;
  version: string;
  author: string | null;
  description: string | null;
  homepage: string | null;
  repository: string | null;
  download_url: string;
  checksum: string | null;
  permissions: string[];
  categories: string[];
  downloads: number;
  rating: number | null;
}

const plugins: Map<string, RegistryPlugin> = new Map([
  ["hello-plugin", {
    id: "hello-plugin",
    name: "Hello Plugin",
    version: "1.0.0",
    author: "Launcher Team",
    description: "A simple example plugin that demonstrates the plugin API",
    homepage: null,
    repository: "https://github.com/launcher/hello-plugin",
    download_url: "https://plugins.launcher.dev/hello-plugin/1.0.0.zip",
    checksum: null,
    permissions: ["logging"],
    categories: ["Examples", "Development"],
    downloads: 0,
    rating: null,
  }],
  ["clipboard-history", {
    id: "clipboard-history",
    name: "Clipboard History",
    version: "1.0.0",
    author: "Launcher Team",
    description: "Track and search your clipboard history. Access past copies with a simple search.",
    homepage: null,
    repository: null,
    download_url: "https://plugins.launcher.dev/clipboard-history/1.0.0.zip",
    checksum: null,
    permissions: ["clipboard"],
    categories: ["Productivity", "Utilities"],
    downloads: 1250,
    rating: 4.5,
  }],
  ["linear", {
    id: "linear",
    name: "Linear",
    version: "1.0.0",
    author: "Community",
    description: "Search and create Linear issues. View assigned tasks and project status.",
    homepage: "https://linear.app",
    repository: null,
    download_url: "https://plugins.launcher.dev/linear/1.0.0.zip",
    checksum: null,
    permissions: ["network", "oauth:linear"],
    categories: ["Productivity", "Development", "Project Management"],
    downloads: 3200,
    rating: 4.7,
  }],
  ["todoist", {
    id: "todoist",
    name: "Todoist",
    version: "1.0.0",
    author: "Community",
    description: "Manage Todoist tasks. Add, complete, and search your to-dos.",
    homepage: "https://todoist.com",
    repository: null,
    download_url: "https://plugins.launcher.dev/todoist/1.0.0.zip",
    checksum: null,
    permissions: ["network", "oauth:todoist"],
    categories: ["Productivity", "Tasks"],
    downloads: 2800,
    rating: 4.6,
  }],
  ["1password", {
    id: "1password",
    name: "1Password",
    version: "1.0.0",
    author: "Community",
    description: "Search and copy passwords from 1Password. Requires 1Password CLI.",
    homepage: "https://1password.com",
    repository: null,
    download_url: "https://plugins.launcher.dev/1password/1.0.0.zip",
    checksum: null,
    permissions: ["clipboard", "shell:op"],
    categories: ["Security", "Utilities"],
    downloads: 5600,
    rating: 4.9,
  }],
  ["spotify", {
    id: "spotify",
    name: "Spotify",
    version: "1.0.0",
    author: "Community",
    description: "Control Spotify playback. Search tracks, albums, and playlists.",
    homepage: "https://spotify.com",
    repository: null,
    download_url: "https://plugins.launcher.dev/spotify/1.0.0.zip",
    checksum: null,
    permissions: ["network", "oauth:spotify"],
    categories: ["Media", "Music"],
    downloads: 6200,
    rating: 4.7,
  }],
  ["github-repos", {
    id: "github-repos",
    name: "GitHub Repositories",
    version: "1.2.0",
    author: "Launcher Team",
    description: "Search and open your GitHub repositories. Clone repos, view issues, and manage pull requests directly from the launcher.",
    homepage: "https://github.com",
    repository: "https://github.com/launcher/github-repos-plugin",
    download_url: "https://plugins.launcher.dev/github-repos/1.2.0.zip",
    checksum: null,
    permissions: ["network", "oauth:github"],
    categories: ["Development", "Productivity"],
    downloads: 8400,
    rating: 4.8,
  }],
  ["calculator-advanced", {
    id: "calculator-advanced",
    name: "Advanced Calculator",
    version: "2.0.0",
    author: "Community",
    description: "Scientific calculator with unit conversions, currency exchange rates, and equation solving. Supports variables and history.",
    homepage: null,
    repository: "https://github.com/launcher/calc-advanced",
    download_url: "https://plugins.launcher.dev/calculator-advanced/2.0.0.zip",
    checksum: null,
    permissions: ["network"],
    categories: ["Utilities", "Productivity"],
    downloads: 4100,
    rating: 4.6,
  }],
  ["snippets", {
    id: "snippets",
    name: "Code Snippets",
    version: "1.0.0",
    author: "Community",
    description: "Store and quickly access code snippets. Supports syntax highlighting and clipboard integration.",
    homepage: null,
    repository: "https://github.com/launcher/snippets-plugin",
    download_url: "https://plugins.launcher.dev/snippets/1.0.0.zip",
    checksum: null,
    permissions: ["clipboard", "filesystem"],
    categories: ["Development", "Productivity"],
    downloads: 2900,
    rating: 4.4,
  }],
  ["emoji-picker", {
    id: "emoji-picker",
    name: "Emoji Picker",
    version: "1.1.0",
    author: "Community",
    description: "Search and copy emojis to clipboard. Includes recent emojis and favorites.",
    homepage: null,
    repository: null,
    download_url: "https://plugins.launcher.dev/emoji-picker/1.1.0.zip",
    checksum: null,
    permissions: ["clipboard"],
    categories: ["Utilities"],
    downloads: 7800,
    rating: 4.5,
  }],
  ["docker", {
    id: "docker",
    name: "Docker Manager",
    version: "1.0.0",
    author: "Community",
    description: "Manage Docker containers, images, and volumes. Start, stop, and inspect containers from the launcher.",
    homepage: "https://docker.com",
    repository: "https://github.com/launcher/docker-plugin",
    download_url: "https://plugins.launcher.dev/docker/1.0.0.zip",
    checksum: null,
    permissions: ["shell:docker"],
    categories: ["Development", "DevOps"],
    downloads: 3500,
    rating: 4.3,
  }],
  ["window-manager", {
    id: "window-manager",
    name: "Window Manager",
    version: "1.0.0",
    author: "Launcher Team",
    description: "Quickly switch between windows, move windows to different workspaces, and resize with keyboard shortcuts.",
    homepage: null,
    repository: null,
    download_url: "https://plugins.launcher.dev/window-manager/1.0.0.zip",
    checksum: null,
    permissions: ["system:windows"],
    categories: ["Utilities", "Productivity"],
    downloads: 5200,
    rating: 4.7,
  }],
  ["bitwarden", {
    id: "bitwarden",
    name: "Bitwarden",
    version: "1.0.0",
    author: "Community",
    description: "Search and copy passwords from Bitwarden. Requires Bitwarden CLI to be installed.",
    homepage: "https://bitwarden.com",
    repository: null,
    download_url: "https://plugins.launcher.dev/bitwarden/1.0.0.zip",
    checksum: null,
    permissions: ["clipboard", "shell:bw"],
    categories: ["Security", "Utilities"],
    downloads: 4800,
    rating: 4.8,
  }],
]);

// Routes
app.get("/", (c) => {
  return c.json({
    name: "Launcher Plugin Registry",
    version: "1.0.0",
    endpoints: {
      plugins: "/api/plugins",
      plugin: "/api/plugins/:id",
      categories: "/api/categories",
      search: "/api/search?q=query",
    },
  });
});

// List all plugins
app.get("/api/plugins", (c) => {
  const allPlugins = Array.from(plugins.values());
  return c.json({
    plugins: allPlugins,
    total: allPlugins.length,
  });
});

// Get plugin by ID
app.get("/api/plugins/:id", (c) => {
  const id = c.req.param("id");
  const plugin = plugins.get(id);
  
  if (!plugin) {
    return c.json({ error: "Plugin not found" }, 404);
  }
  
  return c.json(plugin);
});

// Get all categories
app.get("/api/categories", (c) => {
  const categories = new Set<string>();
  for (const plugin of plugins.values()) {
    for (const category of plugin.categories) {
      categories.add(category);
    }
  }
  return c.json({
    categories: Array.from(categories).sort(),
  });
});

// Search plugins
app.get("/api/search", (c) => {
  const query = c.req.query("q")?.toLowerCase() || "";
  const category = c.req.query("category");
  
  let results = Array.from(plugins.values());
  
  if (query) {
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
    );
  }
  
  if (category) {
    results = results.filter((p) => p.categories.includes(category));
  }
  
  // Sort by downloads
  results.sort((a, b) => b.downloads - a.downloads);
  
  return c.json({
    plugins: results,
    total: results.length,
    query,
    category: category || null,
  });
});

// Download tracking (increment download count)
app.post("/api/plugins/:id/download", (c) => {
  const id = c.req.param("id");
  const plugin = plugins.get(id);
  
  if (!plugin) {
    return c.json({ error: "Plugin not found" }, 404);
  }
  
  plugin.downloads++;
  return c.json({ success: true, downloads: plugin.downloads });
});

const port = process.env.PORT || 3001;
console.log(`🚀 Plugin Registry API running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
