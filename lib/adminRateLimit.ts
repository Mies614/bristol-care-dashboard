/**
 * Lightweight admin rate limiter.
 *
 * Limits login attempts per IP to prevent brute force.
 * Uses in-memory storage (resets on cold start in serverless).
 * For production hardening, migrate to Vercel KV or Upstash Redis.
 *
 * ⚠️  Vercel serverless limitation:
 *   Each function instance has its own in-memory store.
 *   Cold starts reset the counter. For true distributed rate limiting,
 *   use Vercel KV: https://vercel.com/docs/storage/vercel-kv
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
  blockedUntil: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt && now > entry.blockedUntil) {
      store.delete(key);
    }
  }
}

/**
 * Configuration for rate limiting.
 * Defaults are tuned for admin login protection:
 * - 5 attempts per 15 minutes
 * - 15 minute block after exceeding limit
 */
export interface RateLimitConfig {
  maxAttempts: number;    // max attempts per window
  windowMs: number;       // time window in milliseconds
  blockDurationMs: number; // how long to block after exceeding
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,      // 15 minutes
  blockDurationMs: 15 * 60 * 1000, // 15 minutes
};

/**
 * Check if a key (IP address) is rate limited.
 * Returns { allowed: true } if the request can proceed,
 * or { allowed: false, retryAfter } if blocked.
 */
export function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {}
): { allowed: true } | { allowed: false; retryAfter: number } {
  cleanup();
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();

  const entry = store.get(key);

  // Check if currently blocked
  if (entry && now < entry.blockedUntil) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  // Reset expired window
  if (entry && now > entry.resetAt && now > entry.blockedUntil) {
    store.set(key, { count: 1, resetAt: now + cfg.windowMs, blockedUntil: 0 });
    return { allowed: true };
  }

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + cfg.windowMs, blockedUntil: 0 });
    return { allowed: true };
  }

  // Increment counter
  entry.count++;

  if (entry.count > cfg.maxAttempts) {
    entry.blockedUntil = now + cfg.blockDurationMs;
    return {
      allowed: false,
      retryAfter: Math.ceil(cfg.blockDurationMs / 1000),
    };
  }

  return { allowed: true };
}

/**
 * Reset rate limit for a key (e.g., after successful login).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Extract a sanitized client IP from a Next.js request.
 * Never logs or returns the raw IP in production responses.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
