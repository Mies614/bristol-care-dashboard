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

describe("backup", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: makeStorage(), dispatchEvent: vi.fn() });
    vi.stubGlobal("localStorage", window.localStorage);
  });
  it("exports backgroundSettings and currentIdentity", async () => {
    localStorage.clear();
    const { createBackupPayload } = await import("@/lib/backup");
    const payload = createBackupPayload();
    expect(payload.backgroundSettings).toBeDefined();
    expect(payload.currentIdentity).toBe("xiaoguai");
  });

  it("restores missing fields without crashing", async () => {
    const { restoreBackupPayload } = await import("@/lib/backup");
    const data = restoreBackupPayload({ courses: [], deadlines: [], links: [] });
    expect(data.courses).toEqual([]);
  });
});
