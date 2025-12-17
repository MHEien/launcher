"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIER_LIMITS = exports.userPluginsRelations = exports.pluginsRelations = exports.subscriptionsRelations = exports.userProfilesRelations = exports.apiKeys = exports.pluginRatings = exports.userPlugins = exports.plugins = exports.usageAggregates = exports.usageRecords = exports.subscriptions = exports.userProfiles = exports.usageTypeEnum = exports.subscriptionStatusEnum = exports.subscriptionTierEnum = exports.neonAuthUsers = exports.neonAuthSchema = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var drizzle_orm_1 = require("drizzle-orm");
// Neon Auth schema - users are managed by Neon Auth
exports.neonAuthSchema = (0, pg_core_1.pgSchema)("neon_auth");
// Reference to Neon Auth users table (read-only, managed by Neon Auth)
exports.neonAuthUsers = exports.neonAuthSchema.table("users_sync", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    email: (0, pg_core_1.text)("email"),
    name: (0, pg_core_1.text)("name"),
    image: (0, pg_core_1.text)("image"),
    createdAt: (0, pg_core_1.timestamp)("created_at"),
    updatedAt: (0, pg_core_1.timestamp)("updated_at"),
    deletedAt: (0, pg_core_1.timestamp)("deleted_at"),
});
// Enums
exports.subscriptionTierEnum = (0, pg_core_1.pgEnum)("subscription_tier", [
    "free",
    "pro",
    "team",
    "enterprise",
]);
exports.subscriptionStatusEnum = (0, pg_core_1.pgEnum)("subscription_status", [
    "active",
    "canceled",
    "past_due",
    "trialing",
]);
exports.usageTypeEnum = (0, pg_core_1.pgEnum)("usage_type", [
    "ai_query",
    "ai_embedding",
    "plugin_install",
    "search",
]);
// User profiles - extends Neon Auth users with app-specific data
exports.userProfiles = (0, pg_core_1.pgTable)("user_profiles", {
    userId: (0, pg_core_1.text)("user_id").primaryKey(), // References neon_auth.users_sync.id
    settings: (0, pg_core_1.jsonb)("settings").$type().default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// Subscriptions table
exports.subscriptions = (0, pg_core_1.pgTable)("subscriptions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.text)("user_id").notNull(), // References neon_auth.users_sync.id
    tier: (0, exports.subscriptionTierEnum)("tier").default("free").notNull(),
    status: (0, exports.subscriptionStatusEnum)("status").default("active").notNull(),
    stripeCustomerId: (0, pg_core_1.varchar)("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: (0, pg_core_1.varchar)("stripe_subscription_id", { length: 255 }),
    currentPeriodStart: (0, pg_core_1.timestamp)("current_period_start"),
    currentPeriodEnd: (0, pg_core_1.timestamp)("current_period_end"),
    cancelAtPeriodEnd: (0, pg_core_1.boolean)("cancel_at_period_end").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// Usage tracking table
exports.usageRecords = (0, pg_core_1.pgTable)("usage_records", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.text)("user_id").notNull(), // References neon_auth.users_sync.id
    type: (0, exports.usageTypeEnum)("type").notNull(),
    count: (0, pg_core_1.integer)("count").default(1).notNull(),
    metadata: (0, pg_core_1.jsonb)("metadata").$type(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Monthly usage aggregates for quick lookups
exports.usageAggregates = (0, pg_core_1.pgTable)("usage_aggregates", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.text)("user_id").notNull(), // References neon_auth.users_sync.id
    month: (0, pg_core_1.varchar)("month", { length: 7 }).notNull(), // YYYY-MM format
    aiQueries: (0, pg_core_1.integer)("ai_queries").default(0).notNull(),
    aiEmbeddings: (0, pg_core_1.integer)("ai_embeddings").default(0).notNull(),
    pluginInstalls: (0, pg_core_1.integer)("plugin_installs").default(0).notNull(),
    searches: (0, pg_core_1.integer)("searches").default(0).notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// Plugins table (for marketplace)
exports.plugins = (0, pg_core_1.pgTable)("plugins", {
    id: (0, pg_core_1.varchar)("id", { length: 255 }).primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    version: (0, pg_core_1.varchar)("version", { length: 50 }).notNull(),
    authorId: (0, pg_core_1.text)("author_id"), // References neon_auth.users_sync.id
    authorName: (0, pg_core_1.varchar)("author_name", { length: 255 }),
    description: (0, pg_core_1.text)("description"),
    longDescription: (0, pg_core_1.text)("long_description"),
    homepage: (0, pg_core_1.text)("homepage"),
    repository: (0, pg_core_1.text)("repository"),
    downloadUrl: (0, pg_core_1.text)("download_url").notNull(),
    checksum: (0, pg_core_1.varchar)("checksum", { length: 128 }),
    permissions: (0, pg_core_1.jsonb)("permissions").$type().default([]),
    categories: (0, pg_core_1.jsonb)("categories").$type().default([]),
    downloads: (0, pg_core_1.integer)("downloads").default(0).notNull(),
    rating: (0, pg_core_1.decimal)("rating", { precision: 2, scale: 1 }),
    ratingCount: (0, pg_core_1.integer)("rating_count").default(0).notNull(),
    verified: (0, pg_core_1.boolean)("verified").default(false),
    featured: (0, pg_core_1.boolean)("featured").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    publishedAt: (0, pg_core_1.timestamp)("published_at"),
});
// User installed plugins
exports.userPlugins = (0, pg_core_1.pgTable)("user_plugins", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.text)("user_id").notNull(), // References neon_auth.users_sync.id
    pluginId: (0, pg_core_1.varchar)("plugin_id", { length: 255 })
        .references(function () { return exports.plugins.id; }, { onDelete: "cascade" })
        .notNull(),
    installedVersion: (0, pg_core_1.varchar)("installed_version", { length: 50 }).notNull(),
    enabled: (0, pg_core_1.boolean)("enabled").default(true),
    settings: (0, pg_core_1.jsonb)("settings").$type().default({}),
    installedAt: (0, pg_core_1.timestamp)("installed_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// Plugin ratings/reviews
exports.pluginRatings = (0, pg_core_1.pgTable)("plugin_ratings", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.text)("user_id").notNull(), // References neon_auth.users_sync.id
    pluginId: (0, pg_core_1.varchar)("plugin_id", { length: 255 })
        .references(function () { return exports.plugins.id; }, { onDelete: "cascade" })
        .notNull(),
    rating: (0, pg_core_1.integer)("rating").notNull(), // 1-5
    review: (0, pg_core_1.text)("review"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// API keys for desktop app sync
exports.apiKeys = (0, pg_core_1.pgTable)("api_keys", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.text)("user_id").notNull(), // References neon_auth.users_sync.id
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    keyHash: (0, pg_core_1.varchar)("key_hash", { length: 255 }).notNull(),
    keyPrefix: (0, pg_core_1.varchar)("key_prefix", { length: 12 }).notNull(),
    lastUsedAt: (0, pg_core_1.timestamp)("last_used_at"),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Relations - using userProfiles as the main user reference
exports.userProfilesRelations = (0, drizzle_orm_1.relations)(exports.userProfiles, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        subscription: one(exports.subscriptions, {
            fields: [exports.userProfiles.userId],
            references: [exports.subscriptions.userId],
        }),
        usageRecords: many(exports.usageRecords),
        usageAggregates: many(exports.usageAggregates),
        installedPlugins: many(exports.userPlugins),
        pluginRatings: many(exports.pluginRatings),
        apiKeys: many(exports.apiKeys),
        authoredPlugins: many(exports.plugins),
    });
});
exports.subscriptionsRelations = (0, drizzle_orm_1.relations)(exports.subscriptions, function (_a) {
    var one = _a.one;
    return ({
        userProfile: one(exports.userProfiles, {
            fields: [exports.subscriptions.userId],
            references: [exports.userProfiles.userId],
        }),
    });
});
exports.pluginsRelations = (0, drizzle_orm_1.relations)(exports.plugins, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        author: one(exports.userProfiles, {
            fields: [exports.plugins.authorId],
            references: [exports.userProfiles.userId],
        }),
        installedBy: many(exports.userPlugins),
        ratings: many(exports.pluginRatings),
    });
});
exports.userPluginsRelations = (0, drizzle_orm_1.relations)(exports.userPlugins, function (_a) {
    var one = _a.one;
    return ({
        userProfile: one(exports.userProfiles, {
            fields: [exports.userPlugins.userId],
            references: [exports.userProfiles.userId],
        }),
        plugin: one(exports.plugins, {
            fields: [exports.userPlugins.pluginId],
            references: [exports.plugins.id],
        }),
    });
});
// Subscription tier limits
exports.TIER_LIMITS = {
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
    team: {
        aiQueriesPerMonth: 5000,
        aiEmbeddingsPerMonth: 25000,
        maxPlugins: -1,
        features: ["basic_search", "calculator", "apps", "ai_search", "ai_commands", "cloud_sync", "team_sharing", "priority_support"],
    },
    enterprise: {
        aiQueriesPerMonth: -1,
        aiEmbeddingsPerMonth: -1,
        maxPlugins: -1,
        features: ["basic_search", "calculator", "apps", "ai_search", "ai_commands", "cloud_sync", "team_sharing", "priority_support", "sso", "custom_integrations"],
    },
};
