/**
 * In-memory sliding-window limiter. Architecture for Phase 1B Private Beta — replace with a
 * shared store (Redis / Upstash) before multi-instance production traffic.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

export function rateLimit(
  key: string,
  options: { windowMs: number; max: number } = { windowMs: 60_000, max: 60 },
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < options.windowMs);
  if (bucket.timestamps.length >= options.max) {
    const oldest = bucket.timestamps[0] ?? now;
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, options.windowMs - (now - oldest)),
    };
  }
  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: options.max - bucket.timestamps.length,
    retryAfterMs: 0,
  };
}

export function assertRateLimit(key: string, options?: { windowMs: number; max: number }) {
  const result = rateLimit(key, options);
  if (!result.allowed) {
    const error = new Error("Too many requests. Please wait and try again.");
    (error as Error & { status: number }).status = 429;
    throw error;
  }
  return result;
}
