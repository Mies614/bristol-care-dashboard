"use client";

import { useState, useCallback } from "react";
import type { LoveNote } from "@/lib/types";
import { DEFAULT_NORMAL_IDENTITY_ID, isSameIdentity } from "@/lib/identity";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { ApiClientError } from "@/lib/apiError";
import ContentComments from "./ContentComments";
import ContentInteractionBar from "./ContentInteractionBar";
import type { CommentEntry } from "@/lib/contentInteractions";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import { NoteMediaDownload } from "./NoteMediaDownload";
import { MobileSheet } from "@/components/ui/MobileSheet";
import { SignedMediaImage } from "@/components/SignedMediaImage";
import { SignedMediaVideo } from "@/components/SignedMediaVideo";
import { SignedMediaAudio } from "@/components/SignedMediaAudio";
import type { AppSide } from "@/lib/appIdentity";

export interface NoteCardProps {
  note: LoveNote;
  onClick?: () => void;
  featured?: boolean;
  onEdit?: () => void;
  onPatch?: (body: Record<string, unknown>) => void;
  busy?: boolean;
  identityId?: string;
  side?: AppSide;
  readKeySet?: Set<string>;
  onNoteRead?: (noteId: string) => void;
}

/** Map legacy 7 styles to 3 core visual styles */
function mapToCoreStyle(displayStyle?: string | null): "sticky" | "postcard" | "minimal" {
  const core = displayStyle || "sticky";
  if (core === "sticky") return "sticky";
  if (core === "postcard" || core === "romantic" || core === "photo_card") return "postcard";
  if (core === "bubble" || core === "timeline") return "minimal";
  return "minimal";
}

/** Side-aware author label */
function getSideAuthorLabel(author: string | null | undefined, identityId: string, side: AppSide | undefined): string {
  const normalized = author || "";
  if (normalized === identityId) return "我写的";
  if (side === "owner") return "小乖写的";
  return "他写的";
}

/** Determine if the note is "mine" for accent purposes */
function isMineNote(author: string | null | undefined, identityId: string): boolean {
  return (author || "") === identityId;
}


