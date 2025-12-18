// Pricing configuration - shared between client and server
// This file does NOT have "use server" so it can export objects

// Stripe Product IDs
export const STRIPE_PRODUCT_IDS = {
  pro: "prod_TccMqCLWhM5L7S",
  pro_plus: "prod_TcdUSMqgFUVScM",
} as const;

// Stripe Price IDs (fetched from Stripe, monthly only for now)
export const STRIPE_PRICE_IDS = {
  pro_monthly: "price_1SfN7iRrtp1VYWo7AEvSbupe",
  pro_plus_monthly: "price_1SfODFRrtp1VYWo7O4AbqFIj",
} as const;

// Tier limits interface
export interface TierLimits {
  aiQueriesPerMonth: number;
  aiEmbeddingsPerMonth: number;
  maxPlugins: number;
}

// Pricing tier interface
export interface PricingTierConfig {
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  productId?: string;
  priceId?: {
    monthly: string;
    yearly?: string;
  };
  features: string[];
  limits: TierLimits;
}

// Static pricing configuration (Free tier + fallback for paid tiers)
// Paid tier details are fetched from Stripe at runtime
export const PRICING_TIERS: Record<string, PricingTierConfig> = {
  free: {
    name: "Free",
    description: "Perfect for trying out Launcher",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "10 AI queries/month",
      "5 plugins max",
      "Basic search",
      "Calculator & Apps",
      "Community support",
    ],
    limits: {
      aiQueriesPerMonth: 10,
      aiEmbeddingsPerMonth: 100,
      maxPlugins: 5,
    },
  },
  pro: {
    name: "Pro",
    description: "For power users who need more",
    monthlyPrice: 50,
    yearlyPrice: 500,
    productId: STRIPE_PRODUCT_IDS.pro,
    priceId: {
      monthly: STRIPE_PRICE_IDS.pro_monthly,
    },
    features: [
      "1,000 AI queries/month",
      "50 plugins max",
      "AI-powered search",
      "AI commands",
      "Cloud sync",
      "Priority support",
    ],
    limits: {
      aiQueriesPerMonth: 1000,
      aiEmbeddingsPerMonth: 5000,
      maxPlugins: 50,
    },
  },
  pro_plus: {
    name: "Pro+",
    description: "For power users and teams",
    monthlyPrice: 150,
    yearlyPrice: 1500,
    productId: STRIPE_PRODUCT_IDS.pro_plus,
    priceId: {
      monthly: STRIPE_PRICE_IDS.pro_plus_monthly,
    },
    features: [
      "10,000 AI queries/month",
      "Unlimited plugins",
      "Everything in Pro",
      "Team sharing",
      "Admin dashboard",
      "Priority support",
    ],
    limits: {
      aiQueriesPerMonth: 10000,
      aiEmbeddingsPerMonth: 50000,
      maxPlugins: -1,
    },
  },
};

export type PricingTier = "free" | "pro" | "pro_plus";
export type BillingInterval = "monthly" | "yearly";

// Helper to get tier limits (used for usage checking)
export function getTierLimits(tier: PricingTier): TierLimits {
  return PRICING_TIERS[tier]?.limits ?? PRICING_TIERS.free.limits;
}

// Helper to check if a tier is paid
export function isPaidTier(tier: PricingTier): boolean {
  return tier !== "free";
}
