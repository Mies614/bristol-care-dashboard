"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import type { ContentType, InteractionSummary } from "@/lib/contentInteractions";
import { getLikeCount, getCommentCount, isLikedByIdentity } from "@/lib/contentInteractions";

// ─── Reaction config ───
// These map to the "reaction" field in content_interactions
// interactionType = "reaction", reaction = "fire" | "hug" | "moon"
const REACTION_CONFIG = [
  { id: "fire" as const, emoji: "❤️‍🔥", label: "心动" },
  { id: "hug" as const, emoji: "🫶", label: "想你" },
  { id: "moon" as const, emoji: "🌙", label: "晚安" },
] as const;

type ReactionId = (typeof REACTION_CONFIG)[number]["id"];

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
  /** Callback when any interaction occurs (like, reaction, or comment open) — useful for mark-as-read */
  onInteract?: () => void;
  /** Compact mode: smaller icons, no comment count label */
  compact?: boolean;
  /** Whether to show the comment button */
  showComments?: boolean;
  /** Whether to show reaction buttons (❤️‍🔥/🫶/🌙) */
  showReactions?: boolean;
  /** External like count override */
  likeCountOverride?: number;
  /** External liked state override */
  hasLikedOverride?: boolean;
  /** External comment count override */
  commentCountOverride?: number;
  /** Called when like or reaction state changes */
  onLikeChanged?: (newState: { liked: boolean; count: number }) => void;
  /** Called when any reaction state changes */
  onReactionChanged?: (reactions: Record<string, { count: number; active: boolean }>) => void;
  /** Disable interactions */
  disabled?: boolean;
  /** Externally-provided reactions map (from server summary), keyed by reaction id */
  externalReactions?: Record<string, { count: number; active: boolean }>;
}

