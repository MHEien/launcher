import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { createDb, apiKeys } from "@launcher/db";
import { randomBytes, createHash } from "crypto";

const db = createDb(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userKeys = await db.query.apiKeys.findMany({
      where: (key, { eq }) => eq(key.userId, user.id),
      orderBy: (key, { desc }) => [desc(key.createdAt)],
    });

    return NextResponse.json({ keys: userKeys });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Generate a secure API key
    const keyBytes = randomBytes(32);
    const key = `lnch_${keyBytes.toString("base64url")}`;
    const keyPrefix = key.substring(0, 12);
    const keyHash = createHash("sha256").update(key).digest("hex");

    // Insert the API key
    const [newKey] = await db
      .insert(apiKeys)
      .values({
        userId: user.id,
        name: name.trim(),
        keyHash,
        keyPrefix,
      })
      .returning();

    return NextResponse.json({
      key, // Only returned once, never stored in plain text
      apiKey: {
        id: newKey.id,
        name: newKey.name,
        keyPrefix: newKey.keyPrefix,
        lastUsedAt: newKey.lastUsedAt,
        expiresAt: newKey.expiresAt,
        createdAt: newKey.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}
