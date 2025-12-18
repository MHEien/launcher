/**
 * Authentication helpers for API routes
 */

import { headers } from "next/headers";
import type { UserSession, ModelTier } from "@/lib/ai/types";

// Token cache to reduce validation overhead (simple in-memory, use Redis in production)
const tokenCache = new Map<string, { session: UserSession; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cleanup expired cache entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of tokenCache.entries()) {
      if (now > value.expiresAt) {
        tokenCache.delete(key);
      }
    }
  }, 60000);
}

/**
 * Validate user session and extract tier info
 */
export async function getAuthUser(): Promise<UserSession | null> {
  const headersList = await headers();
  const authHeader = headersList.get("Authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  
  // Check cache first
  const cached = tokenCache.get(token);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.session;
  }
  
  // Test tokens ONLY for development - never accept in production
  if (process.env.NODE_ENV === "development") {
    if (token === "test-free") {
      return cacheSession(token, { userId: "test-free", tier: "free", limits: { aiQueriesPerMonth: 10, aiEmbeddingsPerMonth: 100, maxPlugins: 5 } });
    }
    if (token === "test-pro") {
      return cacheSession(token, { userId: "test-pro", tier: "pro", limits: { aiQueriesPerMonth: 1000, aiEmbeddingsPerMonth: 5000, maxPlugins: 50 } });
    }
    if (token === "test-pro-plus") {
      return cacheSession(token, { userId: "test-pro-plus", tier: "pro_plus", limits: { aiQueriesPerMonth: 10000, aiEmbeddingsPerMonth: 50000, maxPlugins: -1 } });
    }
  }

  // Validate desktop app tokens (format: lnch_{base64url})
  if (token.startsWith("lnch_")) {
    const session = await validateDesktopToken(token);
    if (session) {
      return cacheSession(token, session);
    }
    return null;
  }

  // Legacy/fallback: Accept valid-looking tokens for development
  if (process.env.NODE_ENV === "development" && token.length > 10) {
    return cacheSession(token, { 
      userId: "user-" + token.slice(0, 8), 
      tier: "free", 
      limits: { aiQueriesPerMonth: 10, aiEmbeddingsPerMonth: 100, maxPlugins: 5 } 
    });
  }

  return null;
}

/**
 * Cache a validated session
 */
function cacheSession(token: string, session: UserSession): UserSession {
  tokenCache.set(token, { session, expiresAt: Date.now() + CACHE_TTL });
  return session;
}

/**
 * Validate desktop auth tokens by calling the web app
 * Desktop tokens are issued by the web app's /api/auth/desktop/exchange endpoint
 */
async function validateDesktopToken(token: string): Promise<UserSession | null> {
  const webAppUrl = process.env.WEB_APP_URL || process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";
  
  try {
    // Call the web app to validate the token
    const response = await fetch(`${webAppUrl}/api/auth/desktop/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Use internal service key if configured
        ...(process.env.INTERNAL_SERVICE_KEY && {
          "X-Service-Key": process.env.INTERNAL_SERVICE_KEY,
        }),
      },
      body: JSON.stringify({ token }),
    });
    
    if (!response.ok) {
      console.warn(`[auth] Token validation failed: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.valid || !data.userId) {
      return null;
    }
    
    // Map subscription tier from web app
    const tierMap: Record<string, ModelTier> = {
      free: "free",
      pro: "pro", 
      pro_plus: "pro_plus",
    };
    
    const tier = tierMap[data.tier] || "free";
    const limits = getTierLimits(tier);
    
    return {
      userId: data.userId,
      tier,
      limits,
    };
  } catch (error) {
    console.error("[auth] Failed to validate desktop token:", error);
    
    // In development, allow tokens through with basic validation
    if (process.env.NODE_ENV === "development") {
      console.warn("[auth] Development mode: accepting token without validation");
      return {
        userId: `dev-${token.slice(5, 13)}`,
        tier: "free",
        limits: getTierLimits("free"),
      };
    }
    
    return null;
  }
}

/**
 * Get tier limits
 */
function getTierLimits(tier: ModelTier) {
  const limits = {
    free: { aiQueriesPerMonth: 10, aiEmbeddingsPerMonth: 100, maxPlugins: 5 },
    pro: { aiQueriesPerMonth: 1000, aiEmbeddingsPerMonth: 5000, maxPlugins: 50 },
    pro_plus: { aiQueriesPerMonth: 10000, aiEmbeddingsPerMonth: 50000, maxPlugins: -1 },
  };
  return limits[tier];
}

/**
 * Get auth user with name (for plugin operations)
 */
export async function getAuthUserWithName(): Promise<{ id: string; name: string } | null> {
  const session = await getAuthUser();
  if (!session) return null;
  
  // In production, fetch user details from your auth service
  return {
    id: session.userId,
    name: session.userId.startsWith("test-") ? "Test User" : "User",
  };
}

