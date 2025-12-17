"use client";

import { motion } from "framer-motion";
import { ArrowRight, Download } from "lucide-react";
import Link from "next/link";

export function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-b from-zinc-950 to-violet-950/20 pointer-events-none" />
      
      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-bold mb-6"
        >
          Ready to upgrade your workflow?
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto"
        >
          Join thousands of developers who have switched to the fastest, 
          most extensible launcher built for the modern stack.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/download"
            className="h-14 px-8 rounded-lg bg-white text-black font-semibold text-lg flex items-center gap-2 hover:bg-zinc-200 transition-colors w-full sm:w-auto justify-center"
          >
            <Download className="w-5 h-5" />
            Download Now
          </Link>
          <Link
            href="/app"
            className="h-14 px-8 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-semibold text-lg flex items-center gap-2 hover:bg-zinc-800 transition-colors w-full sm:w-auto justify-center"
          >
            View Plugins
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
