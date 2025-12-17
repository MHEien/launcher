import { createDb, usageRecords, usageAggregates, sql } from "@launcher/db";

const db = createDb(process.env.DATABASE_URL!);

export type UsageType = "ai_query" | "ai_embedding" | "plugin_install" | "search";

export async function trackUsage(
  userId: string,
  type: UsageType,
  count: number = 1,
  metadata?: Record<string, unknown>
) {
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
    ai_query: "ai_queries",
    ai_embedding: "ai_embeddings",
    plugin_install: "plugin_installs",
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

export async function getMonthlyUsage(userId: string) {
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

export async function checkUsageLimit(
  userId: string,
  type: UsageType,
  tierLimits: { aiQueriesPerMonth: number; aiEmbeddingsPerMonth: number; maxPlugins: number }
) {
  const usage = await getMonthlyUsage(userId);

  switch (type) {
    case "ai_query":
      if (tierLimits.aiQueriesPerMonth === -1) return { allowed: true, remaining: -1 };
      return {
        allowed: usage.aiQueries < tierLimits.aiQueriesPerMonth,
        remaining: Math.max(0, tierLimits.aiQueriesPerMonth - usage.aiQueries),
      };
    case "ai_embedding":
      if (tierLimits.aiEmbeddingsPerMonth === -1) return { allowed: true, remaining: -1 };
      return {
        allowed: usage.aiEmbeddings < tierLimits.aiEmbeddingsPerMonth,
        remaining: Math.max(0, tierLimits.aiEmbeddingsPerMonth - usage.aiEmbeddings),
      };
    default:
      return { allowed: true, remaining: -1 };
  }
}
