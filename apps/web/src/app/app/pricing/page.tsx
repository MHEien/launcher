"use client";

import { useState, useEffect } from "react";
import { useUser } from "@stackframe/stack";
import { Header } from "@/components/header";
import { PRICING_TIERS, type PricingTierConfig, type BillingInterval } from "@/lib/pricing";

// Order of tiers for display
const TIER_ORDER = ["free", "pro", "pro_plus"] as const;

export default function PricingPage() {
  const user = useUser();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [tiers, setTiers] = useState<Record<string, PricingTierConfig>>(PRICING_TIERS);

  // Fetch pricing from Stripe on mount
  useEffect(() => {
    async function fetchPricing() {
      try {
        const res = await fetch("/api/stripe/pricing");
        if (res.ok) {
          const data = await res.json();
          setTiers(data.tiers);
        }
      } catch (error) {
        console.error("Failed to fetch pricing:", error);
      }
    }
    fetchPricing();
  }, []);

  const handleSubscribe = async (tier: string) => {
    if (!user) {
      window.location.href = "/handler/sign-in?after_auth_return_to=/app/pricing";
      return;
    }

    if (tier === "free") return;

    setLoading(tier);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval: billingInterval }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Header />

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <span className={billingInterval === "monthly" ? "text-white" : "text-zinc-500"}>
              Monthly
            </span>
            <button
              onClick={() => setBillingInterval(billingInterval === "monthly" ? "yearly" : "monthly")}
              className="relative w-12 h-6 bg-zinc-800 rounded-full transition-colors"
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-violet-500 rounded-full transition-transform duration-200 ${
                  billingInterval === "yearly" ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <span className={billingInterval === "yearly" ? "text-white" : "text-zinc-500"}>
              Yearly
              <span className="ml-2 text-xs text-green-400 font-medium">Save 17%</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIER_ORDER.map((key) => {
            const tier = tiers[key];
            if (!tier) return null;

            const price = billingInterval === "monthly" ? tier.monthlyPrice : tier.yearlyPrice;
            const isPopular = key === "pro";
            const isFree = key === "free";
            const isProPlus = key === "pro_plus";

            return (
              <div
                key={key}
                className={`relative bg-zinc-900 border rounded-xl p-6 flex flex-col ${
                  isPopular ? "border-violet-500 ring-1 ring-violet-500" : "border-zinc-800"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}

                <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                <p className="text-zinc-400 text-sm mb-4">{tier.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold">${price}</span>
                  {!isFree && (
                    <span className="text-zinc-500">
                      /{billingInterval === "monthly" ? "mo" : "yr"}
                    </span>
                  )}
                </div>

                <ul className="space-y-3 mb-6 grow">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <svg
                        className="w-5 h-5 text-green-400 shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(key)}
                  disabled={loading === key}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    isPopular
                      ? "bg-violet-500 hover:bg-violet-600 text-white"
                      : isProPlus
                      ? "bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                      : "bg-zinc-800 hover:bg-zinc-700 text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === key ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Processing...
                    </span>
                  ) : isFree ? (
                    "Get Started"
                  ) : (
                    "Subscribe"
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="font-semibold mb-2">Can I change plans later?</h3>
              <p className="text-zinc-400 text-sm">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="font-semibold mb-2">What happens if I exceed my limits?</h3>
              <p className="text-zinc-400 text-sm">
                You&apos;ll receive a notification when you&apos;re close to your limits. You can upgrade or wait for the next billing cycle.
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="font-semibold mb-2">Is there a free trial?</h3>
              <p className="text-zinc-400 text-sm">
                The Free tier is always available. Pro and Team plans include a 14-day free trial.
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="font-semibold mb-2">How do I cancel?</h3>
              <p className="text-zinc-400 text-sm">
                You can cancel anytime from your dashboard. You&apos;ll keep access until the end of your billing period.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
