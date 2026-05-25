import { afterEach, describe, expect, it, vi } from "vitest";

describe("admin safety helpers", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("validates admin password on the server helper", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "secret");
    const { validateAdminPassword } = await import("@/lib/adminAuth");
    expect(validateAdminPassword("secret")).toBe(true);
    expect(validateAdminPassword("wrong")).toBe(false);
  });

  it("treats missing admin password as unauthorized", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    const { validateAdminPassword } = await import("@/lib/adminAuth");
    expect(validateAdminPassword("anything")).toBe(false);
  });
});
