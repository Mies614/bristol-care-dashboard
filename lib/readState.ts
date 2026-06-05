"use client";

import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";

/**
 * Read/unread state for all content types (notes, albums, memories).
 *
 * Uses composite keys in localStorage:
 *   note:{noteId}   → ISO timestamp
 *   album:{albumId} → ISO timestamp
 *   memory:{memoryId} → ISO timestamp
 *
 * Each identity + spaceCode combination has independent read state.
 *
 * This is device-local state — NOT synced to Supabase.
 * Export/backup does not include read state.
 */

const STORAGE_PREFIX = "bristol_dashboard_read_state";

/** Event dispatched when read state changes, so BottomNav / homepage can update. */
export const READ_STATE_CHANGED_EVENT = "bristol-read-state-changed";

export type ReadContentType = "note" | "album" | "memory";

export type ReadMap = Record<string, string>; // compositeKey -> ISO timestamp

function getStorageKey(spaceCode: string, identity: string): string {
  return `${STORAGE_PREFIX}_${spaceCode || "default"}_${identity || DEFAULT_NORMAL_IDENTITY_ID}`;
}

// In-memory cache to avoid repeated localStorage reads within a render cycle
let _cacheKey: string | null = null;
let _cacheMap: ReadMap | null = null;

function loadReadMap(spaceCode: string, identity: string): ReadMap {
  const key = getStorageKey(spaceCode, identity);
  if (_cacheKey === key && _cacheMap) return _cacheMap;

  if (typeof window === "undefined") { _cacheKey = null; _cacheMap = null; return {}; }
  try {
    const raw = window.localStorage.getItem(key);
    let map = raw ? (JSON.parse(raw) as ReadMap) : {};
    // Migrate from old key format (without identity) if new key is empty
    if (Object.keys(map).length === 0 && identity !== DEFAULT_NORMAL_IDENTITY_ID) {
      const oldKey = getStorageKey(spaceCode, DEFAULT_NORMAL_IDENTITY_ID);
      try {
        const oldRaw = window.localStorage.getItem(oldKey);
        if (oldRaw) {
          map = JSON.parse(oldRaw) as ReadMap;
          window.localStorage.setItem(key, JSON.stringify(map));
          window.localStorage.removeItem(oldKey);
        }
      } catch {
        // Non-critical migration
      }
    }
    _cacheMap = map;
    _cacheKey = key;
    return map;
  } catch {
    return {};
  }
}

function saveReadMap(spaceCode: string, identity: string, map: ReadMap): void {
  const key = getStorageKey(spaceCode, identity);
  _cacheMap = map;
  _cacheKey = key;
  if (typeof window === "undefined") { _cacheKey = null; _cacheMap = null; return; }
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
    // Notify listeners (BottomNav, homepage, etc.)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(READ_STATE_CHANGED_EVENT));
    }
  } catch {
    // Non-critical
  }
}

/**
 * Invalidate the in-memory cache. Call after external mutations.
 */
function invalidateCache(): void {
  _cacheKey = null;
  _cacheMap = null;
}

function compositeKey(contentType: ReadContentType, contentId: string): string {
  return `${contentType}:${contentId}`;
}

// ─── Generic content read state ───

/**
 * Mark any content type as read.
 */
export function markContentAsRead(
  contentType: ReadContentType,
  contentId: string,
  spaceCode = "default",
  identity = DEFAULT_NORMAL_IDENTITY_ID
): void {
  const map = loadReadMap(spaceCode, identity);
  map[compositeKey(contentType, contentId)] = new Date().toISOString();
  saveReadMap(spaceCode, identity, map);
}

/**
 * Check if any content type has been read.
 */
export function isContentRead(
  contentType: ReadContentType,
  contentId: string,
  spaceCode = "default",
  identity = DEFAULT_NORMAL_IDENTITY_ID
): boolean {
  const map = loadReadMap(spaceCode, identity);
  return compositeKey(contentType, contentId) in map;
}

// ─── Note read state (backward-compatible wrappers) ───

/**
 * Mark a note as read. Uses composite key "note:{id}" internally.
 */
export function markAsRead(noteId: string, spaceCode = "default", identity = DEFAULT_NORMAL_IDENTITY_ID): void {
  markContentAsRead("note", noteId, spaceCode, identity);
}

/**
 * Check if a note has been read.
 */
export function isRead(noteId: string, spaceCode = "default", identity = DEFAULT_NORMAL_IDENTITY_ID): boolean {
  return isContentRead("note", noteId, spaceCode, identity);
}

/**
 * Get the number of unread notes from a list.
 * Excludes: own notes, soft-deleted notes.
 */
export function getUnreadCount(
  notes: Array<{ id: string; author?: string | null; deletedAt?: string | null }>,
  spaceCode = "default",
  identity = DEFAULT_NORMAL_IDENTITY_ID
): number {
  const map = loadReadMap(spaceCode, identity);
  return notes.filter((n) => {
    if (n.author === identity || n.author === DEFAULT_NORMAL_IDENTITY_ID) return false;
    if (n.deletedAt) return false;
    return !(compositeKey("note", n.id) in map);
  }).length;
}

/**
 * Get unread note IDs from a list.
 */
