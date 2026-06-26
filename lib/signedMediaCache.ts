/**
 * In-memory signed URL cache for the current page session.
 *
 * Design constraints:
 * - Signed URLs are NOT stored in localStorage, sessionStorage, or IndexedDB.
 * - The cache is cleared on page navigation (module re-import).
 * - Each entry has an expiresAt timestamp; expired entries are auto-purged.
 * - One automatic retry on load failure with fresh URL.
 */

export type SignedMediaEntry = {
  bucket: string;
  path: string;
  signedUrl: string;
  expiresAt: string;
};

const cache = new Map<string, SignedMediaEntry>();
const RETRY_MAP = new Map<string, boolean>(); // path → has retried once?

function cacheKey(bucket: string, path: string): string {
  return `${bucket}:${path}`;
}

export function getSignedUrl(bucket: string, path: string): string | null {
  const key = cacheKey(bucket, path);
  const entry = cache.get(key);
  if (!entry) return null;
  // Check expiry with 30-second buffer
  if (Date.now() > new Date(entry.expiresAt).getTime() - 30_000) {
    cache.delete(key);
    return null;
  }
  return entry.signedUrl;
}

export function setSignedUrl(entry: SignedMediaEntry): void {
  const key = cacheKey(entry.bucket, entry.path);
  cache.set(key, entry);
}

export function flushSignedCache(): void {
  cache.clear();
  RETRY_MAP.clear();
}

/**
 * Fetch signed URLs for a batch of paths.
 * Only fetches paths not already in cache.
 */
export async function ensureSignedUrls(
  paths: { bucket: string; path: string }[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const uncached: { bucket: string; path: string }[] = [];

  for (const { bucket, path } of paths) {
    const existing = getSignedUrl(bucket, path);
    if (existing) {
      result.set(cacheKey(bucket, path), existing);
    } else {
      uncached.push({ bucket, path });
    }
  }

  if (uncached.length === 0) return result;

  // Fetch in batch via GET /api/media/sign
  const query = uncached.map(({ bucket, path }) => `${bucket}:${path}`).join(",");
  try {
    const res = await fetch(`/api/media/sign?paths=${encodeURIComponent(query)}`);
    if (!res.ok) return result;

    const json = await res.json();
    if (!json.ok || !Array.isArray(json.media)) return result;

    for (const entry of json.media as SignedMediaEntry[]) {
      setSignedUrl(entry);
      result.set(cacheKey(entry.bucket, entry.path), entry.signedUrl);
    }
  } catch {
    // Network failure — return whatever we have cached
  }

  return result;
}

/**
 * Load a signed URL for a single media item, with one automatic retry on failure.
 * Uses Mode A (POST /api/media/sign) for content-backed sign requests.
 */
export async function loadSignedUrlForContent(
  contentType: "note" | "album",
  contentId: string,
): Promise<string | null> {
  try {
    const res = await fetch("/api/media/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType, contentId }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    if (!json.ok || !Array.isArray(json.media) || json.media.length === 0) return null;

    // Cache all returned entries and return the first one
    for (const entry of json.media as SignedMediaEntry[]) {
      setSignedUrl(entry);
    }
    return (json.media as SignedMediaEntry[])[0].signedUrl;
  } catch {
    return null;
  }
}

/**
 * Check if a retry is allowed for this path.
 * Only one retry per path per session.
 */
export function canRetry(bucket: string, path: string): boolean {
  const key = cacheKey(bucket, path);
  if (RETRY_MAP.get(key)) return false;
  RETRY_MAP.set(key, true);
  return true;
}

/**
 * Invalidate a cached signed URL (used after load failure, before retry).
 */
export function invalidateSignedUrl(bucket: string, path: string): void {
  cache.delete(cacheKey(bucket, path));
}
