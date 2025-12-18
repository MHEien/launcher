/**
 * Usage tracking for AI queries and other metered features
 */

import { getDb, usageRecords, usageAggregates, subscriptions, sql } from "./db";
import type { ModelTier } from "./ai/types";

export type UsageType = "ai_query" | "ai_embedding" | "plugin_install" | "search";

// Tier limits configuration (single source of truth for server)
export const TIER_LIMITS = {
  free: {
    aiQueriesPerMonth: 10,
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
} as const;

/**
 * Get tier limits for a subscription tier
 */
export function getTierLimits(tier: ModelTier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

/**
 * Track usage for a user
 */
export async function trackUsage(
  userId: string,
  type: UsageType,
  count: number = 1,
  metadata?: Record<string, unknown>
): Promise<void> {
  const db = getDb();

  // Insert usage record
  await db.insert(usageRecords).values({
    userId,
    type,
    count,
    metadata: metadata || null,
  });

  // Update monthly aggregate
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM format

  const columnMap: Record<UsageType, string> = {
    ai_query: "aiQueries",
    ai_embedding: "aiEmbeddings",
    plugin_install: "pluginInstalls",
    search: "searches",
  };

  const column = columnMap[type];

  // Upsert the aggregate
  await db
    .insert(usageAggregates)
    .values({
      userId,
      month,
      aiQueries: type === "ai_query" ? count : 0,
      aiEmbeddings: type === "ai_embedding" ? count : 0,
      pluginInstalls: type === "plugin_install" ? count : 0,
      searches: type === "search" ? count : 0,
    })
    .onConflictDoUpdate({
      target: [usageAggregates.userId, usageAggregates.month],
      set: {
        [column]: sql`${usageAggregates[column as keyof typeof usageAggregates]} + ${count}`,
        updatedAt: new Date(),
      },
    });
}

/**
 * Get monthly usage for a user
 */
export async function getMonthlyUsage(userId: string) {
  const db = getDb();
  const month = new Date().toISOString().slice(0, 7);

  const aggregate = await db.query.usageAggregates.findFirst({
    where: (agg, { eq, and }) => and(eq(agg.userId, userId), eq(agg.month, month)),
  });

  return {
    aiQueries: aggregate?.aiQueries || 0,
    aiEmbeddings: aggregate?.aiEmbeddings || 0,
    pluginInstalls: aggregate?.pluginInstalls || 0,
    searches: aggregate?.searches || 0,
    month,
  };
}

/**
 * Check if user has remaining quota for a usage type
 */
export async function checkUsageLimit(
  userId: string,
  type: UsageType,
  tier: ModelTier
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const usage = await getMonthlyUsage(userId);
  const limits = getTierLimits(tier);

  switch (type) {
    case "ai_query": {
      const limit = limits.aiQueriesPerMonth as number;
      if (limit === -1) return { allowed: true, remaining: -1, limit: -1 };
      const remaining = Math.max(0, limit - usage.aiQueries);
      return {
        allowed: usage.aiQueries < limit,
        remaining,
        limit,
      };
    }
    case "ai_embedding": {
      const limit = limits.aiEmbeddingsPerMonth as number;
      if (limit === -1) return { allowed: true, remaining: -1, limit: -1 };
      const remaining = Math.max(0, limit - usage.aiEmbeddings);
      return {
        allowed: usage.aiEmbeddings < limit,
        remaining,
        limit,
      };
    }
    default:
      return { allowed: true, remaining: -1, limit: -1 };
  }
}

/**
 * Get user's subscription tier from database
 */
export async function getUserTier(userId: string): Promise<ModelTier> {
  const db = getDb();
  
  // Use query builder with subscriptions table
  const results = await db.select().from(subscriptions).where(
    sql`${subscriptions.userId} = ${userId}`
  ).limit(1);
  
  const subscription = results[0];
  return (subscription?.tier as ModelTier) || "free";
}

