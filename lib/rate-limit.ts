import { isDatabaseConfigured, query } from "@/lib/db";

const memory = new Map<string, { windowStart: number; count: number }>();

export async function checkRateLimit(key: string, limit = 10, windowSeconds = 60) {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSeconds);

  if (!isDatabaseConfigured()) {
    const current = memory.get(key);
    if (!current || current.windowStart !== windowStart) {
      memory.set(key, { windowStart, count: 1 });
      return { allowed: true, remaining: limit - 1, resetAt: (windowStart + windowSeconds) * 1000 };
    }
    current.count += 1;
    return {
      allowed: current.count <= limit,
      remaining: Math.max(0, limit - current.count),
      resetAt: (windowStart + windowSeconds) * 1000,
    };
  }

  const result = await query<{ request_count: number }>(
    `INSERT INTO api_rate_limits(bucket_key, window_start, request_count)
     VALUES($1, to_timestamp($2), 1)
     ON CONFLICT(bucket_key, window_start)
     DO UPDATE SET request_count=api_rate_limits.request_count+1, updated_at=now()
     RETURNING request_count`,
    [key, windowStart],
  );
  const count = Number(result.rows[0]?.request_count || 1);

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: (windowStart + windowSeconds) * 1000,
  };
}
