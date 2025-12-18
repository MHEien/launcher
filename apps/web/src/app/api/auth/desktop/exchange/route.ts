import { NextRequest, NextResponse } from "next/server";
import {
  validateAndConsumePendingToken,
  generateTokenPair,
} from "@/lib/desktop-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Validate and consume the pending token
    const pending = await validateAndConsumePendingToken(token);

    if (!pending) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken, expiresAt } = await generateTokenPair({
      userId: pending.userId,
      email: pending.email,
      name: pending.name,
      avatar: pending.avatar,
    });

    // Return session data
    return NextResponse.json({
      user_id: pending.userId,
      email: pending.email,
      name: pending.name,
      avatar: pending.avatar,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error("Token exchange error:", error);
    return NextResponse.json(
      { error: "Failed to exchange token" },
      { status: 500 }
    );
  }
}
