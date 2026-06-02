import { describe, expect, it, beforeEach, vi } from "vitest";
import type { LoveNote, AlbumItem } from "@/lib/types";

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

function makeNote(
  id: string,
  author: string,
  overrides: Partial<LoveNote> = {}
): LoveNote {
  return {
    id,
    content: "test",
    active: true,
    pinned: false,
    author: author as LoveNote["author"],
    createdAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

function makeAlbum(id: string, createdAt: string, overrides: Partial<AlbumItem> = {}): AlbumItem {
  return {
    id,
    type: "photo",
    createdAt,
    ...overrides,
  };
}

describe("readState isolation and filtering", () => {
  beforeEach(() => {
    vi.resetModules();
    const storage = makeStorage();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("localStorage", storage);
  });

  it("isolates read state per spaceCode", async () => {
    const { markAsRead, isRead } = await import("@/lib/readState");

    markAsRead("n1", "space-A");
    markAsRead("n2", "space-B");

    expect(isRead("n1", "space-A")).toBe(true);
    expect(isRead("n1", "space-B")).toBe(false);
    expect(isRead("n2", "space-A")).toBe(false);
    expect(isRead("n2", "space-B")).toBe(true);
  });

  it("getUnreadCount isolates per spaceCode", async () => {
    const { markAsRead, getUnreadCount } = await import("@/lib/readState");

    const notes = [makeNote("n1", "admin"), makeNote("n2", "admin")];

    markAsRead("n1", "space-A");
    expect(getUnreadCount(notes, "space-A")).toBe(1);
    expect(getUnreadCount(notes, "space-B")).toBe(2);
  });

  it("excludes soft-deleted notes from unread count", async () => {
    const { getUnreadCount } = await import("@/lib/readState");

    const notes = [
      makeNote("n1", "admin", { deletedAt: "2026-06-01T00:00:00Z" }),
      makeNote("n2", "admin"),
    ];

    expect(getUnreadCount(notes)).toBe(1);
  });

  it("excludes own notes from unread count", async () => {
    const { getUnreadCount } = await import("@/lib/readState");

    const notes = [
      makeNote("n1", "xiaoguai"),
      makeNote("n2", "admin"),
      makeNote("n3", "xiaoguai"),
    ];

    expect(getUnreadCount(notes)).toBe(1);
  });

  it("excludes own and soft-deleted notes from getUnreadIds", async () => {
    const { getUnreadIds } = await import("@/lib/readState");

    const notes = [
      makeNote("n1", "xiaoguai"),
      makeNote("n2", "admin", { deletedAt: "2026-06-01T00:00:00Z" }),
      makeNote("n3", "admin"),
    ];

    const unread = getUnreadIds(notes);
    expect(unread).toEqual(["n3"]);
  });
});

describe("reactions isolation", () => {
  beforeEach(() => {
    vi.resetModules();
    const storage = makeStorage();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("localStorage", storage);
  });

  it("isolates reactions per spaceCode", async () => {
    const { addReaction, hasReaction } = await import("@/lib/reactions");

    addReaction("n1", "heart", "space-A");
    expect(hasReaction("n1", "heart", "space-A")).toBe(true);
    expect(hasReaction("n1", "heart", "space-B")).toBe(false);
  });

  it("getReactionsForNote isolates per spaceCode", async () => {
    const { addReaction, getReactionsForNote } = await import("@/lib/reactions");

    addReaction("n1", "heart", "space-A");
    const reactionsA = getReactionsForNote("n1", "space-A");
    const reactionsB = getReactionsForNote("n1", "space-B");

    expect(reactionsA.find((r) => r.id === "heart")!.count).toBe(1);
    expect(reactionsB.find((r) => r.id === "heart")!.count).toBe(0);
  });

  it("does not double-count same user same reaction", async () => {
    const { addReaction } = await import("@/lib/reactions");

    expect(addReaction("n1", "heart")).toBe(1);
    expect(addReaction("n1", "heart")).toBe(1); // Same user, no change
    expect(addReaction("n1", "heart")).toBe(1);
  });
});

describe("updateChecker isolation and filtering", () => {
  beforeEach(() => {
    vi.resetModules();
    const storage = makeStorage();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("localStorage", storage);
  });

  it("isolates last check per spaceCode", async () => {
    const { markChecked, getLastCheckAt } = await import("@/lib/updateChecker");

    markChecked("space-A");

    // Wait a tiny bit then mark space-B
    const timeA = getLastCheckAt("space-A");
    expect(timeA).toBeTruthy();

    // Default space not checked
    expect(getLastCheckAt("space-B")).toBeNull();
  });

  it("clears updates after clearSeenUpdates", async () => {
    const { getPartnerUpdates, clearSeenUpdates, markChecked } = await import("@/lib/updateChecker");

    // First reset
    markChecked();
    await new Promise((r) => setTimeout(r, 10));

    const notes = [makeNote("n1", "admin", { createdAt: new Date(Date.now() - 100).toISOString() })];
    let updates = getPartnerUpdates(notes, []);
    expect(updates.hasUpdates).toBe(false); // note is older than check

    // New note
    notes.push(makeNote("n2", "admin", { createdAt: new Date().toISOString() }));
    updates = getPartnerUpdates(notes, []);
    expect(updates.hasUpdates).toBe(true);

    clearSeenUpdates();
    updates = getPartnerUpdates(notes, []);
    expect(updates.hasUpdates).toBe(false);
  });

  it("excludes soft-deleted notes", async () => {
    const { resetLastCheck, getNewNotes } = await import("@/lib/updateChecker");

    resetLastCheck(); // Ensure no last check

    const notes = [
      makeNote("n1", "admin", { deletedAt: "2026-06-01T00:00:00Z" }),
      makeNote("n2", "admin"),
    ];

    const newNotes = getNewNotes(notes);
    expect(newNotes).toHaveLength(1);
    expect(newNotes[0].id).toBe("n2");
  });

  it("excludes soft-deleted albums", async () => {
    const { resetLastCheck, getNewAlbums } = await import("@/lib/updateChecker");

    resetLastCheck();

    const albums = [
      makeAlbum("a1", "2026-06-01T00:00:00Z", { deletedAt: "2026-06-02T00:00:00Z" }),
      makeAlbum("a2", "2026-06-01T00:00:00Z"),
    ];

    const newAlbums = getNewAlbums(albums);
    expect(newAlbums).toHaveLength(1);
    expect(newAlbums[0].id).toBe("a2");
  });

  it("excludes own notes in updates", async () => {
    const { resetLastCheck, getNewNotes } = await import("@/lib/updateChecker");

    resetLastCheck();

    const notes = [
      makeNote("n1", "xiaoguai"),
      makeNote("n2", "admin"),
    ];

    const newNotes = getNewNotes(notes);
    expect(newNotes).toHaveLength(1);
    expect(newNotes[0].id).toBe("n2");
  });
});
