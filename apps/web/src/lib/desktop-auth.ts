import { randomBytes, createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

// File-based token store for development (Next.js uses multiple processes)
// In production, use Redis with TTL
const TOKEN_FILE = join(tmpdir(), "launcher-pending-tokens.json");
const REFRESH_TOKEN_FILE = join(tmpdir(), "launcher-refresh-tokens.json");

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

function loadPendingTokens(): Map<string, PendingToken> {
  try {
    if (existsSync(TOKEN_FILE)) {
      const data = JSON.parse(readFileSync(TOKEN_FILE, "utf-8"));
      return new Map(Object.entries(data));
    }
  } catch (e) {
    console.error("[desktop-auth] Failed to load pending tokens:", e);
  }
  return new Map();
}

function savePendingTokens(tokens: Map<string, PendingToken>): void {
  try {
    writeFileSync(TOKEN_FILE, JSON.stringify(Object.fromEntries(tokens)));
  } catch (e) {
    console.error("[desktop-auth] Failed to save pending tokens:", e);
  }
}

function loadRefreshTokens(): Map<string, RefreshTokenData> {
  try {
    if (existsSync(REFRESH_TOKEN_FILE)) {
      const data = JSON.parse(readFileSync(REFRESH_TOKEN_FILE, "utf-8"));
      return new Map(Object.entries(data));
    }
  } catch (e) {
    console.error("[desktop-auth] Failed to load refresh tokens:", e);
  }
  return new Map();
}

function saveRefreshTokens(tokens: Map<string, RefreshTokenData>): void {
  try {
    writeFileSync(REFRESH_TOKEN_FILE, JSON.stringify(Object.fromEntries(tokens)));
  } catch (e) {
    console.error("[desktop-auth] Failed to save refresh tokens:", e);
  }
}

// Use getter functions to always load fresh from file
function getPendingTokens(): Map<string, PendingToken> {
  return loadPendingTokens();
}

function getRefreshTokens(): Map<string, RefreshTokenData> {
  return loadRefreshTokens();
}

// Legacy exports for compatibility (not used directly anymore)
export const pendingTokens = new Map<string, PendingToken>();
export const refreshTokens = new Map<string, RefreshTokenData>();

export function generatePendingToken(user: {
  id: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
}): string {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  const tokens = getPendingTokens();
  tokens.set(token, {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    expiresAt,
  });
  savePendingTokens(tokens);

  console.log(`[desktop-auth] Generated token for user ${user.id}, pending tokens count: ${tokens.size}`);

  // Clean up expired tokens
  cleanupExpiredTokens();

  return token;
}

export function validateAndConsumePendingToken(token: string): PendingToken | null {
  const tokens = getPendingTokens();
  console.log(`[desktop-auth] Validating token, pending tokens count: ${tokens.size}`);
  const pending = tokens.get(token);

  if (!pending) {
    console.log(`[desktop-auth] Token not found in pending tokens`);
    return null;
  }

  if (pending.expiresAt < Date.now()) {
    tokens.delete(token);
    savePendingTokens(tokens);
    return null;
  }

  // One-time use - delete after validation
  tokens.delete(token);
  savePendingTokens(tokens);
  return pending;
}

export function generateTokenPair(user: {
  userId: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
}): { accessToken: string; refreshToken: string; expiresAt: number } {
  const accessToken = `lnch_${randomBytes(32).toString("base64url")}`;
  const refreshToken = randomBytes(48).toString("base64url");

  // Access token expires in 1 hour
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;

  // Refresh token expires in 30 days
  const refreshExpiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

  // Store refresh token hash
  const tokens = getRefreshTokens();
  const refreshHash = createHash("sha256").update(refreshToken).digest("hex");
  tokens.set(refreshHash, {
    userId: user.userId,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    expiresAt: refreshExpiresAt,
  });
  saveRefreshTokens(tokens);

  return { accessToken, refreshToken, expiresAt };
}

export function validateRefreshToken(token: string): RefreshTokenData | null {
  const tokens = getRefreshTokens();
  const hash = createHash("sha256").update(token).digest("hex");
  const data = tokens.get(hash);

  if (!data) {
    return null;
  }

  if (data.expiresAt < Date.now()) {
    tokens.delete(hash);
    saveRefreshTokens(tokens);
    return null;
  }

  return data;
}

export function revokeRefreshToken(token: string): void {
  const tokens = getRefreshTokens();
  const hash = createHash("sha256").update(token).digest("hex");
  tokens.delete(hash);
  saveRefreshTokens(tokens);
}

function cleanupExpiredTokens(): void {
  const now = Date.now();

  const pending = getPendingTokens();
  let pendingChanged = false;
  for (const [key, value] of pending.entries()) {
    if (value.expiresAt < now) {
      pending.delete(key);
      pendingChanged = true;
    }
  }
  if (pendingChanged) savePendingTokens(pending);

  const refresh = getRefreshTokens();
  let refreshChanged = false;
  for (const [key, value] of refresh.entries()) {
    if (value.expiresAt < now) {
      refresh.delete(key);
      refreshChanged = true;
    }
  }
  if (refreshChanged) saveRefreshTokens(refresh);
}
