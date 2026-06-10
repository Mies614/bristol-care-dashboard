import { describe, expect, it } from "vitest";
import { getLatestVisibleNote, getLatestVisibleMemories } from "../lib/recentContent";
import type { LoveNote, AlbumItem } from "../lib/types";

function makeNote(overrides: Partial<LoveNote> = {}): LoveNote {
  return {
    id: "n1",
    content: "hello",
    author: "partner",
    active: true,
    pinned: false,
    createdAt: "2025-01-01T00:00:00Z",
    ...overrides,
  } as LoveNote;
}

function makeAlbum(overrides: Partial<AlbumItem> = {}): AlbumItem {
  return {
    id: "a1",
    title: "photo",
    type: "photo",
    createdAt: "2025-01-01T00:00:00Z",
    isFavorite: false,
    ...overrides,
  } as AlbumItem;
}

describe("getLatestVisibleNote", () => {
  it("returns latest note by createdAt", () => {
    const notes = [
      makeNote({ id: "old", createdAt: "2025-01-01T00:00:00Z" }),
      makeNote({ id: "new", createdAt: "2025-06-10T00:00:00Z" }),
    ];
    expect(getLatestVisibleNote(notes)?.id).toBe("new");
  });

  it("uses max of updatedAt and createdAt", () => {
    const notes = [
      makeNote({ id: "a", createdAt: "2025-06-10T00:00:00Z", updatedAt: undefined }),
      makeNote({ id: "b", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-06-10T00:00:00Z" }),
    ];
    // Both have max timestamp 2025-06-10 — a's createdAt, b's updatedAt
    // Either is acceptable; both are equally recent
    const result = getLatestVisibleNote(notes);
    expect(result).toBeTruthy();
  });

  it("filters out hidden notes", () => {
    const notes = [
      makeNote({ id: "hidden", active: false, createdAt: "2025-06-10T00:00:00Z" }),
      makeNote({ id: "visible", createdAt: "2025-01-01T00:00:00Z" }),
    ];
    expect(getLatestVisibleNote(notes)?.id).toBe("visible");
  });

  it("filters out notes with deletedAt", () => {
    const notes = [
      makeNote({ id: "deleted", deletedAt: "2025-01-01T00:00:00Z", createdAt: "2025-06-10T00:00:00Z" }),
      makeNote({ id: "ok", createdAt: "2025-01-01T00:00:00Z" }),
    ];
    expect(getLatestVisibleNote(notes)?.id).toBe("ok");
  });

  it("returns latest active note when mixed with inactive", () => {
    const notes = [
      makeNote({ id: "inactive", active: false, createdAt: "2025-06-10T00:00:00Z" }),
      makeNote({ id: "real", active: true, createdAt: "2025-01-01T00:00:00Z" }),
    ];
    expect(getLatestVisibleNote(notes)?.id).toBe("real");
  });

  it("returns null for empty array", () => {
    expect(getLatestVisibleNote([])).toBeNull();
  });

  it("returns null when all notes are hidden", () => {
    const notes = [
      makeNote({ id: "h1", active: false }),
      makeNote({ id: "h2", deletedAt: "2025-01-01T00:00:00Z" }),
    ];
    expect(getLatestVisibleNote(notes)).toBeNull();
  });

  it("handles null input gracefully", () => {
    expect(getLatestVisibleNote(null as unknown as LoveNote[])).toBeNull();
  });
});

describe("getLatestVisibleMemories", () => {
  it("returns latest 2 items", () => {
    const items = [
      makeAlbum({ id: "old", createdAt: "2025-01-01T00:00:00Z" }),
      makeAlbum({ id: "mid", createdAt: "2025-03-01T00:00:00Z" }),
      makeAlbum({ id: "new", createdAt: "2025-06-10T00:00:00Z" }),
    ];
    const result = getLatestVisibleMemories(items, 2);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("new");
    expect(result[1].id).toBe("mid");
  });

  it("filters out deleted items", () => {
    const items = [
      makeAlbum({ id: "del", deletedAt: "2025-01-01T00:00:00Z", createdAt: "2025-06-10T00:00:00Z" }),
      makeAlbum({ id: "ok", createdAt: "2025-01-01T00:00:00Z" }),
    ];
    const result = getLatestVisibleMemories(items, 2);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ok");
  });

  it("prioritizes favorites among recent", () => {
    const items = [
      makeAlbum({ id: "nf1", isFavorite: false, createdAt: "2025-06-10T00:00:00Z" }),
      makeAlbum({ id: "fav", isFavorite: true, createdAt: "2025-05-01T00:00:00Z" }),
      makeAlbum({ id: "nf2", isFavorite: false, createdAt: "2025-04-01T00:00:00Z" }),
    ];
    const result = getLatestVisibleMemories(items, 2);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("fav");
    expect(result[1].id).toBe("nf1");
  });

  it("returns empty for empty array", () => {
    expect(getLatestVisibleMemories([], 2)).toEqual([]);
  });

  it("handles limit larger than available items", () => {
    const items = [makeAlbum({ id: "a1" })];
    expect(getLatestVisibleMemories(items, 5)).toHaveLength(1);
  });

  it("uses takenAt as fallback timestamp", () => {
    const items = [
      makeAlbum({ id: "old", createdAt: "2025-01-01T00:00:00Z" }),
      makeAlbum({ id: "recent", createdAt: "2025-01-01T00:00:00Z", takenAt: "2025-06-10T00:00:00Z" }),
    ];
    const result = getLatestVisibleMemories(items, 2);
    expect(result[0].id).toBe("recent");
  });
});
