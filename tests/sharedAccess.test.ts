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

describe("shared access", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_SPACE_CODE", "BRISTOL2026");
    vi.stubGlobal("window", { localStorage: makeStorage(), dispatchEvent: vi.fn() });
    vi.stubGlobal("localStorage", window.localStorage);
    localStorage.clear();
  });

  it("validates correct and wrong access codes", async () => {
    const mod = await import("@/lib/sharedAccess");
    expect(mod.validateSharedAccessCode("BRISTOL2026")).toBe(true);
    expect(mod.validateSharedAccessCode("WRONG")).toBe(false);
  });

  it("saves and clears access state", async () => {
    const mod = await import("@/lib/sharedAccess");
    mod.saveSharedAccess();
    expect(mod.hasSharedAccess()).toBe(true);
    mod.clearSharedAccess();
    expect(mod.hasSharedAccess()).toBe(false);
  });
});
