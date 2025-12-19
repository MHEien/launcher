import { pgTable, foreignKey, uuid, varchar, text, integer, jsonb, boolean, timestamp, unique, numeric, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const buildStatus = pgEnum("build_status", ['pending', 'building', 'success', 'failure', 'cancelled'])
export const platform = pgEnum("platform", ['windows', 'macos', 'macos_arm', 'linux', 'linux_appimage', 'linux_deb'])
export const pluginStatus = pgEnum("plugin_status", ['draft', 'pending_review', 'published', 'rejected', 'deprecated'])
export const releaseChannel = pgEnum("release_channel", ['stable', 'beta', 'alpha'])
export const subscriptionStatus = pgEnum("subscription_status", ['active', 'canceled', 'past_due', 'trialing'])
export const subscriptionTier = pgEnum("subscription_tier", ['free', 'pro', 'pro_plus'])
export const usageType = pgEnum("usage_type", ['ai_query', 'ai_embedding', 'plugin_install', 'search'])


export const pluginVersions = pgTable("plugin_versions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	pluginId: varchar("plugin_id", { length: 255 }).notNull(),
	version: varchar({ length: 50 }).notNull(),
	changelog: text(),
	downloadUrl: text("download_url").notNull(),
	checksum: varchar({ length: 128 }),
	fileSize: integer("file_size"),
	minLauncherVersion: varchar("min_launcher_version", { length: 50 }),
	maxLauncherVersion: varchar("max_launcher_version", { length: 50 }),
	permissions: jsonb().default([]),
	isLatest: boolean("is_latest").default(false).notNull(),
	isDeprecated: boolean("is_deprecated").default(false).notNull(),
	downloads: integer().default(0).notNull(),
	publishedAt: timestamp("published_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.pluginId],
			foreignColumns: [plugins.id],
			name: "plugin_versions_plugin_id_fkey"
		}).onDelete("cascade"),
]);

export const pluginDownloads = pgTable("plugin_downloads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	pluginId: varchar("plugin_id", { length: 255 }).notNull(),
	versionId: uuid("version_id"),
	userId: text("user_id"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.pluginId],
			foreignColumns: [plugins.id],
			name: "plugin_downloads_plugin_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.versionId],
			foreignColumns: [pluginVersions.id],
			name: "plugin_downloads_version_id_fkey"
		}).onDelete("set null"),
]);

export const pluginBuilds = pgTable("plugin_builds", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	pluginId: varchar("plugin_id", { length: 255 }).notNull(),
	versionId: uuid("version_id"),
	version: varchar({ length: 50 }).notNull(),
	status: buildStatus().default('pending').notNull(),
	githubRunId: integer("github_run_id"),
	githubSha: varchar("github_sha", { length: 40 }),
	logs: text(),
	wasmUrl: text("wasm_url"),
	checksum: varchar({ length: 128 }),
	fileSize: integer("file_size"),
	startedAt: timestamp("started_at", { mode: 'string' }),
	finishedAt: timestamp("finished_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.pluginId],
			foreignColumns: [plugins.id],
			name: "plugin_builds_plugin_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.versionId],
			foreignColumns: [pluginVersions.id],
			name: "plugin_builds_version_id_fkey"
		}).onDelete("set null"),
]);

export const apiKeys = pgTable("api_keys", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	keyHash: varchar("key_hash", { length: 255 }).notNull(),
	keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	tier: subscriptionTier().default('free').notNull(),
	status: subscriptionStatus().default('active').notNull(),
	stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
	stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
	currentPeriodStart: timestamp("current_period_start", { mode: 'string' }),
	currentPeriodEnd: timestamp("current_period_end", { mode: 'string' }),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const usageAggregates = pgTable("usage_aggregates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	month: varchar({ length: 7 }).notNull(),
	aiQueries: integer("ai_queries").default(0).notNull(),
	aiEmbeddings: integer("ai_embeddings").default(0).notNull(),
	pluginInstalls: integer("plugin_installs").default(0).notNull(),
	searches: integer().default(0).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const usageRecords = pgTable("usage_records", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	type: usageType().notNull(),
	count: integer().default(1).notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const userProfiles = pgTable("user_profiles", {
	userId: text("user_id").primaryKey().notNull(),
	settings: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const userPlugins = pgTable("user_plugins", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	pluginId: varchar("plugin_id", { length: 255 }).notNull(),
	installedVersion: varchar("installed_version", { length: 50 }).notNull(),
	enabled: boolean().default(true),
	settings: jsonb().default({}),
	installedAt: timestamp("installed_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.pluginId],
			foreignColumns: [plugins.id],
			name: "user_plugins_plugin_id_plugins_id_fk"
		}).onDelete("cascade"),
]);

export const pluginRatings = pgTable("plugin_ratings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	pluginId: varchar("plugin_id", { length: 255 }).notNull(),
	rating: integer().notNull(),
	review: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	helpful: integer().default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.pluginId],
			foreignColumns: [plugins.id],
			name: "plugin_ratings_plugin_id_plugins_id_fk"
		}).onDelete("cascade"),
	unique("plugin_ratings_user_plugin_unique").on(table.userId, table.pluginId),
]);

