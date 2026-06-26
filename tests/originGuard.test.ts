/**
 * Origin guard tests.
 *
 * Verifies the tightened origin policy:
 * - Write endpoints require Origin → 403 if missing
 * - Trusted origins must be exact match (no wildcards)
 * - Cron/Webhook exempted via Bearer secret (server-to-server)
 * - localhost allowed only in development/test
 * - space_code is NOT authentication
 * - ALLOWED_ORIGINS, VERCEL_URL, VERCEL_PROJECT_PRODUCTION_URL handled
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAllowedOrigin, isServerToServer } from "@/lib/originGuard";

const originalEnv = { ...process.env };

function setEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete (process.env as Record<string, string | undefined>)[key];
  } else {
    (process.env as Record<string, string | undefined>)[key] = value;
  }
}

function clearVercelEnv() {
  setEnv("VERCEL_URL", undefined);
  setEnv("VERCEL_PROJECT_PRODUCTION_URL", undefined);
  setEnv("VERCEL_BRANCH_URL", undefined);
  setEnv("ALLOWED_ORIGINS", undefined);
}

function makeReq(origin: string, overrides?: Record<string, string>) {
  return new Request("http://localhost:3000/api/test", {
    headers: { origin, ...overrides },
  });
}

describe("isAllowedOrigin", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "development";
    clearVercelEnv();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ─── Development ───

  it("allows localhost:3000 in development", () => {
    expect(isAllowedOrigin(makeReq("http://localhost:3000"))).toBe(true);
  });

  it("allows 127.0.0.1:3000 in development", () => {
    expect(isAllowedOrigin(makeReq("http://127.0.0.1:3000"))).toBe(true);
  });

  it("allows [::1]:3000 in development", () => {
    expect(isAllowedOrigin(makeReq("http://[::1]:3000"))).toBe(true);
  });

  it("denies missing Origin even in development", () => {
    const req = new Request("http://localhost:3000/api/comments");
    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("denies non-localhost origin in development", () => {
    expect(isAllowedOrigin(makeReq("https://evil.example.com"))).toBe(false);
  });

  it("denies localhost on wrong port in development", () => {
    expect(isAllowedOrigin(makeReq("http://localhost:9999"))).toBe(false);
  });

  // ─── Production: VERCEL_URL ───

  it("allows matching VERCEL_URL in production", () => {
    process.env.NODE_ENV = "production";
    setEnv("VERCEL_URL", "bristol-dashboard.vercel.app");
    expect(isAllowedOrigin(makeReq("https://bristol-dashboard.vercel.app"))).toBe(true);
  });

  it("denies non-matching vercel.app origin", () => {
    process.env.NODE_ENV = "production";
    setEnv("VERCEL_URL", "bristol-dashboard.vercel.app");
    expect(isAllowedOrigin(makeReq("https://attacker.vercel.app"))).toBe(false);
  });

  it("denies evil lookalike origin", () => {
    process.env.NODE_ENV = "production";
    setEnv("VERCEL_URL", "myapp.vercel.app");
    expect(isAllowedOrigin(makeReq("https://evilmyapp.vercel.app"))).toBe(false);
  });

  it("denies missing Origin in production", () => {
    process.env.NODE_ENV = "production";
    const req = new Request("https://app.example.com/api/comments");
    expect(isAllowedOrigin(req)).toBe(false);
  });

  // ─── Production: VERCEL_PROJECT_PRODUCTION_URL ───

  it("allows VERCEL_PROJECT_PRODUCTION_URL in production", () => {
    process.env.NODE_ENV = "production";
    setEnv("VERCEL_PROJECT_PRODUCTION_URL", "myapp.com");
    expect(isAllowedOrigin(makeReq("https://myapp.com"))).toBe(true);
  });

  it("includes both VERCEL_URL and VERCEL_PROJECT_PRODUCTION_URL when different", () => {
    process.env.NODE_ENV = "production";
    setEnv("VERCEL_PROJECT_PRODUCTION_URL", "myapp.com");
    setEnv("VERCEL_URL", "myapp.vercel.app");
    expect(isAllowedOrigin(makeReq("https://myapp.com"))).toBe(true);
    expect(isAllowedOrigin(makeReq("https://myapp.vercel.app"))).toBe(true);
  });

  // ─── ALLOWED_ORIGINS ───

  it("allows origins from ALLOWED_ORIGINS env var", () => {
    process.env.NODE_ENV = "production";
    setEnv("ALLOWED_ORIGINS", "https://example.com, https://www.example.com");
    expect(isAllowedOrigin(makeReq("https://example.com"))).toBe(true);
    expect(isAllowedOrigin(makeReq("https://www.example.com"))).toBe(true);
  });

  it("normalizes trailing slashes in ALLOWED_ORIGINS", () => {
    process.env.NODE_ENV = "production";
    setEnv("ALLOWED_ORIGINS", "https://example.com/");
    expect(isAllowedOrigin(makeReq("https://example.com"))).toBe(true);
  });

  it("skips malformed entries in ALLOWED_ORIGINS", () => {
    process.env.NODE_ENV = "production";
    setEnv("ALLOWED_ORIGINS", "not-a-url, https://example.com");
    expect(isAllowedOrigin(makeReq("https://example.com"))).toBe(true);
  });

  it("does not allow empty ALLOWED_ORIGINS to become wildcard", () => {
    process.env.NODE_ENV = "production";
    setEnv("ALLOWED_ORIGINS", "");
    expect(isAllowedOrigin(makeReq("https://anything.example.com"))).toBe(false);
  });

  // ─── Edge cases ───

  it("denies malformed Origin header", () => {
    process.env.NODE_ENV = "development";
    const req = new Request("http://localhost:3000/api/test", {
      headers: { origin: "not-a-valid-url!!!" },
    });
    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("denies empty Origin header", () => {
    process.env.NODE_ENV = "development";
    const req = new Request("http://localhost:3000/api/test", {
      headers: { origin: "" },
    });
    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("denies null Origin header", () => {
    process.env.NODE_ENV = "development";
    const req = new Request("http://localhost:3000/api/test");
    expect(isAllowedOrigin(req)).toBe(false);
  });
});

// ─── Server-to-server exemption ───

describe("isServerToServer", () => {
  beforeEach(() => {
    setEnv("CRON_SECRET", "test-cron-secret-123");
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("allows request with correct Bearer token", () => {
    const req = new Request("https://app.example.com/api/cron/reminders", {
      headers: { authorization: "Bearer test-cron-secret-123" },
    });
    expect(isServerToServer(req)).toBe(true);
  });

  it("denies request with incorrect Bearer token", () => {
    const req = new Request("https://app.example.com/api/cron/reminders", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    expect(isServerToServer(req)).toBe(false);
  });

  it("denies request with no Authorization header", () => {
    const req = new Request("https://app.example.com/api/cron/reminders");
    expect(isServerToServer(req)).toBe(false);
  });

  it("denies Basic auth header (not Bearer)", () => {
    const req = new Request("https://app.example.com/api/cron/reminders", {
      headers: { authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(isServerToServer(req)).toBe(false);
  });

  it("returns false when CRON_SECRET is not configured", () => {
    setEnv("CRON_SECRET", undefined);
    const req = new Request("https://app.example.com/api/cron/reminders", {
      headers: { authorization: "Bearer anything" },
    });
    expect(isServerToServer(req)).toBe(false);
  });
});
