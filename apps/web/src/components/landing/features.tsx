"use client";

import { motion } from "framer-motion";
import { 
  Zap, 
  Puzzle, 
  Keyboard, 
  Shield, 
  Sparkles, 
  LayoutDashboard, 
  Terminal, 
  Globe,
  Calculator,
  FolderOpen,
  Clock
} from "lucide-react";

const coreFeatures = [
  {
    name: "Blazingly Fast",
    description: "Built with Tauri and Rust. ~40ms startup, minimal memory footprint. No Electron bloat.",
    icon: Zap,
    color: "from-yellow-500 to-orange-500",
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-400",
  },
  {
    name: "AI-Powered",
    description: "Built-in AI assistant and Codex CLI integration for intelligent workflows and coding help.",
    icon: Sparkles,
    color: "from-violet-500 to-purple-500",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-400",
  },
  {
    name: "Custom Dashboard",
    description: "Drag-and-drop widgets: Terminal, Calculator, Clock, Recent Files, Quick Actions, and more.",
    icon: LayoutDashboard,
    color: "from-blue-500 to-cyan-500",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
  },
  {
    name: "Plugin Ecosystem",
    description: "Extend with WASM plugins. Write in Rust, Go, or TypeScript. Secure sandboxed execution.",
    icon: Puzzle,
    color: "from-emerald-500 to-green-500",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
  },
  {
    name: "Keyboard First",
    description: "Everything via shortcuts. Customizable hotkeys. Never leave your keyboard.",
    icon: Keyboard,
    color: "from-pink-500 to-rose-500",
    iconBg: "bg-pink-500/10",
    iconColor: "text-pink-400",
  },
  {
    name: "Privacy First",
    description: "Local file indexing. Your data stays on your machine. No telemetry by default.",
    icon: Shield,
    color: "from-teal-500 to-cyan-500",
    iconBg: "bg-teal-500/10",
    iconColor: "text-teal-400",
  },
];

const searchProviders = [
  { name: "Apps", icon: "🚀", description: "Launch any application instantly" },
  { name: "Files", icon: FolderOpen, description: "Search 40k+ indexed files" },
  { name: "Calculator", icon: Calculator, description: "Math expressions on the fly" },
  { name: "Web Search", icon: Globe, description: "Search Google, DuckDuckGo" },
  { name: "GitHub", icon: "gh:", description: "Search repos, issues, PRs" },
  { name: "Notion", icon: "nt:", description: "Search pages and databases" },
  { name: "Slack", icon: "sl:", description: "Search messages and channels" },
  { name: "Google Drive", icon: "gd:", description: "Search your documents" },
  { name: "Calendar", icon: "gc:", description: "View upcoming events" },
  { name: "System", icon: "⚙️", description: "Shutdown, restart, lock" },
];

const widgets = [
  { name: "Terminal", icon: Terminal, color: "bg-zinc-800" },
  { name: "Calculator", icon: Calculator, color: "bg-violet-500/20" },
  { name: "Clock", icon: Clock, color: "bg-blue-500/20" },
  { name: "Recent Files", icon: FolderOpen, color: "bg-emerald-500/20" },
  { name: "Quick Actions", icon: Zap, color: "bg-yellow-500/20" },
];

export function Features() {
  return (
    <section className="py-32 bg-zinc-950 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-size-[64px_64px]" />
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-fuchsia-500/5 rounded-full blur-3xl" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-400 mb-6"
          >
            <Zap className="w-4 h-4 text-yellow-500" />
            Engineered for performance
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            Everything you need,{" "}
            <span className="bg-clip-text text-transparent bg-linear-to-r from-violet-400 to-fuchsia-400">
              one keystroke away
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-zinc-400"
          >
            We reimagined the launcher from the ground up. Fast, extensible, and packed with features for everyone.
          </motion.p>
        </div>

        {/* Core features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
          {coreFeatures.map((feature, index) => (
            <motion.div
              key={feature.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all hover:bg-zinc-900/80"
            >
              <div className={`absolute inset-0 bg-linear-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity`} />
              <div className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center mb-4 ${feature.iconColor}`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-zinc-100">{feature.name}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Search providers section */}
        <div className="mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Search <span className="text-violet-400">everything</span>
            </h3>
            <p className="text-zinc-400">Type a prefix to instantly search your favorite services</p>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {searchProviders.map((provider, index) => (
              <motion.div
                key={provider.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="group p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-800/50 transition-all cursor-default"
              >
                <div className="flex items-center gap-3 mb-2">
                  {typeof provider.icon === "string" ? (
                    <span className="text-lg font-mono text-violet-400">{provider.icon}</span>
                  ) : (
                    <provider.icon className="w-5 h-5 text-violet-400" />
                  )}
                  <span className="font-medium text-zinc-200 text-sm">{provider.name}</span>
                </div>
                <p className="text-xs text-zinc-500">{provider.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Widgets showcase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="absolute -inset-4 bg-linear-to-r from-violet-600/10 via-fuchsia-600/10 to-pink-600/10 rounded-3xl blur-xl" />
          <div className="relative p-8 md:p-12 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  Your dashboard,{" "}
                  <span className="text-fuchsia-400">your way</span>
                </h3>
                <p className="text-zinc-400 mb-6">
                  Customize your launcher with drag-and-drop widgets. Pin your favorite apps, 
                  embed a terminal, track time, and more. Everything adapts to your workflow.
                </p>
                <div className="flex flex-wrap gap-2">
                  {widgets.map((widget) => (
                    <div
                      key={widget.name}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${widget.color} border border-zinc-700/50`}
                    >
                      <widget.icon className="w-4 h-4 text-zinc-300" />
                      <span className="text-sm text-zinc-300">{widget.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 w-full">
                {/* Mini dashboard preview */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                    <div className="text-xs text-zinc-500 mb-2">SUGGESTED APPS</div>
                    <div className="flex gap-2">
                      {["💻", "🌐", "💬", "🎵"].map((emoji, i) => (
                        <div key={i} className="w-8 h-8 rounded-lg bg-zinc-700/50 flex items-center justify-center text-sm">
                          {emoji}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                    <div className="text-xs text-zinc-500 mb-1">CLOCK</div>
                    <div className="text-xl font-mono text-zinc-200">14:32</div>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs">
                    <div className="text-green-400">$ _</div>
                  </div>
                  <div className="col-span-2 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                    <div className="text-xs text-zinc-500 mb-1">CALCULATOR</div>
                    <div className="text-lg font-mono text-zinc-200">2 + 2 = 4</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
