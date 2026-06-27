/**
 * Media download URL helpers for notes and albums.
 *
 * Pure functions — no Supabase, no browser APIs.
 */

import type { LoveNote, AlbumItem } from "./types";

/**
 * Get a downloadable URL for a note's media.
 * Priority: videoUrl > imageUrl > audioUrl
 */
export function getNoteMediaDownloadUrl(note: LoveNote): string | null {
  if (note.videoPath) return note.videoPath;
  if (note.imagePath) return note.imagePath;
  if (note.audioPath) return note.audioPath;
  return null;
}

/**
 * Get a human-readable label for the download button based on media type.
 */
export function getNoteMediaDownloadLabel(note: LoveNote): string {
  if (note.videoPath) return "保存视频";
  if (note.imagePath) return "保存图片";
  if (note.audioPath) return "保存语音";
  return "下载";
}

/**
 * Whether a note has photo, video, or audio media that can be downloaded.
 */
export function hasNoteDownloadableMedia(note: LoveNote): boolean {
  return getNoteMediaDownloadUrl(note) !== null;
}

/**
 * Get a downloadable URL for an album item's media.
 * Priority: videoUrl > imageUrl
 */
export function getAlbumMediaDownloadUrl(album: AlbumItem): string | null {
  if (album.videoPath) return album.videoPath;
  if (album.imagePath) return album.imagePath;
  return null;
}

/**
 * Get a human-readable label for the download button based on album media type.
 */
export function getAlbumMediaDownloadLabel(album: AlbumItem): string {
  if (album.videoPath) return "保存视频";
  if (album.imagePath) return "保存图片";
  return "下载";
}

/**
 * Whether an album item has downloadable media.
 */
export function hasAlbumDownloadableMedia(album: AlbumItem): boolean {
  return getAlbumMediaDownloadUrl(album) !== null;
}