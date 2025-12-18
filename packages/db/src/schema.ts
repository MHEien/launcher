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

// Plugin status enum
export const pluginStatusEnum = pgEnum("plugin_status", [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "deprecated",
]);

// Plugin build status enum
export const buildStatusEnum = pgEnum("build_status", [
  "pending",
  "building",
  "success",
  "failed",
]);

// Plugins table (for marketplace)
export const plugins = pgTable("plugins", {
  id: varchar("id", { length: 255 }).primaryKey(), // Unique slug e.g. "clipboard-history"
  name: varchar("name", { length: 255 }).notNull(),
  authorId: text("author_id"), // References neon_auth.users_sync.id
  authorName: varchar("author_name", { length: 255 }),
  description: text("description"),
  longDescription: text("long_description"),
  iconUrl: text("icon_url"),
  bannerUrl: text("banner_url"),
  homepage: text("homepage"),
  repository: text("repository"),
  license: varchar("license", { length: 50 }),
  categories: jsonb("categories").$type<string[]>().default([]),
  tags: jsonb("tags").$type<string[]>().default([]),
  downloads: integer("downloads").default(0).notNull(),
  weeklyDownloads: integer("weekly_downloads").default(0).notNull(),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  ratingCount: integer("rating_count").default(0).notNull(),
  verified: boolean("verified").default(false),
  featured: boolean("featured").default(false),
  status: pluginStatusEnum("status").default("draft").notNull(),
  currentVersion: varchar("current_version", { length: 50 }),
  // GitHub integration fields
  githubRepoId: integer("github_repo_id"),
  githubRepoFullName: text("github_repo_full_name"), // e.g., "owner/repo"
  githubWebhookId: integer("github_webhook_id"),
  githubDefaultBranch: varchar("github_default_branch", { length: 100 }),
  githubPluginPath: text("github_plugin_path"), // For monorepos, e.g., "packages/my-plugin"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"),
});

// Plugin versions table - stores all versions of a plugin
export const pluginVersions = pgTable("plugin_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  pluginId: varchar("plugin_id", { length: 255 })
    .references(() => plugins.id, { onDelete: "cascade" })
    .notNull(),
  version: varchar("version", { length: 50 }).notNull(), // semver e.g. "1.0.0"
  downloadUrl: text("download_url").notNull(), // Vercel Blob URL
  checksum: varchar("checksum", { length: 128 }), // SHA256 hash
  fileSize: integer("file_size"), // bytes
  permissions: jsonb("permissions").$type<string[]>().default([]),
  aiToolSchemas: jsonb("ai_tool_schemas").$type<Record<string, unknown>>().default({}),
  minLauncherVersion: varchar("min_launcher_version", { length: 50 }),
  changelog: text("changelog"),
  downloads: integer("downloads").default(0).notNull(),
  isLatest: boolean("is_latest").default(false).notNull(),
  isPrerelease: boolean("is_prerelease").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"),
});

