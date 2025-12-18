/**
 * Plugin Registry - Database operations for plugins
 */

import { getDb } from "@/lib/db";
import {
  plugins,
  pluginVersions,
  pluginRatings,
  pluginDownloads,
  pluginCategories,
  eq,
  and,
  or,
  desc,
  asc,
  sql,
} from "@launcher/db";
import { ilike } from "drizzle-orm";
import { uploadPluginFile, deletePluginFiles } from "./storage";
import type {
  PluginListItem,
  PluginDetails,
  PluginVersionInfo,
  PluginRating,
  PluginCategory,
  CreatePluginInput,
  CreateVersionInput,
  SubmitRatingInput,
  PluginSearchOptions,
} from "./types";
import { createHash } from "crypto";

/**
 * Get all plugins with optional filtering and pagination
 */
export async function searchPlugins(options: PluginSearchOptions = {}): Promise<{
  plugins: PluginListItem[];
  total: number;
  hasMore: boolean;
}> {
  const db = getDb();
  const {
    query,
    category,
    tags,
    author,
    verified,
    featured,
    sortBy = "downloads",
    limit = 20,
    offset = 0,
  } = options;

  // Build conditions
  const conditions = [eq(plugins.status, "published")];

  if (query) {
    conditions.push(
      or(
        ilike(plugins.name, `%${query}%`),
        ilike(plugins.description, `%${query}%`),
        ilike(plugins.id, `%${query}%`)
      )!
    );
  }

  if (category) {
    conditions.push(
      sql`${plugins.categories}::jsonb ? ${category}`
    );
  }

  if (tags && tags.length > 0) {
    conditions.push(
      sql`${plugins.tags}::jsonb ?| array[${sql.join(tags.map(t => sql`${t}`), sql`, `)}]`
    );
  }

  if (author) {
    conditions.push(eq(plugins.authorId, author));
  }

  if (verified !== undefined) {
    conditions.push(eq(plugins.verified, verified));
  }

  if (featured !== undefined) {
    conditions.push(eq(plugins.featured, featured));
  }

  // Determine sort order
  let orderBy;
  switch (sortBy) {
    case "rating":
      orderBy = desc(plugins.rating);
      break;
    case "newest":
      orderBy = desc(plugins.publishedAt);
      break;
    case "weekly":
      orderBy = desc(plugins.weeklyDownloads);
      break;
    case "downloads":
    default:
      orderBy = desc(plugins.downloads);
  }

  // Execute query
  const results = await db
    .select({
      id: plugins.id,
      name: plugins.name,
      description: plugins.description,
      iconUrl: plugins.iconUrl,
      authorName: plugins.authorName,
      currentVersion: plugins.currentVersion,
      categories: plugins.categories,
      downloads: plugins.downloads,
      weeklyDownloads: plugins.weeklyDownloads,
      rating: plugins.rating,
      ratingCount: plugins.ratingCount,
      verified: plugins.verified,
      featured: plugins.featured,
      publishedAt: plugins.publishedAt,
    })
    .from(plugins)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit + 1) // Fetch one extra to check if there's more
    .offset(offset);

  const hasMore = results.length > limit;
  const pluginList = results.slice(0, limit).map((p) => ({
    ...p,
    categories: p.categories || [],
    rating: p.rating ? parseFloat(p.rating) : null,
    verified: p.verified ?? false,
    featured: p.featured ?? false,
    publishedAt: p.publishedAt?.toISOString() || null,
  }));

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(plugins)
    .where(and(...conditions));

  return {
    plugins: pluginList,
    total: Number(count),
    hasMore,
  };
}

/**
 * Get plugin details by ID
 */
