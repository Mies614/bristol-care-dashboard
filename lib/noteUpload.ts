import { getNoteFileExtension } from "./noteValidation";
import { buildImmutableStoragePath } from "./storagePathPolicy";
import { getSupabaseBrowserClient } from "./supabase/client";
import { timeoutForKind, uploadWithTimeout } from "./mediaUpload";

export type UploadedNoteMedia = {
  url: string;
  path: string;
  size: number;
  mimeType: string;
};

const BUCKET = "love-notes";

export async function uploadNoteMediaDirectly(file: File | Blob, kind: "images" | "videos" | "audio", code: string, identity?: string): Promise<UploadedNoteMedia> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase publishable client 未配置，无法上传小纸条媒体。");
  const ext = getNoteFileExtension(file as Blob & { name?: string });
  const path = buildImmutableStoragePath({
    spaceCode: code,
    identity,
    kind,
    extension: ext,
  });
  const uploadPromise = supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000", // 1 year for immutable assets
    contentType: file.type || "application/octet-stream",
    upsert: false
  });
  const mediaKind = kind === "images" ? "image" : kind === "videos" ? "video" : "audio";
  const { error } = await uploadWithTimeout(uploadPromise, timeoutForKind(mediaKind));
  if (error) throw new Error(error.message || "Supabase Storage 上传失败。");
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path, size: file.size, mimeType: file.type || "application/octet-stream" };
}
