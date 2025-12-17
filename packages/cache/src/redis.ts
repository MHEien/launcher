import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;

export function createRedis(url: string, token: string): Redis {
  return new Redis({ url, token });
}

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisClient;
}

// Rate limiting helper
export async function checkRateLimit(
  redis: Redis,
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowSeconds)}`;

  const count = await redis.incr(windowKey);

  if (count === 1) {
    await redis.expire(windowKey, windowSeconds);
  }

  const resetAt = (Math.floor(now / windowSeconds) + 1) * windowSeconds;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}

// Cache helpers
export async function getCached<T>(redis: Redis, key: string): Promise<T | null> {
  return redis.get<T>(key);
}

export async function setCache<T>(
  redis: Redis,
  key: string,
  value: T,
  expirationSeconds?: number
): Promise<void> {
  if (expirationSeconds) {
    await redis.set(key, value, { ex: expirationSeconds });
  } else {
    await redis.set(key, value);
  }
}

export async function invalidateCache(redis: Redis, pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

export { Redis };
