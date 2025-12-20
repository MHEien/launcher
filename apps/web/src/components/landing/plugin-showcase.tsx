"use client";

import { motion } from "framer-motion";
import { ArrowRight, Github, FileText, MessageSquare, Music, CheckSquare, Code2, Puzzle, Download, Users } from "lucide-react";
import Link from "next/link";

const integrations = [
  { 
    name: "GitHub", 
    icon: Github, 
    category: "Developer",
    color: "from-gray-600 to-gray-800",
    description: "Search repos, issues, PRs"
  },
  { 
    name: "Notion", 
    icon: FileText, 
    category: "Productivity",
    color: "from-zinc-600 to-zinc-800",
    description: "Search pages & databases"
  },
  { 
    name: "Slack", 
    icon: MessageSquare, 
    category: "Communication",
    color: "from-purple-600 to-purple-800",
    description: "Messages & channels"
  },
  { 
    name: "Spotify", 
    icon: Music, 
    category: "Media",
    color: "from-green-600 to-green-800",
    description: "Control your music"
  },
  { 
    name: "Linear", 
    icon: CheckSquare, 
    category: "Project Management",
    color: "from-indigo-600 to-indigo-800",
    description: "Track issues & projects"
  },
  { 
    name: "VS Code", 
    icon: Code2, 
    category: "Developer",
    color: "from-blue-600 to-blue-800",
    description: "Open projects & files"
  },
];

const pluginCategories = [
  { name: "Productivity", count: 24, icon: "⚡" },
  { name: "Developer Tools", count: 18, icon: "🛠️" },
  { name: "Communication", count: 12, icon: "💬" },
  { name: "Media", count: 8, icon: "🎵" },
  { name: "Utilities", count: 15, icon: "🔧" },
  { name: "Finance", count: 6, icon: "💰" },
];

export function PluginShowcase() {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-linear-to-b from-zinc-950 via-violet-950/10 to-zinc-950" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/5 rounded-full blur-3xl" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 mb-6"
          >
            <Puzzle className="w-4 h-4" />
            Plugin Marketplace
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            Extend with{" "}
            <span className="bg-clip-text text-transparent bg-linear-to-r from-violet-400 via-fuchsia-400 to-pink-400">
              powerful plugins
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-zinc-400"
          >
            Connect your favorite tools and services. Our WASM-based architecture ensures 
            security and blazing performance.
          </motion.p>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-8 mb-16"
        >
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-zinc-900/50 border border-zinc-800">
            <Puzzle className="w-5 h-5 text-violet-400" />
            <span className="text-zinc-300"><strong className="text-white">100+</strong> Plugins</span>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-zinc-900/50 border border-zinc-800">
            <Download className="w-5 h-5 text-emerald-400" />
            <span className="text-zinc-300"><strong className="text-white">50k+</strong> Downloads</span>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-zinc-900/50 border border-zinc-800">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-zinc-300"><strong className="text-white">200+</strong> Contributors</span>
          </div>
        </motion.div>

        {/* Integrations grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-16">
          {integrations.map((integration, index) => (
            <motion.div
              key={integration.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-violet-500/50 transition-all overflow-hidden"
            >
              <div className={`absolute inset-0 bg-linear-to-br ${integration.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <integration.icon className="w-6 h-6 text-zinc-300" />
                </div>
                <h3 className="font-semibold text-zinc-200 mb-1">{integration.name}</h3>
                <p className="text-xs text-zinc-500">{integration.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h3 className="text-center text-xl font-semibold mb-8">Browse by category</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {pluginCategories.map((category) => (
              <Link
                key={category.name}
                href={`/app?category=${category.name.toLowerCase().replace(" ", "-")}`}
                className="group flex items-center gap-3 px-5 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-800/50 transition-all"
              >
                <span className="text-lg">{category.icon}</span>
                <span className="text-zinc-300 group-hover:text-white transition-colors">{category.name}</span>
                <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">{category.count}</span>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Developer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="absolute -inset-1 bg-linear-to-r from-violet-600/20 via-fuchsia-600/20 to-pink-600/20 rounded-2xl blur-xl" />
          <div className="relative p-8 md:p-12 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-3">Build your own plugin</h3>
              <p className="text-zinc-400 max-w-lg">
                Create plugins in Rust, Go, TypeScript, or any language that compiles to WASM. 
                Publish to the marketplace and reach thousands of users.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/docs/plugins"
                className="px-6 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-medium hover:bg-zinc-700 transition-colors text-center"
              >
                Read the Docs
              </Link>
              <Link
                href="/plugins/submit"
                className="px-6 py-3 rounded-xl bg-linear-to-r from-violet-600 to-fuchsia-600 text-white font-medium hover:from-violet-500 hover:to-fuchsia-500 transition-all flex items-center gap-2 justify-center"
              >
                Submit Plugin
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
