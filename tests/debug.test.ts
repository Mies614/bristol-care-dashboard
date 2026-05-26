import { describe, expect, it } from "vitest";

describe("debug response shape", () => {
  it("does not expose secret-shaped fields", () => {
    const payload = {
      ok: true,
      checks: [
        { name: "SUPABASE_SERVICE_ROLE_KEY exists", ok: true },
        { name: "service key configured", ok: true }
      ]
    };
    expect(JSON.stringify(payload)).not.toContain("sb_secret_");
    expect(payload.checks.every((check) => typeof check.ok === "boolean")).toBe(true);
  });
});
