import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { rateLimit, type RateLimitOptions, type RateLimitResult } from "@/lib/rate-limit";

export { getClientIp, rateLimitResponse } from "@/lib/rate-limit";

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().slice(0, 300);
}

function useSharedRateLimitStore(): boolean {
  if (process.env.RATE_LIMIT_STORE === "memory") return false;
  if (process.env.RATE_LIMIT_STORE === "postgres") return true;
  return process.env.NODE_ENV === "production" && Boolean(process.env.DATABASE_URL?.trim());
}

export async function consumeRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  if (!useSharedRateLimitStore()) return rateLimit(options);
  try {
    return await consumeSharedRateLimit(options);
  } catch {
    return rateLimit(options);
  }
}

export async function consumeSharedRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const key = normalizeKey(options.key);
  const limit = Math.max(1, Math.floor(options.limit));
  const windowMs = Math.max(1_000, Math.floor(options.windowMs));

  const rows = await db.execute(sql`
    INSERT INTO rate_limit_buckets (bucket_key, hit_count, reset_at)
    VALUES (${key}, 1, NOW() + (${windowMs}::int * INTERVAL '1 millisecond'))
    ON CONFLICT (bucket_key) DO UPDATE
    SET
      hit_count = CASE
        WHEN rate_limit_buckets.reset_at <= NOW() THEN 1
        ELSE rate_limit_buckets.hit_count + 1
      END,
      reset_at = CASE
        WHEN rate_limit_buckets.reset_at <= NOW()
          THEN NOW() + (${windowMs}::int * INTERVAL '1 millisecond')
        ELSE rate_limit_buckets.reset_at
      END
    RETURNING hit_count, reset_at
  `);

  const row = Array.isArray(rows)
    ? (rows[0] as { hit_count?: number; reset_at?: Date | string } | undefined)
    : (rows as { rows?: Array<{ hit_count?: number; reset_at?: Date | string }> }).rows?.[0];

  const count = Number(row?.hit_count ?? 1);
  const resetAtRaw = row?.reset_at;
  const resetAt =
    resetAtRaw instanceof Date
      ? resetAtRaw.getTime()
      : resetAtRaw
        ? new Date(resetAtRaw).getTime()
        : Date.now() + windowMs;
  const allowed = count <= limit;

  return {
    allowed,
    limit,
    remaining: allowed ? Math.max(0, limit - count) : 0,
    resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - Date.now()) / 1_000)),
  };
}
