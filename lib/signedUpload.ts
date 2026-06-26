/**
 * Client-side signed upload module.
 *
 * Replaces direct anonymous Supabase Storage uploads with a server-authorized
 * signed-URL flow. The client never holds the anon key for writing.
 *
 * Flow:
 * 1. Client calls POST /api/upload/authorize with bucket, MIME, fileSize
 * 2. Server validates and returns { signedUrl, path, bucket }
 * 3. Client uploads file via fetch(signedUrl, { method: 'PUT', body: file })
 * 4. Client returns { url, path, size, mimeType } to the caller
 */

import { uploadWithTimeout, timeoutForKind, type MediaKind } from "./mediaUpload";

type AuthorizeResponse = {
  ok: true;
  bucket: string;
  path: string;
  signedUrl: string;
  token: string;
  expiresIn: number;
};

type ApiErrorResponse = {
  ok: false;
  error: string;
  code: string;
};

export type SignedUploadResult = {
  url: string;
  path: string;
  size: number;
  mimeType: string;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

function publicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

export async function signedUpload(
  file: File | Blob,
  bucket: string,
  kind: MediaKind,
): Promise<SignedUploadResult> {
  // 1. Request signed URL from server
  const authRes = await fetch("/api/upload/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket,
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
    }),
  });

  if (!authRes.ok) {
    const errBody = await authRes.json().catch(() => ({})) as ApiErrorResponse;
    throw new Error(errBody.error || `Upload authorize failed (${authRes.status})`);
  }

  const authJson = await authRes.json() as AuthorizeResponse;
  if (!authJson.ok) {
    throw new Error("Upload authorize rejected");
  }

  // 2. Upload directly to Supabase Storage via signed URL
  const uploadPromise = fetch(authJson.signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "Cache-Control": "max-age=31536000, immutable",
    },
    body: file,
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Storage upload failed (${res.status})`);
    }
  });

  await uploadWithTimeout(uploadPromise, timeoutForKind(kind));

  // 3. Return public URL and metadata
  return {
    url: publicUrl(authJson.bucket, authJson.path),
    path: authJson.path,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
  };
}
