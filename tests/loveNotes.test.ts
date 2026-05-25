import { describe, expect, it } from "vitest";
import { pickFeaturedLoveNote } from "@/lib/loveNotes";
import type { LoveNote } from "@/lib/types";

const now = new Date("2026-05-25T12:00:00Z");

function note(partial: Partial<LoveNote>): LoveNote {
  return {
    id: partial.id || crypto.randomUUID(),
    content: partial.content || "note",
    active: partial.active ?? true,
    pinned: partial.pinned ?? false,
    visibleFrom: partial.visibleFrom || "2026-05-25T10:00:00Z",
    createdAt: partial.createdAt || "2026-05-25T10:00:00Z",
    ...partial
  };
}

describe("love note selection", () => {
  it("prefers pinned notes", () => {
    const picked = pickFeaturedLoveNote([note({ content: "latest", visibleFrom: "2026-05-25T11:00:00Z" }), note({ content: "pinned", pinned: true })], now);
    expect(picked?.content).toBe("pinned");
  });

  it("selects latest active note when none is pinned", () => {
    const picked = pickFeaturedLoveNote([note({ content: "old", visibleFrom: "2026-05-25T09:00:00Z" }), note({ content: "new", visibleFrom: "2026-05-25T11:00:00Z" })], now);
    expect(picked?.content).toBe("new");
  });

  it("does not show future notes", () => {
    const picked = pickFeaturedLoveNote([note({ content: "future", visibleFrom: "2026-05-26T11:00:00Z" })], now);
    expect(picked).toBeUndefined();
  });

  it("does not return inactive notes", () => {
    const picked = pickFeaturedLoveNote([note({ content: "inactive", active: false })], now);
    expect(picked).toBeUndefined();
  });

  it("does not return deleted notes and falls back to next active note", () => {
    const picked = pickFeaturedLoveNote([
      note({ content: "deleted pinned", pinned: true, deletedAt: "2026-05-25T11:00:00Z" }),
      note({ content: "next active", visibleFrom: "2026-05-25T10:30:00Z" })
    ], now);
    expect(picked?.content).toBe("next active");
  });

  it("handles notes with and without images", () => {
    const picked = pickFeaturedLoveNote([note({ content: "image", imageUrl: "https://example.com/a.webp" }), note({ content: "text" })], now);
    expect(picked?.imageUrl).toBe("https://example.com/a.webp");
  });
});
