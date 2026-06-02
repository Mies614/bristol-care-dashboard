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

function makeNote(id: string, author: string, createdAt: string): LoveNote {
  return {
    id,
    content: "test",
    active: true,
    pinned: false,
    author: author as LoveNote["author"],
    createdAt,
  };
}

function makeAlbum(id: string, createdAt: string): AlbumItem {
  return {
    id,
    type: "photo",
    createdAt,
  };
}

describe("updateChecker", () => {
  beforeEach(() => {
    vi.resetModules();
    const storage = makeStorage();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("localStorage", storage);
  });

  it("returns all partner notes when never checked", async () => {
    const { getNewNotes } = await import("@/lib/updateChecker");
    const notes = [
      makeNote("n1", "admin", "2026-06-01T00:00:00Z"),
      makeNote("n2", "xiaoguai", "2026-06-01T00:00:00Z"), // own, excluded
      makeNote("n3", "admin", "2026-06-02T00:00:00Z"),
    ];
    const newNotes = getNewNotes(notes);
    expect(newNotes).toHaveLength(2);
    expect(newNotes[0].id).toBe("n1");
    expect(newNotes[1].id).toBe("n3");
  });

  it("returns only notes after last check", async () => {
    // Set a last check time
    localStorage.setItem("bristol_dashboard_last_check_at", "2026-06-01T12:00:00Z");

    const { getNewNotes } = await import("@/lib/updateChecker");
    const notes = [
      makeNote("n1", "admin", "2026-06-01T00:00:00Z"), // before check
      makeNote("n2", "admin", "2026-06-02T00:00:00Z"), // after check
    ];
    const newNotes = getNewNotes(notes);
    expect(newNotes).toHaveLength(1);
    expect(newNotes[0].id).toBe("n2");
  });

  it("getPartnerUpdates returns full summary", async () => {
    localStorage.setItem("bristol_dashboard_last_check_at", "2026-06-01T12:00:00Z");

    const { getPartnerUpdates } = await import("@/lib/updateChecker");
    const notes = [
      makeNote("n1", "admin", "2026-06-02T00:00:00Z"),
      makeNote("n2", "admin", "2026-06-03T00:00:00Z"),
    ];
    const albums = [
      makeAlbum("a1", "2026-06-02T00:00:00Z"),
    ];

    const updates = getPartnerUpdates(notes, albums);
    expect(updates.hasUpdates).toBe(true);
    expect(updates.newNotesCount).toBe(2);
    expect(updates.newAlbumsCount).toBe(1);
    expect(updates.latestAt).toBe("2026-06-03T00:00:00Z");
  });

  it("getPartnerUpdates returns empty after marking checked", async () => {
    localStorage.setItem("bristol_dashboard_last_check_at", "2026-06-01T12:00:00Z");
    const notes = [makeNote("n1", "admin", "2026-06-02T00:00:00Z")];

    const { getPartnerUpdates } = await import("@/lib/updateChecker");
    let updates = getPartnerUpdates(notes, []);
    expect(updates.hasUpdates).toBe(true);

    // Mark checked
    const { clearSeenUpdates } = await import("@/lib/updateChecker");
    clearSeenUpdates();

    // Now should return empty
    updates = getPartnerUpdates(notes, []);
    expect(updates.hasUpdates).toBe(false);
    expect(updates.newNotesCount).toBe(0);
  });

  it("getUpdateMessage returns null when no updates", async () => {
    const { getUpdateMessage } = await import("@/lib/updateChecker");
    const msg = getUpdateMessage({
      newNotesCount: 0,
      newAlbumsCount: 0,
      latestAt: null,
      hasUpdates: false,
    });
    expect(msg).toBeNull();
  });

  it("getUpdateMessage generates gentle text", async () => {
    const { getUpdateMessage } = await import("@/lib/updateChecker");
    const msg1 = getUpdateMessage({
      newNotesCount: 1,
      newAlbumsCount: 0,
      latestAt: "2026-06-01T00:00:00Z",
      hasUpdates: true,
    });
    expect(msg1).toContain("1 条新小纸条");

    const msg2 = getUpdateMessage({
      newNotesCount: 2,
      newAlbumsCount: 3,
      latestAt: "2026-06-01T00:00:00Z",
      hasUpdates: true,
    });
    expect(msg2).toContain("2 条新小纸条");
    expect(msg2).toContain("3 张新照片");
  });

  it("does not crash when localStorage unavailable", async () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("localStorage", undefined);
    vi.resetModules();

    const { getNewNotes, getPartnerUpdates, clearSeenUpdates } = await import("@/lib/updateChecker");
    const notes = [makeNote("n1", "admin", "2026-06-02T00:00:00Z")];

    expect(() => getNewNotes(notes)).not.toThrow();
    expect(() => getPartnerUpdates(notes, [])).not.toThrow();
    expect(() => clearSeenUpdates()).not.toThrow();
  });
});
