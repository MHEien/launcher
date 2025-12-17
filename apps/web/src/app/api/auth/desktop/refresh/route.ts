import { NextRequest, NextResponse } from "next/server";
import {
  validateRefreshToken,
  generateTokenPair,
  revokeRefreshToken,
} from "@/lib/desktop-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json({ error: "Refresh token is required" }, { status: 400 });
    }

    // Validate the refresh token
    const tokenData = validateRefreshToken(refresh_token);

    if (!tokenData) {
      return NextResponse.json({ error: "Invalid or expired refresh token" }, { status: 401 });
    }

    // Revoke the old refresh token
    revokeRefreshToken(refresh_token);

    // Generate new token pair
    const { accessToken, refreshToken, expiresAt } = generateTokenPair({
      userId: tokenData.userId,
      email: tokenData.email,
      name: tokenData.name,
      avatar: tokenData.avatar,
    });

    // Return new session data
    return NextResponse.json({
      user_id: tokenData.userId,
      email: tokenData.email,
      name: tokenData.name,
      avatar: tokenData.avatar,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 }
    );
  }
}
