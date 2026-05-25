import { getNoteFileExtension } from "./noteValidation";
import { getSupabaseBrowserClient } from "./supabase/client";

export type UploadedNoteMedia = {
  url: string;
  path: string;
  size: number;
  mimeType: string;
};

const BUCKET = "love-notes";
const UPLOAD_TIMEOUTS = {
  images: 60_000,
  audio: 90_000,
  videos: 180_000
};

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

export async function uploadNoteMediaDirectly(file: File | Blob, kind: "images" | "videos" | "audio", code: string): Promise<UploadedNoteMedia> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase publishable client 未配置，无法上传小纸条媒体。");
  const ext = getNoteFileExtension(file as Blob & { name?: string });
  const path = `${code}/${kind}/${Date.now()}-${randomId()}.${ext}`;
  const uploadPromise = supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });
  const timeoutPromise = new Promise<never>((_, reject) => {
    window.setTimeout(() => reject(new Error("上传超时，请检查网络后重试。")), UPLOAD_TIMEOUTS[kind]);
  });
  const { error } = await Promise.race([uploadPromise, timeoutPromise]);
  if (error) throw new Error(error.message || "Supabase Storage 上传失败。");
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path, size: file.size, mimeType: file.type || "application/octet-stream" };
}
