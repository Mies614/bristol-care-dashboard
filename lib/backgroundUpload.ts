"use client";

import { uploadWithTimeout } from "./mediaUpload";
import { getSupabaseBrowserClient } from "./supabase/client";

export const BACKGROUND_BUCKET = "backgrounds";
export const MAX_BACKGROUND_IMAGE_SIZE = 30 * 1024 * 1024;
export const ALLOWED_BACKGROUND_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
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

export async function uploadBackgroundImageDirectly(file: File, code: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase publishable client 未配置，无法上传背景图片。");
  const ext = getBackgroundImageExtension(file);
  const path = `${code}/backgrounds/${Date.now()}-${randomId()}.${ext}`;
  const upload = supabase.storage.from(BACKGROUND_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });
  const { error } = await uploadWithTimeout(upload, 60_000);
  if (error) throw new Error(error.message || "背景图片上传失败。");
  const { data } = supabase.storage.from(BACKGROUND_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
