import { NextRequest, NextResponse } from "next/server";
import { getPluginBuilds } from "@/lib/build";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/plugins/:id/builds - Get builds for a plugin
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: pluginId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    
    const builds = await getPluginBuilds(pluginId, Math.min(limit, 50));
    return NextResponse.json({ builds });
  } catch (error) {
    console.error("Error getting plugin builds:", error);
    return NextResponse.json({ error: "Failed to get plugin builds" }, { status: 500 });
  }
}

