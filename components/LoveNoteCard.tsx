"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { LoveNote } from "@/lib/types";
import { isRead, markAsRead } from "@/lib/readState";
import { addReaction, removeReaction, getReactionsForNote, hasReaction, type ReactionId } from "@/lib/reactions";

export function LoveNoteCard({ note, fallback, onRefresh }: { note?: LoveNote; fallback: string; onRefresh?: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [unread, setUnread] = useState(false);
  const [reactions, setReactions] = useState<ReturnType<typeof getReactionsForNote>>([]);

  const content = note?.content || fallback;

  useEffect(() => {
    if (note) {
      setUnread(!isRead(note.id) && note.author !== "xiaoguai");
      setReactions(getReactionsForNote(note.id));
    }
  }, [note]);

  function handleReaction(noteId: string, reactionId: ReactionId) {
    if (hasReaction(noteId, reactionId)) {
      removeReaction(noteId, reactionId);
    } else {
      addReaction(noteId, reactionId);
    }
    setReactions(getReactionsForNote(noteId));
  }

  function handleRead() {
    if (note && unread) {
      markAsRead(note.id);
      setUnread(false);
    }
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
      {note?.videoUrl ? <video className="mt-4 max-h-[280px] w-full rounded-[1.5rem] bg-black shadow-sm" src={note.videoUrl} controls /> : null}

      {/* Light reactions bar */}
      {note && (
        <div className="mt-3 flex items-center gap-1 border-t border-white/70 pt-3" onClick={(e) => e.stopPropagation()}>
          {reactions.map((r) => (
            <button aria-label={`${r.id}（${r.active ? "已点击" : "点击"}）`}
              key={r.id}
              className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-xs transition ${
                r.active
                  ? "bg-roseSoft/70 text-cocoa/80 shadow-sm"
                  : "bg-white/60 text-cocoa/50 hover:bg-white/85"
              }`}
              onClick={() => handleReaction(note.id, r.id)}
            >
              <span>{r.emoji}</span>
              {r.count > 0 ? <span className="tabular-nums text-[10px]">{r.count}</span> : null}
            </button>
          ))}
        </div>
      )}

      {imageFailed ? <p className="mt-3 rounded-2xl bg-white/60 px-3 py-2 text-sm text-cocoa/65">图片暂时加载失败。</p> : null}
    </section>
  );
}
