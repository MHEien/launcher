import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { handle } from "@hono/node-server/vercel";
import { chatHandler, modelsHandler, builtinTools } from "./ai";
import {
  searchPlugins,
  getPlugin,
  getPluginDownloadUrl,
  createPlugin,
  updatePlugin,
  createVersion,
  trackDownload,
  submitRating,
  getPluginRatings,
  getCategories,
  deletePlugin,
  getTrendingPlugins,
  getFeaturedPlugins,
  getPluginsByAuthor,
  uploadPluginIcon,
  uploadPluginBanner,
} from "./plugins";
import type { CreatePluginInput, CreateVersionInput, SubmitRatingInput } from "./plugins";
import { githubWebhookRouter } from "./webhooks/github";
import { getBuildStatus, getPluginBuilds } from "./build";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors());

// Error handler
app.onError((err, c) => {
  console.error("Server error:", err);
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  return c.json({ error: "Internal server error" }, 500);
});

// ============================================
// Health Check
// ============================================

app.get("/", (c) => {
  return c.json({
    name: "Launcher API Server",
    version: "1.0.0",
    status: "healthy",
    endpoints: {
      // AI endpoints
      aiChat: "POST /api/ai/chat",
      aiModels: "GET /api/ai/models",
      aiTools: "GET /api/ai/tools",
      // Plugin registry endpoints
      plugins: "GET /api/plugins",
      pluginDetails: "GET /api/plugins/:id",
      pluginDownload: "GET /api/plugins/:id/download",
      pluginRatings: "GET /api/plugins/:id/ratings",
      categories: "GET /api/categories",
      trending: "GET /api/trending",
      featured: "GET /api/featured",
      // Auth required endpoints
      createPlugin: "POST /api/plugins",
      updatePlugin: "PATCH /api/plugins/:id",
      publishVersion: "POST /api/plugins/:id/versions",
      submitRating: "POST /api/plugins/:id/ratings",
    },
  });
});

// ============================================
// AI Routes
// ============================================

// Streaming chat endpoint
app.post("/api/ai/chat", chatHandler);

// Get available models for user's tier
app.get("/api/ai/models", modelsHandler);

// Get available built-in tools
app.get("/api/ai/tools", (c) => {
  return c.json({
    tools: builtinTools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
      source: t.source,
    })),
  });
});

// ============================================
// Plugin Registry Routes - Public
// ============================================

// Search/list plugins
app.get("/api/plugins", async (c) => {
  try {
    const query = c.req.query("q");
    const category = c.req.query("category");
    const tags = c.req.query("tags")?.split(",").filter(Boolean);
    const verified = c.req.query("verified") === "true" ? true : undefined;
    const featured = c.req.query("featured") === "true" ? true : undefined;
    const sortBy = c.req.query("sort") as "downloads" | "rating" | "newest" | "weekly" | undefined;
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = parseInt(c.req.query("offset") || "0");

    const result = await searchPlugins({
      query,
      category,
      tags,
      verified,
      featured,
      sortBy,
      limit: Math.min(limit, 100), // Cap at 100
      offset,
    });

    return c.json(result);
  } catch (error) {
    console.error("Error searching plugins:", error);
    return c.json({ error: "Failed to search plugins" }, 500);
  }
});

// Get plugin details
app.get("/api/plugins/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const plugin = await getPlugin(id);

    if (!plugin) {
      return c.json({ error: "Plugin not found" }, 404);
    }

    return c.json(plugin);
  } catch (error) {
    console.error("Error getting plugin:", error);
    return c.json({ error: "Failed to get plugin" }, 500);
  }
});

// Download plugin (redirects to blob URL and tracks download)
app.get("/api/plugins/:id/download", async (c) => {
  try {
    const id = c.req.param("id");
    const version = c.req.query("version");

    const download = await getPluginDownloadUrl(id, version);
    if (!download) {
      return c.json({ error: "Plugin or version not found" }, 404);
    }

    // Track download (async, don't wait)
    const userId = c.req.header("X-User-Id") || null;
    const ipAddress = c.req.header("X-Forwarded-For")?.split(",")[0] || c.req.header("X-Real-Ip") || null;
    const userAgent = c.req.header("User-Agent") || null;

    // Get version ID for tracking
    const plugin = await getPlugin(id);
    const versionRecord = plugin?.versions.find((v) => v.version === download.version);

    trackDownload(id, versionRecord?.id || null, userId, ipAddress, userAgent).catch((err) => {
      console.error("Failed to track download:", err);
    });

    // Return download info (client will fetch the file)
    return c.json({
      url: download.url,
      version: download.version,
      checksum: download.checksum,
    });
  } catch (error) {
    console.error("Error getting download URL:", error);
    return c.json({ error: "Failed to get download URL" }, 500);
  }
});

