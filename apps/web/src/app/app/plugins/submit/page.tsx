"use client";

import { useState } from "react";
import { useUser } from "@stackframe/stack";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/header";

const CATEGORIES = [
  "Productivity",
  "Developer Tools",
  "Communication",
  "Finance",
  "Entertainment",
  "Utilities",
  "AI & Machine Learning",
  "Data & Analytics",
];

const PERMISSIONS = [
  { id: "fs:read", label: "Read files", description: "Read files from the filesystem" },
  { id: "fs:write", label: "Write files", description: "Write files to the filesystem" },
  { id: "net:http", label: "HTTP requests", description: "Make HTTP requests to external services" },
  { id: "clipboard", label: "Clipboard access", description: "Read and write to clipboard" },
  { id: "notifications", label: "Notifications", description: "Show system notifications" },
  { id: "config", label: "Configuration", description: "Store and retrieve plugin configuration" },
];

interface FormData {
  id: string;
  name: string;
  version: string;
  description: string;
  longDescription: string;
  homepage: string;
  repository: string;
  downloadUrl: string;
  categories: string[];
  permissions: string[];
}

export default function SubmitPluginPage() {
  const user = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    id: "",
    name: "",
    version: "1.0.0",
    description: "",
    longDescription: "",
    homepage: "",
    repository: "",
    downloadUrl: "",
    categories: [],
    permissions: [],
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <Header />
        <main className="max-w-2xl mx-auto px-6 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Sign in required</h1>
          <p className="text-zinc-400 mb-6">
            You need to sign in to submit a plugin to the marketplace.
          </p>
          <Link
            href="/handler/sign-in?after_auth_return_to=/app/plugins/submit"
            className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Sign In
          </Link>
        </main>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/plugins/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit plugin");
      }

      router.push(`/plugins/${data.id}?submitted=true`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handlePermissionToggle = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const generateId = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setFormData((prev) => ({ ...prev, id: slug }));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <Link
            href="/app"
            className="text-zinc-400 hover:text-white text-sm mb-4 inline-block"
          >
            ← Back to Marketplace
          </Link>
          <h1 className="text-3xl font-bold mb-2">Submit a Plugin</h1>
          <p className="text-zinc-400">
            Share your plugin with the Launcher community
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Plugin Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  onBlur={generateId}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="My Awesome Plugin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Plugin ID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="my-awesome-plugin"
                  pattern="[a-z0-9-]+"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Lowercase letters, numbers, and hyphens only. This cannot be changed later.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Version *
                </label>
                <input
                  type="text"
                  required
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="1.0.0"
                  pattern="\d+\.\d+\.\d+"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Short Description *
                </label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="A brief description of what your plugin does"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {formData.description.length}/160 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Long Description
                </label>
                <textarea
                  rows={5}
                  value={formData.longDescription}
                  onChange={(e) => setFormData({ ...formData, longDescription: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  placeholder="A detailed description of your plugin, its features, and how to use it. Markdown is supported."
                />
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Links</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Download URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.downloadUrl}
                  onChange={(e) => setFormData({ ...formData, downloadUrl: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="https://github.com/user/repo/releases/download/v1.0.0/plugin.wasm"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Direct URL to the compiled .wasm plugin file
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Homepage
                </label>
                <input
                  type="url"
                  value={formData.homepage}
                  onChange={(e) => setFormData({ ...formData, homepage: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="https://my-plugin.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Repository
                </label>
                <input
                  type="url"
                  value={formData.repository}
                  onChange={(e) => setFormData({ ...formData, repository: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="https://github.com/user/my-plugin"
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Categories</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Select one or more categories that best describe your plugin.
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategoryToggle(category)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    formData.categories.includes(category)
                      ? "bg-violet-500 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Permissions</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Select the permissions your plugin requires. Users will see these before installing.
            </p>
            <div className="space-y-3">
              {PERMISSIONS.map((permission) => (
                <label
                  key={permission.id}
                  className="flex items-start gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(permission.id)}
                    onChange={() => handlePermissionToggle(permission.id)}
                    className="mt-1 w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500 focus:ring-offset-zinc-900"
                  />
                  <div>
                    <span className="text-sm font-medium text-zinc-200">
                      {permission.label}
                    </span>
                    <p className="text-xs text-zinc-500">{permission.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              By submitting, you agree to our plugin guidelines.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Submitting...
                </>
              ) : (
                "Submit Plugin"
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
