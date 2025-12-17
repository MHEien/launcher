import Link from "next/link";
import { notFound } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

async function getPlugin(id: string): Promise<RegistryPlugin | null> {
  const res = await fetch(`${API_URL}/api/plugins/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

const categoryColors: Record<string, string> = {
  Productivity: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Security: "bg-red-500/20 text-red-400 border-red-500/30",
  Development: "bg-green-500/20 text-green-400 border-green-500/30",
  Media: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Utilities: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Tasks: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  DevOps: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Examples: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  Music: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Project Management": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
};

const permissionDescriptions: Record<string, { label: string; description: string; icon: string }> = {
  logging: { label: "Logging", description: "Write to application logs", icon: "📝" },
  clipboard: { label: "Clipboard", description: "Read and write clipboard contents", icon: "📋" },
  network: { label: "Network", description: "Make HTTP requests to external services", icon: "🌐" },
  "oauth:linear": { label: "Linear OAuth", description: "Authenticate with Linear", icon: "🔗" },
  "oauth:todoist": { label: "Todoist OAuth", description: "Authenticate with Todoist", icon: "🔗" },
  "oauth:spotify": { label: "Spotify OAuth", description: "Authenticate with Spotify", icon: "🔗" },
  "shell:op": { label: "1Password CLI", description: "Execute 1Password CLI commands", icon: "⚙️" },
};

export default async function PluginDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plugin = await getPlugin(id);

  if (!plugin) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg" />
              <h1 className="text-xl font-semibold">Launcher Plugins</h1>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Link
          href="/app"
          className="text-sm text-zinc-500 hover:text-white transition-colors mb-6 inline-flex items-center gap-1"
        >
          ← Back to all plugins
        </Link>

        <div className="mt-6">
          {/* Plugin Header */}
          <div className="flex items-start justify-between gap-6 mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center text-2xl font-bold">
                  {plugin.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-3xl font-bold">{plugin.name}</h2>
                  <p className="text-zinc-400">
                    v{plugin.version} • by {plugin.author || "Unknown"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {plugin.rating && (
                <div className="flex items-center gap-2 text-yellow-500">
                  <span className="text-2xl">★</span>
                  <span className="text-xl font-semibold">{plugin.rating.toFixed(1)}</span>
                </div>
              )}
              <p className="text-sm text-zinc-500">
                {plugin.downloads.toLocaleString()} downloads
              </p>
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-8">
            {plugin.categories.map((cat) => (
              <span
                key={cat}
                className={`text-sm px-3 py-1 rounded-full border ${
                  categoryColors[cat] || "bg-zinc-700/50 text-zinc-400 border-zinc-600"
                }`}
              >
                {cat}
              </span>
            ))}
          </div>

          {/* Description */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold mb-3">Description</h3>
            <p className="text-zinc-300 leading-relaxed">
              {plugin.description || "No description available."}
            </p>
          </div>

          {/* Install Button */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold mb-3">Installation</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Click the button below to install this plugin directly to your Launcher app.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a 
                href={`launcher://install?plugin=${plugin.id}`}
                className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Install in Launcher
              </a>
              <code className="bg-zinc-800 border border-zinc-700 px-4 py-2.5 rounded-lg text-sm text-zinc-300 font-mono flex items-center">
                launcher install {plugin.id}
              </code>
            </div>
            <p className="text-zinc-500 text-xs mt-3">
              Make sure Launcher is running on your computer. The app will open automatically.
            </p>
          </div>

          {/* Permissions */}
          {plugin.permissions.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold mb-3">Permissions</h3>
              <p className="text-zinc-400 text-sm mb-4">
                This plugin requires the following permissions to function:
              </p>
              <div className="space-y-3">
                {plugin.permissions.map((perm) => {
                  const info = permissionDescriptions[perm] || {
                    label: perm,
                    description: "Custom permission",
                    icon: "🔒",
                  };
                  return (
                    <div
                      key={perm}
                      className="flex items-start gap-3 bg-zinc-800/50 rounded-lg p-3"
                    >
                      <span className="text-lg">{info.icon}</span>
                      <div>
                        <p className="font-medium text-zinc-200">{info.label}</p>
                        <p className="text-sm text-zinc-500">{info.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Links */}
          {(plugin.homepage || plugin.repository) && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3">Links</h3>
              <div className="flex flex-wrap gap-4">
                {plugin.homepage && (
                  <a
                    href={plugin.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-2"
                  >
                    <span>🌐</span> Homepage
                  </a>
                )}
                {plugin.repository && (
                  <a
                    href={plugin.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-2"
                  >
                    <span>📦</span> Repository
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center text-zinc-500 text-sm">
          <p>Launcher Plugin Marketplace</p>
        </div>
      </footer>
    </div>
  );
}
