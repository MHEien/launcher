import { PluginGrid } from "@/components/plugin-grid";
import { SearchBar } from "@/components/search-bar";
import { CategoryFilter } from "@/components/category-filter";
import { Header } from "@/components/header";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function getPlugins() {
  const res = await fetch(`${API_URL}/api/plugins`, {
    cache: "no-store",
  });
  if (!res.ok) return { plugins: [], total: 0 };
  return res.json();
}

async function getCategories() {
  const res = await fetch(`${API_URL}/api/categories`, {
    cache: "no-store",
  });
  if (!res.ok) return { categories: [] };
  return res.json();
}

export default async function Home() {
  const [pluginsData, categoriesData] = await Promise.all([
    getPlugins(),
    getCategories(),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Plugin Marketplace</h2>
          <p className="text-zinc-400">
            Discover and install plugins to extend your launcher
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <SearchBar />
          <CategoryFilter categories={categoriesData.categories} />
        </div>

        <div className="mb-4 text-sm text-zinc-500">
          {pluginsData.total} plugins available
        </div>

        <PluginGrid plugins={pluginsData.plugins} />
      </main>

      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-zinc-500 text-sm">
          <p>Launcher Plugin Marketplace</p>
        </div>
      </footer>
    </div>
  );
}
