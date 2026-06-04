"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import type { LoveNote } from "@/lib/types";
import { isRead, markAsRead } from "@/lib/readState";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { useCurrentIdentity } from "@/hooks/useCurrentIdentity";
import { ApiClientError } from "@/lib/apiError";
import ContentComments from "./ContentComments";
import ContentInteractionBar from "./ContentInteractionBar";
import type { CommentEntry as CommentEntryType } from "@/lib/contentInteractions";
import { getNoteMediaDownloadUrl, getNoteMediaDownloadLabel } from "@/lib/notesMedia";

export function LoveNoteCard({ note, fallback, onRefresh }: { note?: LoveNote; fallback: string; onRefresh?: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [unread, setUnread] = useState(false);
  const [comments, setComments] = useState<CommentEntryType[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const spaceCode = useMemo(() => getDefaultSpaceCode(), []);
  const { identityId: identity } = useCurrentIdentity(spaceCode);

  const content = note?.content || fallback;

  const loadComments = useCallback(async () => {
    if (!note) return;
    setCommentsLoading(true);
    try {
      const code = spaceCode || getDefaultSpaceCode();
      const res = await fetch(
        `/api/comments?code=${encodeURIComponent(code)}&contentType=note&contentId=${encodeURIComponent(note.id)}&identity=${encodeURIComponent(identity)}`
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
      setUnread(!isRead(note.id) && note.author !== identity);
    }
  }, [note, identity]);

  useEffect(() => {
    if (showComments && note) {
      loadComments();
    }
  }, [showComments, note, loadComments]);

  function handleRead() {
    if (note && unread) {
      markAsRead(note.id);
      setUnread(false);
    }
  }

  async function handleAddComment(body: string, _identity: string) {
    if (!note) throw new Error("No note");
    const code = spaceCode || getDefaultSpaceCode();
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
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
      body: JSON.stringify({ code, commentId, identity }),
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

  return (
    <section className="soft-card relative overflow-hidden bg-white/55" onClick={handleRead}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {unread ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose/15 px-2 py-0.5 text-[10px] font-medium text-rose">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose" />
              未读
            </span>
          ) : null}
          <h2 className="text-sm font-semibold text-cocoa/60">✉ 今天的小纸条</h2>
        </div>
        {onRefresh ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Link className="btn-secondary btn-small" href="/notes">小纸条墙</Link>
            <button className="btn-secondary btn-small" onClick={onRefresh}>刷新</button>
          </div>
        ) : null}
      </div>
      <p className="mt-4 whitespace-pre-wrap text-[0.95rem] leading-8 text-cocoa/78">{content}</p>
      {note?.imageUrl && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={note.imageAlt || "小纸条图片"}
          className="mt-4 max-h-[280px] w-full rounded-[1.5rem] border border-white/80 bg-white/60 object-cover shadow-sm"
          src={note.imageUrl}
          onError={() => setImageFailed(true)}
        />
      ) : null}
      {note?.audioUrl ? <audio className="mt-4 w-full" src={note.audioUrl} controls /> : null}
      {note?.videoUrl ? (
        <div className="mt-4 space-y-2">
          <video className="max-h-[280px] w-full rounded-[1.5rem] bg-black shadow-sm" src={note.videoUrl} controls />
          {note ? (
            <a
              href={getNoteMediaDownloadUrl(note) ?? undefined}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1.5 text-xs font-medium text-cocoa/65 hover:bg-white/80 transition-colors"
            >
              {getNoteMediaDownloadLabel(note)}
            </a>
          ) : null}
        </div>
      ) : null}

      {/* Interaction bar: likes + reactions + comment toggle */}
      {note && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/70 pt-3" onClick={(e) => e.stopPropagation()}>
          {/* Unified interaction bar: likes + reactions + comment toggle */}
          <ContentInteractionBar
            spaceCode={spaceCode}
            contentType="note"
            contentId={note.id}
            identityId={identity}
            compact
            showComments
            onOpenComments={() => setShowComments(!showComments)}
          />
        </div>
      )}

      {/* Comments section */}
      {note && showComments ? (
        <div className="mt-3 border-t border-white/70 pt-3" onClick={(e) => e.stopPropagation()}>
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
            maxLength={200}
          />
        </div>
      ) : null}

      {imageFailed ? <p className="mt-3 rounded-2xl bg-white/60 px-3 py-2 text-sm text-cocoa/65">图片暂时加载失败。</p> : null}
    </section>
  );
}