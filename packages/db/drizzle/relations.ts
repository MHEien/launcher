import { relations } from "drizzle-orm/relations";
import { plugins, pluginVersions, pluginDownloads, pluginBuilds, userPlugins, pluginRatings, releases, releaseAssets } from "./schema";

export const pluginVersionsRelations = relations(pluginVersions, ({one, many}) => ({
	plugin: one(plugins, {
		fields: [pluginVersions.pluginId],
		references: [plugins.id]
	}),
	pluginDownloads: many(pluginDownloads),
	pluginBuilds: many(pluginBuilds),
}));

export const pluginsRelations = relations(plugins, ({many}) => ({
	pluginVersions: many(pluginVersions),
	pluginDownloads: many(pluginDownloads),
	pluginBuilds: many(pluginBuilds),
	userPlugins: many(userPlugins),
	pluginRatings: many(pluginRatings),
}));

export const pluginDownloadsRelations = relations(pluginDownloads, ({one}) => ({
	plugin: one(plugins, {
		fields: [pluginDownloads.pluginId],
		references: [plugins.id]
	}),
	pluginVersion: one(pluginVersions, {
		fields: [pluginDownloads.versionId],
		references: [pluginVersions.id]
	}),
}));

export const pluginBuildsRelations = relations(pluginBuilds, ({one}) => ({
	plugin: one(plugins, {
		fields: [pluginBuilds.pluginId],
		references: [plugins.id]
	}),
	pluginVersion: one(pluginVersions, {
		fields: [pluginBuilds.versionId],
		references: [pluginVersions.id]
	}),
}));

export const userPluginsRelations = relations(userPlugins, ({one}) => ({
	plugin: one(plugins, {
		fields: [userPlugins.pluginId],
		references: [plugins.id]
	}),
}));

export const pluginRatingsRelations = relations(pluginRatings, ({one}) => ({
	plugin: one(plugins, {
		fields: [pluginRatings.pluginId],
		references: [plugins.id]
	}),
}));

export const releaseAssetsRelations = relations(releaseAssets, ({one}) => ({
	release: one(releases, {
		fields: [releaseAssets.releaseId],
		references: [releases.id]
	}),
}));

export const releasesRelations = relations(releases, ({many}) => ({
	releaseAssets: many(releaseAssets),
}));