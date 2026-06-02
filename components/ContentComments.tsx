"use client";

import { useState, useCallback } from "react";
import { getIdentityDisplayName } from "@/lib/identity";
import type { CommentEntry as CommentEntryType } from "@/lib/contentInteractions";

export type { CommentEntryType };

export interface ContentCommentsProps {
  /** Type of content being commented on */
  contentType: "note" | "album" | "memory";
  /** ID of the content item */
  contentId: string;
  /** Current user's identity */
  identity: string;
  /** Existing comment entries to display */
  comments: CommentEntryType[];
  /** Called when user submits a new comment */
  onAddComment: (body: string) => Promise<void>;
  /** Called when user deletes their own comment */
  onDeleteComment: (commentId: string) => void;
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
}

export default function ContentComments({
  contentType: _contentType,
  contentId: _contentId,
  identity,
  comments,
  onAddComment,
  onDeleteComment,
  disabled = false,
  maxLength = 500,
  placeholder = "写下你的想法...",
  submitLabel = "发送",
  deleteLabel = "删除",
  loading = false,
}: ContentCommentsProps) {
  const [inputValue, setInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await onAddComment(trimmed);
      setInputValue("");
      setExpanded(true); // show comments after posting
    } catch {
      setError("发送失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }, [inputValue, maxLength, onAddComment]);

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

  return (
    <div className="mt-4 pt-3 border-t border-white/10">
      {/* Comment input area */}
      <div className="flex gap-2">
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
          maxLength={maxLength + 50} // allow slight overflow for UX
          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none focus:outline-none focus:border-pink-400/50 disabled:opacity-50 placeholder:text-white/30"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || submitting || !inputValue.trim()}
          className="self-end px-4 py-2 rounded-lg bg-pink-500/80 hover:bg-pink-500 text-white text-sm transition disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        >
          {submitting ? "..." : submitLabel}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}

      {/* Loading state */}
      {loading && (
        <p className="mt-3 text-xs text-white/40 text-center">加载评论中...</p>
      )}

      {/* Comments list */}
      {!loading && visibleComments.length > 0 && (
        <div className="mt-3 space-y-2">
          {visibleComments.map((comment) => (
            <div
              key={comment.id}
              className={`p-2 rounded-lg ${
                comment.isDeleted
                  ? "bg-white/5 text-white/30 italic"
                  : "bg-white/5 text-white/80"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {/* Identity label */}
                  <span className="text-xs font-medium text-pink-300/80 mr-2">
                    {getIdentityDisplayName(comment.identity)}
                  </span>
                  {/* Timestamp */}
                  <span className="text-xs text-white/30">
                    {formatCommentTime(comment.createdAt)}
                  </span>
                  {/* Body */}
                  {comment.isDeleted ? (
                    <p className="text-xs mt-1">此评论已删除</p>
                  ) : (
                    <p className="text-sm mt-1 break-words">{comment.body}</p>
                  )}
                </div>

                {/* Delete button (only for own comments that aren't deleted) */}
                {!comment.isDeleted && comment.isMine && (
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    disabled={disabled}
                    className="text-xs text-white/20 hover:text-red-400 transition shrink-0 disabled:opacity-30"
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
              className="w-full text-xs text-pink-300/60 hover:text-pink-300 transition pt-1"
            >
              {expanded ? "收起评论" : `查看全部 ${comments.length} 条评论`}
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && comments.length === 0 && expanded && (
        <p className="mt-3 text-xs text-white/30 text-center">
          还没有评论，来说点什么吧
        </p>
      )}
    </div>
  );
}

// ─── Helpers ───

function formatCommentTime(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "刚刚";
    if (mins < 60) return `${mins} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;

    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  } catch {
    return "";
  }
}