"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, Apple, Monitor, Terminal, ChevronDown, Check, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/landing/footer";

interface PlatformRelease {
  downloadUrl: string;
  fileName: string;
  fileSize: number | null;
  checksum: string | null;
}

interface LatestRelease {
  version: string;
  channel: string;
  platforms: Record<string, PlatformRelease>;
  releaseNotes: string | null;
  publishedAt: string;
}

interface VersionInfo {
  version: string;
  channel: string;
  publishedAt: string;
  isLatest: boolean;
  isDeprecated: boolean;
  releaseNotes: string | null;
}

type OS = "windows" | "macos" | "linux";

function detectOS(): OS {
  if (typeof window === "undefined") return "linux";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  return "linux";
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

const OS_CONFIG = {
  windows: {
    name: "Windows",
    icon: Monitor,
    platforms: ["windows"],
    description: "Windows 10 or later",
  },
  macos: {
    name: "macOS",
    icon: Apple,
    platforms: ["macos", "macos_arm"],
    description: "macOS 11 or later",
  },
  linux: {
    name: "Linux",
    icon: Terminal,
    platforms: ["linux_appimage", "linux_deb"],
    description: "Ubuntu 20.04+, Fedora 36+, Arch",
  },
};

export default function DownloadPage() {
  const [release, setRelease] = useState<LatestRelease | null>(null);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [selectedOS, setSelectedOS] = useState<OS>("linux");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    setSelectedOS(detectOS());
  }, []);

  useEffect(() => {
    async function fetchRelease() {
      try {
        const [releaseRes, versionsRes] = await Promise.all([
          fetch("/api/releases/latest"),
          fetch("/api/releases/versions?limit=10"),
        ]);

        if (releaseRes.ok) {
          const data = await releaseRes.json();
          setRelease(data);
        } else if (releaseRes.status !== 404) {
          throw new Error("Failed to fetch release");
        }

        if (versionsRes.ok) {
          const data = await versionsRes.json();
          setVersions(data.versions || []);
        }
      } catch (err) {
        setError("Failed to load download information");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchRelease();
  }, []);

  const osConfig = OS_CONFIG[selectedOS];
  const primaryPlatform = osConfig.platforms[0];
  const primaryRelease = release?.platforms[primaryPlatform];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />
      <main className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Download Launcher
            </h1>
            <p className="text-xl text-zinc-400">
              {release ? `Version ${release.version}` : "Loading..."}
            </p>
          </motion.div>

          {/* OS Selector */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center gap-4 mb-12"
          >
            {(Object.keys(OS_CONFIG) as OS[]).map((os) => {
              const config = OS_CONFIG[os];
              const Icon = config.icon;
              const isSelected = selectedOS === os;

              return (
                <button
                  key={os}
                  onClick={() => setSelectedOS(os)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-zinc-800 border-violet-500 text-white"
                      : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <Icon className="w-8 h-8" />
                  <span className="font-medium">{config.name}</span>
                </button>
              );
            })}
          </motion.div>

          {/* Download Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 mb-8"
          >
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-zinc-400">Loading download information...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-400">{error}</p>
              </div>
            ) : !release || !primaryRelease ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-zinc-400">
                  No release available for {osConfig.name} yet.
                </p>
                <p className="text-sm text-zinc-500 mt-2">
                  Check back soon or try a different platform.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">
                      Launcher for {osConfig.name}
                    </h2>
                    <p className="text-zinc-400">{osConfig.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-500">Version</p>
                    <p className="font-mono text-lg">{release.version}</p>
                  </div>
                </div>

                <a
                  href={primaryRelease.downloadUrl}
                  className="flex items-center justify-center gap-3 w-full h-14 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors mb-4"
                >
                  <Download className="w-5 h-5" />
                  Download {primaryRelease.fileName}
                  {primaryRelease.fileSize && (
                    <span className="text-violet-200">
                      ({formatBytes(primaryRelease.fileSize)})
                    </span>
                  )}
                </a>

                {/* Alternative downloads for this OS */}
                {osConfig.platforms.length > 1 && (
                  <div className="border-t border-zinc-800 pt-4 mt-4">
                    <p className="text-sm text-zinc-500 mb-3">
                      Alternative downloads:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {osConfig.platforms.slice(1).map((platform) => {
                        const platformRelease = release.platforms[platform];
                        if (!platformRelease) return null;

                        return (
                          <a
                            key={platform}
                            href={platformRelease.downloadUrl}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            {platformRelease.fileName}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Checksum */}
                {primaryRelease.checksum && (
                  <div className="border-t border-zinc-800 pt-4 mt-4">
                    <p className="text-sm text-zinc-500 mb-2">SHA256 Checksum:</p>
                    <code className="block text-xs font-mono text-zinc-400 bg-zinc-800 p-3 rounded-lg break-all">
                      {primaryRelease.checksum}
                    </code>
                  </div>
                )}
              </>
            )}
          </motion.div>

          {/* Previous Versions */}
          {versions.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-zinc-900/50 rounded-xl border border-zinc-800"
            >
              <button
                onClick={() => setShowVersions(!showVersions)}
                className="flex items-center justify-between w-full p-4 text-left"
              >
                <span className="font-medium">Previous Versions</span>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${
                    showVersions ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showVersions && (
                <div className="border-t border-zinc-800 p-4">
                  <div className="space-y-2">
                    {versions.slice(1).map((v) => (
                      <Link
                        key={v.version}
                        href={`/download?version=${v.version}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono">{v.version}</span>
                          {v.isDeprecated && (
                            <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                              Deprecated
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-zinc-500">
                          {new Date(v.publishedAt).toLocaleDateString()}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Release Notes */}
          {release?.releaseNotes && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <h3 className="text-xl font-bold mb-4">Release Notes</h3>
              <div className="prose prose-invert prose-zinc max-w-none">
                <div
                  className="text-zinc-400 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: release.releaseNotes }}
                />
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
