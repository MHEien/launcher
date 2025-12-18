import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getPlugin, getPluginDownloadUrl, trackDownload } from "@/lib/plugins/registry";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/plugins/:id/download - Get download URL and track download
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const version = searchParams.get("version") || undefined;

    const download = await getPluginDownloadUrl(id, version);
    if (!download) {
      return NextResponse.json({ error: "Plugin or version not found" }, { status: 404 });
    }

    // Track download (async, don't wait)
    const headersList = await headers();
    const userId = headersList.get("X-User-Id") || null;
    const ipAddress = headersList.get("X-Forwarded-For")?.split(",")[0] || headersList.get("X-Real-Ip") || null;
    const userAgent = headersList.get("User-Agent") || null;

    // Get version ID for tracking
    const plugin = await getPlugin(id);
    const versionRecord = plugin?.versions.find((v) => v.version === download.version);

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
    return NextResponse.json({ error: "Failed to get download URL" }, { status: 500 });
  }
}

