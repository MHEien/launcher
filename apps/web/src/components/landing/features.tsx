"use client";

import { motion } from "framer-motion";
import { Zap, Puzzle, Keyboard, Shield } from "lucide-react";

const features = [
  {
    name: "Blazingly Fast",
    description:
      "Built with Tauri and Rust for instant startup times and minimal memory footprint. No Electron bloat.",
    icon: Zap,
  },
  {
    name: "WASM Plugins",
    description:
      "Extend functionality safely with WebAssembly plugins. Write plugins in Rust, Go, or any WASM-compiling language.",
    icon: Puzzle,
  },
  {
    name: "Keyboard Centric",
    description:
      "Keep your hands on the keyboard. Everything is accessible via shortcuts, from launching apps to complex workflows.",
    icon: Keyboard,
  },
  {
    name: "Local First",
    description:
      "Your data stays on your machine. We index your files locally and respect your privacy by default.",
    icon: Shield,
  },
];

export function Features() {
  return (
    <section className="py-24 bg-zinc-950">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Engineered for performance
          </h2>
          <p className="text-zinc-400">
            We reimagined the launcher from the ground up to be the fastest, most extensible tool in your arsenal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center mb-4 text-violet-400">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.name}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