// Get plugin ratings
app.get("/api/plugins/:id/ratings", async (c) => {
  try {
    const id = c.req.param("id");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = parseInt(c.req.query("offset") || "0");

    const result = await getPluginRatings(id, Math.min(limit, 50), offset);
    return c.json(result);
  } catch (error) {
    console.error("Error getting ratings:", error);
    return c.json({ error: "Failed to get ratings" }, 500);
  }
});

// Get all categories
app.get("/api/categories", async (c) => {
  try {
    const categories = await getCategories();
    return c.json({ categories });
  } catch (error) {
    console.error("Error getting categories:", error);
    return c.json({ error: "Failed to get categories" }, 500);
  }
});

// Get trending plugins
app.get("/api/trending", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");
    const plugins = await getTrendingPlugins(Math.min(limit, 20));
    return c.json({ plugins });
  } catch (error) {
    console.error("Error getting trending plugins:", error);
    return c.json({ error: "Failed to get trending plugins" }, 500);
  }
});

// Get featured plugins
app.get("/api/featured", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "6");
    const plugins = await getFeaturedPlugins(Math.min(limit, 20));
    return c.json({ plugins });
  } catch (error) {
    console.error("Error getting featured plugins:", error);
    return c.json({ error: "Failed to get featured plugins" }, 500);
  }
});

// ============================================
// Plugin Registry Routes - Auth Required
// ============================================

// Helper to get user from auth header
async function getAuthUser(c: any): Promise<{ id: string; name: string } | null> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  
  // TODO: Validate token with your auth service
  // For now, use a simple test implementation
  if (token.startsWith("test-")) {
    return { id: token, name: "Test User" };
  }

  // In production, decode JWT and validate
  if (token.length > 10) {
    // Placeholder - would normally decode JWT
    return { id: "user-" + token.slice(0, 8), name: "User" };
  }

  return null;
}

// Create a new plugin
app.post("/api/plugins", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json<CreatePluginInput>();
    
    // Validate required fields
    if (!body.id || !body.name) {
      return c.json({ error: "id and name are required" }, 400);
    }

    // Validate plugin ID format (lowercase, alphanumeric, hyphens)
    if (!/^[a-z0-9-]+$/.test(body.id)) {
      return c.json({ error: "Plugin ID must be lowercase alphanumeric with hyphens" }, 400);
    }

    const result = await createPlugin(body, user.id, user.name);
    return c.json(result, 201);
  } catch (error: any) {
    if (error.code === "23505") {
      // Unique constraint violation
      return c.json({ error: "Plugin ID already exists" }, 409);
    }
    console.error("Error creating plugin:", error);
    return c.json({ error: "Failed to create plugin" }, 500);
  }
});

// Update plugin metadata
app.patch("/api/plugins/:id", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");
    const body = await c.req.json<Partial<CreatePluginInput>>();

    const success = await updatePlugin(id, user.id, body);
    if (!success) {
      return c.json({ error: "Plugin not found or not authorized" }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating plugin:", error);
    return c.json({ error: "Failed to update plugin" }, 500);
  }
});

// Publish a new version
app.post("/api/plugins/:id/versions", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const pluginId = c.req.param("id");

    // Verify ownership
    const plugin = await getPlugin(pluginId);
    if (!plugin) {
      return c.json({ error: "Plugin not found" }, 404);
    }
    if (plugin.authorId !== user.id) {
      return c.json({ error: "Not authorized to publish versions for this plugin" }, 403);
    }

    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const version = formData.get("version") as string;
    const changelog = formData.get("changelog") as string | null;
    const permissions = formData.get("permissions") as string | null;
    const aiToolSchemas = formData.get("aiToolSchemas") as string | null;
    const minLauncherVersion = formData.get("minLauncherVersion") as string | null;
    const isPrerelease = formData.get("isPrerelease") === "true";

    if (!file || !version) {
      return c.json({ error: "file and version are required" }, 400);
    }

    // Validate version format (semver)
    if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(version)) {
      return c.json({ error: "Invalid version format (use semver)" }, 400);
    }

    // Check for duplicate version
    if (plugin.versions.some((v) => v.version === version)) {
      return c.json({ error: "Version already exists" }, 409);
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const input: CreateVersionInput = {
      pluginId,
      version,
      fileBuffer,
      fileName: file.name || `${pluginId}-${version}.zip`,
      changelog: changelog || undefined,
      permissions: permissions ? JSON.parse(permissions) : undefined,
      aiToolSchemas: aiToolSchemas ? JSON.parse(aiToolSchemas) : undefined,
      minLauncherVersion: minLauncherVersion || undefined,
      isPrerelease,
    };

    const versionInfo = await createVersion(input);
    return c.json(versionInfo, 201);
  } catch (error) {
    console.error("Error publishing version:", error);
    return c.json({ error: "Failed to publish version" }, 500);
  }
});

