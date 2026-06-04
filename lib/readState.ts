"use client";

import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";

/**
 * Read/unread state for love notes.
 *
 * Stores a map of note IDs to read timestamps in localStorage.
 * Each identity + spaceCode combination has independent read state.
 *
 * This is device-local state — NOT synced to Supabase.
 * Export/backup does not include read state.
 */

const STORAGE_PREFIX = "bristol_dashboard_read_state";

export type ReadMap = Record<string, string>; // noteId -> ISO timestamp

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

/**
 * Mark a note as read.
 */
export function markAsRead(noteId: string, spaceCode = "default", identity = DEFAULT_NORMAL_IDENTITY_ID): void {
  const map = loadReadMap(spaceCode, identity);
  map[noteId] = new Date().toISOString();
  saveReadMap(spaceCode, identity, map);
}

/**
 * Check if a note has been read.
 */
export function isRead(noteId: string, spaceCode = "default", identity = DEFAULT_NORMAL_IDENTITY_ID): boolean {
  const map = loadReadMap(spaceCode, identity);
  return noteId in map;
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
    // Exclude own notes — either the current identity or DEFAULT_NORMAL_IDENTITY_ID
    if (n.author === identity || n.author === DEFAULT_NORMAL_IDENTITY_ID) return false;
    // Exclude soft-deleted notes
    if (n.deletedAt) return false;
    // Check if unread
    return !(n.id in map);
  }).length;
}

/**
 * Get unread note IDs from a list.
 * Excludes: own notes, soft-deleted notes.
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
      return !(n.id in map);
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
    if (!(n.id in map)) {
      map[n.id] = now;
    }
  }
  saveReadMap(spaceCode, identity, map);
}

/**
 * Get the timestamp when a note was read, or null if unread.
 */
export function getReadAt(noteId: string, spaceCode = "default", identity = DEFAULT_NORMAL_IDENTITY_ID): string | null {
  const map = loadReadMap(spaceCode, identity);
  return map[noteId] || null;
}

/**
 * Reset all read state (for testing or manual reset).
 */
export function resetReadState(spaceCode = "default", identity = DEFAULT_NORMAL_IDENTITY_ID): void {
  if (typeof window === "undefined") { _cacheKey = null; _cacheMap = null; return; }
  try {
    window.localStorage.removeItem(getStorageKey(spaceCode, identity));
    invalidateCache();
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