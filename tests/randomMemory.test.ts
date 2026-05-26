import { describe, expect, it, vi } from "vitest";
import { buildRandomMemoryItems, pickRandomMemory } from "@/lib/randomMemory";
import type { AlbumItem, LoveNote } from "@/lib/types";

describe("random memory", () => {
  const visibleNote: LoveNote = {
    id: "n1",
    content: "想你",
    active: true,
    pinned: false,
    noteType: "text",
    createdAt: "2026-05-01T08:00:00Z"
  };
  const album: AlbumItem = {
    id: "a1",
    type: "photo",
    title: "海边",
    imageUrl: "https://example.com/a.jpg",
    createdAt: "2026-05-02T08:00:00Z"
  };

  it("combines notes and albums", () => {
    const items = buildRandomMemoryItems([visibleNote], [album]);
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.source)).toEqual(["note", "album"]);
  });

  it("filters inactive and deleted notes", () => {
    const items = buildRandomMemoryItems([
      visibleNote,
      { ...visibleNote, id: "n2", active: false },
      { ...visibleNote, id: "n3", deletedAt: "2026-05-03T08:00:00Z" }
    ], []);
    expect(items.map((item) => item.id)).toEqual(["note-n1"]);
  });

  it("filters deleted albums", () => {
    const items = buildRandomMemoryItems([], [
      album,
      { ...album, id: "a2", deletedAt: "2026-05-03T08:00:00Z" }
    ]);
    expect(items.map((item) => item.id)).toEqual(["album-a1"]);
  });

  it("avoids repeating the previous item when possible", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const items = buildRandomMemoryItems([visibleNote], [album]);
    expect(pickRandomMemory(items, "note-n1")?.id).toBe("album-a1");
    vi.restoreAllMocks();
  });

  it("returns null for empty items", () => {
    expect(pickRandomMemory([])).toBeNull();
  });

  it("can return the same item when there is only one", () => {
    const items = buildRandomMemoryItems([visibleNote], []);
    expect(pickRandomMemory(items, "note-n1")?.id).toBe("note-n1");
  });
});
