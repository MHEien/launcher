import { randomBytes, createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { getRedis } from "@launcher/cache";

// Redis key prefixes
const PENDING_TOKEN_PREFIX = "desktop:pending:";
const REFRESH_TOKEN_PREFIX = "desktop:refresh:";
const ACCESS_TOKEN_PREFIX = "desktop:access:";

// TTL values in seconds
const PENDING_TOKEN_TTL = 5 * 60; // 5 minutes
const ACCESS_TOKEN_TTL = 60 * 60; // 1 hour
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days

// File-based fallback for local development (when Redis is not configured)
const TOKEN_FILE = join(tmpdir(), "launcher-pending-tokens.json");
const REFRESH_TOKEN_FILE = join(tmpdir(), "launcher-refresh-tokens.json");
const ACCESS_TOKEN_FILE = join(tmpdir(), "launcher-access-tokens.json");

interface PendingToken {
  userId: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  expiresAt: number;
}

interface RefreshTokenData {
  userId: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  expiresAt: number;
}

interface AccessTokenData {
  userId: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  tier: string;
  expiresAt: number;
}

// Check if Redis is configured
function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

// ============================================
// File-based storage (fallback for local dev)
// ============================================

function loadPendingTokensFromFile(): Map<string, PendingToken> {
  try {
    if (existsSync(TOKEN_FILE)) {
      const data = JSON.parse(readFileSync(TOKEN_FILE, "utf-8"));
      return new Map(Object.entries(data));
    }
  } catch (e) {
    console.error("[desktop-auth] Failed to load pending tokens from file:", e);
  }
  return new Map();
}

function savePendingTokensToFile(tokens: Map<string, PendingToken>): void {
  try {
    writeFileSync(TOKEN_FILE, JSON.stringify(Object.fromEntries(tokens)));
  } catch (e) {
    console.error("[desktop-auth] Failed to save pending tokens to file:", e);
  }
}

function loadRefreshTokensFromFile(): Map<string, RefreshTokenData> {
  try {
    if (existsSync(REFRESH_TOKEN_FILE)) {
      const data = JSON.parse(readFileSync(REFRESH_TOKEN_FILE, "utf-8"));
      return new Map(Object.entries(data));
    }
  } catch (e) {
    console.error("[desktop-auth] Failed to load refresh tokens from file:", e);
  }
  return new Map();
}

function saveRefreshTokensToFile(tokens: Map<string, RefreshTokenData>): void {
  try {
    writeFileSync(REFRESH_TOKEN_FILE, JSON.stringify(Object.fromEntries(tokens)));
  } catch (e) {
    console.error("[desktop-auth] Failed to save refresh tokens to file:", e);
  }
}

function loadAccessTokensFromFile(): Map<string, AccessTokenData> {
  try {
    if (existsSync(ACCESS_TOKEN_FILE)) {
      const data = JSON.parse(readFileSync(ACCESS_TOKEN_FILE, "utf-8"));
      return new Map(Object.entries(data));
    }
  } catch (e) {
    console.error("[desktop-auth] Failed to load access tokens from file:", e);
  }
  return new Map();
}

function saveAccessTokensToFile(tokens: Map<string, AccessTokenData>): void {
  try {
    writeFileSync(ACCESS_TOKEN_FILE, JSON.stringify(Object.fromEntries(tokens)));
  } catch (e) {
    console.error("[desktop-auth] Failed to save access tokens to file:", e);
  }
}

// ============================================
// Main exports (use Redis in production, file in dev)
// ============================================

export async function generatePendingToken(user: {
  id: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
}): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + PENDING_TOKEN_TTL * 1000;

  const tokenData: PendingToken = {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    expiresAt,
  };

  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.set(PENDING_TOKEN_PREFIX + token, tokenData, { ex: PENDING_TOKEN_TTL });
      console.log(`[desktop-auth] Generated token for user ${user.id} (stored in Redis)`);
    } catch (e) {
      console.error("[desktop-auth] Failed to store pending token in Redis:", e);
      throw new Error("Failed to generate authentication token");
    }
  } else {
    // File-based fallback for local development
    const tokens = loadPendingTokensFromFile();
    tokens.set(token, tokenData);
    savePendingTokensToFile(tokens);
    console.log(`[desktop-auth] Generated token for user ${user.id} (stored in file, count: ${tokens.size})`);
    cleanupExpiredTokensFromFile();
  }

  return token;
}

export async function validateAndConsumePendingToken(token: string): Promise<PendingToken | null> {
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const key = PENDING_TOKEN_PREFIX + token;
      const pending = await redis.get<PendingToken>(key);

      console.log(`[desktop-auth] Validating token from Redis, found: ${!!pending}`);

      if (!pending) {
        console.log(`[desktop-auth] Token not found in Redis`);
        return null;
      }

      if (pending.expiresAt < Date.now()) {
        await redis.del(key);
        console.log(`[desktop-auth] Token expired`);
        return null;
      }

      // One-time use - delete after validation
      await redis.del(key);
      console.log(`[desktop-auth] Token validated and consumed for user ${pending.userId}`);
      return pending;
    } catch (e) {
      console.error("[desktop-auth] Failed to validate pending token from Redis:", e);
      return null;
    }
  } else {
    // File-based fallback for local development
    const tokens = loadPendingTokensFromFile();
    console.log(`[desktop-auth] Validating token from file, pending tokens count: ${tokens.size}`);
    const pending = tokens.get(token);

    if (!pending) {
      console.log(`[desktop-auth] Token not found in file storage`);
      return null;
    }

    if (pending.expiresAt < Date.now()) {
      tokens.delete(token);
      savePendingTokensToFile(tokens);
      return null;
    }

    // One-time use - delete after validation
    tokens.delete(token);
    savePendingTokensToFile(tokens);
    return pending;
  }
}

