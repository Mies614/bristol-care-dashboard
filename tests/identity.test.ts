import { beforeEach, describe, expect, it, vi } from "vitest";

function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear()
  };
}

describe("identity", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: makeStorage(), dispatchEvent: vi.fn() });
    vi.stubGlobal("localStorage", window.localStorage);
  });
  it("defaults to xiaoguai and saves me", async () => {
    localStorage.clear();
    const mod = await import("@/lib/identity");
    expect(mod.getCurrentIdentity()).toBe("xiaoguai");
    mod.saveCurrentIdentity("me");
    expect(mod.getCurrentIdentity()).toBe("me");
  });

  it("returns display labels", async () => {
    const mod = await import("@/lib/identity");
    expect(mod.getIdentityLabel("me")).toBe("我");
    expect(mod.getIdentityLabel("xiaoguai")).toBe("小乖");
  });
});
