"use client";

/**
 * Partner update checker.
 *
 * Detects new notes, albums, and memories since the last time
 * the user checked. Stores the last check timestamp in localStorage.
 */

import type { LoveNote, AlbumItem } from "./types";

const STORAGE_KEY = "bristol_dashboard_last_check_at";

export interface PartnerUpdate {
  /** Number of new love notes from the other side */
  newNotesCount: number;
  /** Number of new album items */
  newAlbumsCount: number;
  /** ISO timestamp of the most recent new item */
  latestAt: string | null;
  /** Whether there are any unread updates */
  hasUpdates: boolean;
}

/**
 * Get the timestamp of the last check. Returns null if never checked.
 */
export function getLastCheckAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Save the current time as the last check timestamp.
 */
export function markChecked(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  } catch {
    // Non-critical
  }
}

/**
 * Reset the last check timestamp (for testing).
 */
export function resetLastCheck(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-critical
  }
}

/**
 * Check for new notes from the other side since last check.
 */
export function getNewNotes(notes: LoveNote[]): LoveNote[] {
  const lastCheck = getLastCheckAt();
  if (!lastCheck) return notes.filter((n) => n.author !== "xiaoguai");

  const lastDate = new Date(lastCheck);
  return notes.filter((n) => {
    if (n.author === "xiaoguai") return false; // Own notes don't count
    const createdAt = n.createdAt ? new Date(n.createdAt) : null;
    return createdAt && createdAt > lastDate;
  });
}

/**
 * Check for new albums since last check.
 */
export function getNewAlbums(albums: AlbumItem[]): AlbumItem[] {
  const lastCheck = getLastCheckAt();
  if (!lastCheck) return albums;

  const lastDate = new Date(lastCheck);
  return albums.filter((a) => {
    const createdAt = a.createdAt ? new Date(a.createdAt) : null;
    return createdAt && createdAt > lastDate;
  });
}

/**
 * Get a summary of partner updates since last check.
 */
export function getPartnerUpdates(notes: LoveNote[], albums: AlbumItem[]): PartnerUpdate {
  const newNotes = getNewNotes(notes);
  const newAlbums = getNewAlbums(albums);

  let latestAt: string | null = null;
  for (const n of newNotes) {
    if (n.createdAt && (!latestAt || n.createdAt > latestAt)) latestAt = n.createdAt;
  }
  for (const a of newAlbums) {
    if (a.createdAt && (!latestAt || a.createdAt > latestAt)) latestAt = a.createdAt;
  }

  return {
    newNotesCount: newNotes.length,
    newAlbumsCount: newAlbums.length,
    latestAt,
    hasUpdates: newNotes.length > 0 || newAlbums.length > 0,
  };
}

/**
 * Clear the "seen" state for updates (mark everything as checked).
 * After calling this, getPartnerUpdates will return zero updates.
 */
export function clearSeenUpdates(): void {
  markChecked();
}

/**
 * Generate a gentle message about partner updates.
 * Returns null if no updates.
 */
export function getUpdateMessage(updates: PartnerUpdate): string | null {
  if (!updates.hasUpdates) return null;

  const parts: string[] = [];
  if (updates.newNotesCount > 0) {
    parts.push(updates.newNotesCount === 1 ? "有 1 条新小纸条" : `有 ${updates.newNotesCount} 条新小纸条`);
  }
  if (updates.newAlbumsCount > 0) {
    parts.push(updates.newAlbumsCount === 1 ? "有 1 张新照片" : `有 ${updates.newAlbumsCount} 张新照片`);
  }

  return `${parts.join("，")}。打开看看吧 ✨`;
}
