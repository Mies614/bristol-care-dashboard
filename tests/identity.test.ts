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