import { NextRequest, NextResponse } from "next/server";
import { getBuildStatus } from "@/lib/build";

type RouteParams = { params: Promise<{ buildId: string }> };

// GET /api/builds/:buildId - Get build status
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { buildId } = await params;
    const build = await getBuildStatus(buildId);

    if (!build) {
      return NextResponse.json({ error: "Build not found" }, { status: 404 });
    }

    return NextResponse.json({ build });
  } catch (error) {
    console.error("Error getting build status:", error);
    return NextResponse.json({ error: "Failed to get build status" }, { status: 500 });
  }
}

