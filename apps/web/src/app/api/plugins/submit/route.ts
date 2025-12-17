import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { createDb, plugins, sql } from "@launcher/db";

const db = createDb(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      name,
      version,
      description,
      longDescription,
      homepage,
      repository,
      downloadUrl,
      categories,
      permissions,
    } = body;

    // Validation
    if (!id || !name || !version || !description || !downloadUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate ID format
    if (!/^[a-z0-9-]+$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid plugin ID format" },
        { status: 400 }
      );
    }

    // Validate version format
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      return NextResponse.json(
        { error: "Invalid version format (use semver: x.y.z)" },
        { status: 400 }
      );
    }

    // Check if plugin ID already exists
    const existing = await db.query.plugins.findFirst({
      where: (p, { eq }) => eq(p.id, id),
    });

    if (existing) {
      return NextResponse.json(
        { error: "A plugin with this ID already exists" },
        { status: 409 }
      );
    }

    // Insert the plugin
    await db.insert(plugins).values({
      id,
      name,
      version,
      authorId: user.id,
      authorName: user.displayName || user.primaryEmail || "Anonymous",
      description,
      longDescription: longDescription || null,
      homepage: homepage || null,
      repository: repository || null,
      downloadUrl,
      categories: categories || [],
      permissions: permissions || [],
      downloads: 0,
      ratingCount: 0,
      verified: false,
      featured: false,
      publishedAt: new Date(),
    });

    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error("Plugin submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit plugin" },
      { status: 500 }
    );
  }
}
