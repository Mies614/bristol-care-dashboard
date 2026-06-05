import type { AlbumItem, LoveNote } from "./types";

export type TimelineItem = {
  id: string;
  type: "note" | "photo" | "video" | "live_photo" | "audio" | "meeting";
  title: string;
  content?: string;
  date: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  href: string;
};

export type TimelineGroup = {
  month: string;
  items: TimelineItem[];
};

function visibleNote(note: LoveNote) {
  return note.active !== false && !note.deletedAt;
}

function visibleAlbum(item: AlbumItem) {
  return !item.deletedAt;
}

function monthKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未标日期";
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月`;
}

export function buildMemoryTimelineItems(input: {
  notes?: LoveNote[];
  albums?: AlbumItem[];
  nextMeetingDate?: string;
  basePath?: string;
}): TimelineItem[] {
  const basePath = input.basePath || "";
  const notes = (input.notes || []).filter(visibleNote).map((note): TimelineItem => ({
    id: `note-${note.id}`,
    type: note.audioUrl ? "audio" : note.videoUrl ? "video" : note.imageUrl ? "photo" : "note",
    title: note.mood || "小纸条",
    content: note.content,
    date: note.createdAt || note.visibleFrom || new Date(0).toISOString(),
    imageUrl: note.imageUrl,
    videoUrl: note.videoUrl,
    audioUrl: note.audioUrl,
    href: `${basePath}/notes`
  }));
  const albums = (input.albums || []).filter(visibleAlbum).map((item): TimelineItem => ({
    id: `album-${item.id}`,
    type: item.type,
    title: item.title || "相册回忆",
    content: item.note,
    date: item.takenAt || item.createdAt || new Date(0).toISOString(),
    imageUrl: item.imageUrl,
    videoUrl: item.videoUrl,
    href: `${basePath}/albums`
  }));
  const meeting = input.nextMeetingDate ? [{
    id: `meeting-${input.nextMeetingDate}`,
    type: "meeting" as const,
    title: "下次见面",
    content: "又近了一点。",
    date: input.nextMeetingDate,
    href: `${basePath}/settings`
  }] : [];
  return [...notes, ...albums, ...meeting].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function groupTimelineByMonth(items: TimelineItem[]): TimelineGroup[] {
  const groups = new Map<string, TimelineItem[]>();
  for (const item of items) {
    const key = monthKey(item.date);
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  return Array.from(groups.entries()).map(([month, groupItems]) => ({ month, items: groupItems }));
}
