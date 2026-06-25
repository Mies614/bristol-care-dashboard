/**
 * Origin guard tests.
 *
 * Verifies the tightened origin policy:
 * - Write endpoints require Origin → 403 if missing
 * - Trusted origins must be exact match (no wildcards)
 * - Cron/Webhook exempted via Bearer secret (server-to-server)
 * - localhost allowed only in development/test
 * - space_code is NOT authentication
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

describe("isAllowedOrigin", () => {
  beforeEach(() => {
    // Reset to development by default
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ─── Development ───

  it("allows localhost:3000 in development", () => {
    const req = new Request("http://localhost:3000/api/comments", {
      headers: { origin: "http://localhost:3000" },
    });
    expect(isAllowedOrigin(req)).toBe(true);
  });

  it("allows 127.0.0.1:3000 in development", () => {
    const req = new Request("http://127.0.0.1:3000/api/comments", {
      headers: { origin: "http://127.0.0.1:3000" },
    });
    expect(isAllowedOrigin(req)).toBe(true);
  });

  it("denies missing Origin even in development", () => {
    const req = new Request("http://localhost:3000/api/comments");
    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("denies non-localhost origin in development", () => {
    const req = new Request("http://localhost:3000/api/comments", {
      headers: { origin: "https://evil.example.com" },
    });
    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("denies localhost on wrong port in development", () => {
    const req = new Request("http://localhost:3000/api/comments", {
      headers: { origin: "http://localhost:9999" },
    });
    expect(isAllowedOrigin(req)).toBe(false);
  });

  // ─── Production ───

  it("denies missing Origin in production", () => {
    process.env.NODE_ENV = "production";
    const req = new Request("https://app.example.com/api/comments");
    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("allows matching Vercel production URL", () => {
    process.env.NODE_ENV = "production";
    setEnv("NEXT_PUBLIC_VERCEL_URL", "bristol-dashboard.vercel.app");
    const req = new Request("https://bristol-dashboard.vercel.app/api/comments", {
      headers: { origin: "https://bristol-dashboard.vercel.app" },
    });
    expect(isAllowedOrigin(req)).toBe(true);
  });

  it("denies arbitrary *.vercel.app origin (not in allowlist)", () => {
    process.env.NODE_ENV = "production";
    setEnv("NEXT_PUBLIC_VERCEL_URL", "bristol-dashboard.vercel.app");
    const req = new Request("https://bristol-dashboard.vercel.app/api/comments", {
      headers: { origin: "https://attacker.vercel.app" },
    });
    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("allows matching Vercel preview URL", () => {
    process.env.NODE_ENV = "production";
    setEnv("NEXT_PUBLIC_VERCEL_BRANCH_URL", "bristol-dashboard-git-feat.vercel.app");
    const req = new Request("https://bristol-dashboard-git-feat.vercel.app/api/comments", {
      headers: { origin: "https://bristol-dashboard-git-feat.vercel.app" },
    });
    expect(isAllowedOrigin(req)).toBe(true);
  });

  it("denies malformed Origin header", () => {
    process.env.NODE_ENV = "development";
    const req = new Request("http://localhost:3000/api/comments", {
      headers: { origin: "not-a-valid-url!!!" },
    });
    expect(isAllowedOrigin(req)).toBe(false);
  });

  // ─── Ensure no wildcard bypass ───

  it("denies substring match attempts", () => {
    process.env.NODE_ENV = "production";
    setEnv("NEXT_PUBLIC_VERCEL_URL", "myapp.vercel.app");
    const req = new Request("https://myapp.vercel.app/api/comments", {
      headers: { origin: "https://evilmyapp.vercel.app" },
    });
    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("denies empty Origin header", () => {
    process.env.NODE_ENV = "development";
    const req = new Request("http://localhost:3000/api/comments", {
      headers: { origin: "" },
    });
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
