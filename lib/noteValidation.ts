import type { LoveNote } from "./types";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";

export const MAX_NOTE_IMAGE_SIZE = 30 * 1024 * 1024;
export const MAX_NOTE_VIDEO_SIZE = 100 * 1024 * 1024;
export const MAX_NOTE_AUDIO_SIZE = 20 * 1024 * 1024;

export const NOTE_DISPLAY_STYLES = ["sticky", "postcard", "bubble", "photo_card", "timeline", "minimal", "romantic"] as const;
export const NOTE_AUTHORS = ["admin", "user", DEFAULT_NORMAL_IDENTITY_ID, "me"] as const;
export const NOTE_TYPES = ["text", "image", "audio", "video", "mixed"] as const;
export const NOTE_MOODS = ["开心", "想你", "累了", "记录一下", "加油", "今日小事", "重要", "悄悄话"] as const;

export const ALLOWED_NOTE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
export const ALLOWED_NOTE_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
export const ALLOWED_NOTE_AUDIO_TYPES = ["audio/webm", "audio/mpeg", "audio/mp4", "audio/aac", "audio/wav", "audio/x-m4a"] as const;

type FileLike = Blob & { name?: string };

function extensionFromName(name?: string) {
  return name?.split(".").pop()?.toLowerCase() || "";
}

function isOctetWithExtension(file: FileLike, allowed: readonly string[]) {
  return file.type === "application/octet-stream" && allowed.includes(extensionFromName(file.name));
}

export function validateNoteImageFile(file: FileLike): { ok: boolean; error?: string } {
  if (!ALLOWED_NOTE_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_NOTE_IMAGE_TYPES)[number])) {
    return { ok: false, error: "只支持 JPG、PNG、WebP、HEIC 或 HEIF 图片。" };
  }
  if (file.size > MAX_NOTE_IMAGE_SIZE) return { ok: false, error: "图片不能超过 30MB。" };
  return { ok: true };
}

export function validateNoteVideoFile(file: FileLike): { ok: boolean; error?: string } {
  const okType = ALLOWED_NOTE_VIDEO_TYPES.includes(file.type as (typeof ALLOWED_NOTE_VIDEO_TYPES)[number]) || isOctetWithExtension(file, ["mov", "mp4", "webm"]);
  if (!okType) return { ok: false, error: "只支持 MP4、MOV 或 WebM 视频。" };
  if (file.size > MAX_NOTE_VIDEO_SIZE) return { ok: false, error: "视频不能超过 100MB。" };
  return { ok: true };
}

export function validateNoteAudioFile(file: FileLike): { ok: boolean; error?: string } {
  const okType = ALLOWED_NOTE_AUDIO_TYPES.includes(file.type as (typeof ALLOWED_NOTE_AUDIO_TYPES)[number]) || isOctetWithExtension(file, ["m4a", "mp3", "wav", "webm", "aac"]);
  if (!okType) return { ok: false, error: "只支持 WebM、MP3、MP4、AAC、WAV 或 M4A 音频。" };
  if (file.size > MAX_NOTE_AUDIO_SIZE) return { ok: false, error: "语音不能超过 20MB。" };
  return { ok: true };
}

export function getNoteFileExtension(file: FileLike): string {
  const ext = extensionFromName(file.name);
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/heic") return "heic";
  if (file.type === "image/heif") return "heif";
  if (file.type === "video/mp4") return "mp4";
  if (file.type === "video/quicktime") return "mov";
  if (file.type === "video/webm") return "webm";
  if (file.type === "audio/webm") return "webm";
  if (file.type === "audio/mpeg") return "mp3";
  if (file.type === "audio/mp4" || file.type === "audio/x-m4a") return "m4a";
  if (file.type === "audio/aac") return "aac";
  if (file.type === "audio/wav") return "wav";
  if (file.type === "application/octet-stream" && ["mov", "mp4", "webm", "m4a", "mp3", "wav", "aac"].includes(ext)) return ext;
  throw new Error("Unsupported note media file type");
}

export function inferNoteType(input: { content?: string; imagePath?: string; audioPath?: string; videoPath?: string }): LoveNote["noteType"] {
  const count = [input.content?.trim(), input.imagePath, input.audioPath, input.videoPath].filter(Boolean).length;
  if (count > 1) return "mixed";
  if (input.videoPath) return "video";
  if (input.audioPath) return "audio";
  if (input.imagePath) return "image";
  return "text";
}

export function normalizeNoteAuthor(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : DEFAULT_NORMAL_IDENTITY_ID;
}

export function normalizeDisplayStyle(value: unknown): NonNullable<LoveNote["displayStyle"]> {
  return NOTE_DISPLAY_STYLES.includes(value as NonNullable<LoveNote["displayStyle"]>) ? value as NonNullable<LoveNote["displayStyle"]> : "sticky";
}

export function isValidDisplayStyle(value: unknown): value is NonNullable<LoveNote["displayStyle"]> {
  return NOTE_DISPLAY_STYLES.includes(value as NonNullable<LoveNote["displayStyle"]>);
}

export function isValidAuthor(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasNoteContent(input: { content?: string; imagePath?: string; audioPath?: string; videoPath?: string }) {
  return Boolean(input.content?.trim() || input.imagePath || input.audioPath || input.videoPath);
}