"use client";

import { motion } from "framer-motion";
import { ArrowRight, Download, Terminal } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-violet-900/40 via-zinc-950/0 to-zinc-950/0 pointer-events-none" />
      
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-400 mb-8"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            v1.0 Public Beta is live
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-linear-to-b from-white to-zinc-500"
          >
            The developer-first <br />
            launcher for pros.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-zinc-400 mb-10 leading-relaxed"
          >
            Extensible with WASM, powered by Rust. Blazingly fast, fully customizable, 
            and designed for keyboard-centric workflows.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link
              href="/download"
              className="h-12 px-6 rounded-lg bg-white text-black font-medium flex items-center gap-2 hover:bg-zinc-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download for Linux
            </Link>
            <Link
              href="/app"
              className="h-12 px-6 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-medium flex items-center gap-2 hover:bg-zinc-800 transition-colors"
            >
              Browse Plugins
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Terminal/Launcher Preview Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-20 w-full relative group"
          >
            <div className="absolute -inset-1 bg-linear-to-r from-violet-500 to-fuchsia-500 rounded-xl opacity-20 group-hover:opacity-30 blur-lg transition-opacity duration-500" />
            <div className="relative bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                </div>
                <div className="flex-1 text-center text-xs text-zinc-500 font-mono">launcher</div>
              </div>
              <div className="p-6 font-mono text-left">
                <div className="flex items-center gap-3 text-xl text-zinc-300 mb-6">
                  <Terminal className="w-6 h-6 text-violet-500" />
                  <span className="w-0.5 h-6 bg-violet-500 animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-zinc-200">Open Terminal</div>
                        <div className="text-xs text-zinc-500">System Application</div>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-600">Enter</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/30 border border-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-green-500/20 flex items-center justify-center text-green-400">
                        <span className="font-bold">GH</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-zinc-200">Search GitHub</div>
                        <div className="text-xs text-zinc-500">Plugin Command</div>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-600">gh</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
