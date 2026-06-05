"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getIdentityDisplayName } from "@/lib/identity";
import { useCurrentIdentity } from "@/hooks/useCurrentIdentity";
import type { CommentEntry as CommentEntryType } from "@/lib/contentInteractions";
import { addLocalComment, softDeleteLocalComment } from "@/lib/interactionsLocal";

export type { CommentEntryType };

export interface ContentCommentsProps {
  /** Type of content being commented on */
  contentType: "note" | "album" | "memory";
  /** ID of the content item */
  contentId: string;
  /** Space code for localStorage fallback */
  spaceCode: string;
  /** Current user's identity (optional — falls back to identityStorage) */
  identity?: string;
  /** Existing comment entries to display */
  comments: CommentEntryType[];
  /** Called when user submits a new comment. Throw to trigger local fallback. */
  onAddComment: (body: string, identity: string) => Promise<void>;
  /** Called when user deletes their own comment. Throw to trigger local fallback. */
  onDeleteComment: (commentId: string, identity: string) => Promise<void>;
  /** Whether to disable comment input */
  disabled?: boolean;
  /** Max comment body length */
  maxLength?: number;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Button label override */
  submitLabel?: string;
  /** Delete button label override */
  deleteLabel?: string;
  /** Whether the component has loaded data from remote */
  loading?: boolean;
  /** Called when identity changes and comments should be reloaded */
  onIdentityChanged?: () => void;
}