export async function getPlugin(pluginId: string): Promise<PluginDetails | null> {
  const db = getDb();

  const [plugin] = await db
    .select()
    .from(plugins)
    .where(eq(plugins.id, pluginId));

  if (!plugin) {
    return null;
  }

  // Get all versions
  const versions = await db
    .select()
    .from(pluginVersions)
    .where(eq(pluginVersions.pluginId, pluginId))
    .orderBy(desc(pluginVersions.publishedAt));

  // Get latest version for permissions and ai tools
  const latestVersion = versions.find((v) => v.isLatest) || versions[0];

  return {
    id: plugin.id,
    name: plugin.name,
    description: plugin.description,
    longDescription: plugin.longDescription,
    iconUrl: plugin.iconUrl,
    bannerUrl: plugin.bannerUrl,
    authorId: plugin.authorId,
    authorName: plugin.authorName,
    homepage: plugin.homepage,
    repository: plugin.repository,
    license: plugin.license,
    currentVersion: plugin.currentVersion,
    categories: plugin.categories || [],
    tags: plugin.tags || [],
    downloads: plugin.downloads,
    weeklyDownloads: plugin.weeklyDownloads,
    rating: plugin.rating ? parseFloat(plugin.rating) : null,
    ratingCount: plugin.ratingCount,
    verified: plugin.verified ?? false,
    featured: plugin.featured ?? false,
    publishedAt: plugin.publishedAt?.toISOString() || null,
    createdAt: plugin.createdAt.toISOString(),
    updatedAt: plugin.updatedAt.toISOString(),
    permissions: (latestVersion?.permissions as string[]) || [],
    aiToolSchemas: (latestVersion?.aiToolSchemas as Record<string, unknown>) || {},
    versions: versions.map((v) => ({
      id: v.id,
      version: v.version,
      downloadUrl: v.downloadUrl,
      checksum: v.checksum,
      fileSize: v.fileSize,
      permissions: (v.permissions as string[]) || [],
      aiToolSchemas: (v.aiToolSchemas as Record<string, unknown>) || {},
      minLauncherVersion: v.minLauncherVersion,
      changelog: v.changelog,
      downloads: v.downloads,
      isLatest: v.isLatest,
      isPrerelease: v.isPrerelease,
      publishedAt: v.publishedAt?.toISOString() || null,
    })),
  };
}

/**
 * Get the download URL for a plugin version
 */
export async function getPluginDownloadUrl(
  pluginId: string,
  version?: string
): Promise<{ url: string; version: string; checksum: string | null } | null> {
  const db = getDb();

  let versionQuery;
  if (version) {
    versionQuery = and(
      eq(pluginVersions.pluginId, pluginId),
      eq(pluginVersions.version, version)
    );
  } else {
    // Get latest version
    versionQuery = and(
      eq(pluginVersions.pluginId, pluginId),
      eq(pluginVersions.isLatest, true)
    );
  }

  const [versionRecord] = await db
    .select({
      url: pluginVersions.downloadUrl,
      version: pluginVersions.version,
      checksum: pluginVersions.checksum,
    })
    .from(pluginVersions)
    .where(versionQuery);

  return versionRecord || null;
}

/**
 * Create a new plugin
 */
export async function createPlugin(
  input: CreatePluginInput,
  authorId: string,
  authorName: string
): Promise<{ id: string }> {
  const db = getDb();

  await db.insert(plugins).values({
    id: input.id,
    name: input.name,
    description: input.description,
    longDescription: input.longDescription,
    homepage: input.homepage,
    repository: input.repository,
    license: input.license,
    categories: input.categories || [],
    tags: input.tags || [],
    authorId,
    authorName,
    status: "draft",
  });

  return { id: input.id };
}

/**
 * Update plugin metadata
 */
export async function updatePlugin(
  pluginId: string,
  authorId: string,
  updates: Partial<CreatePluginInput>
): Promise<boolean> {
  const db = getDb();

  // Verify ownership
  const [plugin] = await db
    .select({ authorId: plugins.authorId })
    .from(plugins)
    .where(eq(plugins.id, pluginId));

  if (!plugin || plugin.authorId !== authorId) {
    return false;
  }

  await db
    .update(plugins)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(plugins.id, pluginId));

  return true;
}

/**
 * Upload and create a new plugin version
 */