export async function generateTokenPair(user: {
  userId: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  tier?: string;
}): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
  const accessToken = `lnch_${randomBytes(32).toString("base64url")}`;
  const refreshToken = randomBytes(48).toString("base64url");

  // Access token expires in 1 hour
  const accessExpiresAt = Date.now() + ACCESS_TOKEN_TTL * 1000;
  const expiresAt = Math.floor(accessExpiresAt / 1000);

  // Refresh token expires in 30 days
  const refreshExpiresAt = Date.now() + REFRESH_TOKEN_TTL * 1000;

  const accessHash = createHash("sha256").update(accessToken).digest("hex");
  const accessData: AccessTokenData = {
    userId: user.userId,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    tier: user.tier || "free",
    expiresAt: accessExpiresAt,
  };

  const refreshHash = createHash("sha256").update(refreshToken).digest("hex");
  const refreshData: RefreshTokenData = {
    userId: user.userId,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    expiresAt: refreshExpiresAt,
  };

  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      // Store both access and refresh tokens
      await Promise.all([
        redis.set(ACCESS_TOKEN_PREFIX + accessHash, accessData, { ex: ACCESS_TOKEN_TTL }),
        redis.set(REFRESH_TOKEN_PREFIX + refreshHash, refreshData, { ex: REFRESH_TOKEN_TTL }),
      ]);
      console.log(`[desktop-auth] Generated token pair for user ${user.userId} (stored in Redis)`);
    } catch (e) {
      console.error("[desktop-auth] Failed to store tokens in Redis:", e);
      throw new Error("Failed to generate token pair");
    }
  } else {
    // File-based fallback
    const accessTokens = loadAccessTokensFromFile();
    accessTokens.set(accessHash, accessData);
    saveAccessTokensToFile(accessTokens);

    const refreshTokens = loadRefreshTokensFromFile();
    refreshTokens.set(refreshHash, refreshData);
    saveRefreshTokensToFile(refreshTokens);
  }

  return { accessToken, refreshToken, expiresAt };
}

export async function validateAccessToken(token: string): Promise<AccessTokenData | null> {
  // Access tokens have the format: lnch_{base64url}
  if (!token.startsWith("lnch_")) {
    return null;
  }

  const hash = createHash("sha256").update(token).digest("hex");

  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const key = ACCESS_TOKEN_PREFIX + hash;
      const data = await redis.get<AccessTokenData>(key);

      if (!data) {
        return null;
      }

      if (data.expiresAt < Date.now()) {
        await redis.del(key);
        return null;
      }

      return data;
    } catch (e) {
      console.error("[desktop-auth] Failed to validate access token from Redis:", e);
      return null;
    }
  } else {
    // File-based fallback
    const tokens = loadAccessTokensFromFile();
    const data = tokens.get(hash);

    if (!data) {
      return null;
    }

    if (data.expiresAt < Date.now()) {
      tokens.delete(hash);
      saveAccessTokensToFile(tokens);
      return null;
    }

    return data;
  }
}

export async function validateRefreshToken(token: string): Promise<RefreshTokenData | null> {
  const hash = createHash("sha256").update(token).digest("hex");

  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const key = REFRESH_TOKEN_PREFIX + hash;
      const data = await redis.get<RefreshTokenData>(key);

      if (!data) {
        return null;
      }

      if (data.expiresAt < Date.now()) {
        await redis.del(key);
        return null;
      }

      return data;
    } catch (e) {
      console.error("[desktop-auth] Failed to validate refresh token from Redis:", e);
      return null;
    }
  } else {
    // File-based fallback
    const tokens = loadRefreshTokensFromFile();
    const data = tokens.get(hash);

    if (!data) {
      return null;
    }

    if (data.expiresAt < Date.now()) {
      tokens.delete(hash);
      saveRefreshTokensToFile(tokens);
      return null;
    }

    return data;
  }
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const hash = createHash("sha256").update(token).digest("hex");

  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.del(REFRESH_TOKEN_PREFIX + hash);
    } catch (e) {
      console.error("[desktop-auth] Failed to revoke refresh token from Redis:", e);
    }
  } else {
    // File-based fallback
    const tokens = loadRefreshTokensFromFile();
    tokens.delete(hash);
    saveRefreshTokensToFile(tokens);
  }
}

// File-based cleanup (only used in local dev)
function cleanupExpiredTokensFromFile(): void {
  const now = Date.now();

  const pending = loadPendingTokensFromFile();
  let pendingChanged = false;
  for (const [key, value] of pending.entries()) {
    if (value.expiresAt < now) {
      pending.delete(key);
      pendingChanged = true;
    }
  }
  if (pendingChanged) savePendingTokensToFile(pending);

  const access = loadAccessTokensFromFile();
  let accessChanged = false;
  for (const [key, value] of access.entries()) {
    if (value.expiresAt < now) {
      access.delete(key);
      accessChanged = true;
    }
  }
  if (accessChanged) saveAccessTokensToFile(access);

  const refresh = loadRefreshTokensFromFile();
  let refreshChanged = false;
  for (const [key, value] of refresh.entries()) {
    if (value.expiresAt < now) {
      refresh.delete(key);
      refreshChanged = true;
    }
  }
  if (refreshChanged) saveRefreshTokensToFile(refresh);
}

// Legacy exports for compatibility (deprecated, do not use)
export const pendingTokens = new Map<string, PendingToken>();
export const refreshTokens = new Map<string, RefreshTokenData>();
