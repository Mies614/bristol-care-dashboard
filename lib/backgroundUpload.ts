"use client";

import { signedUpload } from "./signedUpload";

export const BACKGROUND_BUCKET = "backgrounds";
export const MAX_BACKGROUND_IMAGE_SIZE = 30 * 1024 * 1024;
export const ALLOWED_BACKGROUND_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;

export function buildBackgroundImagePath(_code: string, _extension: string, _identity?: string) {
  // Path is now generated server-side by /api/upload/authorize
  return "";
}

export function validateBackgroundImageFile(file: File | Blob) {
  if (!ALLOWED_BACKGROUND_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_BACKGROUND_IMAGE_TYPES)[number])) {
    return { ok: false, error: "只支持 JPG、PNG、WebP、HEIC 或 HEIF 图片。" };
  }
  if (file.size > MAX_BACKGROUND_IMAGE_SIZE) {
    return { ok: false, error: "背景图片不能超过 30MB。" };
  }
  return { ok: true };
}

export function getBackgroundImageExtension(file: File | Blob & { name?: string }) {
  const name = "name" in file && file.name ? file.name.toLowerCase() : "";
  if (file.type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) return "jpg";
  if (file.type === "image/png" || name.endsWith(".png")) return "png";
  if (file.type === "image/webp" || name.endsWith(".webp")) return "webp";
  if (file.type === "image/heic" || name.endsWith(".heic")) return "heic";
  if (file.type === "image/heif" || name.endsWith(".heif")) return "heif";
  return "jpg";
}

export async function uploadBackgroundImageDirectly(file: File, _code: string, _identity?: string) {
  return signedUpload(file, BACKGROUND_BUCKET, "image");
}
