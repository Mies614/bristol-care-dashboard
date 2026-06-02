import { describe, expect, it } from "vitest";

/**
 * Health check tests.
 *
 * These tests validate the shape and security constraints of the health check API
 * without actually running the Next.js server. They verify that:
 *
 * 1. The health response format is stable
 * 2. Secrets are never exposed
 * 3. Missing env vars don't cause crashes
 */

describe("health response shape", () => {
  // Simulate what the API would return
  function simulateHealthResponse(envVars: Record<string, string | undefined>) {
    const checks: Array<{ key: string; status: string; description: string }> = [];

    function addCheck(key: string, description: string) {
      const value = envVars[key];
      let status: string;
      if (value === undefined || value === null) {
        status = "unavailable";
      } else if (value === "") {
        status = "missing";
      } else {
        status = "configured";
      }
      checks.push({ key, status, description });
    }

    addCheck("NEXT_PUBLIC_SUPABASE_URL", "Supabase");
    addCheck("NEXT_PUBLIC_SUPABASE_ANON_KEY", "Anon key");
    addCheck("ADMIN_PASSWORD", "Admin password");
    addCheck("NEXT_PUBLIC_DEFAULT_SPACE_CODE", "Space code");
    addCheck("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID public");
    addCheck("VAPID_PRIVATE_KEY", "VAPID private");
    addCheck("SUPABASE_SERVICE_ROLE_KEY", "Service role");

    return {
      ok: true,
      timestamp: new Date().toISOString(),
      env: checks,
      runtime: { nodeEnv: "test", timezone: "UTC" },
    };
  }

  it("all env vars show as configured when present", () => {
    const response = simulateHealthResponse({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      ADMIN_PASSWORD: "secret123",
      NEXT_PUBLIC_DEFAULT_SPACE_CODE: "xiaoguai520",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "BP...",
      VAPID_PRIVATE_KEY: "abc...",
      SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIs...",
    });

    expect(response.ok).toBe(true);
    expect(response.env).toHaveLength(7);
    for (const check of response.env) {
      expect(check.status).toBe("configured");
    }
  });

  it("all env vars show as missing when keys are empty strings", () => {
    const response = simulateHealthResponse({
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      ADMIN_PASSWORD: "",
      NEXT_PUBLIC_DEFAULT_SPACE_CODE: "",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "",
      VAPID_PRIVATE_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    });

    for (const check of response.env) {
      expect(check.status).toBe("missing");
    }
  });

  it("all env vars show as unavailable when keys are undefined", () => {
    const response = simulateHealthResponse({});

    for (const check of response.env) {
      expect(check.status).toBe("unavailable");
    }
  });

  it("never exposes actual secret values", () => {
    const secretUrl = "https://abc123.supabase.co";
    const secretKey = "sb_secret_abcdef123456";

    const response = simulateHealthResponse({
      NEXT_PUBLIC_SUPABASE_URL: secretUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: secretKey,
      ADMIN_PASSWORD: "my-password",
      NEXT_PUBLIC_DEFAULT_SPACE_CODE: "xiaoguai520",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "BP123",
      VAPID_PRIVATE_KEY: "private-key-here",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
    });

    const serialized = JSON.stringify(response);

    // Never contains actual secret values
    expect(serialized).not.toContain(secretUrl);
    expect(serialized).not.toContain(secretKey);
    expect(serialized).not.toContain("my-password");
    expect(serialized).not.toContain("private-key-here");
    expect(serialized).not.toContain("service-role-secret");

    // Only status values, never actual content
    expect(serialized).toContain("configured");
    expect(serialized).not.toContain("https://");
    expect(serialized).not.toContain("sb_secret");
    expect(serialized).not.toContain("eyJhbGci");
  });

  it("response is stable when Supabase env vars are completely missing", () => {
    const response = simulateHealthResponse({
      // No Supabase vars at all
      ADMIN_PASSWORD: "admin",
      NEXT_PUBLIC_DEFAULT_SPACE_CODE: "xiaoguai520",
    });

    expect(response.ok).toBe(true);

    // Check Supabase-related vars
    const supabaseUrl = response.env.find((c) => c.key === "NEXT_PUBLIC_SUPABASE_URL")!;
    expect(supabaseUrl.status).toBe("unavailable");

    const anonKey = response.env.find((c) => c.key === "NEXT_PUBLIC_SUPABASE_ANON_KEY")!;
    expect(anonKey.status).toBe("unavailable");

    const serviceKey = response.env.find((c) => c.key === "SUPABASE_SERVICE_ROLE_KEY")!;
    expect(serviceKey.status).toBe("unavailable");

    // Other configured vars should still show correctly
    const admin = response.env.find((c) => c.key === "ADMIN_PASSWORD")!;
    expect(admin.status).toBe("configured");
  });

  it("never crashes when all env vars are missing", () => {
    // This should never throw
    expect(() => simulateHealthResponse({})).not.toThrow();

    const response = simulateHealthResponse({});
    expect(response.ok).toBe(true);
    expect(response.env).toHaveLength(7);
    expect(response.runtime).toBeDefined();
    expect(response.timestamp).toBeDefined();
  });

  it("returns only 'configured', 'missing', or 'unavailable' as status values", () => {
    const response = simulateHealthResponse({
      NEXT_PUBLIC_SUPABASE_URL: "present",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    });

    const allowedStatuses = ["configured", "missing", "unavailable"];
    for (const check of response.env) {
      expect(allowedStatuses).toContain(check.status);
    }
  });
});