export async function createVersion(input: CreateVersionInput): Promise<PluginVersionInfo> {
  const db = getDb();

  // Upload file to blob storage
  const { url, checksum, fileSize } = await uploadPluginFile(
    input.pluginId,
    input.version,
    input.fileBuffer,
    input.fileName
  );

  // Mark previous versions as not latest
  await db
    .update(pluginVersions)
    .set({ isLatest: false })
    .where(eq(pluginVersions.pluginId, input.pluginId));

  // Create version record
  const [version] = await db
    .insert(pluginVersions)
    .values({
      pluginId: input.pluginId,
      version: input.version,
      downloadUrl: url,
      checksum,
      fileSize,
      permissions: input.permissions || [],
      aiToolSchemas: input.aiToolSchemas || {},
      minLauncherVersion: input.minLauncherVersion,
      changelog: input.changelog,
      isLatest: !input.isPrerelease,
      isPrerelease: input.isPrerelease || false,
      publishedAt: new Date(),
    })
    .returning();

  // Update plugin current version if not prerelease
  if (!input.isPrerelease) {
    await db
      .update(plugins)
      .set({
        currentVersion: input.version,
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(plugins.id, input.pluginId));
  }

  return {
    id: version.id,
    version: version.version,
    downloadUrl: version.downloadUrl,
    checksum: version.checksum,
    fileSize: version.fileSize,
    permissions: (version.permissions as string[]) || [],
    aiToolSchemas: (version.aiToolSchemas as Record<string, unknown>) || {},
    minLauncherVersion: version.minLauncherVersion,
    changelog: version.changelog,
    downloads: version.downloads,
    isLatest: version.isLatest,
    isPrerelease: version.isPrerelease,
    publishedAt: version.publishedAt?.toISOString() || null,
  };
}

/**
 * Track a plugin download
 */
export async function trackDownload(
  pluginId: string,
  versionId: string | null,
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null
): Promise<void> {
  const db = getDb();

  // Hash IP for privacy
  const ipHash = ipAddress
    ? createHash("sha256").update(ipAddress).digest("hex").slice(0, 16)
    : null;

  // Check for recent duplicate (same IP, same version, within 24 hours)
  if (ipHash && versionId) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [existing] = await db
      .select({ id: pluginDownloads.id })
      .from(pluginDownloads)
      .where(
        and(
          eq(pluginDownloads.versionId, versionId),
          eq(pluginDownloads.ipHash, ipHash),
          sql`${pluginDownloads.createdAt} > ${oneDayAgo}`
        )
      )
      .limit(1);

    if (existing) {
      // Don't count duplicate downloads
      return;
    }
  }

  // Record download
  await db.insert(pluginDownloads).values({
    pluginId,
    versionId,
    userId,
    ipHash,
    userAgent,
  });

  // Increment counters
  await db
    .update(plugins)
    .set({
      downloads: sql`${plugins.downloads} + 1`,
      weeklyDownloads: sql`${plugins.weeklyDownloads} + 1`,
    })
    .where(eq(plugins.id, pluginId));

  if (versionId) {
    await db
      .update(pluginVersions)
      .set({
        downloads: sql`${pluginVersions.downloads} + 1`,
      })
      .where(eq(pluginVersions.id, versionId));
  }
}

/**
 * Submit or update a rating
 */
export async function submitRating(input: SubmitRatingInput): Promise<PluginRating> {
  const db = getDb();

  // Check if user already rated
  const [existing] = await db
    .select()
    .from(pluginRatings)
    .where(
      and(
        eq(pluginRatings.pluginId, input.pluginId),
        eq(pluginRatings.userId, input.userId)
      )
    );

  let rating;
  if (existing) {
    // Update existing rating
    [rating] = await db
      .update(pluginRatings)
      .set({
        rating: input.rating,
        review: input.review,
        updatedAt: new Date(),
      })
      .where(eq(pluginRatings.id, existing.id))
      .returning();
  } else {
    // Create new rating
    [rating] = await db
      .insert(pluginRatings)
      .values({
        pluginId: input.pluginId,
        userId: input.userId,
        rating: input.rating,
        review: input.review,
      })
      .returning();
  }

  // Recalculate average rating
  await recalculateRating(input.pluginId);

  return {
    id: rating.id,
    userId: rating.userId,
    userName: null, // Would need to join with users
    rating: rating.rating,
    review: rating.review,
    helpful: rating.helpful,
    createdAt: rating.createdAt.toISOString(),
  };
}

/**
 * Get ratings for a plugin
 */
export async function getPluginRatings(
  pluginId: string,
  limit = 20,
  offset = 0
): Promise<{ ratings: PluginRating[]; total: number }> {
  const db = getDb();

  const ratings = await db
    .select()
    .from(pluginRatings)
    .where(eq(pluginRatings.pluginId, pluginId))
    .orderBy(desc(pluginRatings.helpful), desc(pluginRatings.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pluginRatings)
    .where(eq(pluginRatings.pluginId, pluginId));

  return {
    ratings: ratings.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: null,
      rating: r.rating,
      review: r.review,
      helpful: r.helpful,
      createdAt: r.createdAt.toISOString(),
    })),
    total: Number(count),
  };
}

