export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function validateImageFile(file: Blob): { ok: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { ok: false, error: "只支持 JPG、PNG 或 WebP 图片。" };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { ok: false, error: "图片不能超过 5MB。" };
  }
  return { ok: true };
}

export function getImageExtension(mimeType: string): "jpg" | "png" | "webp" {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  throw new Error("Unsupported image type");
}
