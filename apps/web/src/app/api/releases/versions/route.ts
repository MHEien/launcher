import { createDb, releases, eq, desc, type releaseChannelEnum } from "@launcher/db";
import { NextRequest, NextResponse } from "next/server";

const db = createDb(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const channel = searchParams.get("channel") || "stable";
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  try {
    // Get distinct versions with their publish dates
    const versions = await db
      .selectDistinct({
        version: releases.version,
        channel: releases.channel,
        publishedAt: releases.publishedAt,
        isLatest: releases.isLatest,
        isDeprecated: releases.isDeprecated,
        releaseNotes: releases.releaseNotes,
      })
      .from(releases)
      .where(eq(releases.channel, channel as typeof releaseChannelEnum.enumValues[number]))
      .orderBy(desc(releases.publishedAt))
      .limit(limit);

    return NextResponse.json({
      versions,
      count: versions.length,
    });
  } catch (error) {
    console.error("Error fetching versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch versions" },
      { status: 500 }
    );
  }
}
