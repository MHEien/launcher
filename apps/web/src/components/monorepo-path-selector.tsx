"use client";

import { useState, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  FileJson,
  Loader2,
  AlertCircle,
  CheckCircle,
  ChevronRight,
} from "lucide-react";

interface PluginPath {
  path: string;
  name: string;
  hasManifest: boolean;
}

interface MonorepoAnalysis {
  isMonorepo: boolean;
  type: string | null;
  workspaces: string[];
  potentialPluginPaths: PluginPath[];
}

interface MonorepoPathSelectorProps {
  owner: string;
  repo: string;
  branch: string;
  onSelect: (path: string) => void;
  selectedPath: string;
}

export function MonorepoPathSelector({
  owner,
  repo,
  branch,
  onSelect,
  selectedPath,
}: MonorepoPathSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MonorepoAnalysis | null>(null);

  useEffect(() => {
    const analyzeRepo = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/github/repos/${owner}/${repo}/analyze?branch=${branch}`
        );
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Failed to analyze repository");
          return;
        }

        setAnalysis(data);

        // If not a monorepo and has manifest in root, auto-select root
        if (!data.isMonorepo && data.potentialPluginPaths.length === 1) {
          onSelect(data.potentialPluginPaths[0].path);
        }
      } catch (err) {
        setError("Failed to analyze repository");
      } finally {
        setLoading(false);
      }
    };

    analyzeRepo();
  }, [owner, repo, branch, onSelect]);

  if (loading) {
    return (
      <div className="border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Analyzing repository structure...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-4">
        <div className="flex items-center gap-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  // If it's a single plugin repo (not monorepo with manifest in root), don't show selector
  if (
    !analysis.isMonorepo &&
    analysis.potentialPluginPaths.length === 1 &&
    analysis.potentialPluginPaths[0].hasManifest &&
    analysis.potentialPluginPaths[0].path === ""
  ) {
    return (
      <div className="border border-green-500/20 bg-green-500/5 rounded-xl p-4">
        <div className="flex items-center gap-3 text-sm text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>Plugin detected in repository root</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-800/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-white">
              {analysis.isMonorepo ? "Monorepo Detected" : "Select Plugin Location"}
            </h3>
            {analysis.isMonorepo && analysis.type && (
              <p className="text-xs text-zinc-500 mt-1">
                {analysis.type.toUpperCase()} workspaces detected
              </p>
            )}
          </div>
          {analysis.isMonorepo && (
            <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 text-xs font-medium rounded">
              {analysis.type}
            </span>
          )}
        </div>
      </div>

      {/* Path list */}
      <div className="max-h-64 overflow-y-auto">
        {analysis.potentialPluginPaths.length === 0 ? (
          <div className="p-4 text-sm text-zinc-500 text-center">
            No plugin directories found. Select a custom path or ensure your
            plugin has a manifest.json
          </div>
        ) : (
          analysis.potentialPluginPaths.map((item) => (
            <button
              key={item.path || "__root__"}
              type="button"
              onClick={() => onSelect(item.path)}
              className={`w-full p-3 text-left flex items-center gap-3 transition-colors ${
                selectedPath === item.path
                  ? "bg-violet-500/10 border-l-2 border-violet-500"
                  : "hover:bg-zinc-800/50 border-l-2 border-transparent"
              }`}
            >
              {selectedPath === item.path ? (
                <FolderOpen className="w-4 h-4 text-violet-400" />
              ) : (
                <Folder className="w-4 h-4 text-zinc-500" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium truncate ${
                      selectedPath === item.path
                        ? "text-violet-300"
                        : "text-zinc-300"
                    }`}
                  >
                    {item.name}
                  </span>
                  {item.hasManifest && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 text-green-400 text-xs rounded">
                      <FileJson className="w-3 h-3" />
                      manifest.json
                    </span>
                  )}
                </div>
                {item.path && (
                  <p className="text-xs text-zinc-600 truncate mt-0.5">
                    {item.path}
                  </p>
                )}
              </div>
              <ChevronRight
                className={`w-4 h-4 ${
                  selectedPath === item.path
                    ? "text-violet-400"
                    : "text-zinc-600"
                }`}
              />
            </button>
          ))
        )}
      </div>

      {/* Custom path input */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
        <label className="block text-xs text-zinc-500 mb-2">
          Or enter a custom path:
        </label>
        <input
          type="text"
          value={selectedPath}
          onChange={(e) => onSelect(e.target.value)}
          placeholder="packages/my-plugin"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>
    </div>
  );
}

