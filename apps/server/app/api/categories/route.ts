import { NextResponse } from "next/server";
import { getCategories } from "@/lib/plugins/registry";

// GET /api/categories - Get all categories
export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error getting categories:", error);
    return NextResponse.json({ error: "Failed to get categories" }, { status: 500 });
  }
}