export function NoteCard({
  note,
  onClick,
  featured = false,
  onEdit,
  onPatch,
  busy,
  identityId,
  side,
  readKeySet,
  onNoteRead,
}: NoteCardProps) {
  const spaceCode = getDefaultSpaceCode();
  const identity = identityId || DEFAULT_NORMAL_IDENTITY_ID;

  const coreStyle = mapToCoreStyle(note.displayStyle);
  const mine = isMineNote(note.author, identity);
  const isOwner = side === "owner";

  // Owner/partner accent colors
  const ownerAccent = mine
    ? "from-indigo-50/70 via-white/80 to-indigo-50/40 border-indigo-100/40"
    : "from-rose-50/70 via-white/80 to-rose-50/40 border-rose-100/40";
  const partnerAccent = mine
    ? "from-rose-50/70 via-white/80 to-rose-50/40 border-rose-100/40"
    : "from-violet-50/50 via-white/80 to-slate-100/30 border-violet-100/30";

  const accentGradient = isOwner ? ownerAccent : partnerAccent;

  // Core style classes
  const styleClasses: Record<string, string> = {
    sticky: `rounded-[1.5rem] border p-4 rotate-[-0.3deg] bg-gradient-to-br ${accentGradient}`,
    postcard: `rounded-[1.7rem] border p-5 bg-gradient-to-br ${accentGradient}`,
    minimal: `rounded-[1.25rem] border p-4 bg-white/78`,
  };

  const base = "overflow-hidden shadow-soft backdrop-blur-xl text-left transition hover:-translate-y-0.5";
  const styleClass = styleClasses[coreStyle] || styleClasses.sticky;
  const pinnedClass = note.pinned
    ? "ring-1 ring-[var(--app-accent)]/25 shadow-[0_0_10px_rgba(232,169,155,0.12)]"
    : "";

  const type = note.noteType || (note.videoUrl || note.videoPath ? "video" : note.audioUrl || note.audioPath ? "audio" : note.imageUrl || note.imagePath ? "image" : "text");

  const [showComments] = useState(false);
  const [showCommentSheet, setShowCommentSheet] = useState(false);
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Text truncation
  const [contentExpanded, setContentExpanded] = useState(false);
  const needsTruncation = (note.content || "").length > 180;

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch(
        `/api/comments?spaceCode=${encodeURIComponent(spaceCode)}&contentType=note&contentId=${encodeURIComponent(note.id)}&identity=${encodeURIComponent(identity)}`
      );
      const payload = await res.json();
      if (payload.ok && Array.isArray(payload.comments)) {
        const entries: CommentEntry[] = payload.comments.map((c: Record<string, unknown>) => ({
          id: c.id as string,
          identity: c.identity as string,
          body: c.body as string,
          createdAt: c.createdAt as string,
          deletedAt: c.deletedAt as string | undefined,
          updatedAt: c.updatedAt as string | undefined,
          isDeleted: Boolean(c.deletedAt),
          isMine: isSameIdentity(c.identity as string, identity),
        }));
        setComments(entries);
      }
    } catch {
      // Non-critical
    } finally {
      setCommentsLoading(false);
    }
  }, [note.id, spaceCode, identity]);

  async function handleAddComment(body: string, _identity: string) {
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spaceCode,
        contentType: "note",
        contentId: note.id,
        identity,
        body,
      }),
    });
    const payload = await res.json();
    if (!payload.ok) {
      if (res.status >= 400 && res.status < 500) {
        throw new ApiClientError(payload.error || "发送失败");
      }
      throw new Error(payload.error || "发送失败");
    }
    await loadComments();
  }

  async function handleDeleteComment(commentId: string, _identity: string) {
    const res = await fetch("/api/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaceCode, commentId, identity }),
    });
    const payload = await res.json();
    if (!payload.ok) {
      if (res.status >= 400 && res.status < 500) {
        throw new ApiClientError(payload.error || "删除失败");
      }
      throw new Error(payload.error || "删除失败");
    }
    await loadComments();
  }

  const isHidden = note.active === false;
  const isUnread = note.author !== identity && !note.deletedAt && readKeySet && !readKeySet.has(`note:${note.id}`);

  const handleCardClick = () => {
    if (onNoteRead && isUnread) {
      onNoteRead(note.id);
    }
    onClick?.();
  };

  const commentPlaceholder = isOwner ? "回复小乖..." : "回一句？";
  const openCommentSheet = () => {
    if (!showCommentSheet) {
      loadComments();
    }
    setShowCommentSheet(true);
  };

  return (
    <>
      <article
        className={`${base} ${styleClass} ${pinnedClass} ${onClick ? "cursor-pointer" : ""} ${featured ? "w-full" : ""}`}
        onClick={handleCardClick}
      >
        {/* Header: author + time */}
        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-cocoa/55">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/60 px-2.5 py-1 font-medium">
              {getSideAuthorLabel(note.author, identity, side)}
            </span>
            {isUnread ? <UnreadBadge mode="label" label="未读小纸条" /> : null}
          </div>
          <span>
            {note.createdAt
              ? new Date(note.createdAt).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
              : "刚刚"}
          </span>
        </div>

        {/* Media: image */}
        {(note.imageUrl || note.imagePath) ? (
          <div className="mb-3 space-y-2">
            <SignedMediaImage
              className="max-h-56 w-full rounded-[1.25rem] object-cover animate-[fadeIn_0.3s_ease-out]"
              path={note.imagePath}
              bucket="love-notes"
              url={note.imageUrl}
              alt={note.imageAlt || "小纸条图片"}
              loading="lazy"
            />
            <NoteMediaDownload note={note} />
          </div>
        ) : null}

        {/* Media: video */}
        {(note.videoUrl || note.videoPath) ? (
          <div className="mb-3 space-y-2">
            <SignedMediaVideo
              className="max-h-56 w-full rounded-[1.25rem] bg-black"
              path={note.videoPath}
              bucket="love-notes"
              url={note.videoUrl}
              controls
            />
            <NoteMediaDownload note={note} />
          </div>
        ) : null}

        {/* Media: audio */}
        {(note.audioUrl || note.audioPath) ? (
          <div className="mb-3 space-y-2">
            <SignedMediaAudio
              className="w-full"
              path={note.audioPath}
              bucket="love-notes"
              url={note.audioUrl}
            />
            <NoteMediaDownload note={note} />
          </div>
        ) : null}

        {/* Text content with truncation */}
        {note.content ? (
          <div>
            <p
              className={`whitespace-pre-wrap break-words text-sm leading-7 text-cocoa/78 ${
                !contentExpanded && needsTruncation ? "line-clamp-4" : ""
              }`}
            >
              {note.content}
            </p>
            {needsTruncation && (
              <button
                className="mt-1 text-xs font-medium text-rose/60 hover:text-rose transition-colors"
                onClick={(e) => { e.stopPropagation(); setContentExpanded(!contentExpanded); }}
                type="button"
                aria-label={contentExpanded ? "收起全文" : "展开全文"}
              >
                {contentExpanded ? "收起" : "展开全文"}
              </button>
            )}
          </div>
        ) : null}

        {/* Tags + interactions */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {note.mood ? (
            <span className="rounded-full bg-white/60 px-2.5 py-1 text-xs text-cocoa/62">{note.mood}</span>
          ) : null}
          <span className="rounded-full bg-cocoa/8 px-2.5 py-1 text-xs uppercase text-cocoa/55">{type}</span>
          {note.pinned ? (
            <span className="rounded-full bg-blush/70 px-2.5 py-1 text-xs text-cocoa/65">置顶</span>
          ) : null}
          {!isHidden ? (
            <ContentInteractionBar
              spaceCode={spaceCode}
              contentType="note"
              contentId={note.id}
              identityId={identity}
              compact
              onOpenComments={openCommentSheet}
            />
          ) : null}
        </div>

        {/* Inline comments (keep for backward compat, but comment button now opens sheet) */}
        {showComments ? (
          <div className="mt-3 border-t border-white/60 pt-3" onClick={(e) => e.stopPropagation()}>
            <ContentComments
              contentType="note"
              contentId={note.id}
              spaceCode={spaceCode}
              identity={identity}
              appSide={side}
              comments={comments}
              loading={commentsLoading}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              placeholder={commentPlaceholder}
              maxLength={500}
            />
          </div>
        ) : null}

        {/* Admin controls */}
        {onPatch ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/60 pt-3" onClick={(event) => event.stopPropagation()}>
            <button className="btn-secondary btn-small text-xs" disabled={busy} onClick={onEdit} type="button" aria-label="编辑小纸条">编辑</button>
            <button className="btn-secondary btn-small text-xs" disabled={busy} onClick={() => onPatch({ id: note.id, action: "toggle_pinned" })} type="button" aria-label={note.pinned ? "取消置顶" : "置顶"}>{note.pinned ? "取消置顶" : "置顶"}</button>
            <button className="btn-secondary btn-small text-xs" disabled={busy} onClick={() => onPatch({ id: note.id, action: "set_active", active: note.active })} type="button" aria-label={note.active ? "隐藏小纸条" : "恢复小纸条"}>{note.active ? "隐藏" : "恢复"}</button>
            <select className="field h-7 w-14 min-w-0 py-0 text-xs" disabled={busy} value={note.displayStyle || "sticky"} onChange={(event) => onPatch({ id: note.id, action: "change_style", display_style: event.target.value })}>
              <option value="sticky">便签</option>
              <option value="postcard">明信片</option>
              <option value="minimal">极简</option>
              <option value="bubble">气泡</option>
              <option value="photo_card">照片卡</option>
              <option value="timeline">时间线</option>
              <option value="romantic">浪漫</option>
            </select>
            <button className="btn-danger btn-small text-xs" disabled={busy} onClick={() => onPatch({ id: note.id, action: "delete" })} type="button" aria-label="删除小纸条">删除</button>
          </div>
        ) : null}
      </article>

      {/* Comments MobileSheet */}
      <MobileSheet open={showCommentSheet} onClose={() => setShowCommentSheet(false)} title="评论">
        <ContentComments
          contentType="note"
          contentId={note.id}
          spaceCode={spaceCode}
          identity={identity}
          appSide={side}
          comments={comments}
          loading={commentsLoading}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          placeholder={commentPlaceholder}
          maxLength={500}
        />
      </MobileSheet>
    </>
  );
}

export default NoteCard;
