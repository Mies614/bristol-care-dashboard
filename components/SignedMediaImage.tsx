"use client";

import { useEffect, useState, useRef } from "react";
import { getSignedUrl, canRetry, invalidateSignedUrl, ensureSignedUrls } from "@/lib/signedMediaCache";
import { parsePublicStorageUrl } from "@/lib/mediaReference";

type Props = {
  /** Direct path reference (preferred) */
  path?: string | null;
  /** Bucket when path is provided directly */
  bucket?: "couple-albums" | "love-notes";
  /** Legacy URL (will be parsed for path) */
  url?: string | null;
  /** CSS classes */
  className?: string;
  /** Alt text */
  alt?: string;
  /** Aspect ratio for skeleton */
  aspectRatio?: "square" | "video" | "auto";
  /** Show play icon overlay */
  showPlayIcon?: boolean;
  /** Loading strategy */
  loading?: "lazy" | "eager";
  /** Decoding strategy */
  decoding?: "async" | "sync" | "auto";
};

export function SignedMediaImage({
  path,
  bucket,
  url,
  className = "",
  alt = "",
  aspectRatio = "auto",
  showPlayIcon = false,
  loading = "lazy",
  decoding = "async",
}: Props) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const retrying = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // Priority 1: Direct path + bucket
      if (path && bucket) {
        const cached = getSignedUrl(bucket, path);
        if (cached && !cancelled) {
          setResolvedUrl(cached);
          return;
        }

        const signedMap = await ensureSignedUrls([{ bucket, path }]);
        if (!cancelled) {
          const signed = signedMap.get(`${bucket}:${path}`);
          if (signed) {
            setResolvedUrl(signed);
          } else {
            // Fallback: construct public URL (works while bucket is still public)
            setResolvedUrl(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`);
          }
        }
        return;
      }

      // Priority 2: Parse legacy public URL
      if (url) {
        const ref = parsePublicStorageUrl(url);
        if (ref && !cancelled) {
          const cached = getSignedUrl(ref.bucket, ref.path);
          if (cached) {
            setResolvedUrl(cached);
            return;
          }

          const signedMap = await ensureSignedUrls([{ bucket: ref.bucket, path: ref.path }]);
          const signed = signedMap.get(`${ref.bucket}:${ref.path}`);
          if (signed) {
            setResolvedUrl(signed);
          } else {
            setResolvedUrl(url);
          }
          return;
        }

        // External URL or unparseable — use as-is
        if (!cancelled) setResolvedUrl(url);
        return;
      }

      // No source
      if (!cancelled) setError(true);
    }

    resolve();
    return () => { cancelled = true; };
  }, [path, bucket, url]);

  async function handleError() {
    if (retrying.current) return;
    retrying.current = true;

    // Determine path+bucket for retry
    let retryBucket: string | undefined;
    let retryPath: string | undefined;

    if (path && bucket) {
      retryBucket = bucket;
      retryPath = path;
    } else if (url) {
      const ref = parsePublicStorageUrl(url);
      if (ref) {
        retryBucket = ref.bucket;
        retryPath = ref.path;
      }
    }

    if (retryBucket && retryPath && canRetry(retryBucket, retryPath)) {
      invalidateSignedUrl(retryBucket, retryPath);
      const signedMap = await ensureSignedUrls([{ bucket: retryBucket, path: retryPath }]);
      const fresh = signedMap.get(`${retryBucket}:${retryPath}`);
      if (fresh) {
        setResolvedUrl(fresh);
        setError(false);
      }
    }
  }

  if (!resolvedUrl && !error) {
    const aspectClass = aspectRatio === "square" ? "aspect-square" : aspectRatio === "video" ? "aspect-video" : "";
    return <div className={`bg-cocoa/10 animate-pulse rounded-2xl ${aspectClass} ${className}`} />;
  }

  if (error || (!resolvedUrl && error)) {
    return <div className={`flex items-center justify-center bg-cocoa/10 rounded-2xl aspect-square ${className}`}>🖼️</div>;
  }

  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={className}
        src={resolvedUrl || ""}
        alt={alt}
        loading={loading}
        decoding={decoding}
        onError={handleError}
      />
      {showPlayIcon && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-3xl text-white drop-shadow-lg">▶</span>
        </div>
      )}
    </div>
  );
}
