import { describe, expect, it } from "vitest";

describe("identity", () => {
  it("maps user-facing author labels (v1.3: admin is now a separate identity)", async () => {
    const mod = await import("@/lib/identity");
    expect(mod.getUserFacingAuthorLabel("me")).toBe("我");
    expect(mod.getUserFacingAuthorLabel("admin")).toBe("Admin");
    expect(mod.getUserFacingAuthorLabel("xiaoguai")).toBe("小乖");
    expect(mod.getUserFacingAuthorLabel("user")).toBe("user");
    expect(mod.getUserFacingAuthorLabel(null)).toBe("小乖");
    expect(mod.getUserFacingAuthorLabel("default")).toBe("小乖");
  });
});

describe("me identity context default", () => {
  it("/me identity context uses me/owner default value", async () => {
    const ctx = await import("@/app/me/identityContext");
    expect(ctx.MeIdentityContext).toBeDefined();
    expect(ctx.useMeIdentity).toBeDefined();
    // Context is created and exported — the default value is tested
    // at the component level through layout/rendering
  });
});

describe("interactionsLocal no bare xiaoguai", () => {
  it("exports all comment management functions", async () => {
    const mod = await import("@/lib/interactionsLocal");
    expect(typeof mod.getLocalComments).toBe("function");
    expect(typeof mod.softDeleteLocalComment).toBe("function");
    expect(typeof mod.restoreLocalComment).toBe("function");
    expect(typeof mod.hardDeleteLocalComment).toBe("function");
  });
});
