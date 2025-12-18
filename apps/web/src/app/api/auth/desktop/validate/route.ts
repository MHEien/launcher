import { NextRequest, NextResponse } from "next/server";
import { validateAccessToken } from "@/lib/desktop-auth";

/**
 * POST /api/auth/desktop/validate
 * Validates a desktop access token and returns user info
 * 
 * This endpoint is called by the server API to validate tokens
 * issued to the desktop app.
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify internal service key for server-to-server calls
    const serviceKey = request.headers.get("X-Service-Key");
    const expectedKey = process.env.INTERNAL_SERVICE_KEY;
    
    if (expectedKey && serviceKey !== expectedKey) {
      // If service key is configured but not provided/wrong, reject
      return NextResponse.json({ valid: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ valid: false, error: "Token is required" }, { status: 400 });
    }

    // Validate the access token
    const userData = await validateAccessToken(token);

    if (!userData) {
      return NextResponse.json({ valid: false, error: "Invalid or expired token" }, { status: 401 });
    }

    // Return user info for the server to use
    return NextResponse.json({
      valid: true,
      userId: userData.userId,
      email: userData.email,
      name: userData.name,
      tier: userData.tier || "free",
    });
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate token" },
      { status: 500 }
    );
  }
}

