import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/security/authenticatedRequestContext";
import { resolveRequestContext } from "@/lib/security/requestContext";
import { isValidBucket, isValidStoragePath } from "@/lib/mediaReference";

const SIGNED_EXPIRY = 120; // 2 minutes for download
const SIGN_READABLE_BUCKETS = new Set(["couple-albums", "love-notes"]);

function safeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|\n\r\t\0]/g, "_").slice(0, 200) || "download";
}

async function resolveAuth(request: NextRequest) {
  const mode = process.env.AUTH_ENFORCEMENT_MODE || "off";
  if (mode === "off") {
    const ctx = resolveRequestContext(request);
    if (!ctx.ok) return ctx;
    return { ok: true as const, spaceCode: ctx.context.spaceCode };
  }
  return requireAuth();
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuth(request);
    if (!auth.ok) return auth.response!;

    const { searchParams } = request.nextUrl;
    const contentType = searchParams.get("contentType");
    const contentId = searchParams.get("contentId");
    const field = searchParams.get("field") || "image";

    if (!contentType || !contentId || !["note", "album"].includes(contentType)) {
      return NextResponse.json({ ok: false, error: "Invalid request.", code: "INVALID_PARAMS" }, { status: 400 });
    }

    // Look up record and extract media path
    const serviceClient = createSupabaseServerClient();
    let bucket = "";
    let path = "";
    let filename = "";

    if (contentType === "album") {
      const { data } = await serviceClient.from("album_items")
        .select("image_path, video_path, title")
        .eq("id", contentId).maybeSingle();
      if (!data) return NextResponse.json({ ok: false, error: "Not found.", code: "NOT_FOUND" }, { status: 404 });

      if (field === "video" && data.video_path) {
        bucket = "couple-albums"; path = data.video_path;
      } else if (data.image_path) {
        bucket = "couple-albums"; path = data.image_path;
      }
      filename = data.title || "";
    } else {
      const { data } = await serviceClient.from("love_notes")
        .select("image_path, audio_path, video_path, content")
        .eq("id", contentId).is("deleted_at", null).maybeSingle();
      if (!data) return NextResponse.json({ ok: false, error: "Not found.", code: "NOT_FOUND" }, { status: 404 });

      if (field === "video" && data.video_path) {
        bucket = "love-notes"; path = data.video_path;
      } else if (field === "audio" && data.audio_path) {
        bucket = "love-notes"; path = data.audio_path;
      } else if (data.image_path) {
        bucket = "love-notes"; path = data.image_path;
      }
      filename = data.content?.slice(0, 50) || "";
    }

    if (!bucket || !path) {
      return NextResponse.json({ ok: false, error: "No media found.", code: "NO_MEDIA" }, { status: 404 });
    }
    if (!isValidBucket(bucket) || !SIGN_READABLE_BUCKETS.has(bucket) || !isValidStoragePath(path)) {
      return NextResponse.json({ ok: false, error: "Invalid media reference.", code: "INVALID_MEDIA" }, { status: 400 });
    }

    // Sign URL with download disposition
    const ext = path.split(".").pop() || "";
    const baseFilename = safeFilename(filename) || "media";
    const fullFilename = `${baseFilename}.${ext}`;

    const { data, error } = await serviceClient.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_EXPIRY, { download: fullFilename });

    if (error || !data?.signedUrl) {
      return NextResponse.json({ ok: false, error: "Download failed.", code: "DOWNLOAD_FAILED" }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      signedUrl: data.signedUrl,
      filename: fullFilename,
      expiresAt: new Date(Date.now() + SIGNED_EXPIRY * 1000).toISOString(),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Download failed.", code: "SERVER_ERROR" }, { status: 500 });
  }
}
