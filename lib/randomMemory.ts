import type { AlbumItem, LoveNote } from "./types";

export type RandomMemoryItem = {
  id: string;
  source: "note" | "album";
  type: "text" | "image" | "audio" | "video" | "live_photo" | "mixed";
  title?: string;
  content?: string;
  imageUrl?: string;
  imagePath?: string;
  videoUrl?: string;
  audioUrl?: string;
  createdAt?: string;
  href: string;
};

function isVisibleNote(note: LoveNote) {
  return note.active !== false && !note.deletedAt;
}

function isVisibleAlbum(item: AlbumItem) {
  return !item.deletedAt;
}

export function buildRandomMemoryItems(notes: LoveNote[] = [], albums: AlbumItem[] = []): RandomMemoryItem[] {
  const noteItems = notes.filter(isVisibleNote).map((note) => ({
    id: `note-${note.id}`,
    source: "note" as const,
    type: note.noteType || (note.videoUrl ? "video" : note.audioUrl ? "audio" : note.imageUrl ? "image" : "text"),
    title: note.mood || "小纸条",
    content: note.content,
    imageUrl: note.imageUrl,
    imagePath: note.imagePath,
    videoUrl: note.videoUrl,
    audioUrl: note.audioUrl,
    createdAt: note.createdAt,
    href: "/notes"
  }));
  const albumItems = albums.filter(isVisibleAlbum).map((item) => ({
    id: `album-${item.id}`,
    source: "album" as const,
    type: item.type === "photo" ? "image" as const : item.type,
    title: item.title || "相册回忆",
    content: item.note,
    imageUrl: item.imageUrl,
    imagePath: item.imagePath,
    videoUrl: item.videoUrl,
    createdAt: item.takenAt || item.createdAt,
    href: "/albums"
  }));
  return [...noteItems, ...albumItems];
}

export function pickRandomMemory(items: RandomMemoryItem[], previousId?: string): RandomMemoryItem | null {
  if (!items.length) return null;
  if (items.length === 1) return items[0];
  const candidates = previousId ? items.filter((item) => item.id !== previousId) : items;
  return candidates[Math.floor(Math.random() * candidates.length)] || items[0];
}
