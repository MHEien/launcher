"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Search, GitBranch, Star, Lock, Globe, Loader2, RefreshCw, AlertCircle } from "lucide-react";

interface Repo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  defaultBranch: string;
  isPrivate: boolean;
  owner: string;
  ownerAvatar: string;
  updatedAt: string;
  language: string | null;
  stars: number;
}

interface GitHubRepoSelectorProps {
  onSelect: (repo: Repo | null) => void;
  selectedRepo: Repo | null;
}

export function GitHubRepoSelector({ onSelect, selectedRepo }: GitHubRepoSelectorProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; connectUrl?: string } | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchRepos = async (pageNum: number = 1, append: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/github/repos?page=${pageNum}&per_page=30&sort=updated`);
      const data = await response.json();

      if (!response.ok) {
        setError({
          message: data.message || data.error || "Failed to fetch repositories",
          connectUrl: data.connectUrl,
        });
        return;
      }

      if (append) {
        setRepos((prev) => [...prev, ...data.repos]);
      } else {
        setRepos(data.repos);
      }
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch {
      setError({ message: "Failed to fetch repositories" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const filteredRepos = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(search.toLowerCase()) ||
      repo.fullName.toLowerCase().includes(search.toLowerCase()) ||
      repo.description?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  if (error?.connectUrl) {
    return (
      <div className="border border-zinc-800 rounded-xl p-8 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Connect GitHub</h3>
        <p className="text-zinc-400 mb-6 max-w-md mx-auto">
          {error.message || "Connect your GitHub account to select a repository for your plugin."}
        </p>
        <a
          href={error.connectUrl}
          className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Connect GitHub
        </a>
      </div>
    );
  }

  if (selectedRepo) {
    return (
      <div className="border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={selectedRepo.ownerAvatar}
              alt={selectedRepo.owner}
              width={40}
              height={40}
              className="w-10 h-10 rounded-lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{selectedRepo.fullName}</span>
                {selectedRepo.isPrivate ? (
                  <Lock className="w-3.5 h-3.5 text-zinc-500" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-zinc-500" />
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-500">
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3.5 h-3.5" />
                  {selectedRepo.defaultBranch}
                </span>
                {selectedRepo.language && <span>{selectedRepo.language}</span>}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      {/* Search header */}
      <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
        <Search className="w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search repositories..."
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-zinc-500 text-sm"
        />
        <button
          type="button"
          onClick={() => fetchRepos(1)}
          className="p-1.5 text-zinc-500 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Repo list */}
      <div className="max-h-80 overflow-y-auto">
        {loading && repos.length === 0 ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Loading repositories...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-400">{error.message}</p>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-zinc-500">
              {search ? "No repositories match your search" : "No repositories found"}
            </p>
          </div>
        ) : (
          <>
            {filteredRepos.map((repo) => (
              <button
                key={repo.id}
                type="button"
                onClick={() => onSelect(repo)}
                className="w-full p-3 text-left hover:bg-zinc-800/50 transition-colors border-b border-zinc-800/50 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <Image
                      src={repo.ownerAvatar}
                      alt={repo.owner}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-lg shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">{repo.fullName}</span>
                        {repo.isPrivate ? (
                          <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        ) : (
                          <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-sm text-zinc-500 truncate mt-0.5">{repo.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-600">
                        {repo.language && <span>{repo.language}</span>}
                        {repo.stars > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {repo.stars}
                          </span>
                        )}
                        <span>Updated {formatDate(repo.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="p-3 text-center">
                <button
                  type="button"
                  onClick={() => fetchRepos(page + 1, true)}
                  disabled={loading}
                  className="text-sm text-violet-400 hover:text-violet-300 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

