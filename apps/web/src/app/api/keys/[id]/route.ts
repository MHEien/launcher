import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { createDb, apiKeys, sql } from "@launcher/db";

const db = createDb(process.env.DATABASE_URL!);

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify the key belongs to the user before deleting
    const existingKey = await db.query.apiKeys.findFirst({
      where: (key, { eq, and }) => and(eq(key.id, id), eq(key.userId, user.id)),
    });

    if (!existingKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    // Delete the key
    await db.delete(apiKeys).where(sql`${apiKeys.id} = ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}
