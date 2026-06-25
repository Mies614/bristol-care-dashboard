/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import type { LoveNote } from "@/lib/types";
import { isRead, markAsRead } from "@/lib/readState";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import { ApiClientError } from "@/lib/apiError";
import ContentComments from "./ContentComments";
import ContentInteractionBar from "./ContentInteractionBar";
import type { CommentEntry as CommentEntryType } from "@/lib/contentInteractions";
import { NoteMediaDownload } from "./NoteMediaDownload";

interface LoveNoteCardProps {
  note?: LoveNote;
  fallback: string;
  onRefresh?: () => void;
  identityId?: string;
  appSide?: "partner" | "owner";
  /** When true, hide comments and interaction bar for homepage preview */
  compact?: boolean;
}

export function LoveNoteCard({ note, fallback, onRefresh, identityId: propIdentityId, appSide, compact }: LoveNoteCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [unread, setUnread] = useState(false);
  const [comments, setComments] = useState<CommentEntryType[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const spaceCode = useMemo(() => getDefaultSpaceCode(), []);
  const identity = propIdentityId || DEFAULT_NORMAL_IDENTITY_ID;
  const isOwner = appSide === "owner";
  const notesHref = isOwner ? "/me/notes" : "/notes";

  const content = note?.content || fallback;

  const loadComments = useCallback(async () => {
    if (!note) return;
    setCommentsLoading(true);
    try {
      const code = spaceCode || getDefaultSpaceCode();
      const res = await fetch(
        `/api/comments?spaceCode=${encodeURIComponent(code)}&contentType=note&contentId=${encodeURIComponent(note.id)}&identity=${encodeURIComponent(identity)}`
      );
      const payload = await res.json();
      if (payload.ok && Array.isArray(payload.comments)) {
        const entries: CommentEntryType[] = payload.comments.map((c: Record<string, unknown>) => ({
          id: c.id as string,
          identity: c.identity as string,
          body: c.body as string,
          createdAt: c.createdAt as string,
          deletedAt: c.deletedAt as string | undefined,
          updatedAt: c.updatedAt as string | undefined,
          isDeleted: Boolean(c.deletedAt),
          isMine: (c.identity as string) === identity,
        } satisfies CommentEntryType));
        setComments(entries);
      }
    } catch {
      // Non-critical — fallback to local comments
    } finally {
      setCommentsLoading(false);
    }
  }, [note, identity, spaceCode]);

  useEffect(() => {
    if (note) {
      setUnread(!isRead(note.id, spaceCode, identity) && note.author !== identity);
    }
  }, [note, identity, spaceCode]);

  useEffect(() => {
    if (showComments && note && !compact) {
      loadComments();
    }
  }, [showComments, note, loadComments, compact]);

  const handleMarkRead = useCallback(() => {
    if (note && unread) {
      markAsRead(note.id, spaceCode, identity);
      setUnread(false);
    }
  }, [note, unread, spaceCode, identity]);

  async function handleAddComment(body: string, _identity: string) {
    if (!note) throw new Error("No note");
    const code = spaceCode || getDefaultSpaceCode();
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spaceCode: code,
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
    if (!note) throw new Error("No note");
    const code = spaceCode || getDefaultSpaceCode();
    const res = await fetch("/api/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaceCode: code, commentId, identity }),
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

  const title = isOwner ? "小乖最近的小纸条" : "最近的小纸条";

  return (
    <section className="soft-card relative overflow-hidden bg-white/55" onClick={compact ? undefined : handleMarkRead}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {unread && !compact ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose/15 px-2 py-0.5 text-[10px] font-medium text-rose">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose" />
              未读
            </span>
          ) : null}
          <h2 className="text-sm font-semibold text-cocoa/60">{title}</h2>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Link className="btn-secondary btn-small" href={notesHref}>全部</Link>
          {!compact && onRefresh ? (
            <button className="btn-secondary btn-small" onClick={onRefresh} aria-label="换一张小纸条">刷新</button>
          ) : null}
        </div>
      </div>

      {compact ? (
        <Link href={notesHref} className="mt-3 block">
          <p className="whitespace-pre-wrap text-[0.95rem] leading-7 text-cocoa/78 line-clamp-3">
            {content}
          </p>
        </Link>
      ) : (
        <p className="mt-4 whitespace-pre-wrap text-[0.95rem] leading-8 text-cocoa/78">{content}</p>
      )}

      {!compact && note?.imageUrl && !imageFailed ? (
        <div className="mt-4 space-y-2">
          <img
            alt={note.imageAlt || "小纸条图片"}
            className="max-h-[280px] w-full rounded-[1.5rem] border border-white/80 bg-white/60 object-cover shadow-sm"
            src={note.imageUrl}
            onError={() => setImageFailed(true)}
          />
          <NoteMediaDownload note={note} />
        </div>
      ) : null}
      {!compact && note?.audioUrl ? (
        <div className="mt-4 space-y-2">
          <audio className="w-full" src={note.audioUrl} controls />
          <NoteMediaDownload note={note} />
        </div>
      ) : null}
      {!compact && note?.videoUrl ? (
        <div className="mt-4 space-y-2">
          <video className="max-h-[280px] w-full rounded-[1.5rem] bg-black shadow-sm" src={note.videoUrl} controls preload="none" />
          <NoteMediaDownload note={note} />
        </div>
      ) : null}

      {/* Interaction bar — hidden in compact mode */}
      {note && !compact && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/70 pt-3" onClick={(e) => e.stopPropagation()}>
          <ContentInteractionBar
            spaceCode={spaceCode}
            contentType="note"
            contentId={note.id}
            identityId={identity}
            compact
            showComments
            onOpenComments={() => setShowComments(!showComments)}
            onInteract={handleMarkRead}
          />
        </div>
      )}

      {/* Comments — hidden in compact mode */}
      {note && showComments && !compact ? (
        <div className="mt-3 border-t border-white/70 pt-3" onClick={(e) => e.stopPropagation()}>
          <ContentComments
            contentType="note"
            contentId={note.id}
            spaceCode={spaceCode}
            identity={identity}
            appSide={appSide}
            comments={comments}
            loading={commentsLoading}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
            placeholder="想说点什么..."
            maxLength={200}
          />
        </div>
      ) : null}

      {!compact && imageFailed ? <p className="mt-3 rounded-2xl bg-white/60 px-3 py-2 text-sm text-cocoa/65">图片暂时加载失败。</p> : null}
    </section>
  );
}
