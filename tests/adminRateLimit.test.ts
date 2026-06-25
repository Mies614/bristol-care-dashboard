/**
 * Admin rate limiter tests.
 * Verifies:
 * - Allow up to maxAttempts within window
 * - Block after exceeding maxAttempts
 * - Reset after successful action
 */
import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimit, getClientIp } from "@/lib/adminRateLimit";

describe("checkRateLimit", () => {
  const key = `test-${Date.now()}-${Math.random()}`;

  beforeEach(() => {
    resetRateLimit(key);
  });

  it("allows first attempt", () => {
    const result = checkRateLimit(key, { maxAttempts: 3, windowMs: 60000, blockDurationMs: 60000 });
    expect(result.allowed).toBe(true);
  });

  it("allows up to maxAttempts within window", () => {
    for (let i = 0; i < 3; i++) {
      const result = checkRateLimit(key, { maxAttempts: 3, windowMs: 60000, blockDurationMs: 60000 });
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks after exceeding maxAttempts", () => {
    const config = { maxAttempts: 2, windowMs: 60000, blockDurationMs: 60000 };
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    // Third attempt should be blocked
    const result = checkRateLimit(key, config);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfter).toBeGreaterThan(0);
    }
  });

  it("resets after calling resetRateLimit", () => {
    const config = { maxAttempts: 2, windowMs: 60000, blockDurationMs: 60000 };
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    // Should be blocked
    const blocked = checkRateLimit(key, config);
    expect(blocked.allowed).toBe(false);

    // Reset
    resetRateLimit(key);

    // Should be allowed again
    const afterReset = checkRateLimit(key, config);
    expect(afterReset.allowed).toBe(true);
  });

  it("different keys are independent", () => {
    const key1 = `test-key1-${Date.now()}`;
    const key2 = `test-key2-${Date.now()}`;
    const config = { maxAttempts: 2, windowMs: 60000, blockDurationMs: 60000 };

    // Exhaust key1
    checkRateLimit(key1, config);
    checkRateLimit(key1, config);
    const blocked1 = checkRateLimit(key1, config);
    expect(blocked1.allowed).toBe(false);

    // Key2 should still be allowed
    const allowed2 = checkRateLimit(key2, config);
    expect(allowed2.allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for header", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
    });
    expect(getClientIp(request)).toBe("192.168.1.1");
  });

  it("extracts IP from x-real-ip header", () => {
    const request = new Request("https://example.com", {
      headers: { "x-real-ip": "10.0.0.1" },
    });
    expect(getClientIp(request)).toBe("10.0.0.1");
  });

  it("returns 'unknown' when no headers present", () => {
    const request = new Request("https://example.com");
    expect(getClientIp(request)).toBe("unknown");
  });
});