/**
 * Recalculate average rating for a plugin
 */
async function recalculateRating(pluginId: string): Promise<void> {
  const db = getDb();

  const [stats] = await db
    .select({
      avgRating: sql<number>`AVG(${pluginRatings.rating})::numeric(2,1)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(pluginRatings)
    .where(eq(pluginRatings.pluginId, pluginId));

  await db
    .update(plugins)
    .set({
      rating: stats.avgRating?.toString() || null,
      ratingCount: Number(stats.count),
    })
    .where(eq(plugins.id, pluginId));
}

/**
 * Get all categories with plugin counts
 */
export async function getCategories(): Promise<PluginCategory[]> {
  const db = getDb();

  // Get predefined categories
  const categories = await db
    .select()
    .from(pluginCategories)
    .orderBy(asc(pluginCategories.sortOrder));

  // Count plugins per category
  const categoryCounts = await db
    .select({
      category: sql<string>`jsonb_array_elements_text(${plugins.categories})`,
      count: sql<number>`count(*)`,
    })
    .from(plugins)
    .where(eq(plugins.status, "published"))
    .groupBy(sql`jsonb_array_elements_text(${plugins.categories})`);

  const countMap = new Map(categoryCounts.map((c) => [c.category, Number(c.count)]));

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    iconName: c.iconName,
    count: countMap.get(c.id) || 0,
  }));
}

/**
 * Delete a plugin (soft delete - mark as deprecated)
 */
export async function deletePlugin(pluginId: string, authorId: string): Promise<boolean> {
  const db = getDb();

  // Verify ownership
  const [plugin] = await db
    .select({ authorId: plugins.authorId })
    .from(plugins)
    .where(eq(plugins.id, pluginId));

  if (!plugin || plugin.authorId !== authorId) {
    return false;
  }

  await db
    .update(plugins)
    .set({
      status: "deprecated",
      updatedAt: new Date(),
    })
    .where(eq(plugins.id, pluginId));

  return true;
}

/**
 * Hard delete a plugin (admin only)
 */
export async function hardDeletePlugin(pluginId: string): Promise<void> {
  const db = getDb();

  // Delete files from storage
  await deletePluginFiles(pluginId);

  // Delete from database (cascades to versions, ratings, etc.)
  await db.delete(plugins).where(eq(plugins.id, pluginId));
}

/**
 * Reset weekly downloads (to be called by cron job)
 */
export async function resetWeeklyDownloads(): Promise<void> {
  const db = getDb();

  await db
    .update(plugins)
    .set({ weeklyDownloads: 0 });
}

/**
 * Get trending plugins (high weekly downloads)
 */
export async function getTrendingPlugins(limit = 10): Promise<PluginListItem[]> {
  return searchPlugins({ sortBy: "weekly", limit }).then((r) => r.plugins);
}

/**
 * Get featured plugins
 */
export async function getFeaturedPlugins(limit = 6): Promise<PluginListItem[]> {
  return searchPlugins({ featured: true, limit }).then((r) => r.plugins);
}

/**
 * Get plugins by author
 */
export async function getPluginsByAuthor(
  authorId: string,
  includeUnpublished = false
): Promise<PluginListItem[]> {
  const db = getDb();

  const conditions = [eq(plugins.authorId, authorId)];
  if (!includeUnpublished) {
    conditions.push(eq(plugins.status, "published"));
  }

  const results = await db
    .select({
      id: plugins.id,
      name: plugins.name,
      description: plugins.description,
      iconUrl: plugins.iconUrl,
      authorName: plugins.authorName,
      currentVersion: plugins.currentVersion,
      categories: plugins.categories,
      downloads: plugins.downloads,
      weeklyDownloads: plugins.weeklyDownloads,
      rating: plugins.rating,
      ratingCount: plugins.ratingCount,
      verified: plugins.verified,
      featured: plugins.featured,
      publishedAt: plugins.publishedAt,
    })
    .from(plugins)
    .where(and(...conditions))
    .orderBy(desc(plugins.downloads));

  return results.map((p) => ({
    ...p,
    categories: p.categories || [],
    rating: p.rating ? parseFloat(p.rating) : null,
    verified: p.verified ?? false,
    featured: p.featured ?? false,
    publishedAt: p.publishedAt?.toISOString() || null,
  }));
}

