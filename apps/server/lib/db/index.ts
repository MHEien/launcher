/**
 * Database connection for the server
 */

import { createDb, type Database } from "@launcher/db";

// Singleton database instance
let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    db = createDb(databaseUrl);
  }
  return db;
}

export { type Database };

// Re-export schema tables and utilities from @launcher/db
export {
  plugins,
  pluginVersions,
  pluginBuilds,
  pluginRatings,
  pluginDownloads,
  pluginCategories,
  userPlugins,
  usageRecords,
  usageAggregates,
  subscriptions,
  eq,
  and,
  or,
  desc,
  asc,
  sql,
} from "@launcher/db";

