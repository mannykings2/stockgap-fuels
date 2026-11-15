/**
 * Minimal in-memory rate limiter.
 *
 * Adequate for a single-process prototype; a multi-instance deployment would
 * move this counter into Redis or the database. Used to slow down credential
 * stuffing against the login endpoint.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface LimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function consume(key: string, limit: number, windowMs: number): LimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function reset(key: string): void {
  buckets.delete(key);
}

/** Test helper: drop every bucket. */
export function clearAll(): void {
  buckets.clear();
}
