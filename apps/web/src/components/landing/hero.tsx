"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Download, Sparkles, Command, Zap, Users, Gamepad2, Briefcase, Code2 } from "lucide-react";
import Link from "next/link";

type OS = "windows" | "macos" | "linux";

function detectOS(): OS {
  if (typeof window === "undefined") return "linux";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  return "linux";
}

const OS_NAMES: Record<OS, string> = {
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
};

const audiences = [
  { icon: Users, label: "Everyone", color: "text-blue-400" },
  { icon: Briefcase, label: "Professionals", color: "text-emerald-400" },
  { icon: Gamepad2, label: "Gamers", color: "text-pink-400" },
  { icon: Code2, label: "Developers", color: "text-violet-400" },
];

export function Hero() {
  const [os] = useState<OS>(() => detectOS());
  const [version, setVersion] = useState<string | null>(null);
  const [activeAudience, setActiveAudience] = useState(0);

  useEffect(() => {
    fetch("/api/releases/latest")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.version) setVersion(data.version);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveAudience((prev) => (prev + 1) % audiences.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-24 pb-32 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-violet-600/30 via-fuchsia-600/10 to-transparent pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[64px_64px] mask-[radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      </div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 text-sm mb-8"
          >
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-violet-300">Now with AI-powered workflows</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
          >
            <span className="bg-clip-text text-transparent bg-linear-to-b from-white via-white to-zinc-400">
              The Ultimate
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-linear-to-r from-violet-400 via-fuchsia-400 to-pink-400">
              Launcher
            </span>
          </motion.h1>

          {/* Audience rotator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex items-center gap-3 mb-8 h-10"
          >
            <span className="text-xl text-zinc-400">Built for</span>
            <div className="relative w-40 h-10 overflow-hidden">
              {audiences.map((audience, index) => (
                <motion.div
                  key={audience.label}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{
                    y: activeAudience === index ? 0 : activeAudience > index ? -40 : 40,
                    opacity: activeAudience === index ? 1 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                  className={`absolute inset-0 flex items-center gap-2 ${audience.color}`}
                >
                  <audience.icon className="w-5 h-5" />
                  <span className="text-xl font-semibold">{audience.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-400 mb-10 leading-relaxed max-w-2xl"
          >
            Lightning-fast app launcher with AI assistance, customizable dashboard, 
            and a powerful plugin ecosystem. One keystroke away from everything.
          </motion.p>

          {/* Hotkey hint */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="flex items-center gap-2 mb-10 text-zinc-500"
          >
            <kbd className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm font-mono text-zinc-300">Alt</kbd>
            <span>+</span>
            <kbd className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm font-mono text-zinc-300">Space</kbd>
            <span className="ml-2">to launch</span>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link
              href="/download"
              className="group h-14 px-8 rounded-xl bg-linear-to-r from-violet-600 to-fuchsia-600 text-white font-semibold flex items-center gap-3 hover:from-violet-500 hover:to-fuchsia-500 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105"
            >
              <Download className="w-5 h-5" />
              Download for {OS_NAMES[os]}
              {version && <span className="text-violet-200 text-sm">v{version}</span>}
            </Link>
            <Link
              href="/app"
              className="group h-14 px-8 rounded-xl bg-zinc-900/80 border border-zinc-700 text-white font-semibold flex items-center gap-3 hover:bg-zinc-800 hover:border-zinc-600 transition-all"
            >
              Explore Plugins
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="flex items-center gap-8 mt-12 text-sm text-zinc-500"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span><strong className="text-zinc-300">~40ms</strong> startup</span>
            </div>
            <div className="flex items-center gap-2">
              <Command className="w-4 h-4 text-violet-400" />
              <span><strong className="text-zinc-300">100+</strong> plugins</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span><strong className="text-zinc-300">Cross-platform</strong></span>
            </div>
          </motion.div>

          {/* App Preview */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-20 w-full max-w-5xl relative"
          >
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-linear-to-r from-violet-600/20 via-fuchsia-600/20 to-pink-600/20 rounded-3xl blur-2xl" />
            <div className="absolute -inset-1 bg-linear-to-r from-violet-500/50 via-fuchsia-500/50 to-pink-500/50 rounded-2xl opacity-20" />
            
            {/* Main preview container */}
            <div className="relative bg-zinc-900/90 backdrop-blur-xl rounded-2xl border border-zinc-700/50 shadow-2xl overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors" />
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Command className="w-3 h-3" />
                  <span className="font-mono">Launcher</span>
                </div>
                <div className="w-16" />
              </div>

              {/* Search bar */}
              <div className="p-4 border-b border-zinc-800/50">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                  <Command className="w-5 h-5 text-violet-400" />
                  <span className="text-zinc-400">Search apps, files, commands...</span>
                  <span className="ml-auto text-xs text-zinc-600 font-mono">Type to search</span>
                </div>
              </div>

              {/* Dashboard preview */}
              <div className="p-4 grid grid-cols-12 gap-4 min-h-[300px]">
                {/* Suggested apps */}
                <div className="col-span-12 md:col-span-8">
                  <div className="text-xs text-zinc-500 mb-3 font-medium">SUGGESTED APPS</div>
                  <div className="flex gap-3 mb-6">
                    {["VS Code", "Chrome", "Slack", "Spotify", "Discord"].map((app, i) => (
                      <motion.div
                        key={app}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 + i * 0.1 }}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/60 transition-colors cursor-pointer"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                          ["bg-blue-500/20 text-blue-400", "bg-yellow-500/20 text-yellow-400", "bg-purple-500/20 text-purple-400", "bg-green-500/20 text-green-400", "bg-indigo-500/20 text-indigo-400"][i]
                        }`}>
                          {["💻", "🌐", "💬", "🎵", "🎮"][i]}
                        </div>
                        <span className="text-xs text-zinc-400">{app}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Widgets preview */}
                  <div className="grid grid-cols-2 gap-3">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2 }}
                      className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30"
                    >
                      <div className="text-xs text-zinc-500 mb-2">CALCULATOR</div>
                      <div className="text-2xl font-mono text-zinc-200">= 42</div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.3 }}
                      className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30"
                    >
                      <div className="text-xs text-zinc-500 mb-2">CLOCK</div>
                      <div className="text-2xl font-mono text-zinc-200">14:32</div>
                    </motion.div>
                  </div>
                </div>

                {/* Terminal widget */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.4 }}
                  className="col-span-12 md:col-span-4 p-3 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs"
                >
                  <div className="text-zinc-500 mb-2">TERMINAL</div>
                  <div className="text-green-400">$ npm run dev</div>
                  <div className="text-zinc-500 mt-1">Starting server...</div>
                  <div className="text-emerald-400 mt-1">✓ Ready on :3000</div>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-violet-400">❯</span>
                    <span className="w-2 h-4 bg-violet-400 animate-pulse" />
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
