export const MAX_ALBUM_IMAGE_SIZE = 30 * 1024 * 1024;
export const MAX_ALBUM_VIDEO_SIZE = 100 * 1024 * 1024;
export const MAX_ALBUM_FILES_PER_BATCH = 10;

export const ALLOWED_ALBUM_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
export const ALLOWED_ALBUM_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;

export function validateAlbumImageFile(file: Blob): { ok: boolean; error?: string } {
  if (!ALLOWED_ALBUM_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_ALBUM_IMAGE_TYPES)[number])) {
    return { ok: false, error: "只支持 JPG、PNG、WebP、HEIC 或 HEIF 图片。" };
  }
  if (file.size > MAX_ALBUM_IMAGE_SIZE) return { ok: false, error: "图片不能超过 30MB。" };
  return { ok: true };
}

export function validateAlbumVideoFile(file: Blob): { ok: boolean; error?: string } {
  if (!ALLOWED_ALBUM_VIDEO_TYPES.includes(file.type as (typeof ALLOWED_ALBUM_VIDEO_TYPES)[number])) {
    return { ok: false, error: "只支持 MP4、MOV 或 WebM 视频。" };
  }
  if (file.size > MAX_ALBUM_VIDEO_SIZE) return { ok: false, error: "视频不能超过 100MB。" };
  return { ok: true };
}

export function getAlbumFileExtension(mimeType: string): "jpg" | "png" | "webp" | "heic" | "heif" | "mp4" | "mov" | "webm" {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/heic") return "heic";
  if (mimeType === "image/heif") return "heif";
  if (mimeType === "video/mp4") return "mp4";
  if (mimeType === "video/quicktime") return "mov";
  if (mimeType === "video/webm") return "webm";
  throw new Error("Unsupported album file type");
}

export function determineAlbumItemType(hasImage: boolean, hasVideo: boolean): "photo" | "live_photo" | "video" {
  if (hasImage && hasVideo) return "live_photo";
  if (hasVideo) return "video";
  return "photo";
}
