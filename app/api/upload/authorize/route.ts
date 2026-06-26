import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { toSafeApiError } from "@/lib/apiError";
import { resolveRequestContext } from "@/lib/security/requestContext";
import { buildImmutableStoragePath, type StorageKind } from "@/lib/storagePathPolicy";

const ALLOWED_BUCKETS: Record<string, { mimePrefixes: string[]; maxBytes: number }> = {
  "love-notes": {
    mimePrefixes: ["image/", "video/", "audio/"],
    maxBytes: 52_428_800,
  },
  "couple-albums": {
    mimePrefixes: ["image/", "video/"],
    maxBytes: 52_428_800,
  },
  backgrounds: {
    mimePrefixes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
    maxBytes: 31_457_280,
  },
};

function kindFromMime(mimeType: string): StorageKind | null {
  if (mimeType.startsWith("image/")) return "images";
  if (mimeType.startsWith("video/")) return "videos";
  if (mimeType.startsWith("audio/")) return "audio";
  return null;
}

function extensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
    "audio/webm": "weba",
    "audio/ogg": "ogg",
  };
  return map[mimeType] || mimeType.split("/")[1]?.replace(/[^a-z0-9]/g, "") || "bin";
}

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
    const { spaceCode, identity } = contextResult.context;

    const bucket = String(body.bucket ?? "").trim();
    const mimeType = String(body.mimeType ?? "").trim();
    const fileSize = Number(body.fileSize ?? 0);
    let providedExtension = String(body.extension ?? "").trim().toLowerCase().replace(/^\./, "");

    if (!bucket || !mimeType) {
      return NextResponse.json(
        { ok: false, error: "bucket and mimeType are required.", code: "MISSING_PARAMS" },
        { status: 400 },
      );
    }

    const bucketConfig = ALLOWED_BUCKETS[bucket];
    if (!bucketConfig) {
      return NextResponse.json(
        { ok: false, error: "Unknown bucket.", code: "UNKNOWN_BUCKET" },
        { status: 400 },
      );
    }

    const mimeAllowed = bucketConfig.mimePrefixes.some((prefix) =>
      prefix.endsWith("/") ? mimeType.startsWith(prefix) : mimeType === prefix,
    );
    if (!mimeAllowed) {
      return NextResponse.json(
        { ok: false, error: "MIME type not allowed for this bucket.", code: "MIME_FORBIDDEN" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > bucketConfig.maxBytes) {
      return NextResponse.json(
        { ok: false, error: `File size must be between 1 byte and ${bucketConfig.maxBytes} bytes.`, code: "SIZE_INVALID" },
        { status: 400 },
      );
    }

    if (!providedExtension) {
      providedExtension = extensionFromMime(mimeType);
    }
    if (!/^[a-z0-9]{1,12}$/.test(providedExtension)) {
      return NextResponse.json(
        { ok: false, error: "Invalid file extension.", code: "EXTENSION_INVALID" },
        { status: 400 },
      );
    }

    const kind = kindFromMime(mimeType);
    if (!kind) {
      return NextResponse.json(
        { ok: false, error: "Cannot determine storage kind from MIME type.", code: "KIND_UNKNOWN" },
        { status: 400 },
      );
    }

    const path = buildImmutableStoragePath({
      spaceCode,
      identity,
      kind,
      extension: providedExtension,
    });

    const supabase = createSupabaseServerClient();

    const expiresIn = 300;
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error || !data?.signedUrl) {
      const safeError = toSafeApiError(error, "SIGNED_URL_FAILED");
      return NextResponse.json(safeError, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      bucket,
      path,
      signedUrl: data.signedUrl,
      token: data.token,
      expiresIn,
    });
  } catch (err) {
    const safeError = toSafeApiError(err, "UPLOAD_AUTHORIZE_FAILED");
    return NextResponse.json(safeError, { status: 500 });
  }
}
