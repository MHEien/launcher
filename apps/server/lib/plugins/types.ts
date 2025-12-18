/**
 * Plugin registry types
 */

export interface PluginListItem {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  authorName: string | null;
  currentVersion: string | null;
  categories: string[];
  downloads: number;
  weeklyDownloads: number;
  rating: number | null;
  ratingCount: number;
  verified: boolean;
  featured: boolean;
  publishedAt: string | null;
}

export interface PluginDetails extends PluginListItem {
  longDescription: string | null;
  bannerUrl: string | null;
  homepage: string | null;
  repository: string | null;
  license: string | null;
  tags: string[];
  authorId: string | null;
  versions: PluginVersionInfo[];
  permissions: string[];
  aiToolSchemas: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PluginVersionInfo {
  id: string;
  version: string;
  downloadUrl: string;
  checksum: string | null;
  fileSize: number | null;
  permissions: string[];
  aiToolSchemas: Record<string, unknown>;
  minLauncherVersion: string | null;
  changelog: string | null;
  downloads: number;
  isLatest: boolean;
  isPrerelease: boolean;
  publishedAt: string | null;
}

export interface PluginRating {
  id: string;
  userId: string;
  userName: string | null;
  rating: number;
  review: string | null;
  helpful: number;
  createdAt: string;
}

export interface PluginCategory {
  id: string;
  name: string;
  description: string | null;
  iconName: string | null;
  count: number;
}

export interface CreatePluginInput {
  id: string; // Unique slug
  name: string;
  description?: string;
  longDescription?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  categories?: string[];
  tags?: string[];
}

export interface CreateVersionInput {
  pluginId: string;
  version: string;
  fileBuffer: Buffer;
  fileName: string;
  permissions?: string[];
  aiToolSchemas?: Record<string, unknown>;
  minLauncherVersion?: string;
  changelog?: string;
  isPrerelease?: boolean;
}

export interface SubmitRatingInput {
  pluginId: string;
  userId: string;
  rating: number; // 1-5
  review?: string;
}

export interface PluginSearchOptions {
  query?: string;
  category?: string;
  tags?: string[];
  author?: string;
  verified?: boolean;
  featured?: boolean;
  sortBy?: "downloads" | "rating" | "newest" | "weekly";
  limit?: number;
  offset?: number;
}

