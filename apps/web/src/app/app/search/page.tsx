import { PluginGrid } from "@/components/plugin-grid";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function searchPlugins(query: string) {
  const res = await fetch(
    `${API_URL}/api/search?q=${encodeURIComponent(query)}`,
    { cache: "no-store" }
  );
  if (!res.ok) return { plugins: [], total: 0, query };
  return res.json();
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const data = await searchPlugins(q);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg" />
              <h1 className="text-xl font-semibold">Launcher Plugins</h1>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Link
            href="/app"
            className="text-sm text-zinc-500 hover:text-white transition-colors mb-2 inline-block"
          >
            ← Back to all plugins
          </Link>
          <h2 className="text-2xl font-bold">
            Search results for &quot;{q}&quot;
          </h2>
          <p className="text-zinc-400 mt-1">
            {data.total} {data.total === 1 ? "plugin" : "plugins"} found
          </p>
        </div>

        {data.plugins.length > 0 ? (
          <PluginGrid plugins={data.plugins} />
        ) : (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-lg">No plugins found</p>
            <p className="text-zinc-600 mt-2">
              Try a different search term
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
