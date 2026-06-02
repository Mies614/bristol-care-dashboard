import { describe, expect, it, beforeEach, vi } from "vitest";

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

describe("readState", () => {
  beforeEach(() => {
    vi.resetModules();
    const storage = makeStorage();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("localStorage", storage);
  });

  it("marks a note as read", async () => {
    const { markAsRead, isRead } = await import("@/lib/readState");
    markAsRead("note-1");
    expect(isRead("note-1")).toBe(true);
  });

  it("unread count is correct for new notes", async () => {
    const { getUnreadCount } = await import("@/lib/readState");
    const notes = [
      { id: "n1", author: "admin" },
      { id: "n2", author: "admin" },
      { id: "n3", author: "xiaoguai" }, // Own note doesn't count
    ];
    expect(getUnreadCount(notes)).toBe(2);
  });

  it("unread count decreases after marking read", async () => {
    const { markAsRead, getUnreadCount } = await import("@/lib/readState");
    const notes = [
      { id: "n1", author: "admin" },
      { id: "n2", author: "admin" },
    ];

    expect(getUnreadCount(notes)).toBe(2);
    markAsRead("n1");
    expect(getUnreadCount(notes)).toBe(1);
    markAsRead("n2");
    expect(getUnreadCount(notes)).toBe(0);
  });

  it("does not count own notes as unread", async () => {
    const { getUnreadCount } = await import("@/lib/readState");
    const notes = [
      { id: "n1", author: "xiaoguai" },
      { id: "n2", author: "xiaoguai" },
    ];
    expect(getUnreadCount(notes)).toBe(0);
  });

  it("getUnreadIds returns correct IDs", async () => {
    const { markAsRead, getUnreadIds } = await import("@/lib/readState");
    const notes = [
      { id: "n1", author: "admin" },
      { id: "n2", author: "admin" },
      { id: "n3", author: "xiaoguai" },
    ];

    markAsRead("n1");
    const unread = getUnreadIds(notes);
    expect(unread).toEqual(["n2"]); // n3 is xiaoguai, n1 is read
  });

  it("markAllAsRead marks all notes", async () => {
    const { markAllAsRead, getUnreadCount } = await import("@/lib/readState");
    const notes = [
      { id: "n1", author: "admin" },
      { id: "n2", author: "admin" },
    ];

    markAllAsRead(notes);
    expect(getUnreadCount(notes)).toBe(0);
  });

  it("getReadAt returns timestamp after mark", async () => {
    const { markAsRead, getReadAt } = await import("@/lib/readState");
    expect(getReadAt("n1")).toBeNull();
    markAsRead("n1");
    expect(getReadAt("n1")).toBeTruthy();
    expect(new Date(getReadAt("n1")!).getTime()).toBeGreaterThan(0);
  });

  it("read state persists across module reloads", async () => {
    const { markAsRead } = await import("@/lib/readState");
    markAsRead("n1");

    // Reload readState module
    vi.resetModules();
    const { isRead } = await import("@/lib/readState");
    expect(isRead("n1")).toBe(true);
  });

  it("does not crash when localStorage is unavailable", async () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("localStorage", undefined);
    vi.resetModules();

    const { markAsRead, isRead, getUnreadCount } = await import("@/lib/readState");
    expect(() => markAsRead("n1")).not.toThrow();
    expect(isRead("n1")).toBe(false);
    expect(getUnreadCount([{ id: "n1", author: "admin" }])).toBe(1);
  });
});
