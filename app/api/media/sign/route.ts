import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { toSafeApiError } from "@/lib/apiError";
import { resolveRequestContext } from "@/lib/security/requestContext";
import { isValidBucket, isValidStoragePath } from "@/lib/mediaReference";

// Signed read URL expiry in seconds (5 minutes)
const SIGNED_EXPIRY = 300;

// Only these buckets can be signed for read
const SIGN_READABLE_BUCKETS = new Set(["couple-albums", "love-notes"]);

// Maximum batch size
const MAX_BATCH_SIZE = 50;

// ─── POST /api/media/sign (Mode A: by contentType + contentId) ───
// Body: { contentType: "note" | "album", contentId: string }
// Server looks up the record, extracts object paths, returns signed URLs.
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase not configured." },
        { status: 503 },
      );
    }

    const body = await request.json();
    const contextResult = resolveRequestContext(request, body, { requireOrigin: true });
    if (!contextResult.ok) return contextResult.response;
    const { spaceCode } = contextResult.context;

    const contentType = String(body.contentType ?? "").trim();
    const contentId = String(body.contentId ?? "").trim();

    if (!contentType || !contentId) {
      return NextResponse.json(
        { ok: false, error: "contentType and contentId are required.", code: "MISSING_PARAMS" },
        { status: 400 },
      );
    }

    if (!["note", "album"].includes(contentType)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported contentType.", code: "INVALID_CONTENT_TYPE" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseServerClient();

    // Look up the record and extract object paths
    const paths = await resolveMediaPaths(supabase, contentType, contentId, spaceCode);
    if (paths.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No media found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    // Validate all paths before signing
    const validPaths: { bucket: string; path: string }[] = [];
    for (const { bucket, path } of paths) {
      if (!isValidBucket(bucket) || !isValidStoragePath(path)) continue;
      if (!SIGN_READABLE_BUCKETS.has(bucket)) continue;
      validPaths.push({ bucket, path });
    }

    if (validPaths.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No valid media paths.", code: "NO_VALID_MEDIA" },
        { status: 400 },
      );
    }

    // Sign each valid path
    const results = [];
    for (const { bucket, path } of validPaths) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, SIGNED_EXPIRY);

        if (error || !data?.signedUrl) continue;

        results.push({
          bucket,
          path,
          signedUrl: data.signedUrl,
          expiresAt: new Date(Date.now() + SIGNED_EXPIRY * 1000).toISOString(),
        });
      } catch {
        // Skip failed signings — don't leak object existence
      }
    }

    return NextResponse.json({ ok: true, media: results });
  } catch (err) {
    const safeError = toSafeApiError(err, "MEDIA_SIGN_FAILED");
    return NextResponse.json(safeError, { status: 500 });
  }
}

// ─── GET /api/media/sign (Mode B: batch path signing) ───
// Query: ?paths=bucket1:path1,bucket2:path2...
// Limited to MAX_BATCH_SIZE. Each path is validated.
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase not configured." },
        { status: 503 },
      );
    }

    const contextResult = resolveRequestContext(request);
    if (!contextResult.ok) return contextResult.response;

    const pathsRaw = request.nextUrl.searchParams.get("paths");
    if (!pathsRaw) {
      return NextResponse.json(
        { ok: false, error: "paths parameter is required.", code: "MISSING_PARAMS" },
        { status: 400 },
      );
    }

    const entries = pathsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    if (entries.length === 0 || entries.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { ok: false, error: `paths count must be 1-${MAX_BATCH_SIZE}.`, code: "INVALID_BATCH_SIZE" },
        { status: 400 },
      );
    }

    // Parse and validate each entry
    const validPaths: { bucket: string; path: string }[] = [];
    for (const entry of entries) {
      const colonIdx = entry.indexOf(":");
      if (colonIdx === -1) continue;
      const bucket = entry.slice(0, colonIdx);
      const path = entry.slice(colonIdx + 1);
      if (!isValidBucket(bucket)) continue;
      if (!SIGN_READABLE_BUCKETS.has(bucket)) continue;
      if (!isValidStoragePath(path)) continue;
      validPaths.push({ bucket, path });
    }

    if (validPaths.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No valid paths.", code: "NO_VALID_PATHS" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseServerClient();
    const results = [];
    for (const { bucket, path } of validPaths) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, SIGNED_EXPIRY);

        if (error || !data?.signedUrl) continue;

        results.push({
          bucket,
          path,
          signedUrl: data.signedUrl,
          expiresAt: new Date(Date.now() + SIGNED_EXPIRY * 1000).toISOString(),
        });
      } catch {
        // Skip failed signings
      }
    }

    return NextResponse.json({ ok: true, media: results });
  } catch (err) {
    const safeError = toSafeApiError(err, "MEDIA_SIGN_FAILED");
    return NextResponse.json(safeError, { status: 500 });
  }
}

// ─── Internal: resolve media paths from database records ───

async function resolveMediaPaths(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  contentType: string,
  contentId: string,
  spaceCode: string,
): Promise<{ bucket: string; path: string }[]> {
  const paths: { bucket: string; path: string }[] = [];

  if (contentType === "album") {
    const { data } = await supabase
      .from("album_items")
      .select("image_path, video_path")
      .eq("id", contentId)
      .eq("space_code", spaceCode)
      .maybeSingle();

    if (data) {
      if (data.image_path) paths.push({ bucket: "couple-albums", path: data.image_path });
      if (data.video_path) paths.push({ bucket: "couple-albums", path: data.video_path });
    }
  } else if (contentType === "note") {
    const { data } = await supabase
      .from("love_notes")
      .select("image_path, audio_path, video_path")
      .eq("id", contentId)
      .is("deleted_at", null)
      .maybeSingle();

    if (data) {
      if (data.image_path) paths.push({ bucket: "love-notes", path: data.image_path });
      if (data.audio_path) paths.push({ bucket: "love-notes", path: data.audio_path });
      if (data.video_path) paths.push({ bucket: "love-notes", path: data.video_path });
    }
  }

  return paths;
}
