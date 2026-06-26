import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { toSafeApiError } from "@/lib/apiError";
import { requireAuth } from "@/lib/security/authenticatedRequestContext";
import { resolveRequestContext } from "@/lib/security/requestContext";
import { isValidBucket, isValidStoragePath } from "@/lib/mediaReference";

const SIGNED_EXPIRY = 300;
const SIGN_READABLE_BUCKETS = new Set(["couple-albums", "love-notes"]);
const MAX_BATCH_SIZE = 50;

// ─── Auth resolver: uses requireAuth in observe/enforce, falls back in off ───
async function resolveAuth(request: NextRequest, body?: Record<string, unknown>) {
  const mode = process.env.AUTH_ENFORCEMENT_MODE || "off";
  if (mode === "off") {
    const ctx = resolveRequestContext(request, body, { requireOrigin: true });
    if (!ctx.ok) return ctx;
    return { ok: true as const, spaceCode: ctx.context.spaceCode, spaceId: "" };
  }
  const auth = await requireAuth();
  if (!auth.ok) return auth;
  return {
    ok: true as const,
    spaceCode: auth.context.spaceCode,
    spaceId: auth.context.spaceId as string,
  };
}

// ─── POST /api/media/sign (Mode A: by contentType + contentId) ───
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase not configured." }, { status: 503 },
      );
    }

    const body = await request.json();
    const auth = await resolveAuth(request, body);
    if (!auth.ok) return auth.response!;
    const { spaceCode } = auth;

    const contentType = String(body.contentType ?? "").trim();
    const contentId = String(body.contentId ?? "").trim();

    if (!contentType || !contentId) {
      return NextResponse.json(
        { ok: false, error: "contentType and contentId are required.", code: "MISSING_PARAMS" }, { status: 400 },
      );
    }
    if (!["note", "album"].includes(contentType)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported contentType.", code: "INVALID_CONTENT_TYPE" }, { status: 400 },
      );
    }

    const supabase = createSupabaseServerClient();
    const paths = await resolveMediaPaths(supabase, contentType, contentId, spaceCode);
    if (paths.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No media found.", code: "NOT_FOUND" }, { status: 404 },
      );
    }

    const results = await signPaths(supabase, paths);
    return NextResponse.json({ ok: true, media: results });
  } catch (err) {
    return NextResponse.json(toSafeApiError(err, "MEDIA_SIGN_FAILED"), { status: 500 });
  }
}

// ─── GET /api/media/sign (Mode B: batch path signing) ───
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, unavailable: true, error: "Supabase not configured." }, { status: 503 },
      );
    }

    const auth = await resolveAuth(request);
    if (!auth.ok) return auth.response!;
    const { spaceCode } = auth;

    const pathsRaw = request.nextUrl.searchParams.get("paths");
    if (!pathsRaw) {
      return NextResponse.json(
        { ok: false, error: "paths parameter is required.", code: "MISSING_PARAMS" }, { status: 400 },
      );
    }

    const entries = pathsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    if (entries.length === 0 || entries.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { ok: false, error: `paths count must be 1-${MAX_BATCH_SIZE}.`, code: "INVALID_BATCH_SIZE" }, { status: 400 },
      );
    }

    // Parse and validate each entry — also verify space ownership
    const validPaths: { bucket: string; path: string }[] = [];
    for (const entry of entries) {
      const colonIdx = entry.indexOf(":");
      if (colonIdx === -1) continue;
      const bucket = entry.slice(0, colonIdx);
      const path = entry.slice(colonIdx + 1);
      if (!isValidBucket(bucket)) continue;
      if (!SIGN_READABLE_BUCKETS.has(bucket)) continue;
      if (!isValidStoragePath(path)) continue;
      // Verify path belongs to the authenticated user's space
      if (spaceCode && !path.startsWith(spaceCode + "/")) continue;
      validPaths.push({ bucket, path });
    }

    if (validPaths.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No valid paths.", code: "NO_VALID_PATHS" }, { status: 400 },
      );
    }

    const supabase = createSupabaseServerClient();
    const results = await signPaths(supabase, validPaths);
    return NextResponse.json({ ok: true, media: results });
  } catch (err) {
    return NextResponse.json(toSafeApiError(err, "MEDIA_SIGN_FAILED"), { status: 500 });
  }
}

// ─── Shared signing helper ───
async function signPaths(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  paths: { bucket: string; path: string }[],
) {
  const results: { bucket: string; path: string; signedUrl: string; expiresAt: string }[] = [];
  for (const { bucket, path } of paths) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, SIGNED_EXPIRY);
      if (error || !data?.signedUrl) continue;
      results.push({
        bucket, path,
        signedUrl: data.signedUrl,
        expiresAt: new Date(Date.now() + SIGNED_EXPIRY * 1000).toISOString(),
      });
    } catch { /* skip */ }
  }
  return results;
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
    const { data } = await supabase.from("album_items")
      .select("image_path, video_path")
      .eq("id", contentId).eq("space_code", spaceCode).maybeSingle();
    if (data?.image_path) paths.push({ bucket: "couple-albums", path: data.image_path as string });
    if (data?.video_path) paths.push({ bucket: "couple-albums", path: data.video_path as string });
  } else {
    const { data } = await supabase.from("love_notes")
      .select("image_path, audio_path, video_path")
      .eq("id", contentId).is("deleted_at", null).maybeSingle();
    if (data?.image_path) paths.push({ bucket: "love-notes", path: data.image_path as string });
    if (data?.audio_path) paths.push({ bucket: "love-notes", path: data.audio_path as string });
    if (data?.video_path) paths.push({ bucket: "love-notes", path: data.video_path as string });
  }
  return paths;
}
