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
  if (note.videoUrl || note.videoPath) return note.videoUrl ?? note.videoPath ?? null;
  if (note.imageUrl || note.imagePath) return note.imageUrl ?? note.imagePath ?? null;
  if (note.audioUrl || note.audioPath) return note.audioUrl ?? note.audioPath ?? null;
  return null;
}

/**
 * Get a human-readable label for the download button based on media type.
 */
export function getNoteMediaDownloadLabel(note: LoveNote): string {
  if (note.videoUrl || note.videoPath) return "保存视频";
  if (note.imageUrl || note.imagePath) return "保存图片";
  if (note.audioUrl || note.audioPath) return "保存语音";
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
  if (album.videoUrl) return album.videoUrl;
  if (album.imageUrl) return album.imageUrl;
  return null;
}

/**
 * Get a human-readable label for the download button based on album media type.
 */
export function getAlbumMediaDownloadLabel(album: AlbumItem): string {
  if (album.videoUrl) return "保存视频";
  if (album.imageUrl) return "保存图片";
  return "下载";
}

/**
 * Whether an album item has downloadable media.
 */
export function hasAlbumDownloadableMedia(album: AlbumItem): boolean {
  return getAlbumMediaDownloadUrl(album) !== null;
}