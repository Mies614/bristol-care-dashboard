import { describe, expect, it } from "vitest";

describe("identity", () => {
  it("maps user-facing author labels without local identity switching", async () => {
    const mod = await import("@/lib/identity");
    expect(mod.getUserFacingAuthorLabel("me")).toBe("我");
    expect(mod.getUserFacingAuthorLabel("admin")).toBe("我");
    expect(mod.getUserFacingAuthorLabel("xiaoguai")).toBe("小乖");
    expect(mod.getUserFacingAuthorLabel("user")).toBe("小乖");
  });
});