export default function ContentInteractionBar({
  spaceCode,
  contentType,
  contentId,
  identityId,
  initialSummary,
  onOpenComments,
  onInteract,
  compact = false,
  showComments = true,
  showReactions = true,
  likeCountOverride,
  hasLikedOverride,
  commentCountOverride,
  onLikeChanged,
  onReactionChanged,
  disabled = false,
  externalReactions,
}: ContentInteractionBarProps) {
  const [liked, setLiked] = useState<boolean>(
    hasLikedOverride ?? isLikedByIdentity(initialSummary, identityId)
  );
  const [likeCount, setLikeCount] = useState<number>(
    likeCountOverride ?? getLikeCount(initialSummary)
  );
  const [commentCount, setCommentCount] = useState<number>(
    commentCountOverride ?? getCommentCount(initialSummary)
  );
  const [reactions, setReactions] = useState<
    Record<ReactionId, { count: number; active: boolean }>
  >(() => {
    const init: Record<string, { count: number; active: boolean }> = {};
    for (const r of REACTION_CONFIG) {
      init[r.id] = { count: 0, active: false };
    }
    return init as Record<ReactionId, { count: number; active: boolean }>;
  });
  const [busyLike, setBusyLike] = useState(false);
  const [busyReactions, setBusyReactions] = useState<Set<ReactionId>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const summaryFetchedRef = useRef(false);

  // ── Fetch summary from API on mount ──
  useEffect(() => {
    if (summaryFetchedRef.current && !identityId) return;
    // Skip if we have overrides or an external reactions map
    if (
      hasLikedOverride !== undefined &&
      likeCountOverride !== undefined &&
      commentCountOverride !== undefined &&
      externalReactions !== undefined
    ) {
      summaryFetchedRef.current = true;
      return;
    }

    const code = spaceCode || getDefaultSpaceCode();
    if (!code || !contentId || !identityId) return;

    const abortController = new AbortController();
    summaryFetchedRef.current = true;

    (async () => {
      try {
        const res = await fetch(
          `/api/interactions?spaceCode=${encodeURIComponent(code)}&contentType=${encodeURIComponent(contentType)}&contentIds=${encodeURIComponent(contentId)}&identity=${encodeURIComponent(identityId)}`,
          { signal: abortController.signal }
        );
        if (!res.ok) return;
        const payload = await res.json();
        if (!payload.ok || !payload.summaries?.[contentId]) return;
        const summary: {
          likeCount: number;
          hasLiked: boolean;
          reactions?: Record<string, { count: number; active: boolean }>;
        } = payload.summaries[contentId];

        if (hasLikedOverride === undefined) {
          setLiked(summary.hasLiked ?? false);
          setLikeCount(typeof summary.likeCount === "number" ? summary.likeCount : 0);
        }
        if (commentCountOverride === undefined && payload.summaries[contentId]?.commentCount !== undefined) {
          setCommentCount(payload.summaries[contentId]?.commentCount ?? 0);
        }
        // Merge reactions
        if (summary.reactions) {
          setReactions((prev) => {
            const next = { ...prev };
            for (const r of REACTION_CONFIG) {
              const entry = summary.reactions?.[r.id];
              if (entry) {
                next[r.id] = { count: entry.count ?? 0, active: entry.active ?? false };
              }
            }
            return next;
          });
          if (onReactionChanged) {
            onReactionChanged(summary.reactions);
          }
        }
      } catch {
        // Non-critical — will use initial state or fallback
      }
    })();

    return () => {
      abortController.abort();
    };
    // Only re-fetch when identityId, contentId or contentType change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityId, contentId, contentType, spaceCode]);

  // Reset fetch flag when key params change
  useEffect(() => {
    summaryFetchedRef.current = false;
  }, [identityId, contentId, contentType]);

  // Sync external overrides
  useEffect(() => {
    if (hasLikedOverride !== undefined) setLiked(hasLikedOverride);
  }, [hasLikedOverride]);

  useEffect(() => {
    if (likeCountOverride !== undefined) setLikeCount(likeCountOverride);
  }, [likeCountOverride]);

  useEffect(() => {
    if (commentCountOverride !== undefined) setCommentCount(commentCountOverride);
  }, [commentCountOverride]);

  // Sync external reactions
  useEffect(() => {
    if (!externalReactions) return;
    setReactions((prev) => {
      const next = { ...prev };
      for (const r of REACTION_CONFIG) {
        const entry = externalReactions[r.id];
        if (entry) {
          next[r.id] = { count: entry.count ?? 0, active: entry.active ?? false };
        }
      }
      return next;
    });
  }, [externalReactions]);

  /** Apply reactions from a server response */
  const applyResponseReactions = useCallback(
    (responseReactions?: Record<string, { count: number; active: boolean }>) => {
      if (!responseReactions) return;
      setReactions((prev) => {
        const next = { ...prev };
        for (const r of REACTION_CONFIG) {
          const entry = responseReactions[r.id];
          if (entry) {
            next[r.id] = { count: entry.count ?? 0, active: entry.active ?? false };
          }
        }
        return next;
      });
      if (onReactionChanged) {
        onReactionChanged(responseReactions);
      }
    },
    [onReactionChanged]
  );

  /** Toggle like in localStorage when API is unavailable */
  const fallbackLikeToggleLocally = useCallback(
    async (code: string, shouldLike: boolean) => {
      const { addLocalInteraction, removeLocalInteraction } = await import(
        "@/lib/interactionsLocal"
      );
      if (shouldLike) {
        addLocalInteraction(code, {
          id: `local_${contentType}_${contentId}_${identityId}_like_${Date.now()}`,
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
    },
    [contentType, contentId, identityId, onLikeChanged]
  );

  /** Toggle reaction in localStorage */
  const fallbackReactionToggleLocally = useCallback(
    async (code: string, reactionId: ReactionId, shouldAdd: boolean) => {
      const { addLocalInteraction, removeLocalInteraction } = await import(
        "@/lib/interactionsLocal"
      );
      if (shouldAdd) {
        addLocalInteraction(code, {
          id: `local_${contentType}_${contentId}_${identityId}_reaction_${reactionId}_${Date.now()}`,
          contentType,
          contentId,
          identity: identityId,
          interactionType: "reaction",
          reaction: reactionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        removeLocalInteraction(code, contentType, contentId, identityId, "reaction", reactionId);
      }
      // Recalculate
      const { getLocalInteractions } = await import("@/lib/interactionsLocal");
      const localInteractions = getLocalInteractions(code, identityId, contentType);
      const itemReactions = localInteractions.filter(
        (i) => i.contentId === contentId && i.interactionType === "reaction"
      );
      setReactions((prev) => {
        const next = { ...prev };
        for (const r of REACTION_CONFIG) {
          const count = itemReactions.filter((i) => i.reaction === r.id).length;
          const active = itemReactions.some(
            (i) => i.reaction === r.id && i.identity === identityId
          );
          next[r.id] = { count, active };
        }
        return next;
      });
      setError("网络有点慢，先帮你存在本机了。");
    },
    [contentType, contentId, identityId]
  );

  const toggleLike = useCallback(async () => {
    if (disabled || busyLike) return;
    setError(null);

    const prevLiked = liked;
    const prevCount = likeCount;
    const newLiked = !liked;
    const newCount = liked ? Math.max(0, likeCount - 1) : likeCount + 1;
    setLiked(newLiked);
    setLikeCount(newCount);
    setBusyLike(true);

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
        if (res.status >= 400 && res.status < 500) {
          setLiked(prevLiked);
          setLikeCount(prevCount);
          setError("操作失败，请检查参数后重试。");
          return;
        }
        await fallbackLikeToggleLocally(code, newLiked);
        return;
      }

      // Server confirmed state — update like + reactions
      if (typeof payload.liked === "boolean") setLiked(payload.liked);
      if (typeof payload.likeCount === "number") setLikeCount(payload.likeCount);
      applyResponseReactions(payload.reactions);
      if (onLikeChanged) {
        onLikeChanged({
          liked: payload.liked ?? newLiked,
          count: payload.likeCount ?? newCount,
        });
      }
    } catch {
      try {
        await fallbackLikeToggleLocally(code, newLiked);
      } catch {
        setLiked(prevLiked);
        setLikeCount(prevCount);
        setError("喜欢没有保存成功，等网络好一点再试试。");
      }
    } finally {
      setBusyLike(false);
    }
  }, [
    disabled,
    busyLike,
    liked,
    likeCount,
    spaceCode,
    contentType,
    contentId,
    identityId,
    onLikeChanged,
    fallbackLikeToggleLocally,
    applyResponseReactions,
  ]);

  const toggleReaction = useCallback(
    async (reactionId: ReactionId) => {
      if (disabled) return;
      setError(null);

      const prevEntry = reactions[reactionId];
      const isActive = prevEntry.active;
      const newActive = !isActive;
      const newCount = isActive ? Math.max(0, prevEntry.count - 1) : prevEntry.count + 1;

      // Optimistic update
      setReactions((prev) => ({
        ...prev,
        [reactionId]: { count: newCount, active: newActive },
      }));
      setBusyReactions((prev) => new Set(prev).add(reactionId));

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
            interactionType: "reaction",
            reaction: reactionId,
          }),
        });
        const payload = await res.json();

        if (!payload.ok) {
          if (res.status >= 400 && res.status < 500) {
            // Rollback
            setReactions((prev) => ({
              ...prev,
              [reactionId]: { count: prevEntry.count, active: prevEntry.active },
            }));
            setError("操作失败，请重试。");
            return;
          }
          await fallbackReactionToggleLocally(code, reactionId, newActive);
          return;
        }

        // Server confirmed — sync all reactions from response
        applyResponseReactions(payload.reactions);
        // Also sync like state if present
        if (typeof payload.liked === "boolean") setLiked(payload.liked);
        if (typeof payload.likeCount === "number") setLikeCount(payload.likeCount);
      } catch {
        try {
          await fallbackReactionToggleLocally(code, reactionId, newActive);
        } catch {
          setReactions((prev) => ({
            ...prev,
            [reactionId]: { count: prevEntry.count, active: prevEntry.active },
          }));
          setError("反应没有保存成功，等网络好一点再试试。");
        }
      } finally {
        setBusyReactions((prev) => {
          const next = new Set(prev);
          next.delete(reactionId);
          return next;
        });
      }
    },
    [
      disabled,
      reactions,
      spaceCode,
      contentType,
      contentId,
      identityId,
      fallbackReactionToggleLocally,
      applyResponseReactions,
    ]
  );

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
        onClick={(e) => {
          e.stopPropagation();
          onInteract?.();
          toggleLike();
        }}
        disabled={disabled || busyLike}
        title={liked ? "取消点赞" : "点赞"}
      >
        <span className={busyLike ? "animate-pulse" : ""}>{liked ? "❤️" : "🤍"}</span>
        {likeCount > 0 && <span className="tabular-nums text-[10px]">{likeCount}</span>}
      </button>

      {/* Reaction buttons */}
      {showReactions &&
        REACTION_CONFIG.map((r) => {
          const entry = reactions[r.id];
          const isBusy = busyReactions.has(r.id);
          return (
            <button
              key={r.id}
              className={`inline-flex items-center gap-0.5 rounded-full transition ${buttonSize} ${
                entry.active
                  ? "bg-roseSoft/70 text-cocoa/80 shadow-sm"
                  : "bg-white/60 text-cocoa/50 hover:bg-white/85"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onInteract?.();
                toggleReaction(r.id);
              }}
              disabled={disabled || isBusy}
              title={entry.active ? `取消${r.label}` : r.label}
            >
              <span className={isBusy ? "animate-pulse" : ""}>{r.emoji}</span>
              {entry.count > 0 && (
                <span className="tabular-nums text-[10px]">{entry.count}</span>
              )}
            </button>
          );
        })}

      {/* Comment button */}
      {showComments && (
        <button
          className={`inline-flex items-center gap-1 rounded-full bg-white/60 hover:bg-white/85 transition ${buttonSize} ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onInteract?.();
            onOpenComments?.();
          }}
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
      {error && <span className="text-[10px] text-rose/70 ml-1">{error}</span>}
    </div>
  );
}