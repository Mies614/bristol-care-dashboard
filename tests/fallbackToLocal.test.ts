import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock localStorage
function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe("localStorage fallback when Supabase is missing", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    const storage = makeStorage();
    vi.stubGlobal("window", {
      localStorage: storage,
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("isCloudConfigured returns false without env vars", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const { isCloudConfigured } = await import("@/lib/cloudSync");
    expect(isCloudConfigured()).toBe(false);
  });

  it("storage loads default data when localStorage is empty", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const { loadAppData } = await import("@/lib/storage");
    const data = loadAppData();
    // Should return default data
    expect(data).toBeDefined();
    expect(data.nickname).toBeDefined();
    expect(Array.isArray(data.courses)).toBe(true);
    expect(Array.isArray(data.loveNotes)).toBe(true);
  });

  it("storage saves and loads data correctly (local-only)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const { loadAppData, saveAppData } = await import("@/lib/storage");

    const data = loadAppData();
    const modified = { ...data, nickname: "TestUser", nextMeetDate: "2026-12-31" };
    saveAppData(modified, { suppressAutoSync: true });

    const loaded = loadAppData();
    expect(loaded.nickname).toBe("TestUser");
    expect(loaded.nextMeetDate).toBe("2026-12-31");
  });

  it("resetAppData clears and restores defaults without crashing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const { loadAppData, resetAppData } = await import("@/lib/storage");

    resetAppData();
    const data = loadAppData();
    expect(data).toBeDefined();
    expect(data.courses).toEqual([]);
  });

  it("sync status shows 'local' when Supabase is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const { computeStorageMode } = await import("@/lib/syncStatus");
    expect(computeStorageMode()).toBe("local");
  });

  it("sync status shows 'failed' when sync error recorded", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGci...");

    // Simulate a failed sync state
    localStorage.setItem("bristol_dashboard_auto_sync_status", "failed");
    localStorage.setItem("bristol_dashboard_last_sync_error", "同步失败");
    localStorage.setItem(
      "bristol_dashboard_pending_sync",
      JSON.stringify({ pending: true, reason: "test", updatedAt: new Date().toISOString() })
    );

    const { getSyncStatusSnapshot } = await import("@/lib/syncStatus");
    const snapshot = getSyncStatusSnapshot();

    expect(snapshot.syncStatus).toBe("failed");
    expect(snapshot.lastError).toBe("同步失败");
  });
});
