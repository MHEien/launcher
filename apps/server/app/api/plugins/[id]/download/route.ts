import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getPlugin, getPluginDownloadUrl, trackDownload } from "@/lib/plugins/registry";
import { getDb, pluginBuilds, eq, desc } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

// Error codes for client to handle
const ErrorCodes = {
  PLUGIN_NOT_FOUND: "PLUGIN_NOT_FOUND",
  NO_VERSION: "NO_VERSION",
  BUILDING: "BUILDING",
  BUILD_FAILED: "BUILD_FAILED",
  DOWNLOAD_UNAVAILABLE: "DOWNLOAD_UNAVAILABLE",
} as const;

// GET /api/plugins/:id/download - Get download URL and track download
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const version = searchParams.get("version") || undefined;

    // First check if the plugin exists
    const plugin = await getPlugin(id);
    if (!plugin) {
      return NextResponse.json(
        { error: "Plugin not found", code: ErrorCodes.PLUGIN_NOT_FOUND },
        { status: 404 }
      );
    }

    // Try to get download URL
    const download = await getPluginDownloadUrl(id, version);
    
    if (!download) {
      // No version found - check if there's a build in progress
      const db = getDb();
      const latestBuild = await db.query.pluginBuilds.findFirst({
        where: eq(pluginBuilds.pluginId, id),
        orderBy: [desc(pluginBuilds.createdAt)],
      });

      if (latestBuild) {
        if (latestBuild.status === "building" || latestBuild.status === "pending") {
          // Build in progress
          return NextResponse.json(
            {
              error: "Plugin is currently building. Try again in a few minutes.",
              code: ErrorCodes.BUILDING,
              buildId: latestBuild.id,
              buildStatus: latestBuild.status,
            },
            { status: 202 } // Accepted - processing
          );
        } else if (latestBuild.status === "failed") {
          // Build failed
          return NextResponse.json(
            {
              error: "Latest build failed. Developer needs to fix and release again.",
              code: ErrorCodes.BUILD_FAILED,
              buildId: latestBuild.id,
              errorMessage: latestBuild.errorMessage,
            },
            { status: 404 }
          );
        }
      }

      // No builds at all - plugin never had a successful build
      return NextResponse.json(
        {
          error: "No published version available. Developer needs to create a GitHub release.",
          code: ErrorCodes.NO_VERSION,
        },
        { status: 404 }
      );
    }

    // Check if download URL is valid
    if (!download.url) {
      return NextResponse.json(
        {
          error: "Download URL unavailable",
          code: ErrorCodes.DOWNLOAD_UNAVAILABLE,
        },
        { status: 500 }
      );
    }

    // Track download (async, don't wait)
    const headersList = await headers();
    const userId = headersList.get("X-User-Id") || null;
    const ipAddress = headersList.get("X-Forwarded-For")?.split(",")[0] || headersList.get("X-Real-Ip") || null;
    const userAgent = headersList.get("User-Agent") || null;

    // Get version ID for tracking
    const versionRecord = plugin.versions.find((v) => v.version === download.version);

    trackDownload(id, versionRecord?.id || null, userId, ipAddress, userAgent).catch((err) => {
      console.error("Failed to track download:", err);
    });

    // Return download info (client will fetch the file)
    return NextResponse.json({
      url: download.url,
      version: download.version,
      checksum: download.checksum,
    });
  } catch (error) {
    console.error("Error getting download URL:", error);
    return NextResponse.json(
      { error: "Failed to get download URL", code: ErrorCodes.DOWNLOAD_UNAVAILABLE },
      { status: 500 }
    );
  }
}

