"use client";

/* eslint-disable @next/next/no-img-element */

import type { LoveNote } from "@/lib/types";
import { getUserFacingAuthorLabel } from "@/lib/identity";

export function NoteCard({
  note,
  onClick,
  featured = false,
  onEdit,
  onPatch,
  busy
}: {
  note: LoveNote;
  onClick?: () => void;
  featured?: boolean;
  onEdit?: () => void;
  onPatch?: (body: Record<string, unknown>) => void;
  busy?: boolean;
}) {
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

  return (
    <article className={`${base} ${styleClass} ${pinnedClass} ${bubbleAlign} ${onClick ? "cursor-pointer" : ""} ${featured ? "w-full" : ""}`} onClick={onClick}>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-cocoa/55">
        <span className="rounded-full bg-white/60 px-2.5 py-1">{getUserFacingAuthorLabel(note.author)}</span>
        <span>{note.createdAt ? new Date(note.createdAt).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "刚刚"}</span>
      </div>
      {note.imageUrl ? <img className="mb-3 max-h-56 w-full rounded-[1.25rem] object-cover animate-[fadeIn_0.3s_ease-out]" src={note.imageUrl} alt={note.imageAlt || "小纸条图片"} loading="lazy" /> : null}
      {note.videoUrl ? <video className="mb-3 max-h-56 w-full rounded-[1.25rem] bg-black" src={note.videoUrl} controls onClick={(event) => event.stopPropagation()} preload="metadata" /> : null}
      {note.audioUrl ? <audio className="mb-3 w-full" src={note.audioUrl} controls onClick={(event) => event.stopPropagation()} /> : null}
      {note.content ? <p className="whitespace-pre-wrap text-sm leading-7 text-cocoa/78">{note.content}</p> : null}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {note.mood ? <span className="rounded-full bg-white/60 px-2.5 py-1 text-xs text-cocoa/62">{note.mood}</span> : null}
        <span className="rounded-full bg-cocoa/8 px-2.5 py-1 text-xs uppercase text-cocoa/55">{type}</span>
        {note.pinned ? <span className="rounded-full bg-blush/70 px-2.5 py-1 text-xs text-cocoa/65">置顶</span> : null}
      </div>
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