export default function ContentComments({
  contentType,
  contentId,
  spaceCode,
  identity: identityProp,
  comments,
  onAddComment,
  onDeleteComment,
  disabled = false,
  maxLength = 500,
  placeholder = "写下你的想法...",
  submitLabel = "发送",
  deleteLabel = "删除",
  loading = false,
  onIdentityChanged,
}: ContentCommentsProps) {
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve identity: prefer prop, fall back to useCurrentIdentity hook
  const { identityId: hookIdentity } = useCurrentIdentity(spaceCode);

  const activeIdentity = identityProp || hookIdentity;

  // Track previous hook identity to detect changes and notify parent
  const prevHookIdentityRef = useRef(hookIdentity);
  useEffect(() => {
    if (!identityProp && prevHookIdentityRef.current !== hookIdentity) {
      prevHookIdentityRef.current = hookIdentity;
      onIdentityChanged?.();
    }
  }, [hookIdentity, identityProp, onIdentityChanged]);

  /** Save comment to localStorage when API is unavailable */
  const fallbackSaveCommentLocally = useCallback(async (body: string): Promise<boolean> => {
    try {
      const localComment = {
        id: `local_cmt_${contentType}_${contentId}_${Date.now()}`,
        contentType,
        contentId,
        identity: activeIdentity,
        body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      addLocalComment(spaceCode, localComment);
      setError("网络有点慢，先帮你存在本机了。");
      return true;
    } catch {
      return false;
    }
  }, [contentType, contentId, activeIdentity, spaceCode]);

  const handleSubmit = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (trimmed.length > maxLength) {
      setError(`评论不能超过 ${maxLength} 字`);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onAddComment(trimmed, activeIdentity);
      setInputValue("");
      setExpanded(true);
    } catch {
      // API failed — try localStorage fallback
      const fallbackSucceeded = await fallbackSaveCommentLocally(trimmed);
      if (fallbackSucceeded) {
        setInputValue("");
        setExpanded(true);
      } else {
        // Keep input, show gentle error
        setError("发送失败了，内容还在，可以再试一次。");
      }
    } finally {
      setSubmitting(false);
    }
  }, [inputValue, maxLength, onAddComment, fallbackSaveCommentLocally, activeIdentity]);

  /** Handle comment deletion with local fallback */
  const handleDelete = useCallback(async (commentId: string) => {
    setError(null);
    try {
      await onDeleteComment(commentId, activeIdentity);
    } catch {
      try {
        softDeleteLocalComment(spaceCode, contentType, commentId);
        setError("暂时删除在本机，联网后就会同步。");
      } catch {
        setError("删除失败，请稍后再试。");
      }
    }
  }, [onDeleteComment, spaceCode, contentType, activeIdentity]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const visibleComments = expanded ? comments : comments.slice(0, 3);
  const hasMore = comments.length > 3;

  const isInputReady = !disabled && !submitting && inputValue.trim().length > 0;

  return (
    <div className="mt-4 pt-3 border-t border-white/10">
      {/* Comment input area — stacked layout for mobile readability */}
      <div className="relative">
        <textarea
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || submitting}
          rows={2}
          maxLength={maxLength + 50}
          className="w-full px-3 py-2 pr-16 rounded-lg bg-white/80 border border-cocoa/10 text-cocoa text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-300/40 focus:border-rose/40 disabled:opacity-50 placeholder:text-cocoa/40"
        />
        <button
          onClick={handleSubmit}
          disabled={!isInputReady}
          className={
            isInputReady
              ? "absolute right-2 bottom-2 bg-rose-400 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm transition hover:bg-rose-500 active:scale-95"
              : "absolute right-2 bottom-2 bg-rose-100 text-cocoa/40 px-4 py-1.5 rounded-full text-sm font-medium cursor-not-allowed"
          }
        >
          {submitting ? "..." : submitLabel}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs text-rose-500 font-medium">{error}</p>
      )}

      {/* Loading state */}
      {loading && (
        <p className="mt-3 text-xs text-cocoa/40 text-center">正在慢慢加载...</p>
      )}

      {/* Comments list */}
      {!loading && visibleComments.length > 0 && (
        <div className="mt-3 space-y-2">
          {visibleComments.map((comment) => (
            <div
              key={comment.id}
              className={`p-2 rounded-lg ${
                comment.isDeleted
                  ? "bg-white/30 text-cocoa/30 italic"
                  : "bg-white/50 text-cocoa/80"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {/* Identity + timestamp line */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-rose/70">
                      {getIdentityDisplayName(comment.identity)}
                    </span>
                    <span className="text-xs text-cocoa/30">·</span>
                    <span className="text-xs text-cocoa/30">
                      {formatCommentTime(comment.createdAt)}
                    </span>
                  </div>
                  {/* Body on next line */}
                  {comment.isDeleted ? (
                    <p className="text-xs mt-1">此评论已删除</p>
                  ) : (
                    <p className="text-sm mt-1 break-words">{comment.body}</p>
                  )}
                </div>

                {/* Delete button (only for own comments that aren't deleted) */}
                {!comment.isDeleted && comment.isMine && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={disabled}
                    className="text-xs text-cocoa/20 hover:text-red-500 transition shrink-0 disabled:opacity-30"
                    title={deleteLabel}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Show more/less toggle */}
          {hasMore && (
            <button
              onClick={toggleExpanded}
              className="w-full text-xs text-rose/60 hover:text-rose transition pt-1"
            >
              {expanded ? "收起评论" : `查看全部 ${comments.length} 条评论`}
            </button>
          )}
        </div>
      )}

      {/* Empty state — always show when no comments and not loading */}
      {!loading && comments.length === 0 && (
        <p className="mt-3 text-xs text-cocoa/30 text-center">
          还没有评论，先说点什么吧
        </p>
      )}
    </div>
  );
}

// ─── Helpers ───

/**
 * Format a comment timestamp in a human-readable relative style.
 * “刚刚 / 3分钟前 / 今天 15:44 / 6月2日 15:44”
 */
function formatCommentTime(iso: string): string {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const _days = Math.floor(diff / 86400000);

    // Within last minute
    if (mins < 1) return "刚刚";

    // Within last hour
    if (mins < 60) return `${mins}分钟前`;

    // Today: show "今天 HH:MM"
    if (isSameDay(date, now) || hours < 24) {
      const hh = String(date.getHours()).padStart(2, "0");
      const mm = String(date.getMinutes()).padStart(2, "0");
      return `今天 ${hh}:${mm}`;
    }

    // Within this year: "M月D日 HH:MM"
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${month}月${day}日 ${hh}:${mm}`;
  } catch {
    return "";
  }
}

/** Check if two dates share the same calendar day. */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}