export function getUnreadIds(
  notes: Array<{ id: string; author?: string | null; deletedAt?: string | null }>,
  spaceCode = "default",
  identity = DEFAULT_NORMAL_IDENTITY_ID
): string[] {
  const map = loadReadMap(spaceCode, identity);
  return notes
    .filter((n) => {
      if (n.author === identity || n.author === DEFAULT_NORMAL_IDENTITY_ID) return false;
      if (n.deletedAt) return false;
      return !(compositeKey("note", n.id) in map);
    })
    .map((n) => n.id);
}

/**
 * Mark multiple notes as read at once.
 */
export function markAllAsRead(
  notes: Array<{ id: string; author?: string | null; deletedAt?: string | null }>,
  spaceCode = "default",
  identity = DEFAULT_NORMAL_IDENTITY_ID
): void {
  const map = loadReadMap(spaceCode, identity);
  const now = new Date().toISOString();
  for (const n of notes) {
    const key = compositeKey("note", n.id);
    if (!(key in map)) {
      map[key] = now;
    }
  }
  saveReadMap(spaceCode, identity, map);
}

/**
 * Get the timestamp when a note was read, or null if unread.
 */
export function getReadAt(noteId: string, spaceCode = "default", identity = DEFAULT_NORMAL_IDENTITY_ID): string | null {
  const map = loadReadMap(spaceCode, identity);
  return map[compositeKey("note", noteId)] || null;
}

// ─── Album read state ───

/**
 * Get unread album count.
 * Excludes albums uploaded by the current identity.
 */
export function getUnreadAlbumCount(
  albums: Array<{ id: string; deletedAt?: string | null; createdBy?: string | null; author?: string | null }>,
  spaceCode = "default",
  identity = DEFAULT_NORMAL_IDENTITY_ID
): number {
  const map = loadReadMap(spaceCode, identity);
  return albums.filter((a) => {
    if (a.deletedAt) return false;
    // Exclude own uploads
    const uploader = a.createdBy || a.author;
    if (uploader && (uploader === identity || uploader === DEFAULT_NORMAL_IDENTITY_ID)) return false;
    return !(compositeKey("album", a.id) in map);
  }).length;
}

/**
 * Get unread album IDs.
 */
export function getUnreadAlbumIds(
  albums: Array<{ id: string; deletedAt?: string | null; createdBy?: string | null; author?: string | null }>,
  spaceCode = "default",
  identity = DEFAULT_NORMAL_IDENTITY_ID
): string[] {
  const map = loadReadMap(spaceCode, identity);
  return albums
    .filter((a) => {
      if (a.deletedAt) return false;
      const uploader = a.createdBy || a.author;
      if (uploader && (uploader === identity || uploader === DEFAULT_NORMAL_IDENTITY_ID)) return false;
      return !(compositeKey("album", a.id) in map);
    })
    .map((a) => a.id);
}

// ─── Memory read state ───

/**
 * Get unread memory count from a list of general items.
 * Items with a source type (note/album) use the source composite key to avoid double-counting.
 */
export function getUnreadMemoryCount(
  memories: Array<{
    id: string;
    deletedAt?: string | null;
    source?: "note" | "album";
    sourceId?: string;
  }>,
  spaceCode = "default",
  identity = DEFAULT_NORMAL_IDENTITY_ID
): number {
  const map = loadReadMap(spaceCode, identity);
  return memories.filter((m) => {
    if (m.deletedAt) return false;
    // If the memory has a source, check whether the source content was read
    if (m.source && m.sourceId) {
      return !(compositeKey(m.source, m.sourceId) in map);
    }
    // Fallback: use the memory's own composite key
    return !(compositeKey("memory", m.id) in map);
  }).length;
}

// ─── Combined summary ───

/**
 * Build a combined unread summary for homepage rendering.
 */
export function getUnreadHomeSummary(
  data: {
    notes: Array<{ id: string; author?: string | null; deletedAt?: string | null }>;
    albums: Array<{ id: string; deletedAt?: string | null; createdBy?: string | null; author?: string | null }>;
    memories?: Array<{ id: string; deletedAt?: string | null; source?: "note" | "album"; sourceId?: string }>;
  },
  spaceCode = "default",
  identity = DEFAULT_NORMAL_IDENTITY_ID
): { noteCount: number; albumCount: number; memoryCount: number; total: number; hasAny: boolean } {
  const noteCount = getUnreadCount(data.notes, spaceCode, identity);
  const albumCount = getUnreadAlbumCount(data.albums, spaceCode, identity);
  const memoryCount = data.memories ? getUnreadMemoryCount(data.memories, spaceCode, identity) : 0;
  const total = noteCount + albumCount + memoryCount;
  return { noteCount, albumCount, memoryCount, total, hasAny: total > 0 };
}

// ─── Reset ───

/**
 * Reset all read state (for testing or manual reset).
 */
export function resetReadState(spaceCode = "default", identity = DEFAULT_NORMAL_IDENTITY_ID): void {
  if (typeof window === "undefined") { _cacheKey = null; _cacheMap = null; return; }
  try {
    window.localStorage.removeItem(getStorageKey(spaceCode, identity));
    invalidateCache();
    // Notify listeners
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(READ_STATE_CHANGED_EVENT));
    }
  } catch {
    // Non-critical
  }
}

/**
 * Export read state as a serializable object for backup (optional).
 */
export function exportReadState(spaceCode = "default", identity = DEFAULT_NORMAL_IDENTITY_ID): ReadMap {
  return { ...loadReadMap(spaceCode, identity) };
}