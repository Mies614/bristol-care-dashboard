"use client";

import { useState, useRef } from "react";
import { canRetry, invalidateSignedUrl, ensureSignedUrls } from "@/lib/signedMediaCache";
import { parsePublicStorageUrl } from "@/lib/mediaReference";

type Props = {
  path?: string | null;
  bucket?: "couple-albums" | "love-notes";
  url?: string | null;
  className?: string;
};

export function SignedMediaAudio({
  path,
  bucket,
  url,
  className = "w-full",
}: Props) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const retrying = useRef(false);

  async function loadUrl() {
    if (resolvedUrl || loading) return;
    setLoading(true);

    if (path && bucket) {
      const signedMap = await ensureSignedUrls([{ bucket, path }]);
      const signed = signedMap.get(`${bucket}:${path}`);
      setResolvedUrl(signed || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`);
    } else if (url) {
      const ref = parsePublicStorageUrl(url);
      if (ref) {
        const signedMap = await ensureSignedUrls([{ bucket: ref.bucket, path: ref.path }]);
        const signed = signedMap.get(`${ref.bucket}:${ref.path}`);
        setResolvedUrl(signed || url);
      } else {
        setResolvedUrl(url);
      }
    }

    setLoading(false);
  }

  async function handleError() {
    if (retrying.current) return;
    retrying.current = true;

    let retryBucket: string | undefined;
    let retryPath: string | undefined;
    if (path && bucket) { retryBucket = bucket; retryPath = path; }
    else if (url) { const ref = parsePublicStorageUrl(url); if (ref) { retryBucket = ref.bucket; retryPath = ref.path; } }

    if (retryBucket && retryPath && canRetry(retryBucket, retryPath)) {
      invalidateSignedUrl(retryBucket, retryPath);
      setResolvedUrl(null);
      setLoading(false);
      await loadUrl();
    }
  }

  if (!resolvedUrl && !loading) {
    return (
      <button
        className={`rounded-2xl border border-dashed border-cocoa/20 px-4 py-3 text-sm text-cocoa/50 hover:border-cocoa/40 ${className}`}
        onClick={loadUrl}
      >
        🎵 点击播放音频
      </button>
    );
  }

  if (loading) {
    return <div className={`animate-pulse rounded-2xl bg-cocoa/10 h-10 ${className}`} />;
  }

  return (
    <audio
      className={className}
      src={resolvedUrl || ""}
      controls
      preload="none"
      onError={handleError}
    />
  );
}
