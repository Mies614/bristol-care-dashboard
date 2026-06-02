"use client";

import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";

/**
 * Partner update checker.
 *
 * Detects new notes, albums, and memories since the last time
 * the user checked. Stores the last check timestamp in localStorage.
 *
 * This is device-local state — NOT synced to Supabase.
 * Export/backup does not include update check state.
 *
 * Ignores: own notes, soft-deleted notes, soft-deleted albums.
 */

import type { LoveNote, AlbumItem } from "./types";

const STORAGE_PREFIX = "bristol_dashboard_last_check_at";

function getStorageKey(spaceCode: string): string {
  return `${STORAGE_PREFIX}_${spaceCode || "default"}`;
}

export interface PartnerUpdate {
  newNotesCount: number;
  newAlbumsCount: number;
  latestAt: string | null;
  hasUpdates: boolean;
}

export function getLastCheckAt(spaceCode = "default"): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(getStorageKey(spaceCode));
  } catch {
    return null;
  }
}

export function markChecked(spaceCode = "default"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getStorageKey(spaceCode), new Date().toISOString());
  } catch {
    // Non-critical
  }
}

export function resetLastCheck(spaceCode = "default"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getStorageKey(spaceCode));
  } catch {
    // Non-critical
  }
}

/**
 * Check for new notes from the other side since last check.
 * Ignores own notes and soft-deleted notes.
 */
export function getNewNotes(notes: LoveNote[], spaceCode = "default"): LoveNote[] {
  const lastCheck = getLastCheckAt(spaceCode);
  if (!lastCheck) return notes.filter((n) => n.author !== DEFAULT_NORMAL_IDENTITY_ID && !n.deletedAt);

  const lastDate = new Date(lastCheck);
  return notes.filter((n) => {
    if (n.author === DEFAULT_NORMAL_IDENTITY_ID) return false;
    if (n.deletedAt) return false;
    const createdAt = n.createdAt ? new Date(n.createdAt) : null;
    return createdAt && createdAt > lastDate;
  });
}

/**
 * Check for new albums since last check.
 * Ignores soft-deleted albums.
 */
export function getNewAlbums(albums: AlbumItem[], spaceCode = "default"): AlbumItem[] {
  const lastCheck = getLastCheckAt(spaceCode);
  if (!lastCheck) return albums.filter((a) => !a.deletedAt);

  const lastDate = new Date(lastCheck);
  return albums.filter((a) => {
    if (a.deletedAt) return false;
    const createdAt = a.createdAt ? new Date(a.createdAt) : null;
    return createdAt && createdAt > lastDate;
  });
}

/**
 * Get a summary of partner updates since last check.
 */
export function getPartnerUpdates(notes: LoveNote[], albums: AlbumItem[], spaceCode = "default"): PartnerUpdate {
  const newNotes = getNewNotes(notes, spaceCode);
  const newAlbums = getNewAlbums(albums, spaceCode);

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

export function clearSeenUpdates(spaceCode = "default"): void {
  markChecked(spaceCode);
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