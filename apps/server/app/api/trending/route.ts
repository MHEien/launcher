import { NextRequest, NextResponse } from "next/server";
import { getTrendingPlugins } from "@/lib/plugins/registry";

// GET /api/trending - Get trending plugins
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const plugins = await getTrendingPlugins(Math.min(limit, 20));
    return NextResponse.json({ plugins });
  } catch (error) {
    console.error("Error getting trending plugins:", error);
    return NextResponse.json({ error: "Failed to get trending plugins" }, { status: 500 });
  }
}

