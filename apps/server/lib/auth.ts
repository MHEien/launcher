/**
 * Authentication helpers for API routes
 */

import { headers } from "next/headers";
import type { UserSession, ModelTier } from "@/lib/ai/types";

/**
 * Validate user session and extract tier info
 * In production, this would validate the auth token
 */
export async function getAuthUser(): Promise<UserSession | null> {
  const headersList = await headers();
  const authHeader = headersList.get("Authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  
  // TODO: Validate token with your auth provider
  // For now, decode a simple JWT-like structure or use a test user
  
  // Placeholder: In production, validate against your auth service
  if (token === "test-free") {
    return { userId: "test-free", tier: "free", limits: { aiQueriesPerMonth: 50, aiEmbeddingsPerMonth: 100, maxPlugins: 5 } };
  }
  if (token === "test-pro") {
    return { userId: "test-pro", tier: "pro", limits: { aiQueriesPerMonth: 1000, aiEmbeddingsPerMonth: 5000, maxPlugins: 50 } };
  }
  if (token === "test-pro-plus") {
    return { userId: "test-pro-plus", tier: "pro_plus", limits: { aiQueriesPerMonth: 10000, aiEmbeddingsPerMonth: 50000, maxPlugins: -1 } };
  }

  // Default to free tier for any valid-looking token
  // In production, properly validate and extract user info
  if (token.length > 10) {
    return { userId: "user-" + token.slice(0, 8), tier: "free", limits: { aiQueriesPerMonth: 50, aiEmbeddingsPerMonth: 100, maxPlugins: 5 } };
  }

  return null;
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

