import { determineAlbumItemType, getAlbumFileExtension } from "./albumValidation";
import { timeoutForKind, uploadWithTimeout } from "./mediaUpload";
import { getSupabaseBrowserClient } from "./supabase/client";
import type { AlbumItem } from "./types";

export type UploadedAlbumFile = {
  url: string;
  path: string;
  size: number;
  mimeType: string;
};

export type AlbumUploadDraft = {
  title: string;
  note: string;
  takenAt: string;
  location: string;
  isFavorite: boolean;
};

export type AlbumMetadataPayload = {
  code: string;
  title: string;
  note: string;
  taken_at: string;
  location: string;
  is_favorite: boolean;
  type: AlbumItem["type"];
  image_url?: string;
  image_path?: string;
  video_url?: string;
  video_path?: string;
  file_size: number;
  created_by?: string;
};

const BUCKET = "couple-albums";

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

export async function uploadAlbumFileDirectly(file: File, kind: "image" | "video", code: string): Promise<UploadedAlbumFile> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase publishable client 未配置，无法直传相册文件。");
  }

  const ext = getAlbumFileExtension(file);
  const folder = kind === "image" ? "images" : "videos";
  const path = `${code}/${folder}/${Date.now()}-${randomId()}.${ext}`;
  const upload = supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });
  const { error } = await uploadWithTimeout(upload, timeoutForKind(kind));

  if (error) {
    throw new Error(error.message || "Supabase Storage 上传失败。");
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return {
    url: data.publicUrl,
    path,
    size: file.size,
    mimeType: file.type || "application/octet-stream"
  };
}

export function buildAlbumMetadataPayload(input: {
  code: string;
  draft: AlbumUploadDraft;
  imageUpload?: UploadedAlbumFile | null;
  videoUpload?: UploadedAlbumFile | null;
  createdBy?: string;
  typeOverride?: AlbumItem["type"];
}): AlbumMetadataPayload {
  const { code, draft, imageUpload, videoUpload, createdBy, typeOverride } = input;
  return {
    code,
    title: draft.title,
    note: draft.note,
    taken_at: draft.takenAt ? new Date(draft.takenAt).toISOString() : "",
    location: draft.location,
    is_favorite: draft.isFavorite,
    type: typeOverride || determineAlbumItemType(Boolean(imageUpload), Boolean(videoUpload)),
    image_url: imageUpload?.url,
    image_path: imageUpload?.path,
    video_url: videoUpload?.url,
    video_path: videoUpload?.path,
    file_size: (imageUpload?.size || 0) + (videoUpload?.size || 0),
    created_by: createdBy
  };
}
