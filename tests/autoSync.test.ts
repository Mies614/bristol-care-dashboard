import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultAppData } from "@/lib/sampleData";

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
    }
  };
}

describe("auto sync", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
    const storage = makeStorage();
    vi.stubGlobal("window", {
      localStorage: storage,
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("navigator", { onLine: true });
    localStorage.setItem("bristol-care-data-v1", JSON.stringify(defaultAppData));
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, data: {} })
    })));
  });

  afterEach(() => {
    // Restore real timers to prevent timer leaks between tests
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("enables auto sync by default", async () => {
    const { getAutoSyncEnabled } = await import("@/lib/autoSync");
    expect(getAutoSyncEnabled()).toBe(true);
  });

  it("does not schedule when disabled", async () => {
    vi.useFakeTimers();
    const { setAutoSyncEnabled, scheduleAutoSync } = await import("@/lib/autoSync");
    setAutoSyncEnabled(false);
    scheduleAutoSync("disabled_test");
    await vi.advanceTimersByTimeAsync(3000);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("debounces scheduled sync", async () => {
    const { scheduleAutoSync } = await import("@/lib/autoSync");
    scheduleAutoSync("a");
    scheduleAutoSync("b");
    expect(fetch).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 2700));
    expect(fetch).toHaveBeenCalledTimes(1);
  }, 4000);

  it("updates last sync after success", async () => {
    const { runAutoSyncNow, getPendingSyncState } = await import("@/lib/autoSync");
    await runAutoSyncNow("success");
    expect(getPendingSyncState().lastSyncAt).toBeTruthy();
    expect(getPendingSyncState().pending).toBe(false);
  });

  it("sets pending sync after failure", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: "boom", code: "FAIL" })
    })));
    const { runAutoSyncNow, getPendingSyncState } = await import("@/lib/autoSync");
    await runAutoSyncNow("failure");
    expect(getPendingSyncState().pending).toBe(true);
    expect(getPendingSyncState().lastError).toContain("boom");
  });

  it("queues while offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const { runAutoSyncNow, getPendingSyncState } = await import("@/lib/autoSync");
    await runAutoSyncNow("offline");
    expect(getPendingSyncState().status).toBe("queued");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("suppresses auto sync during cloud restore", async () => {
    const { withAutoSyncSuppressed, markLocalChange, scheduleAutoSync, getPendingSyncState } = await import("@/lib/autoSync");
    withAutoSyncSuppressed(() => {
      markLocalChange("restore");
      scheduleAutoSync("restore");
    });
    expect(getPendingSyncState().pending).toBe(false);
  });

  it("strips loveNotes from auto sync payload", async () => {
    const { prepareAutoSyncData } = await import("@/lib/autoSync");
    const payload = prepareAutoSyncData({ ...defaultAppData, loveNotes: [{ id: "n", content: "note", active: true, pinned: false }] });
    expect(payload.loveNotes).toEqual([]);
    expect(payload.note).toBe("");
  });

  // ----- Concurrency control tests -----
  describe("auto sync concurrency control", () => {
    it("does not start a new sync while one is already in progress", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      
      // Make fetch slow so we can overlap calls
      let resolveFetch: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });
      vi.stubGlobal("fetch", vi.fn(() => fetchPromise.then(() => ({
        ok: true,
        json: async () => ({ ok: true, data: {} })
      }))));

      const { runAutoSyncNow } = await import("@/lib/autoSync");

      // Start first sync (will hang because fetch never resolves)
      const firstSync = runAutoSyncNow("first");

      // Allow microtask queue to process so syncInProgress = true
      await new Promise((r) => setTimeout(r, 0));
      await vi.advanceTimersByTimeAsync(10);

      // Start second sync while first is still running
      const secondSync = runAutoSyncNow("second");

      // Give time for the retry logic to process
      await vi.advanceTimersByTimeAsync(500);

      // Verify only one fetch call was made (the first one)
      expect(fetch).toHaveBeenCalledTimes(1);

      // Resolve first sync
      resolveFetch!({ ok: true, json: async () => ({ ok: true, data: {} }) });
      await firstSync;
      
      // Wait for retry (pendingRetryAfterSync)
      await vi.advanceTimersByTimeAsync(1500);
      await vi.advanceTimersByTimeAsync(500);
      
      // The second sync should auto-retry after the first completes
      expect(fetch).toHaveBeenCalledTimes(2);

      await secondSync;
    }, 10000);

    it("queues sync when offline and retries when online", async () => {
      vi.useFakeTimers();

      // Start offline
      vi.stubGlobal("navigator", { onLine: false });

      const { runAutoSyncNow, getPendingSyncState } = await import("@/lib/autoSync");
      
      await runAutoSyncNow("offline_test");
      
      expect(getPendingSyncState().status).toBe("queued");
      expect(fetch).not.toHaveBeenCalled();

      // Go online
      vi.stubGlobal("navigator", { onLine: true });

      // The "online" event handler calls runAutoSyncNow - we already stubbed addEventListener
      // so let's invoke the sync directly
      await runAutoSyncNow("online_now");
      
      expect(fetch).toHaveBeenCalled();
      expect(getPendingSyncState().pending).toBe(false);
    }, 5000);

  });
});