"use client";

import { uploadWithTimeout } from "./mediaUpload";
import { buildImmutableStoragePath } from "./storagePathPolicy";
import { getSupabaseBrowserClient } from "./supabase/client";

export const BACKGROUND_BUCKET = "backgrounds";
export const MAX_BACKGROUND_IMAGE_SIZE = 30 * 1024 * 1024;
export const ALLOWED_BACKGROUND_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;

export function buildBackgroundImagePath(code: string, extension: string, identity?: string) {
  return buildImmutableStoragePath({
    spaceCode: code,
    identity,
    kind: "backgrounds",
    extension,
  });
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

export async function uploadBackgroundImageDirectly(file: File, code: string, identity?: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase publishable client 未配置，无法上传背景图片。");
  const ext = getBackgroundImageExtension(file);
  const path = buildBackgroundImagePath(code, ext, identity);
  const upload = supabase.storage.from(BACKGROUND_BUCKET).upload(path, file, {
    cacheControl: "31536000", // 1 year for immutable assets
    contentType: file.type || "application/octet-stream",
    upsert: false
  });
  const { error } = await uploadWithTimeout(upload, 60_000);
  if (error) throw new Error(error.message || "背景图片上传失败。");
  const { data } = supabase.storage.from(BACKGROUND_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
