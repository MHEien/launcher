import { NextRequest, NextResponse } from "next/server";
import { getPluginRatings, submitRating } from "@/lib/plugins/registry";
import { getAuthUserWithName } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/plugins/:id/ratings - Get plugin ratings
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const result = await getPluginRatings(id, Math.min(limit, 50), offset);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error getting ratings:", error);
    return NextResponse.json({ error: "Failed to get ratings" }, { status: 500 });
  }
}

// POST /api/plugins/:id/ratings - Submit a rating
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await getAuthUserWithName();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: pluginId } = await params;
    const { rating, review } = await request.json() as { rating: number; review?: string };

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const result = await submitRating({
      pluginId,
      userId: user.id,
      rating,
      review,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error submitting rating:", error);
    return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 });
  }
}