// Upload plugin icon
app.post("/api/plugins/:id/icon", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const pluginId = c.req.param("id");

    // Verify ownership
    const plugin = await getPlugin(pluginId);
    if (!plugin || plugin.authorId !== user.id) {
      return c.json({ error: "Not authorized" }, 403);
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "file is required" }, 400);
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const iconUrl = await uploadPluginIcon(pluginId, fileBuffer, file.type);

    // Update plugin
    await updatePlugin(pluginId, user.id, { iconUrl } as any);

    return c.json({ iconUrl });
  } catch (error) {
    console.error("Error uploading icon:", error);
    return c.json({ error: "Failed to upload icon" }, 500);
  }
});

// Upload plugin banner
app.post("/api/plugins/:id/banner", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const pluginId = c.req.param("id");

    // Verify ownership
    const plugin = await getPlugin(pluginId);
    if (!plugin || plugin.authorId !== user.id) {
      return c.json({ error: "Not authorized" }, 403);
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "file is required" }, 400);
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const bannerUrl = await uploadPluginBanner(pluginId, fileBuffer, file.type);

    // Update plugin
    await updatePlugin(pluginId, user.id, { bannerUrl } as any);

    return c.json({ bannerUrl });
  } catch (error) {
    console.error("Error uploading banner:", error);
    return c.json({ error: "Failed to upload banner" }, 500);
  }
});

// Submit a rating
app.post("/api/plugins/:id/ratings", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const pluginId = c.req.param("id");
    const { rating, review } = await c.req.json<{ rating: number; review?: string }>();

    if (!rating || rating < 1 || rating > 5) {
      return c.json({ error: "Rating must be between 1 and 5" }, 400);
    }

    const input: SubmitRatingInput = {
      pluginId,
      userId: user.id,
      rating,
      review,
    };

    const result = await submitRating(input);
    return c.json(result, 201);
  } catch (error) {
    console.error("Error submitting rating:", error);
    return c.json({ error: "Failed to submit rating" }, 500);
  }
});

// Delete plugin (soft delete)
app.delete("/api/plugins/:id", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");
    const success = await deletePlugin(id, user.id);

    if (!success) {
      return c.json({ error: "Plugin not found or not authorized" }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting plugin:", error);
    return c.json({ error: "Failed to delete plugin" }, 500);
  }
});

// Get plugins by author
app.get("/api/authors/:authorId/plugins", async (c) => {
  try {
    const authorId = c.req.param("authorId");
    const user = await getAuthUser(c);
    const includeUnpublished = user?.id === authorId;

    const plugins = await getPluginsByAuthor(authorId, includeUnpublished);
    return c.json({ plugins });
  } catch (error) {
    console.error("Error getting author plugins:", error);
    return c.json({ error: "Failed to get author plugins" }, 500);
  }
});

// ============================================
// Webhooks
// ============================================

// GitHub webhook handler
app.route("/webhooks/github", githubWebhookRouter);

// ============================================
// Build Status Routes
// ============================================

// Get build status
app.get("/api/builds/:buildId", async (c) => {
  try {
    const buildId = c.req.param("buildId");
    const build = await getBuildStatus(buildId);

    if (!build) {
      return c.json({ error: "Build not found" }, 404);
    }

    return c.json({ build });
  } catch (error) {
    console.error("Error getting build status:", error);
    return c.json({ error: "Failed to get build status" }, 500);
  }
});

// Get builds for a plugin
app.get("/api/plugins/:id/builds", async (c) => {
  try {
    const pluginId = c.req.param("id");
    const limit = parseInt(c.req.query("limit") || "10");
    
    const builds = await getPluginBuilds(pluginId, Math.min(limit, 50));
    return c.json({ builds });
  } catch (error) {
    console.error("Error getting plugin builds:", error);
    return c.json({ error: "Failed to get plugin builds" }, 500);
  }
});

// ============================================
// Start Server
// ============================================

const port = process.env.PORT || 3001;
console.log(`🚀 Launcher API Server running on http://localhost:${port}`);

// Export for Vercel serverless (Node.js runtime)
export default handle(app);

// Also export for Bun runtime
export const server = {
  port,
  fetch: app.fetch,
};