export const releases = pgTable("releases", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	version: varchar({ length: 50 }).notNull(),
	platform: platform().notNull(),
	channel: releaseChannel().default('stable').notNull(),
	downloadUrl: text("download_url").notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	fileSize: integer("file_size"),
	checksum: varchar({ length: 128 }),
	signature: text(),
	releaseNotes: text("release_notes"),
	minOsVersion: varchar("min_os_version", { length: 50 }),
	isLatest: boolean("is_latest").default(false).notNull(),
	isDeprecated: boolean("is_deprecated").default(false).notNull(),
	downloads: integer().default(0).notNull(),
	publishedAt: timestamp("published_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const releaseAssets = pgTable("release_assets", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	releaseId: uuid("release_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	downloadUrl: text("download_url").notNull(),
	fileSize: integer("file_size"),
	contentType: varchar("content_type", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.releaseId],
			foreignColumns: [releases.id],
			name: "release_assets_release_id_releases_id_fk"
		}).onDelete("cascade"),
]);

export const plugins = pgTable("plugins", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	version: varchar({ length: 50 }).notNull(),
	authorId: text("author_id"),
	authorName: varchar("author_name", { length: 255 }),
	description: text(),
	longDescription: text("long_description"),
	homepage: text(),
	repository: text(),
	downloadUrl: text("download_url").notNull(),
	checksum: varchar({ length: 128 }),
	permissions: jsonb().default([]),
	categories: jsonb().default([]),
	downloads: integer().default(0).notNull(),
	rating: numeric({ precision: 2, scale:  1 }),
	ratingCount: integer("rating_count").default(0).notNull(),
	verified: boolean().default(false),
	featured: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	publishedAt: timestamp("published_at", { mode: 'string' }),
	iconUrl: text("icon_url"),
	bannerUrl: text("banner_url"),
	license: varchar({ length: 100 }),
	tags: jsonb().default([]),
	status: pluginStatus().default('draft'),
	minLauncherVersion: varchar("min_launcher_version", { length: 50 }),
	maxLauncherVersion: varchar("max_launcher_version", { length: 50 }),
	weeklyDownloads: integer("weekly_downloads").default(0).notNull(),
	monthlyDownloads: integer("monthly_downloads").default(0).notNull(),
	latestVersionId: uuid("latest_version_id"),
	githubRepoId: integer("github_repo_id"),
	githubRepoFullName: text("github_repo_full_name"),
	githubWebhookId: integer("github_webhook_id"),
	githubDefaultBranch: varchar("github_default_branch", { length: 255 }),
	githubPluginPath: text("github_plugin_path").default('.'),
	githubInstallationId: integer("github_installation_id"),
});

export const usersSync = pgTable("users_sync", {
	userId: text("user_id").primaryKey().notNull(),
	email: text(),
	name: varchar({ length: 255 }),
	avatarUrl: text("avatar_url"),
	tier: subscriptionTier().default('free').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const pluginCategories = pgTable("plugin_categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	slug: varchar({ length: 100 }).notNull(),
	description: text(),
	icon: varchar({ length: 50 }),
	displayOrder: integer("display_order").default(0).notNull(),
}, (table) => [
	unique("plugin_categories_name_key").on(table.name),
	unique("plugin_categories_slug_key").on(table.slug),
]);
