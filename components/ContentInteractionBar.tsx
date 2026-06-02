"use client";

import { useState, useCallback, useEffect } from "react";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import type { ContentType, InteractionSummary } from "@/lib/contentInteractions";
import { getLikeCount, getCommentCount, isLikedByIdentity } from "@/lib/contentInteractions";
// Local interaction helpers are dynamically imported for code splitting

export interface ContentInteractionBarProps {
  /** Space code for multi-space isolation */
  spaceCode: string;
  /** What kind of content: note, album, memory */
  contentType: ContentType;
  /** Stable ID of the content item */
  contentId: string;
  /** Current active identity */
  identityId: string;
  /** Pre-fetched interaction summary (optional, for optimistic display) */
  initialSummary?: InteractionSummary;
  /** Callback when user clicks the comment button */
  onOpenComments?: () => void;
  /** Compact mode: smaller icons, no comment count label */
  compact?: boolean;
  /** Whether to show the comment button */
  showComments?: boolean;
  /** External like count override */
  likeCountOverride?: number;
  /** External liked state override */
  hasLikedOverride?: boolean;
  /** External comment count override */
  commentCountOverride?: number;
  /** Called when like is toggled successfully */
  onLikeChanged?: (newState: { liked: boolean; count: number }) => void;
  /** Disable interactions */
  disabled?: boolean;
}

export default function ContentInteractionBar({
  spaceCode,
  contentType,
  contentId,
  identityId,
  initialSummary,
  onOpenComments,
  compact = false,
  showComments = true,
  likeCountOverride,
  hasLikedOverride,
  commentCountOverride,
  onLikeChanged,
  disabled = false,
}: ContentInteractionBarProps) {
  const [liked, setLiked] = useState<boolean>(
    hasLikedOverride ?? isLikedByIdentity(initialSummary, identityId)
  );
  const [likeCount, setLikeCount] = useState<number>(
    likeCountOverride ?? getLikeCount(initialSummary)
  );
  const commentCount = commentCountOverride ?? getCommentCount(initialSummary);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync external overrides
  useEffect(() => {
    if (hasLikedOverride !== undefined) setLiked(hasLikedOverride);
  }, [hasLikedOverride]);

  useEffect(() => {
    if (likeCountOverride !== undefined) setLikeCount(likeCountOverride);
  }, [likeCountOverride]);

  /** Toggle like in localStorage when API is unavailable */
  const fallbackLikeToggleLocally = useCallback(async (code: string, shouldLike: boolean) => {
    const { addLocalInteraction, removeLocalInteraction } = await import("@/lib/interactionsLocal");
    if (shouldLike) {
      addLocalInteraction(code, {
        id: `local_${contentType}_${contentId}_${identityId}_like`,
        contentType,
        contentId,
        identity: identityId,
        interactionType: "like",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      removeLocalInteraction(code, contentType, contentId, identityId, "like");
    }
    // Recalculate counts from local storage
    const { getLocalInteractions } = await import("@/lib/interactionsLocal");
    const localInteractions = getLocalInteractions(code, identityId, contentType);
    const itemLikes = localInteractions.filter(
      (i) => i.contentId === contentId && i.interactionType === "like"
    );
    const newLikeCount = itemLikes.length;
    const newLikedState = itemLikes.some((i) => i.identity === identityId);
    setLiked(newLikedState);
    setLikeCount(newLikeCount);
    setError("网络有点慢，先帮你存在本机了。");
    if (onLikeChanged) {
      onLikeChanged({ liked: newLikedState, count: newLikeCount });
    }
  }, [contentType, contentId, identityId, onLikeChanged]);

  const toggleLike = useCallback(async () => {
    if (disabled || busy) return;
    setError(null);

    // Optimistic update
    const prevLiked = liked;
    const prevCount = likeCount;
    const newLiked = !liked;
    const newCount = liked ? Math.max(0, likeCount - 1) : likeCount + 1;
    setLiked(newLiked);
    setLikeCount(newCount);
    setBusy(true);

    const code = spaceCode || getDefaultSpaceCode();

    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceCode: code,
          contentType,
          contentId,
          identity: identityId,
          interactionType: "like",
        }),
      });
      const payload = await res.json();

      if (!payload.ok) {
        // API failed — try localStorage fallback
        await fallbackLikeToggleLocally(code, newLiked);
        return;
      }

      // Server confirmed state
      if (typeof payload.liked === "boolean") setLiked(payload.liked);
      if (typeof payload.likeCount === "number") setLikeCount(payload.likeCount);
      if (onLikeChanged) {
        onLikeChanged({
          liked: payload.liked ?? newLiked,
          count: payload.likeCount ?? newCount,
        });
      }
    } catch {
      // Network error — try localStorage fallback
      try {
        await fallbackLikeToggleLocally(code, newLiked);
      } catch {
        // Local fallback also failed — rollback
        setLiked(prevLiked);
        setLikeCount(prevCount);
        setError("喜欢没有保存成功，等网络好一点再试试。");
      }
    } finally {
      setBusy(false);
    }
  }, [disabled, busy, liked, likeCount, spaceCode, contentType, contentId, identityId, onLikeChanged, fallbackLikeToggleLocally]);

  // Clear error after a few seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timer);
  }, [error]);

  const buttonSize = compact ? "text-sm px-2 py-1" : "text-sm px-3 py-1.5";

  return (
    <div className="flex items-center gap-1.5">
      {/* Like button */}
      <button
        className={`inline-flex items-center gap-1 rounded-full transition ${buttonSize} ${
          liked
            ? "bg-roseSoft/70 text-cocoa/80 shadow-sm"
            : "bg-white/60 text-cocoa/50 hover:bg-white/85"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={(e) => { e.stopPropagation(); toggleLike(); }}
        disabled={disabled || busy}
        title={liked ? "取消点赞" : "点赞"}
      >
        <span className={busy ? "animate-pulse" : ""}>
          {liked ? "❤️" : "🤍"}
        </span>
        {likeCount > 0 && (
          <span className="tabular-nums text-[10px]">{likeCount}</span>
        )}
      </button>

      {/* Comment button */}
      {showComments && (
        <button
          className={`inline-flex items-center gap-1 rounded-full bg-white/60 hover:bg-white/85 transition ${buttonSize} ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={(e) => { e.stopPropagation(); onOpenComments?.(); }}
          disabled={disabled}
          title="评论"
        >
          <span>💬</span>
          {!compact && commentCount > 0 && (
            <span className="tabular-nums text-[10px] text-cocoa/50">{commentCount}</span>
          )}
        </button>
      )}

      {/* Error message */}
      {error && (
        <span className="text-[10px] text-rose/70 ml-1">{error}</span>
      )}
    </div>
  );
}