// Plugin categories table - predefined categories
export const pluginCategories = pgTable("plugin_categories", {
  id: varchar("id", { length: 50 }).primaryKey(), // slug e.g. "productivity"
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  iconName: varchar("icon_name", { length: 50 }), // Lucide icon name
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  helpful: integer("helpful").default(0).notNull(), // Helpful votes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Plugin download history - for analytics
export const pluginDownloads = pgTable("plugin_downloads", {
  id: uuid("id").primaryKey().defaultRandom(),
  pluginId: varchar("plugin_id", { length: 255 })
    .references(() => plugins.id, { onDelete: "cascade" })
    .notNull(),
  versionId: uuid("version_id")
    .references(() => pluginVersions.id, { onDelete: "cascade" }),
  userId: text("user_id"), // Optional - anonymous downloads allowed
  ipHash: varchar("ip_hash", { length: 64 }), // Hashed IP for deduplication
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Plugin builds - tracks build history from GitHub releases
export const pluginBuilds = pgTable("plugin_builds", {
  id: uuid("id").primaryKey().defaultRandom(),
  pluginId: varchar("plugin_id", { length: 255 })
    .references(() => plugins.id, { onDelete: "cascade" })
    .notNull(),
  versionId: uuid("version_id")
    .references(() => pluginVersions.id, { onDelete: "set null" }),
  version: varchar("version", { length: 50 }).notNull(), // Target version e.g., "1.0.0"
  status: buildStatusEnum("status").default("pending").notNull(),
  // GitHub release info
  githubReleaseId: integer("github_release_id"),
  githubReleaseTag: varchar("github_release_tag", { length: 100 }),
  githubReleaseName: text("github_release_name"),
  tarballUrl: text("tarball_url"),
  // Build output
  logs: text("logs"),
  errorMessage: text("error_message"),
  // Timing
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pluginRatingsRelations = relations(pluginRatings, ({ one }) => ({
  plugin: one(plugins, {
    fields: [pluginRatings.pluginId],
    references: [plugins.id],
  }),
  userProfile: one(userProfiles, {
    fields: [pluginRatings.userId],
    references: [userProfiles.userId],
  }),
}));

export const pluginDownloadsRelations = relations(pluginDownloads, ({ one }) => ({
  plugin: one(plugins, {
    fields: [pluginDownloads.pluginId],
    references: [plugins.id],
  }),
  version: one(pluginVersions, {
    fields: [pluginDownloads.versionId],
    references: [pluginVersions.id],
  }),
}));

export const pluginBuildsRelations = relations(pluginBuilds, ({ one }) => ({
  plugin: one(plugins, {
    fields: [pluginBuilds.pluginId],
    references: [plugins.id],
  }),
  version: one(pluginVersions, {
    fields: [pluginBuilds.versionId],
    references: [pluginVersions.id],
  }),
}));

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
  versions: many(pluginVersions),
  installedBy: many(userPlugins),
  ratings: many(pluginRatings),
  builds: many(pluginBuilds),
}));

export const pluginVersionsRelations = relations(pluginVersions, ({ one }) => ({
  plugin: one(plugins, {
    fields: [pluginVersions.pluginId],
    references: [plugins.id],
  }),
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

// Platform enum for releases
export const platformEnum = pgEnum("platform", [
  "windows",
  "macos",
  "macos_arm",
  "linux",
  "linux_appimage",
  "linux_deb",
]);

// Release channel enum
export const releaseChannelEnum = pgEnum("release_channel", [
  "stable",
  "beta",
  "alpha",
]);

// App releases table - stores download links for each version/platform
export const releases = pgTable("releases", {
  id: uuid("id").primaryKey().defaultRandom(),
  version: varchar("version", { length: 50 }).notNull(), // semver e.g. "1.0.0"
  platform: platformEnum("platform").notNull(),
  channel: releaseChannelEnum("channel").default("stable").notNull(),
  downloadUrl: text("download_url").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size"), // bytes
  checksum: varchar("checksum", { length: 128 }), // SHA256
  signature: text("signature"), // For auto-update verification
  releaseNotes: text("release_notes"),
  minOsVersion: varchar("min_os_version", { length: 50 }),
  isLatest: boolean("is_latest").default(false).notNull(),
  isDeprecated: boolean("is_deprecated").default(false).notNull(),
  downloads: integer("downloads").default(0).notNull(),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Release assets - additional files per release (e.g., updater files, signatures)
export const releaseAssets = pgTable("release_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  releaseId: uuid("release_id")
    .references(() => releases.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  downloadUrl: text("download_url").notNull(),
  fileSize: integer("file_size"),
  contentType: varchar("content_type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations for releases
export const releasesRelations = relations(releases, ({ many }) => ({
  assets: many(releaseAssets),
}));

export const releaseAssetsRelations = relations(releaseAssets, ({ one }) => ({
  release: one(releases, {
    fields: [releaseAssets.releaseId],
    references: [releases.id],
  }),
}));
