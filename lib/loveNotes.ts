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

export function filterNoteWallNotes(notes: LoveNote[], options: { author?: string; noteType?: string; q?: string } = {}) {
  const query = options.q?.trim().toLowerCase();
  return notes
    .filter((note) => !note.deletedAt)
    .filter((note) => note.active)
    .filter((note) => !options.author || note.author === options.author)
    .filter((note) => !options.noteType || note.noteType === options.noteType)
    .filter((note) => {
      if (!query) return true;
      return [note.content, note.mood, note.author].some((value) => value?.toLowerCase().includes(query));
    });
}
