import type { LoveNote } from "./types";

export function getVisibleLoveNotes(notes: LoveNote[], now = new Date()): LoveNote[] {
  return notes
    .filter((note) => note.active)
    .filter((note) => !note.deletedAt)
    .filter((note) => !note.visibleFrom || new Date(note.visibleFrom).getTime() <= now.getTime())
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.visibleFrom || b.createdAt || 0).getTime() - new Date(a.visibleFrom || a.createdAt || 0).getTime();
    });
}

export function pickFeaturedLoveNote(notes: LoveNote[], now = new Date()): LoveNote | undefined {
  return getVisibleLoveNotes(notes, now)[0];
}
