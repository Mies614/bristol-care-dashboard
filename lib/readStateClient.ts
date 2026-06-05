"use client";

import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import {
  READ_STATE_CHANGED_EVENT,
  isContentRead as isContentReadLocal,
  markContentAsRead as markContentAsReadLocal,
  type ReadContentType,
} from "@/lib/readState";

export type { ReadContentType };

export type ReadStateEntry = {
  contentType: ReadContentType;
  contentId: string;
  identity: string;
  readAt: string;
};

/**
 * Fetch cloud read states for one or more content items.
 * Falls back to localStorage if API fails.
 */
export async function fetchCloudReadStates(params: {
  spaceCode?: string;
  identity?: string;
  contentType?: ReadContentType;
  contentIds?: string[];
}): Promise<ReadStateEntry[]> {
  const code = params.spaceCode || getDefaultSpaceCode();
  const identity = params.identity || DEFAULT_NORMAL_IDENTITY_ID;

  const params_ = new URLSearchParams();
  params_.set("spaceCode", code);
  params_.set("identity", identity);
  if (params.contentType) params_.set("contentType", params.contentType);
  if (params.contentIds && params.contentIds.length > 0) {
    params_.set("contentIds", params.contentIds.join(","));
  }

  try {
    const res = await fetch(`/api/read-state?${params_.toString()}`);
    const payload = await res.json();
    if (payload.ok && Array.isArray(payload.reads)) {
      return payload.reads as ReadStateEntry[];
    }
  } catch {
    // Fall through to local
  }

  // Fallback: compute from localStorage
  if (params.contentIds && params.contentIds.length > 0 && params.contentType) {
    return params.contentIds
      .filter((id) => isContentReadLocal(params.contentType!, id, code, identity))
      .map((id) => ({
        contentType: params.contentType!,
        contentId: id,
        identity,
        readAt: new Date().toISOString(),
      }));
  }
  return [];
}

/**
 * Mark a single content item as read in the cloud.
 * Falls back to localStorage if API fails.
 * Dispatches READ_STATE_CHANGED_EVENT on success.
 */
export async function markCloudContentAsRead(params: {
  spaceCode?: string;
  identity?: string;
  contentType: ReadContentType;
  contentId: string;
}): Promise<void> {
  const code = params.spaceCode || getDefaultSpaceCode();
  const identity = params.identity || DEFAULT_NORMAL_IDENTITY_ID;

  try {
    const res = await fetch("/api/read-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spaceCode: code,
        identity,
        contentType: params.contentType,
        contentId: params.contentId,
      }),
    });
    const payload = await res.json();
    if (payload.ok) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(READ_STATE_CHANGED_EVENT));
      }
      return;
    }
  } catch {
    // Fall through to local
  }

  // Fallback to localStorage
  markContentAsReadLocal(params.contentType, params.contentId, code, identity);
}

/**
 * Mark multiple content items as read in the cloud.
 */
export async function markCloudContentsAsRead(params: {
  spaceCode?: string;
  identity?: string;
  items: Array<{ contentType: ReadContentType; contentId: string }>;
}): Promise<void> {
  const code = params.spaceCode || getDefaultSpaceCode();
  const identity = params.identity || DEFAULT_NORMAL_IDENTITY_ID;

  if (params.items.length === 0) return;

  try {
    const res = await fetch("/api/read-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spaceCode: code,
        identity,
        items: params.items,
      }),
    });
    const payload = await res.json();
    if (payload.ok) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(READ_STATE_CHANGED_EVENT));
      }
      return;
    }
  } catch {
    // Fall through to local
  }

  // Fallback: mark each locally
  for (const item of params.items) {
    markContentAsReadLocal(item.contentType, item.contentId, code, identity);
  }
}

/**
 * Check if a content item is read, given a set of cloud read state entries.
 * For use when you already have fetched reads — avoids extra API calls.
 */
export function isReadFromEntries(
  reads: ReadStateEntry[],
  contentType: ReadContentType,
  contentId: string
): boolean {
  return reads.some((r) => r.contentType === contentType && r.contentId === contentId);
}

/**
 * Compute cloud read state in a React-friendly pattern.
 * Returns a Set of "contentType:contentId" keys for quick lookup.
 */
export function buildReadKeySet(reads: ReadStateEntry[]): Set<string> {
  return new Set(reads.map((r) => `${r.contentType}:${r.contentId}`));
}