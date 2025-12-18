import { NextRequest, NextResponse } from "next/server";
import { getPluginsByAuthor } from "@/lib/plugins/registry";
import { getAuthUserWithName } from "@/lib/auth";

type RouteParams = { params: Promise<{ authorId: string }> };

// GET /api/authors/:authorId/plugins - Get plugins by author
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { authorId } = await params;
    const user = await getAuthUserWithName();
    const includeUnpublished = user?.id === authorId;

    const plugins = await getPluginsByAuthor(authorId, includeUnpublished);
    return NextResponse.json({ plugins });
  } catch (error) {
    console.error("Error getting author plugins:", error);
    return NextResponse.json({ error: "Failed to get author plugins" }, { status: 500 });
  }
}

