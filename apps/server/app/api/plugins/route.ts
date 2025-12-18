import { NextRequest, NextResponse } from "next/server";
import { searchPlugins, createPlugin } from "@/lib/plugins/registry";
import type { CreatePluginInput } from "@/lib/plugins/types";
import { getAuthUserWithName } from "@/lib/auth";

// GET /api/plugins - Search/list plugins
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get("q") || undefined;
    const category = searchParams.get("category") || undefined;
    const tags = searchParams.get("tags")?.split(",").filter(Boolean);
    const verified = searchParams.get("verified") === "true" ? true : undefined;
    const featured = searchParams.get("featured") === "true" ? true : undefined;
    const sortBy = searchParams.get("sort") as "downloads" | "rating" | "newest" | "weekly" | undefined;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

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

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error searching plugins:", error);
    return NextResponse.json({ error: "Failed to search plugins" }, { status: 500 });
  }
}

// POST /api/plugins - Create a new plugin
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserWithName();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as CreatePluginInput;
    
    // Validate required fields
    if (!body.id || !body.name) {
      return NextResponse.json({ error: "id and name are required" }, { status: 400 });
    }

    // Validate plugin ID format (lowercase, alphanumeric, hyphens)
    if (!/^[a-z0-9-]+$/.test(body.id)) {
      return NextResponse.json({ error: "Plugin ID must be lowercase alphanumeric with hyphens" }, { status: 400 });
    }

    const result = await createPlugin(body, user.id, user.name);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "23505") {
      // Unique constraint violation
      return NextResponse.json({ error: "Plugin ID already exists" }, { status: 409 });
    }
    console.error("Error creating plugin:", error);
    return NextResponse.json({ error: "Failed to create plugin" }, { status: 500 });
  }
}

