import { createDb, releases, eq, and } from "@launcher/db";
import { NextRequest, NextResponse } from "next/server";

const db = createDb(process.env.DATABASE_URL!);

type Platform = "windows" | "macos" | "macos_arm" | "linux" | "linux_appimage" | "linux_deb";

interface LatestRelease {
  version: string;
  channel: string;
  platforms: Record<string, {
    downloadUrl: string;
    fileName: string;
    fileSize: number | null;
    checksum: string | null;
  }>;
  releaseNotes: string | null;
  publishedAt: Date;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const channel = (searchParams.get("channel") || "stable") as "stable" | "beta" | "alpha";

  try {
    const latestReleases = await db
      .select()
      .from(releases)
      .where(
        and(
          eq(releases.isLatest, true),
          eq(releases.channel, channel),
          eq(releases.isDeprecated, false)
        )
      );

    if (latestReleases.length === 0) {
      return NextResponse.json(
        { error: "No releases found" },
        { status: 404 }
      );
    }

    // Group by version and aggregate platforms
    const version = latestReleases[0].version;
    const platforms: LatestRelease["platforms"] = {};

    for (const release of latestReleases) {
      platforms[release.platform] = {
        downloadUrl: release.downloadUrl,
        fileName: release.fileName,
        fileSize: release.fileSize,
        checksum: release.checksum,
      };
    }

    const response: LatestRelease = {
      version,
      channel,
      platforms,
      releaseNotes: latestReleases[0].releaseNotes,
      publishedAt: latestReleases[0].publishedAt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching latest release:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest release" },
      { status: 500 }
    );
  }
}
