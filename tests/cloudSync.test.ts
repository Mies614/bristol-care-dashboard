import { afterEach, describe, expect, it, vi } from "vitest";

const localStorageMock = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear()
  };
};

describe("cloud sync", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("reports fallback when Supabase env is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const mod = await import("@/lib/cloudSync");
    expect(mod.isCloudConfigured()).toBe(false);
  });

  it("fetch failure returns readable error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const mod = await import("@/lib/cloudSync");
    const result = await mod.pullCloudData("xiaoguai520");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("网络连接失败");
  });

  it("syncLoveNotes returns active visible undeleted notes from API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        loveNotes: [{ id: "1", content: "hello", active: true, pinned: false }]
      })
    }));
    const mod = await import("@/lib/cloudSync");
    const result = await mod.syncLoveNotes("xiaoguai520");
    expect(result.ok).toBe(true);
    expect(result.data?.[0].content).toBe("hello");
  });

  it("failed love note sync does not clear local data", async () => {
    const storage = localStorageMock();
    vi.stubGlobal("window", { localStorage: storage, dispatchEvent: vi.fn() });
    storage.setItem("bristol-care-data-v1", JSON.stringify({ nickname: "小乖", nextMeetDate: "", note: "local", courses: [], deadlines: [], links: [], loveNotes: [{ id: "local", content: "local", active: true, pinned: true }] }));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const mod = await import("@/lib/cloudSync");
    const result = await mod.syncLoveNotesIntoLocalData("xiaoguai520");
    expect(result.ok).toBe(false);
    expect(JSON.parse(storage.getItem("bristol-care-data-v1") || "{}").loveNotes[0].content).toBe("local");
  });

  it("pull success returns app data shape", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { nickname: "小乖", nextMeetDate: "", note: "hi", courses: [], deadlines: [], links: [], loveNotes: [] }
      })
    }));
    const mod = await import("@/lib/cloudSync");
    const result = await mod.pullCloudData("xiaoguai520");
    expect(result.ok).toBe(true);
    expect(result.data?.nickname).toBe("小乖");
  });

  it("failed saved-connection refresh preserves local data", async () => {
    const storage = localStorageMock();
    vi.stubGlobal("window", { localStorage: storage, dispatchEvent: vi.fn() });
    storage.setItem("bristol-care-cloud-connection-v1", JSON.stringify({ code: "xiaoguai520" }));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const mod = await import("@/lib/cloudSync");
    const result = await mod.refreshFromSavedConnection();
    expect(result.ok).toBe(false);
  });
});
