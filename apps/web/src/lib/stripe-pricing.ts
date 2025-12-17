"use server";

import Stripe from "stripe";
import { PRICING_TIERS, STRIPE_PRODUCT_IDS, type PricingTierConfig } from "./pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export interface StripePricingData {
  tiers: Record<string, PricingTierConfig>;
  lastFetched: number;
}

// Cache for pricing data (5 minute TTL)
let pricingCache: StripePricingData | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fetch pricing data from Stripe and merge with static config
export async function getStripePricing(): Promise<Record<string, PricingTierConfig>> {
  // Check cache
  if (pricingCache && Date.now() - pricingCache.lastFetched < CACHE_TTL) {
    return pricingCache.tiers;
  }

  try {
    // Start with static pricing as base
    const tiers: Record<string, PricingTierConfig> = { ...PRICING_TIERS };

    // Fetch Pro product
    const proProduct = await stripe.products.retrieve(STRIPE_PRODUCT_IDS.pro);
    const proPrices = await stripe.prices.list({
      product: STRIPE_PRODUCT_IDS.pro,
      active: true,
    });

    // Fetch Pro+ product
    const proPlusProduct = await stripe.products.retrieve(STRIPE_PRODUCT_IDS.pro_plus);
    const proPlusPrices = await stripe.prices.list({
      product: STRIPE_PRODUCT_IDS.pro_plus,
      active: true,
    });

    // Update Pro tier from Stripe
    const proMonthlyPrice = proPrices.data.find((p) => p.recurring?.interval === "month");
    const proYearlyPrice = proPrices.data.find((p) => p.recurring?.interval === "year");

    if (proProduct && proMonthlyPrice) {
      tiers.pro = {
        ...tiers.pro,
        name: proProduct.name,
        description: proProduct.description || tiers.pro.description,
        monthlyPrice: (proMonthlyPrice.unit_amount || 0) / 100,
        yearlyPrice: proYearlyPrice ? (proYearlyPrice.unit_amount || 0) / 100 : ((proMonthlyPrice.unit_amount || 0) / 100) * 10,
        priceId: {
          monthly: proMonthlyPrice.id,
          yearly: proYearlyPrice?.id,
        },
        features: proProduct.metadata.features?.split(",") || tiers.pro.features,
        limits: {
          aiQueriesPerMonth: parseInt(proProduct.metadata.ai_queries_per_month || "1000"),
          aiEmbeddingsPerMonth: parseInt(proProduct.metadata.ai_embeddings_per_month || "5000"),
          maxPlugins: parseInt(proProduct.metadata.max_plugins || "50"),
        },
      };
    }

    // Update Pro+ tier from Stripe
    const proPlusMonthlyPrice = proPlusPrices.data.find((p) => p.recurring?.interval === "month");
    const proPlusYearlyPrice = proPlusPrices.data.find((p) => p.recurring?.interval === "year");

    if (proPlusProduct && proPlusMonthlyPrice) {
      tiers.pro_plus = {
        ...tiers.pro_plus,
        name: proPlusProduct.name,
        description: proPlusProduct.description || tiers.pro_plus.description,
        monthlyPrice: (proPlusMonthlyPrice.unit_amount || 0) / 100,
        yearlyPrice: proPlusYearlyPrice ? (proPlusYearlyPrice.unit_amount || 0) / 100 : ((proPlusMonthlyPrice.unit_amount || 0) / 100) * 10,
        priceId: {
          monthly: proPlusMonthlyPrice.id,
          yearly: proPlusYearlyPrice?.id,
        },
        features: proPlusProduct.metadata.features?.split(",") || tiers.pro_plus.features,
        limits: {
          aiQueriesPerMonth: parseInt(proPlusProduct.metadata.ai_queries_per_month || "10000"),
          aiEmbeddingsPerMonth: parseInt(proPlusProduct.metadata.ai_embeddings_per_month || "50000"),
          maxPlugins: parseInt(proPlusProduct.metadata.max_plugins || "-1"),
        },
      };
    }

    // Update cache
    pricingCache = {
      tiers,
      lastFetched: Date.now(),
    };

    return tiers;
  } catch (error) {
    console.error("Error fetching Stripe pricing:", error);
    // Return static pricing as fallback
    return PRICING_TIERS;
  }
}

// Get limits for a specific tier (fetches from Stripe if needed)
export async function getTierLimitsFromStripe(tier: string) {
  const pricing = await getStripePricing();
  return pricing[tier]?.limits ?? PRICING_TIERS.free.limits;
}
