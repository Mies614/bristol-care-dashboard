/**
 * Canonical media reference for Supabase Storage objects.
 *
 * A MediaReference is the long-lived identity of a media object.
 * It is NOT a signed URL and NOT a public URL — it is the bucket + path
 * pair that uniquely identifies an object in Supabase Storage.
 *
 * Signed URLs are created on-demand via /api/media/sign and cached in
 * memory for the current page session only.
 */

export type MediaBucket = "couple-albums" | "love-notes" | "backgrounds";
export type MediaKind = "image" | "video" | "audio";

export type MediaReference = {
  bucket: MediaBucket;
  path: string;
  kind: MediaKind;
};

function getStorageHost(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "";
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

const PUBLIC_PATH_PREFIX = "/storage/v1/object/public/";

// ─── Validation ───

const TRAVERSAL_PATTERN = /\.\.\/|\.\.\\|\/\//;
const SAFE_PATH_PATTERN = /^[a-zA-Z0-9._/\-]+$/;
const VALID_BUCKETS: Set<string> = new Set(["love-notes", "couple-albums", "backgrounds"]);

export function isValidBucket(value: string): value is MediaBucket {
  return VALID_BUCKETS.has(value);
}

export function isValidStoragePath(path: string): boolean {
  if (!path || path.length === 0 || path.length > 1024) return false;
  if (TRAVERSAL_PATTERN.test(path)) return false;
  if (path.startsWith("/")) return false;
  if (path.includes("?")) return false;
  if (!SAFE_PATH_PATTERN.test(path)) return false;
  // Each segment must be non-empty
  if (path.split("/").some((seg) => seg.length === 0)) return false;
  return true;
}

// ─── Public URL parsing (historical data compatibility) ───

export function parsePublicStorageUrl(url: string): MediaReference | null {
  if (!url) return null;

  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return null;
  }

  // Only parse URLs from our Supabase project
  if (urlObj.host !== getStorageHost()) return null;

  // Must match /storage/v1/object/public/{bucket}/{path}
  if (!urlObj.pathname.startsWith(PUBLIC_PATH_PREFIX)) return null;

  const rest = urlObj.pathname.slice(PUBLIC_PATH_PREFIX.length);
  const slashIdx = rest.indexOf("/");
  if (slashIdx === -1) return null;

  const bucket = rest.slice(0, slashIdx);
  const path = rest.slice(slashIdx + 1);

  if (!isValidBucket(bucket)) return null;
  if (!isValidStoragePath(path)) return null;

  return { bucket, path, kind: inferKindFromPath(path) };
}

export function inferKindFromPath(path: string): MediaKind {
  const lower = path.toLowerCase();
  if (lower.includes("/videos/") || lower.includes("/video/")) return "video";
  if (lower.includes("/audio/") || lower.includes("/voice/")) return "audio";
  return "image";
}

// ─── URL construction ───

/** Build a signed-read URL request path ONLY (token is never in the URL string we return). */
export function buildSignedReadUrl(bucket: string, path: string): string {
  return `/api/media/sign?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`;
}

/** Build the Supabase render URL from a path (public only — used for backgrounds). */
export function buildPublicStorageUrl(bucket: string, path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeURIComponent(path)}`;
}

// ─── Safe logging ───

export function safePathLog(prefix: string, path?: string | null): string {
  if (!path) return `${prefix}:(none)`;
  // Only log bucket + first 2 path segments for diagnostics
  const parts = path.split("/");
  const safe = parts.slice(0, 2).join("/");
  return `${prefix}:${safe}/...`;
}
