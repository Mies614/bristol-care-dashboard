import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("syncStatus", () => {
  beforeEach(() => {
    vi.resetModules();
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("computeStorageMode", () => {
    it("returns 'local' when Supabase is not configured", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
      const { computeStorageMode } = await import("@/lib/syncStatus");
      expect(computeStorageMode()).toBe("local");
    });

    it("returns 'local' when Supabase configured but not connected", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGci...");
      const { computeStorageMode } = await import("@/lib/syncStatus");
      expect(computeStorageMode()).toBe("local");
    });

    it("returns 'cloud' when Supabase configured and connected", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGci...");
      localStorage.setItem(
        "bristol-care-cloud-connection-v1",
        JSON.stringify({ code: "xiaoguai520" })
      );
      const { computeStorageMode } = await import("@/lib/syncStatus");
      expect(computeStorageMode()).toBe("cloud");
    });

    it("returns 'offline' when navigator.onLine is false", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGci...");
      localStorage.setItem(
        "bristol-care-cloud-connection-v1",
        JSON.stringify({ code: "xiaoguai520" })
      );
      vi.stubGlobal("navigator", { onLine: false });
      const { computeStorageMode } = await import("@/lib/syncStatus");
      expect(computeStorageMode()).toBe("offline");
    });
  });

  describe("formatLastSyncTime", () => {
    it("returns '尚未同步' for null", async () => {
      const { formatLastSyncTime } = await import("@/lib/syncStatus");
      expect(formatLastSyncTime(null)).toBe("尚未同步");
    });

    it("returns '刚刚' for recent timestamp", async () => {
      const { formatLastSyncTime } = await import("@/lib/syncStatus");
      const now = new Date().toISOString();
      expect(formatLastSyncTime(now)).toBe("刚刚");
    });

    it("formats past time correctly", async () => {
      const { formatLastSyncTime } = await import("@/lib/syncStatus");
      const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
      expect(formatLastSyncTime(oneHourAgo)).toContain("小时前");
    });

    it("returns date for very old timestamp", async () => {
      const { formatLastSyncTime } = await import("@/lib/syncStatus");
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString();
      const result = formatLastSyncTime(tenDaysAgo);
      // Should be a date string or 天前
      expect(result).toBeTruthy();
    });
  });

  describe("friendlySyncError", () => {
    it("returns null for null input", async () => {
      const { friendlySyncError } = await import("@/lib/syncStatus");
      expect(friendlySyncError(null)).toBeNull();
    });

    it("detects network errors", async () => {
      const { friendlySyncError } = await import("@/lib/syncStatus");
      expect(friendlySyncError("Failed to fetch")).toContain("网络连接失败");
      expect(friendlySyncError("NetworkError")).toContain("网络连接失败");
    });

    it("detects timeout errors", async () => {
      const { friendlySyncError } = await import("@/lib/syncStatus");
      expect(friendlySyncError("timeout")).toContain("超时");
      expect(friendlySyncError("上传超时")).toContain("超时");
    });

    it("detects auth errors", async () => {
      const { friendlySyncError } = await import("@/lib/syncStatus");
      expect(friendlySyncError("JWT expired")).toContain("认证失败");
      expect(friendlySyncError("invalid token")).toContain("认证失败");
    });

    it("truncates very long messages", async () => {
      const { friendlySyncError } = await import("@/lib/syncStatus");
      const long = "x".repeat(200);
      const result = friendlySyncError(long);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.length).toBeLessThanOrEqual(130);
      }
    });
  });

  describe("getSyncStatusSnapshot", () => {
    it("returns a valid snapshot with all fields", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGci...");
      localStorage.setItem(
        "bristol-care-cloud-connection-v1",
        JSON.stringify({ code: "test" })
      );

      const { getSyncStatusSnapshot } = await import("@/lib/syncStatus");
      const snapshot = getSyncStatusSnapshot();

      expect(snapshot).toHaveProperty("storageMode");
      expect(snapshot).toHaveProperty("syncStatus");
      expect(snapshot).toHaveProperty("lastSyncAt");
      expect(snapshot).toHaveProperty("lastError");
      expect(snapshot).toHaveProperty("cloudConnected");
      expect(snapshot).toHaveProperty("autoSyncEnabled");
      expect(snapshot.cloudConnected).toBe(true);
      expect(snapshot.autoSyncEnabled).toBe(true);
    });

    it("shows storageMode as 'local' when no Supabase configured", async () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

      const { getSyncStatusSnapshot } = await import("@/lib/syncStatus");
      const snapshot = getSyncStatusSnapshot();

      expect(snapshot.storageMode).toBe("local");
      expect(snapshot.cloudConnected).toBe(false);
    });

    it("lastSyncAt falls back to cloud sync last time", async () => {
      localStorage.setItem("bristol-care-last-sync-v1", "2026-01-01T00:00:00Z");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGci...");

      const { getSyncStatusSnapshot } = await import("@/lib/syncStatus");
      const snapshot = getSyncStatusSnapshot();

      expect(snapshot.lastSyncAt).toBe("2026-01-01T00:00:00Z");
    });
  });

  describe("getStorageModeLabel and getSyncStatusLabel", () => {
    it("returns labels for all storage modes", async () => {
      const { getStorageModeLabel } = await import("@/lib/syncStatus");
      expect(getStorageModeLabel("cloud")).toBe("云同步");
      expect(getStorageModeLabel("local")).toBe("本地");
      expect(getStorageModeLabel("offline")).toBe("离线");
      expect(getStorageModeLabel("unknown")).toBe("未知");
    });

    it("returns labels for all sync statuses", async () => {
      const { getSyncStatusLabel } = await import("@/lib/syncStatus");
      expect(getSyncStatusLabel("syncing")).toBe("同步中");
      expect(getSyncStatusLabel("synced")).toBe("已同步");
      expect(getSyncStatusLabel("failed")).toBe("同步失败");
      expect(getSyncStatusLabel("queued")).toBe("等待联网");
      expect(getSyncStatusLabel("disabled")).toBe("已关闭");
    });
  });
});
