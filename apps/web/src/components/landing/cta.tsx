"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Download, Apple, Monitor, Terminal, Check, Sparkles } from "lucide-react";
import Link from "next/link";

type OS = "windows" | "macos" | "linux";

function detectOS(): OS {
  if (typeof window === "undefined") return "linux";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  return "linux";
}

const osConfig = {
  windows: { name: "Windows", icon: Monitor, ext: ".exe" },
  macos: { name: "macOS", icon: Apple, ext: ".dmg" },
  linux: { name: "Linux", icon: Terminal, ext: ".AppImage" },
};

const benefits = [
  "Free forever with generous limits",
  "No account required to start",
  "Cross-platform sync available",
  "Cancel Pro anytime",
];

export function CTA() {
  const [os] = useState<OS>(() => detectOS());
  const config = osConfig[os];
  const Icon = config.icon;

  return (
    <section className="py-32 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-linear-to-b from-zinc-950 via-violet-950/20 to-zinc-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-violet-600/20 via-fuchsia-600/10 to-transparent" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300 mb-8"
          >
            <Sparkles className="w-4 h-4" />
            Free to use, forever
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-bold mb-6"
          >
            Ready to{" "}
            <span className="bg-clip-text text-transparent bg-linear-to-r from-violet-400 via-fuchsia-400 to-pink-400">
              supercharge
            </span>
            <br />
            your workflow?
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-zinc-400 mb-12 max-w-2xl mx-auto"
          >
            Join thousands of users who have made Launcher their command center. 
            Available on Windows, macOS, and Linux.
          </motion.p>
        </div>

        {/* Download card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="relative max-w-2xl mx-auto"
        >
          <div className="absolute -inset-1 bg-linear-to-r from-violet-600 via-fuchsia-600 to-pink-600 rounded-3xl blur-lg opacity-30" />
          <div className="relative p-8 md:p-10 rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-linear-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">Launcher for {config.name}</div>
                    <div className="text-sm text-zinc-500">v1.0.0 • {config.ext} installer</div>
                  </div>
                </div>
                
                <div className="space-y-2 mb-6">
                  {benefits.map((benefit) => (
                    <div key={benefit} className="flex items-center gap-2 text-sm text-zinc-400">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <Link
                  href="/download"
                  className="group h-14 px-8 rounded-xl bg-linear-to-r from-violet-600 to-fuchsia-600 text-white font-semibold flex items-center justify-center gap-3 hover:from-violet-500 hover:to-fuchsia-500 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105"
                >
                  <Download className="w-5 h-5" />
                  Download Free
                </Link>
                <Link
                  href="/app"
                  className="group h-12 px-6 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium flex items-center justify-center gap-2 hover:bg-zinc-700 hover:text-white transition-all"
                >
                  Browse Plugins
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Platform links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex justify-center gap-6 mt-8 text-sm text-zinc-500"
        >
          <span>Also available for:</span>
          {Object.entries(osConfig)
            .filter(([key]) => key !== os)
            .map(([key, value]) => (
              <Link
                key={key}
                href={`/download?os=${key}`}
                className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
              >
                <value.icon className="w-4 h-4" />
                {value.name}
              </Link>
            ))}
        </motion.div>
      </div>
    </section>
  );
}
