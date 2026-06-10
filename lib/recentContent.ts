import type { LoveNote, AlbumItem } from "@/lib/types";

/**
 * Get the latest visible note — filters out hidden/deleted, sample notes,
 * then sorts by most recent timestamp.
 */
export function getLatestVisibleNote(notes: LoveNote[]): LoveNote | null {
  if (!notes || notes.length === 0) return null;

  const visible = notes.filter((n) => {
    if (!n) return false;
    if (!n.active) return false; // inactive = hidden
    if (n.deletedAt) return false;
    return true;
  });

  if (visible.length === 0) return null;

  // Sort all visible notes by time (newest first)
  visible.sort((a, b) => {
    return getLatestTimestamp(b) - getLatestTimestamp(a);
  });

  return visible[0] || null;
}

function getLatestTimestamp(note: LoveNote): number {
  const candidates: (string | undefined)[] = [
    note.updatedAt,
    note.createdAt,
  ];
  let maxTime = 0;
  for (const c of candidates) {
    if (c) {
      const t = new Date(c).getTime();
      if (!isNaN(t) && t > maxTime) maxTime = t;
    }
  }
  return maxTime;
}

/**
 * Get latest visible memories — filters out hidden/deleted items,
 * real items before sample, sorts by most recent timestamp.
 */
export function getLatestVisibleMemories(
  items: AlbumItem[],
  limit = 2
): AlbumItem[] {
  if (!items || items.length === 0) return [];

  const visible = items.filter((item) => {
    if (!item) return false;
    if (item.deletedAt) return false;
    return true;
  });

  if (visible.length === 0) return [];

  // Sort by time (newest first)
  visible.sort((a, b) => {
    return getAlbumTimestamp(b) - getAlbumTimestamp(a);
  });

  // Prioritize favorites among the sorted items
  const favorites = visible.filter((item) => item.isFavorite);
  const nonFavorites = visible.filter((item) => !item.isFavorite);

  const result: AlbumItem[] = [];
  for (const fav of favorites) {
    if (result.length >= limit) break;
    result.push(fav);
  }
  for (const nf of nonFavorites) {
    if (result.length >= limit) break;
    result.push(nf);
  }

  return result.slice(0, limit);
}

function getAlbumTimestamp(item: AlbumItem): number {
  const candidates: (string | undefined)[] = [
    item.createdAt,
    item.takenAt,
  ];
  let maxTime = 0;
  for (const c of candidates) {
    if (c) {
      const t = new Date(c).getTime();
      if (!isNaN(t) && t > maxTime) maxTime = t;
    }
  }
  return maxTime;
}
