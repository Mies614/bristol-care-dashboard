"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  fetchCloudReadStates,
  markCloudContentAsRead,
  buildReadKeySet,
  type ReadContentType,
  type ReadStateEntry,
} from "@/lib/readStateClient";

export type { ReadContentType, ReadStateEntry };

/**
 * Hook that loads cloud read states for a list of content items.
 *
 * Usage:
 *   const { readKeySet, markAsRead, loading } = useCloudReadStates({
 *     spaceCode,
 *     identity,
 *     contentType: "note",
 *     contentIds: notes.map(n => n.id),
 *   });
 *
 * Then check: readKeySet.has("note:someId")
 */
export function useCloudReadStates(params: {
  spaceCode: string;
  identity: string;
  contentType: ReadContentType;
  contentIds: string[];
}) {
  const [reads, setReads] = useState<ReadStateEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef<string>("");

  const { spaceCode, identity, contentType, contentIds } = params;
  const idKey = useMemo(
    () => `${contentType}:${contentIds.join(",")}`,
    [contentType, contentIds]
  );

  // Fetch from cloud when IDs change
  useEffect(() => {
    if (!contentIds.length || !identity) return;
    if (loadedRef.current === idKey) return;

    let cancelled = false;
    setLoading(true);

    fetchCloudReadStates({ spaceCode, identity, contentType, contentIds })
      .then((result) => {
        if (!cancelled) {
          setReads(result);
          loadedRef.current = idKey;
        }
      })
      .catch(() => {
        // Non-critical
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [spaceCode, identity, contentType, idKey, contentIds]);

  const readKeySet = useMemo(() => buildReadKeySet(reads), [reads]);

  const markAsRead = useCallback(
    async (contentId: string) => {
      await markCloudContentAsRead({
        spaceCode,
        identity,
        contentType,
        contentId,
      });
      // Optimistically update local state
      setReads((prev) => {
        const exists = prev.some(
          (r) => r.contentType === contentType && r.contentId === contentId
        );
        if (exists) return prev;
        return [
          ...prev,
          {
            contentType,
            contentId,
            identity,
            readAt: new Date().toISOString(),
          },
        ];
      });
    },
    [spaceCode, identity, contentType]
  );

  return { readKeySet, markAsRead, loading };
}