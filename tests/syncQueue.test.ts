import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const localStorageMock = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key)
  };
};

describe("syncQueue", () => {
  let storage: ReturnType<typeof localStorageMock>;

  beforeEach(() => {
    storage = localStorageMock();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Dynamic import to pick up the stubbed window
  async function importModule() {
    return await import("../lib/syncQueue");
  }

  it("enqueues items and reports pending count", async () => {
    const { enqueueSyncItem, getPendingSyncCount, getSyncQueue } = await importModule();

    expect(getPendingSyncCount()).toBe(0);

    enqueueSyncItem({
      type: "note",
      method: "POST",
      url: "/api/notes",
      body: { code: "test", content: "hello" },
      spaceCode: "test",
      identity: "partner1"
    });

    expect(getPendingSyncCount()).toBe(1);
    expect(getSyncQueue()).toHaveLength(1);
    expect(getSyncQueue()[0].type).toBe("note");
    expect(getSyncQueue()[0].retryCount).toBe(0);
  });

  it("deduplicates identical items", async () => {
    const { enqueueSyncItem, getPendingSyncCount } = await importModule();

    const item = {
      type: "note" as const,
      method: "POST" as const,
      url: "/api/notes",
      body: { code: "test" },
      spaceCode: "test",
      identity: "partner1"
    };

    enqueueSyncItem(item);
    enqueueSyncItem(item);
    enqueueSyncItem(item);

    expect(getPendingSyncCount()).toBe(1);
  });

  it("does not deduplicate items with different bodies", async () => {
    const { enqueueSyncItem, getPendingSyncCount } = await importModule();

    enqueueSyncItem({
      type: "note", method: "POST", url: "/api/notes",
      body: { code: "test", content: "a" },
      spaceCode: "test", identity: "partner1"
    });

    enqueueSyncItem({
      type: "note", method: "POST", url: "/api/notes",
      body: { code: "test", content: "b" },
      spaceCode: "test", identity: "partner1"
    });

    expect(getPendingSyncCount()).toBe(2);
  });

  it("dequeues a specific item", async () => {
    const { enqueueSyncItem, getSyncQueue, dequeueSyncItem } = await importModule();

    enqueueSyncItem({
      type: "comment", method: "POST", url: "/api/comments",
      body: { text: "hi" }, spaceCode: "test", identity: "me"
    });

    const queue = getSyncQueue();
    expect(queue).toHaveLength(1);

    dequeueSyncItem(queue[0].id);
    expect(getSyncQueue()).toHaveLength(0);
  });

  it("flushes pending items successfully", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { enqueueSyncItem, flushSyncQueue, getPendingSyncCount } = await importModule();

    enqueueSyncItem({
      type: "note", method: "POST", url: "/api/notes",
      body: { test: 1 }, spaceCode: "test", identity: "partner1"
    });
    enqueueSyncItem({
      type: "comment", method: "POST", url: "/api/comments",
      body: { test: 2 }, spaceCode: "test", identity: "partner1"
    });

    const result = await flushSyncQueue();
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
    expect(getPendingSyncCount()).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("tracks failed items and increments retry count", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const { enqueueSyncItem, flushSyncQueue, getPendingSyncCount, getFailedSyncCount, getSyncQueue } = await importModule();

    enqueueSyncItem({
      type: "album", method: "POST", url: "/api/albums",
      body: { name: "test" }, spaceCode: "test", identity: "me"
    });

    const result = await flushSyncQueue();
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
    // Still pending because retryCount < maxRetries
    expect(getPendingSyncCount()).toBe(1);
    expect(getFailedSyncCount()).toBe(0);

    const queue = getSyncQueue();
    expect(queue[0].retryCount).toBe(1);
  });

  it("marks items as failed after exceeding max retries", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const { enqueueSyncItem, flushSyncQueue, getPendingSyncCount, getFailedSyncCount } = await importModule();

    enqueueSyncItem({
      type: "settings", method: "POST", url: "/api/settings",
      body: { theme: "warm-letter" }, spaceCode: "test", identity: "partner1"
    });

    // Flush 5 times (max retries = 5)
    for (let i = 0; i < 5; i++) {
      await flushSyncQueue();
    }

    // After 5 retries, should be in failed state
    expect(getPendingSyncCount()).toBe(0);
    expect(getFailedSyncCount()).toBe(1);
  });

  it("clears failed items", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const { enqueueSyncItem, flushSyncQueue, getFailedSyncCount, clearFailedSyncItems } = await importModule();

    enqueueSyncItem({
      type: "interaction", method: "POST", url: "/api/interactions",
      body: { reaction: "fire" }, spaceCode: "test", identity: "partner1"
    });

    // Exhaust retries
    for (let i = 0; i < 5; i++) await flushSyncQueue();

    expect(getFailedSyncCount()).toBe(1);
    clearFailedSyncItems();
    expect(getFailedSyncCount()).toBe(0);
  });

  it("handles network errors gracefully", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("NetworkError"));
    vi.stubGlobal("fetch", fetchMock);

    const { enqueueSyncItem, flushSyncQueue, getPendingSyncCount } = await importModule();

    enqueueSyncItem({
      type: "miss_you", method: "POST", url: "/api/miss-you",
      body: {}, spaceCode: "test", identity: "partner1"
    });

    const result = await flushSyncQueue();
    expect(result.failed).toBe(1);
    expect(getPendingSyncCount()).toBe(1); // retry count incremented but still pending
  });

  it("returns zero counts for empty queue", async () => {
    const { flushSyncQueue, getPendingSyncCount, getFailedSyncCount, getSyncQueue } = await importModule();

    expect(getPendingSyncCount()).toBe(0);
    expect(getFailedSyncCount()).toBe(0);
    expect(getSyncQueue()).toHaveLength(0);

    const result = await flushSyncQueue();
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("supports all sync queue item types", async () => {
    const { enqueueSyncItem, getPendingSyncCount } = await importModule();

    const types = ["note", "comment", "interaction", "miss_you", "album", "settings"] as const;
    for (const type of types) {
      enqueueSyncItem({
        type,
        method: "POST",
        url: "/api/" + type,
        body: {},
        spaceCode: "test",
        identity: "partner1"
      });
    }

    expect(getPendingSyncCount()).toBe(6);
  });
  it("deduplicates identical comment items", async () => {
    const { enqueueSyncItem, getPendingSyncCount } = await importModule();

    const comment = {
      type: "comment" as const,
      method: "POST" as const,
      url: "/api/comments",
      body: { spaceCode: "test", contentId: "n1", body: "hi" },
      spaceCode: "test",
      identity: "partner1"
    };

    enqueueSyncItem(comment);
    enqueueSyncItem(comment);
    enqueueSyncItem({ ...comment, body: { ...comment.body, body: "hi" } });

    expect(getPendingSyncCount()).toBe(1);
  });

  it("deduplicates identical interaction items", async () => {
    const { enqueueSyncItem, getPendingSyncCount } = await importModule();

    const interaction = {
      type: "interaction" as const,
      method: "POST" as const,
      url: "/api/interactions",
      body: { spaceCode: "test", interactionType: "like", contentId: "n1" },
      spaceCode: "test",
      identity: "partner1"
    };

    enqueueSyncItem(interaction);
    enqueueSyncItem(interaction);

    expect(getPendingSyncCount()).toBe(1);
  });
});