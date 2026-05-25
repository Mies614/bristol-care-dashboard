export const MAX_ALBUM_IMAGE_SIZE = 30 * 1024 * 1024;
export const MAX_ALBUM_VIDEO_SIZE = 50 * 1024 * 1024;
export const MAX_ALBUM_FILES_PER_BATCH = 10;

export const ALLOWED_ALBUM_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
export const ALLOWED_ALBUM_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
export const ALLOWED_ALBUM_OCTET_VIDEO_EXTENSIONS = ["mov", "mp4", "webm"] as const;

type AlbumFileLike = Blob & { name?: string };

function extensionFromName(name?: string) {
  const ext = name?.split(".").pop()?.toLowerCase();
  return ext || "";
}

function hasAllowedOctetVideoExtension(file: AlbumFileLike) {
  const ext = extensionFromName(file.name);
  return ALLOWED_ALBUM_OCTET_VIDEO_EXTENSIONS.includes(ext as (typeof ALLOWED_ALBUM_OCTET_VIDEO_EXTENSIONS)[number]);
}

export function validateAlbumImageFile(file: AlbumFileLike): { ok: boolean; error?: string } {
  if (!ALLOWED_ALBUM_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_ALBUM_IMAGE_TYPES)[number])) {
    return { ok: false, error: "只支持 JPG、PNG、WebP、HEIC 或 HEIF 图片。" };
  }
  if (file.size > MAX_ALBUM_IMAGE_SIZE) return { ok: false, error: "图片不能超过 30MB。" };
  return { ok: true };
}

export function validateAlbumVideoFile(file: AlbumFileLike): { ok: boolean; error?: string } {
  const isSupportedMime = ALLOWED_ALBUM_VIDEO_TYPES.includes(file.type as (typeof ALLOWED_ALBUM_VIDEO_TYPES)[number]);
  const isOctetVideo = file.type === "application/octet-stream" && hasAllowedOctetVideoExtension(file);
  if (!isSupportedMime && !isOctetVideo) {
    return { ok: false, error: "只支持 MP4、MOV 或 WebM 视频。" };
  }
  if (file.size > MAX_ALBUM_VIDEO_SIZE) return { ok: false, error: "视频不能超过 50MB。" };
  return { ok: true };
}

export function getAlbumFileExtension(file: AlbumFileLike | string): "jpg" | "png" | "webp" | "heic" | "heif" | "mp4" | "mov" | "webm" {
  const mimeType = typeof file === "string" ? file : file.type;
  const ext = typeof file === "string" ? "" : extensionFromName(file.name);
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/heic") return "heic";
  if (mimeType === "image/heif") return "heif";
  if (mimeType === "video/mp4") return "mp4";
  if (mimeType === "video/quicktime") return "mov";
  if (mimeType === "video/webm") return "webm";
  if (mimeType === "application/octet-stream" && ALLOWED_ALBUM_OCTET_VIDEO_EXTENSIONS.includes(ext as (typeof ALLOWED_ALBUM_OCTET_VIDEO_EXTENSIONS)[number])) {
    return ext as "mp4" | "mov" | "webm";
  }
  throw new Error("Unsupported album file type");
}

export function determineAlbumItemType(hasImage: boolean, hasVideo: boolean): "photo" | "live_photo" | "video" {
  if (hasImage && hasVideo) return "live_photo";
  if (hasVideo) return "video";
  return "photo";
}
