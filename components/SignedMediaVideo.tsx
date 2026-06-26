"use client";

import { useEffect, useState, useRef } from "react";
import { canRetry, invalidateSignedUrl, ensureSignedUrls } from "@/lib/signedMediaCache";
import { parsePublicStorageUrl } from "@/lib/mediaReference";

type Props = {
  path?: string | null;
  bucket?: "couple-albums" | "love-notes";
  url?: string | null;
  className?: string;
  controls?: boolean;
  muted?: boolean;
  loop?: boolean;
  autoPlay?: boolean;
  playsInline?: boolean;
};

export function SignedMediaVideo({
  path,
  bucket,
  url,
  className = "",
  controls = true,
  muted = false,
  loop = false,
  autoPlay = false,
  playsInline = true,
}: Props) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const retrying = useRef(false);
  const _shouldLoad = useRef(autoPlay);

  // Don't load video URL until user interacts or autoPlay is set
  function loadUrl() {
    if (resolvedUrl) return;

    async function resolve() {
      if (path && bucket) {
        const signedMap = await ensureSignedUrls([{ bucket, path }]);
        const signed = signedMap.get(`${bucket}:${path}`);
        if (signed) {
          setResolvedUrl(signed);
        } else {
          setResolvedUrl(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`);
        }
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
    }

    resolve();
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
      const signedMap = await ensureSignedUrls([{ bucket: retryBucket, path: retryPath }]);
      const fresh = signedMap.get(`${retryBucket}:${retryPath}`);
      if (fresh) setResolvedUrl(fresh);
    }
  }

  // Auto-load for autoplay
  useEffect(() => {
    if (autoPlay) loadUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  if (!resolvedUrl) {
    return (
      <div
        className={`flex cursor-pointer items-center justify-center bg-black/10 rounded-2xl ${className}`}
        onClick={loadUrl}
      >
        <span className="text-2xl text-cocoa/50">▶</span>
      </div>
    );
  }

  return (
    <video
      className={className}
      src={resolvedUrl}
      controls={controls}
      muted={muted}
      loop={loop}
      autoPlay={autoPlay}
      playsInline={playsInline}
      preload="none"
      onError={handleError}
    />
  );
}
