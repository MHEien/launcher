"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const popularPlugins = [
  { name: "GitHub", icon: "📦", category: "Developer" },
  { name: "Notion", icon: "📝", category: "Productivity" },
  { name: "Slack", icon: "💬", category: "Communication" },
  { name: "Spotify", icon: "🎵", category: "Media" },
  { name: "Linear", icon: "✅", category: "Project Management" },
  { name: "VS Code", icon: "💻", category: "Developer" },
];

export function PluginShowcase() {
  return (
    <section className="py-24 border-t border-zinc-900 bg-zinc-950/50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="flex-1 max-w-lg">
            <h2 className="text-3xl font-bold mb-6">
              A growing ecosystem <br />
              of powerful plugins.
            </h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              Connect your favorite tools with a single keystroke. 
              Our WASM-based plugin architecture ensures security and performance, 
              while giving you access to the services you use every day.
            </p>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              Explore the Marketplace
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex-1 w-full max-w-lg">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {popularPlugins.map((plugin, index) => (
                <motion.div
                  key={plugin.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="group p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-800/80 transition-all cursor-default"
                >
                  <div className="text-2xl mb-3">{plugin.icon}</div>
                  <div className="font-medium text-zinc-200 group-hover:text-violet-200 transition-colors">
                    {plugin.name}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {plugin.category}
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="mt-8 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 text-center">
              <p className="text-sm text-zinc-400">
                Are you a developer?{" "}
                <Link href="/plugins/submit" className="text-white hover:underline decoration-violet-500 underline-offset-4">
                  Build your own plugin
                </Link>
                {" "}in Rust, Go, or TypeScript.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
