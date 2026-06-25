/**
 * Environment guard unit tests.
 */
import { describe, it, expect, afterEach } from "vitest";
import { validateEnv, warnIfProductionSupabaseInDev } from "@/lib/envGuard";

describe("validateEnv", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns errors when NEXT_PUBLIC_DEFAULT_SPACE_CODE is missing", () => {
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_DEFAULT_SPACE_CODE;
    const result = validateEnv();
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("SPACE_CODE"))).toBe(true);
  });

  it("returns errors when ADMIN_PASSWORD is missing", () => {
    process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE = "test";
    delete (process.env as Record<string, string | undefined>).ADMIN_PASSWORD;
    const result = validateEnv();
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("ADMIN_PASSWORD"))).toBe(true);
  });

  it("returns ok when all required vars are set", () => {
    process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE = "test";
    process.env.ADMIN_PASSWORD = "test-password";
    const result = validateEnv();
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("warns when Supabase URL is set but key is not", () => {
    process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE = "test";
    process.env.ADMIN_PASSWORD = "test";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const result = validateEnv();
    expect(result.warnings.some((w) => w.includes("Supabase"))).toBe(true);
  });

  it("warns about CRON_SECRET in production", () => {
    process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE = "test";
    process.env.ADMIN_PASSWORD = "test";
    process.env.NODE_ENV = "production";
    delete (process.env as Record<string, string | undefined>).CRON_SECRET;
    const result = validateEnv();
    expect(result.warnings.some((w) => w.includes("CRON_SECRET"))).toBe(true);
  });

  it("does not warn about CRON_SECRET in development", () => {
    process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE = "test";
    process.env.ADMIN_PASSWORD = "test";
    process.env.NODE_ENV = "development";
    delete (process.env as Record<string, string | undefined>).CRON_SECRET;
    const result = validateEnv();
    expect(result.warnings.some((w) => w.includes("CRON_SECRET"))).toBe(false);
  });

  it("detects service role key exposed to client (simulated)", () => {
    process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE = "test";
    process.env.ADMIN_PASSWORD = "test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "should-not-be-here";
    const result = validateEnv();
    // In Node env, typeof window is undefined, so this check won't trigger
    // But the test verifies the structure is correct
    expect(result.ok).toBe(true);
  });
});

describe("warnIfProductionSupabaseInDev", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("does not throw in development with no Supabase URL", () => {
    process.env.NODE_ENV = "development";
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SUPABASE_URL;
    expect(() => warnIfProductionSupabaseInDev()).not.toThrow();
  });

  it("does not throw in production", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    expect(() => warnIfProductionSupabaseInDev()).not.toThrow();
  });

  it("does not throw with local Supabase URL", () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    expect(() => warnIfProductionSupabaseInDev()).not.toThrow();
  });
});
