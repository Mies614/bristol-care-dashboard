"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useCallback } from "react";
import type { LoveNote } from "@/lib/types";
import { getUserFacingAuthorLabel, DEFAULT_NORMAL_IDENTITY_ID, isSameIdentity } from "@/lib/identity";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { ApiClientError } from "@/lib/apiError";
import ContentComments from "./ContentComments";
import ContentInteractionBar from "./ContentInteractionBar";
import type { CommentEntry } from "@/lib/contentInteractions";
import { getNoteMediaDownloadUrl, getNoteMediaDownloadLabel } from "@/lib/notesMedia";

export interface NoteCardProps {
  note: LoveNote;
  onClick?: () => void;
  featured?: boolean;
  onEdit?: () => void;
  onPatch?: (body: Record<string, unknown>) => void;
  busy?: boolean;
  /** Current active identity id for interactions */
  identityId?: string;
  /** Cloud-synced read state key set (from useCloudReadStates) */
  readKeySet?: Set<string>;
  /** Called when the note should be marked as read */
  onNoteRead?: (noteId: string) => void;
}

export function NoteCard({
  note,
  onClick,
  featured = false,
  onEdit,
  onPatch,
  busy,
  identityId,
  readKeySet,
  onNoteRead,
}: NoteCardProps) {
  const spaceCode = getDefaultSpaceCode();
  const identity = identityId || DEFAULT_NORMAL_IDENTITY_ID;

  const style = note.displayStyle || "sticky";
  const base = "overflow-hidden border shadow-soft backdrop-blur-xl text-left transition hover:-translate-y-0.5";
  const styleClass = {
    sticky: "rounded-[1.5rem] border-butter/70 bg-butter/75 p-4 rotate-[-0.4deg]",
    postcard: "rounded-[1.7rem] border-white/80 bg-white/75 p-5",
    bubble: `rounded-[1.7rem] border-white/75 p-4 ${note.author === "xiaoguai" ? "bg-blush/70" : "bg-skySoft/70"}`,
    photo_card: "rounded-[1.7rem] border-white/80 bg-white/72 p-3",
    timeline: "rounded-[1.4rem] border-lilac/70 bg-white/65 p-4",
    minimal: "rounded-[1.25rem] border-white/80 bg-white/78 p-4",
    romantic: "rounded-[1.8rem] border-blush/60 bg-gradient-to-br from-blush/75 via-white/75 to-lilac/65 p-4"
  }[style];
  const pinnedClass = note.pinned
    ? "ring-1 ring-[var(--app-accent)]/25 shadow-[0_0_10px_rgba(232,169,155,0.12)]"
    : "";
  const type = note.noteType || (note.videoUrl ? "video" : note.audioUrl ? "audio" : note.imageUrl ? "image" : "text");
  const bubbleAlign = style === "bubble" ? (note.author === "xiaoguai" || note.author === "user" ? "ml-auto" : "mr-auto") : "";

  const downloadUrl = getNoteMediaDownloadUrl(note);
  const downloadLabel = getNoteMediaDownloadLabel(note);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

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

  return (
    <article className={`${base} ${styleClass} ${pinnedClass} ${bubbleAlign} ${onClick ? "cursor-pointer" : ""} ${featured ? "w-full" : ""}`} onClick={handleCardClick}>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-cocoa/55">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/60 px-2.5 py-1">{getUserFacingAuthorLabel(note.author)}</span>
          {isUnread ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose/15 px-2 py-0.5 text-[10px] font-medium text-rose">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose" />
              未读
            </span>
          ) : null}
        </div>
        <span>{note.createdAt ? new Date(note.createdAt).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "刚刚"}</span>
      </div>
      {note.imageUrl ? (
        <div className="mb-3 space-y-2">
          <img className="max-h-56 w-full rounded-[1.25rem] object-cover animate-[fadeIn_0.3s_ease-out]" src={note.imageUrl} alt={note.imageAlt || "小纸条图片"} loading="lazy" />
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1.5 text-xs font-medium text-cocoa/65 hover:bg-white/80 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {downloadLabel}
            </a>
          ) : null}
        </div>
      ) : null}
      {note.videoUrl ? (
        <div className="mb-3 space-y-2">
          <video className="max-h-56 w-full rounded-[1.25rem] bg-black" src={note.videoUrl} controls onClick={(event) => event.stopPropagation()} preload="metadata" />
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1.5 text-xs font-medium text-cocoa/65 hover:bg-white/80 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {downloadLabel}
            </a>
          ) : null}
        </div>
      ) : null}
      {note.audioUrl ? (
        <div className="mb-3 space-y-2">
          <audio className="w-full" src={note.audioUrl} controls onClick={(event) => event.stopPropagation()} />
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1.5 text-xs font-medium text-cocoa/65 hover:bg-white/80 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {downloadLabel}
            </a>
          ) : null}
        </div>
      ) : null}
      {note.content ? <p className="whitespace-pre-wrap text-sm leading-7 text-cocoa/78">{note.content}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {note.mood ? <span className="rounded-full bg-white/60 px-2.5 py-1 text-xs text-cocoa/62">{note.mood}</span> : null}
        <span className="rounded-full bg-cocoa/8 px-2.5 py-1 text-xs uppercase text-cocoa/55">{type}</span>
        {note.pinned ? <span className="rounded-full bg-blush/70 px-2.5 py-1 text-xs text-cocoa/65">置顶</span> : null}
        {!isHidden ? (
          <ContentInteractionBar
            spaceCode={spaceCode}
            contentType="note"
            contentId={note.id}
            identityId={identity}
            compact
            onOpenComments={() => {
              if (!showComments) {
                loadComments();
              }
              setShowComments(!showComments);
            }}
          />
        ) : null}
      </div>

      {/* Comments section */}
      {showComments ? (
        <div className="mt-3 border-t border-white/60 pt-3" onClick={(e) => e.stopPropagation()}>
          <ContentComments
            contentType="note"
            contentId={note.id}
            spaceCode={spaceCode}
            identity={identity}
            comments={comments}
            loading={commentsLoading}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            placeholder="想说点什么..."
            maxLength={500}
          />
        </div>
      ) : null}

      {onPatch ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/60 pt-3" onClick={(event) => event.stopPropagation()}>
          <button className="btn-secondary btn-small text-xs" disabled={busy} onClick={onEdit} type="button">编辑</button>
          <button className="btn-secondary btn-small text-xs" disabled={busy} onClick={() => onPatch({ id: note.id, action: "toggle_pinned" })} type="button">{note.pinned ? "取消置顶" : "置顶"}</button>
          <button className="btn-secondary btn-small text-xs" disabled={busy} onClick={() => onPatch({ id: note.id, action: "set_active", active: !note.active })} type="button">{note.active ? "隐藏" : "恢复"}</button>
          <select className="field h-7 w-14 min-w-0 py-0 text-xs" disabled={busy} value={note.displayStyle || "sticky"} onChange={(event) => onPatch({ id: note.id, action: "change_style", display_style: event.target.value })}>
            <option value="sticky">便签</option>
            <option value="postcard">明信片</option>
            <option value="bubble">气泡</option>
            <option value="photo_card">照片卡</option>
            <option value="timeline">时间线</option>
            <option value="minimal">极简</option>
            <option value="romantic">浪漫</option>
          </select>
          <button className="btn-danger btn-small text-xs" disabled={busy} onClick={() => onPatch({ id: note.id, action: "delete" })} type="button">删除</button>
        </div>
      ) : null}
    </article>
  );
}

export default NoteCard;