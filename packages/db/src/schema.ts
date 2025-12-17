import {
  pgTable,
  pgSchema,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
  varchar,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Neon Auth schema - users are managed by Neon Auth
export const neonAuthSchema = pgSchema("neon_auth");

// Reference to Neon Auth users table (read-only, managed by Neon Auth)
export const neonAuthUsers = neonAuthSchema.table("users_sync", {
  id: text("id").primaryKey(),
  email: text("email"),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  deletedAt: timestamp("deleted_at"),
});

// Enums
export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "free",
  "pro",
  "pro_plus",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
]);

export const usageTypeEnum = pgEnum("usage_type", [
  "ai_query",
  "ai_embedding",
  "plugin_install",
  "search",
]);

// User profiles - extends Neon Auth users with app-specific data
export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id").primaryKey(), // References neon_auth.users_sync.id
  settings: jsonb("settings").$type<UserSettings>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export interface UserSettings {
  theme?: "light" | "dark" | "system";
  notifications?: boolean;
  newsletter?: boolean;
  defaultSearchProvider?: string;
}

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // References neon_auth.users_sync.id
  tier: subscriptionTierEnum("tier").default("free").notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Usage tracking table
export const usageRecords = pgTable("usage_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // References neon_auth.users_sync.id
  type: usageTypeEnum("type").notNull(),
  count: integer("count").default(1).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Monthly usage aggregates for quick lookups
export const usageAggregates = pgTable("usage_aggregates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // References neon_auth.users_sync.id
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM format
  aiQueries: integer("ai_queries").default(0).notNull(),
  aiEmbeddings: integer("ai_embeddings").default(0).notNull(),
  pluginInstalls: integer("plugin_installs").default(0).notNull(),
  searches: integer("searches").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Plugins table (for marketplace)
export const plugins = pgTable("plugins", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  version: varchar("version", { length: 50 }).notNull(),
  authorId: text("author_id"), // References neon_auth.users_sync.id
  authorName: varchar("author_name", { length: 255 }),
  description: text("description"),
  longDescription: text("long_description"),
  homepage: text("homepage"),
  repository: text("repository"),
  downloadUrl: text("download_url").notNull(),
  checksum: varchar("checksum", { length: 128 }),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  categories: jsonb("categories").$type<string[]>().default([]),
  downloads: integer("downloads").default(0).notNull(),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  ratingCount: integer("rating_count").default(0).notNull(),
  verified: boolean("verified").default(false),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"),
});

// User installed plugins
export const userPlugins = pgTable("user_plugins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // References neon_auth.users_sync.id
  pluginId: varchar("plugin_id", { length: 255 })
    .references(() => plugins.id, { onDelete: "cascade" })
    .notNull(),
  installedVersion: varchar("installed_version", { length: 50 }).notNull(),
  enabled: boolean("enabled").default(true),
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}),
  installedAt: timestamp("installed_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Plugin ratings/reviews
export const pluginRatings = pgTable("plugin_ratings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // References neon_auth.users_sync.id
  pluginId: varchar("plugin_id", { length: 255 })
    .references(() => plugins.id, { onDelete: "cascade" })
    .notNull(),
  rating: integer("rating").notNull(), // 1-5
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// API keys for desktop app sync
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(), // References neon_auth.users_sync.id
  name: varchar("name", { length: 255 }).notNull(),
  keyHash: varchar("key_hash", { length: 255 }).notNull(),
  keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations - using userProfiles as the main user reference
export const userProfilesRelations = relations(userProfiles, ({ one, many }) => ({
  subscription: one(subscriptions, {
    fields: [userProfiles.userId],
    references: [subscriptions.userId],
  }),
  usageRecords: many(usageRecords),
  usageAggregates: many(usageAggregates),
  installedPlugins: many(userPlugins),
  pluginRatings: many(pluginRatings),
  apiKeys: many(apiKeys),
  authoredPlugins: many(plugins),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [subscriptions.userId],
    references: [userProfiles.userId],
  }),
}));

export const pluginsRelations = relations(plugins, ({ one, many }) => ({
  author: one(userProfiles, {
    fields: [plugins.authorId],
    references: [userProfiles.userId],
  }),
  installedBy: many(userPlugins),
  ratings: many(pluginRatings),
}));

export const userPluginsRelations = relations(userPlugins, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [userPlugins.userId],
    references: [userProfiles.userId],
  }),
  plugin: one(plugins, {
    fields: [userPlugins.pluginId],
    references: [plugins.id],
  }),
}));

// Subscription tier limits
export const TIER_LIMITS = {
  free: {
    aiQueriesPerMonth: 50,
    aiEmbeddingsPerMonth: 100,
    maxPlugins: 5,
    features: ["basic_search", "calculator", "apps"],
  },
  pro: {
    aiQueriesPerMonth: 1000,
    aiEmbeddingsPerMonth: 5000,
    maxPlugins: 50,
    features: ["basic_search", "calculator", "apps", "ai_search", "ai_commands", "cloud_sync"],
  },
  pro_plus: {
    aiQueriesPerMonth: 10000,
    aiEmbeddingsPerMonth: 50000,
    maxPlugins: -1,
    features: ["basic_search", "calculator", "apps", "ai_search", "ai_commands", "cloud_sync", "team_sharing", "admin_dashboard", "priority_support"],
  },
} as const;

export type SubscriptionTier = keyof typeof TIER_LIMITS;
