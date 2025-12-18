/**
 * Model Registry - Maps AI models to subscription tiers
 */

import type { ModelConfig, ModelTier } from "./types";

// Available models with tier restrictions
export const MODEL_REGISTRY: ModelConfig[] = [
  // Free tier models (fast, cheap)
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    description: "Fast and efficient for everyday tasks",
    contextWindow: 128000,
    maxOutput: 16384,
    supportsTools: true,
    supportsStreaming: true,
    tiers: ["free", "pro", "pro_plus"],
  },
  {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    provider: "anthropic",
    description: "Quick responses for simple tasks",
    contextWindow: 200000,
    maxOutput: 4096,
    supportsTools: true,
    supportsStreaming: true,
    tiers: ["free", "pro", "pro_plus"],
  },

  // Pro tier models (balanced)
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    description: "Advanced reasoning and analysis",
    contextWindow: 128000,
    maxOutput: 16384,
    supportsTools: true,
    supportsStreaming: true,
    tiers: ["pro", "pro_plus"],
  },
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    description: "Best for coding and complex reasoning",
    contextWindow: 200000,
    maxOutput: 8192,
    supportsTools: true,
    supportsStreaming: true,
    tiers: ["pro", "pro_plus"],
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "google",
    description: "Google's advanced multimodal model",
    contextWindow: 1000000,
    maxOutput: 8192,
    supportsTools: true,
    supportsStreaming: true,
    tiers: ["pro", "pro_plus"],
  },

  // Pro+ tier models (premium, reasoning)
  {
    id: "o1-mini",
    name: "o1-mini",
    provider: "openai",
    description: "Advanced reasoning model for complex problems",
    contextWindow: 128000,
    maxOutput: 65536,
    supportsTools: false, // o1 doesn't support tools yet
    supportsStreaming: true,
    tiers: ["pro_plus"],
  },
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet (Latest)",
    provider: "anthropic",
    description: "Most capable Claude model",
    contextWindow: 200000,
    maxOutput: 8192,
    supportsTools: true,
    supportsStreaming: true,
    tiers: ["pro_plus"],
  },
];

/**
 * Get available models for a user's tier
 */
export function getModelsForTier(tier: ModelTier): ModelConfig[] {
  return MODEL_REGISTRY.filter((model) => model.tiers.includes(tier));
}

/**
 * Get a specific model by ID
 */
export function getModelById(modelId: string): ModelConfig | undefined {
  return MODEL_REGISTRY.find((model) => model.id === modelId);
}

/**
 * Get the default model for a tier
 */
export function getDefaultModel(tier: ModelTier): ModelConfig {
  const models = getModelsForTier(tier);
  // Return the first model (which should be the most balanced for that tier)
  return models[0] || MODEL_REGISTRY[0];
}

/**
 * Check if a model is available for a tier
 */
export function isModelAvailable(modelId: string, tier: ModelTier): boolean {
  const model = getModelById(modelId);
  if (!model) return false;
  return model.tiers.includes(tier);
}

/**
 * Get tier limits
 */
export function getTierLimits(tier: ModelTier) {
  const limits = {
    free: {
      aiQueriesPerMonth: 50,
      aiEmbeddingsPerMonth: 100,
      maxPlugins: 5,
    },
    pro: {
      aiQueriesPerMonth: 1000,
      aiEmbeddingsPerMonth: 5000,
      maxPlugins: 50,
    },
    pro_plus: {
      aiQueriesPerMonth: 10000,
      aiEmbeddingsPerMonth: 50000,
      maxPlugins: -1, // unlimited
    },
  };
  return limits[tier];
}

