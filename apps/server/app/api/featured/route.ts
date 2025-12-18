import { NextRequest, NextResponse } from "next/server";
import { getFeaturedPlugins } from "@/lib/plugins/registry";

// GET /api/featured - Get featured plugins
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "6");
    const plugins = await getFeaturedPlugins(Math.min(limit, 20));
    return NextResponse.json({ plugins });
  } catch (error) {
    console.error("Error getting featured plugins:", error);
    return NextResponse.json({ error: "Failed to get featured plugins" }, { status: 500 });
  }
}

