import { describe, expect, it } from "vitest";
import { buildMemoryTimelineItems, groupTimelineByMonth } from "@/lib/memoryTimeline";
import type { AlbumItem, LoveNote } from "@/lib/types";

describe("memory timeline", () => {
  const note: LoveNote = {
    id: "n1",
    content: "今天很好",
    active: true,
    pinned: false,
    createdAt: "2026-05-20T08:00:00Z"
  };
  const album: AlbumItem = {
    id: "a1",
    type: "photo",
    title: "照片",
    imageUrl: "https://example.com/a.jpg",
    takenAt: "2026-04-10T08:00:00Z"
  };

  it("merges notes, albums and meeting date", () => {
    const items = buildMemoryTimelineItems({ notes: [note], albums: [album], nextMeetingDate: "2026-06-01" });
    expect(items.map((item) => item.id)).toContain("note-n1");
    expect(items.map((item) => item.id)).toContain("album-a1");
    expect(items.map((item) => item.id)).toContain("meeting-2026-06-01");
  });

  it("filters hidden and deleted content", () => {
    const items = buildMemoryTimelineItems({
      notes: [{ ...note, active: false }, { ...note, id: "n2", deletedAt: "2026-05-21T08:00:00Z" }],
      albums: [{ ...album, deletedAt: "2026-04-11T08:00:00Z" }]
    });
    expect(items).toEqual([]);
  });

  it("groups items by month", () => {
    const groups = groupTimelineByMonth(buildMemoryTimelineItems({ notes: [note], albums: [album] }));
    expect(groups.map((group) => group.month)).toEqual(["2026年05月", "2026年04月"]);
  });
});
