"use client";

import { motion } from "framer-motion";
import { Check, Sparkles, Users, Building2, Zap } from "lucide-react";
import Link from "next/link";

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for getting started",
    icon: Zap,
    color: "from-zinc-500 to-zinc-600",
    features: [
      "Unlimited app launching",
      "File search (40k files)",
      "5 plugins max",
      "50 AI queries/month",
      "Local data only",
      "Community support",
    ],
    cta: "Download Free",
    ctaLink: "/download",
    popular: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month",
    description: "For power users",
    icon: Sparkles,
    color: "from-violet-500 to-fuchsia-500",
    features: [
      "Everything in Free",
      "50 plugins max",
      "1,000 AI queries/month",
      "Cloud sync & backup",
      "Priority support",
      "Early access features",
    ],
    cta: "Start Pro Trial",
    ctaLink: "/pricing",
    popular: true,
  },
  {
    name: "Team",
    price: "$29",
    period: "/user/month",
    description: "For teams & organizations",
    icon: Users,
    color: "from-blue-500 to-cyan-500",
    features: [
      "Everything in Pro",
      "Unlimited plugins",
      "5,000 AI queries/month",
      "Team sharing & sync",
      "Admin dashboard",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    ctaLink: "/contact",
    popular: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations",
    icon: Building2,
    color: "from-emerald-500 to-green-500",
    features: [
      "Everything in Team",
      "Unlimited AI queries",
      "SSO/SAML integration",
      "Custom deployment",
      "SLA guarantee",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    ctaLink: "/contact",
    popular: false,
  },
];

export function Pricing() {
  return (
    <section className="py-32 bg-zinc-950 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-size-[64px_64px]" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-400 mb-6"
          >
            <Sparkles className="w-4 h-4 text-violet-400" />
            Simple, transparent pricing
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            Start free,{" "}
            <span className="bg-clip-text text-transparent bg-linear-to-r from-violet-400 to-fuchsia-400">
              scale as you grow
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-zinc-400"
          >
            No credit card required. Upgrade anytime. Cancel anytime.
          </motion.p>
        </div>

        {/* Pricing grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-6 rounded-2xl border transition-all ${
                tier.popular
                  ? "bg-zinc-900 border-violet-500/50 shadow-lg shadow-violet-500/10"
                  : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-linear-to-r from-violet-600 to-fuchsia-600 text-xs font-medium text-white">
                  Most Popular
                </div>
              )}
              
              <div className={`w-10 h-10 rounded-lg bg-linear-to-br ${tier.color} flex items-center justify-center mb-4`}>
                <tier.icon className="w-5 h-5 text-white" />
              </div>
              
              <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
              <p className="text-sm text-zinc-500 mb-4">{tier.description}</p>
              
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-bold">{tier.price}</span>
                {tier.period && <span className="text-zinc-500 text-sm">{tier.period}</span>}
              </div>
              
              <ul className="space-y-3 mb-6">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-zinc-400">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              
              <Link
                href={tier.ctaLink}
                className={`block w-full py-3 rounded-xl font-medium text-center transition-all ${
                  tier.popular
                    ? "bg-linear-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                {tier.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* FAQ teaser */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <p className="text-zinc-500">
            Have questions?{" "}
            <Link href="/faq" className="text-violet-400 hover:text-violet-300 transition-colors">
              Check our FAQ
            </Link>
            {" "}or{" "}
            <Link href="/contact" className="text-violet-400 hover:text-violet-300 transition-colors">
              contact us
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
