import { createDb, releases, eq, and, desc } from "@launcher/db";
import { NextRequest, NextResponse } from "next/server";

const db = createDb(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get("platform");
  const version = searchParams.get("version");
  const channel = searchParams.get("channel") || "stable";
  const latest = searchParams.get("latest") === "true";

  try {
    let query = db.select().from(releases);

    const conditions = [];

    if (platform) {
      conditions.push(eq(releases.platform, platform as any));
    }

    if (version) {
      conditions.push(eq(releases.version, version));
    }

    if (channel) {
      conditions.push(eq(releases.channel, channel as any));
    }

    if (latest) {
      conditions.push(eq(releases.isLatest, true));
    }

    // Exclude deprecated releases unless specifically requested
    if (!searchParams.get("include_deprecated")) {
      conditions.push(eq(releases.isDeprecated, false));
    }

    const results = await query
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(releases.publishedAt));

    return NextResponse.json({
      releases: results,
      count: results.length,
    });
  } catch (error) {
    console.error("Error fetching releases:", error);
    return NextResponse.json(
      { error: "Failed to fetch releases" },
      { status: 500 }
    );
  }
}
