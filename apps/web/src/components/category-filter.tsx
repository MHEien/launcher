"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function CategoryFilter({ categories }: { categories: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get("category");

  const handleCategoryClick = (category: string | null) => {
    if (category) {
      router.push(`/?category=${encodeURIComponent(category)}`);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => handleCategoryClick(null)}
        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
          !selectedCategory
            ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
            : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => handleCategoryClick(cat)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            selectedCategory === cat
              ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
              : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
