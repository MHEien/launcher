"use client";

import Link from "next/link";

interface RegistryPlugin {
  id: string;
  name: string;
  version: string;
  author: string | null;
  description: string | null;
  homepage: string | null;
  categories: string[];
  downloads: number;
  rating: number | null;
}

export function PluginGrid({ plugins }: { plugins: RegistryPlugin[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {plugins.map((plugin) => (
        <PluginCard key={plugin.id} plugin={plugin} />
      ))}
    </div>
  );
}

function PluginCard({ plugin }: { plugin: RegistryPlugin }) {
  const categoryColors: Record<string, string> = {
    Productivity: "bg-blue-500/20 text-blue-400",
    Security: "bg-red-500/20 text-red-400",
    Development: "bg-green-500/20 text-green-400",
    Media: "bg-purple-500/20 text-purple-400",
    Utilities: "bg-yellow-500/20 text-yellow-400",
    Tasks: "bg-orange-500/20 text-orange-400",
    DevOps: "bg-cyan-500/20 text-cyan-400",
    Examples: "bg-zinc-500/20 text-zinc-400",
  };

  return (
    <Link
      href={`/plugins/${plugin.id}`}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors group block"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg group-hover:text-violet-400 transition-colors">
            {plugin.name}
          </h3>
          <p className="text-xs text-zinc-500">v{plugin.version}</p>
        </div>
        {plugin.rating && (
          <div className="flex items-center gap-1 text-yellow-500 text-sm">
            <span>★</span>
            <span>{plugin.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
        {plugin.description || "No description"}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {plugin.categories.slice(0, 3).map((cat) => (
          <span
            key={cat}
            className={`text-xs px-2 py-0.5 rounded-full ${
              categoryColors[cat] || "bg-zinc-700/50 text-zinc-400"
            }`}
          >
            {cat}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{plugin.author || "Unknown"}</span>
        <span>{plugin.downloads.toLocaleString()} downloads</span>
      </div>
    </Link>
  );
}
