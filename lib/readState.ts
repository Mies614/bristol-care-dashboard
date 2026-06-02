"use client";

/**
 * Read/unread state for love notes.
 *
 * Stores a map of note IDs to read timestamps in localStorage.
 * Each identity (xiaoguai / admin) has independent read state.
 */

const STORAGE_PREFIX = "bristol_dashboard_read_state";

export type ReadMap = Record<string, string>; // noteId -> ISO timestamp

/**
 * Get the current identity key for read state storage.
 */
function getIdentityKey(): string {
  return "xiaoguai"; // Default identity for the dashboard user
}

function getStorageKey(): string {
  return `${STORAGE_PREFIX}_${getIdentityKey()}`;
}

function loadReadMap(): ReadMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(getStorageKey());
    return raw ? (JSON.parse(raw) as ReadMap) : {};
  } catch {
    return {};
  }
}

function saveReadMap(map: ReadMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getStorageKey(), JSON.stringify(map));
  } catch {
    // Non-critical
  }
}

/**
 * Mark a note as read.
 */
export function markAsRead(noteId: string): void {
  const map = loadReadMap();
  map[noteId] = new Date().toISOString();
  saveReadMap(map);
}

/**
 * Check if a note has been read.
 */
export function isRead(noteId: string): boolean {
  const map = loadReadMap();
  return noteId in map;
}

/**
 * Get the number of unread notes from a list.
 */
export function getUnreadCount(notes: Array<{ id: string; author?: string | null }>): number {
  const map = loadReadMap();
  // Only count notes from "the other side" (admin) as unread for xiaoguai
  return notes.filter((n) => n.author !== "xiaoguai" && !(n.id in map)).length;
}

/**
 * Get unread note IDs from a list.
 */
export function getUnreadIds(notes: Array<{ id: string; author?: string | null }>): string[] {
  const map = loadReadMap();
  return notes
    .filter((n) => n.author !== "xiaoguai" && !(n.id in map))
    .map((n) => n.id);
}

/**
 * Mark multiple notes as read at once.
 */
export function markAllAsRead(notes: Array<{ id: string; author?: string | null }>): void {
  const map = loadReadMap();
  const now = new Date().toISOString();
  for (const n of notes) {
    if (!(n.id in map)) {
      map[n.id] = now;
    }
  }
  saveReadMap(map);
}

/**
 * Get the timestamp when a note was read, or null if unread.
 */
export function getReadAt(noteId: string): string | null {
  const map = loadReadMap();
  return map[noteId] || null;
}

/**
 * Reset all read state (for testing or manual reset).
 */
export function resetReadState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getStorageKey());
  } catch {
    // Non-critical
  }
}
