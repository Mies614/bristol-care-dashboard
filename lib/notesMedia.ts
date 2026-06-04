/**
 * Note media download URL helper.
 *
 * Extracts a download URL for media attachments on love notes.
 * Returns null if no download URL can be determined.
 * Pure function — no Supabase, no browser APIs.
 */

import type { LoveNote } from "./types";

/**
 * Get a downloadable URL for a note's media.
 * Priority: videoUrl > imageUrl > audioUrl
 */
export function getNoteMediaDownloadUrl(note: LoveNote): string | null {
  if (note.videoUrl) return note.videoUrl;
  if (note.imageUrl) return note.imageUrl;
  if (note.audioUrl) return note.audioUrl;
  return null;
}

/**
 * Check if a note has downloadable media.
 */
export function hasNoteDownloadableMedia(note: LoveNote): boolean {
  return getNoteMediaDownloadUrl(note) !== null;
}

/**
 * Get a human-readable label for the download button based on media type.
 */
export function getNoteMediaDownloadLabel(note: LoveNote): string {
  if (note.videoUrl) return "下载视频";
  if (note.imageUrl) return "下载图片";
  if (note.audioUrl) return "下载语音";
  return "下载";
}