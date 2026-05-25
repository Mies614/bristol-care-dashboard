"use client";

/* eslint-disable @next/next/no-img-element */

import type { LoveNote } from "@/lib/types";

const authorLabel: Record<string, string> = {
  admin: "我",
  me: "我",
  user: "我",
  xiaoguai: "小乖"
};

export function NoteCard({ note, onClick, featured = false }: { note: LoveNote; onClick?: () => void; featured?: boolean }) {
  const style = note.displayStyle || "sticky";
  const base = "overflow-hidden border shadow-soft backdrop-blur-xl text-left transition hover:-translate-y-0.5";
  const styleClass = {
    sticky: "rounded-[1.5rem] border-butter/70 bg-butter/75 p-4 rotate-[-0.4deg]",
    postcard: "rounded-[1.7rem] border-white/80 bg-white/75 p-3",
    bubble: `rounded-[1.7rem] border-white/75 p-4 ${note.author === "xiaoguai" ? "bg-blush/70" : "bg-skySoft/70"}`,
    photo_card: "rounded-[1.7rem] border-white/80 bg-white/72 p-2",
    timeline: "rounded-[1.4rem] border-lilac/70 bg-white/65 p-4"
  }[style];
  const type = note.noteType || (note.videoUrl ? "video" : note.audioUrl ? "audio" : note.imageUrl ? "image" : "text");

  return (
    <article className={`${base} ${styleClass} ${onClick ? "cursor-pointer" : ""} ${featured ? "w-full" : ""}`} onClick={onClick}>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-cocoa/55">
        <span className="rounded-full bg-white/60 px-2.5 py-1">{authorLabel[note.author || "admin"] || "小纸条"}</span>
        <span>{note.createdAt ? new Date(note.createdAt).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "刚刚"}</span>
      </div>
      {note.imageUrl ? <img className="mb-3 max-h-64 w-full rounded-[1.25rem] object-cover" src={note.imageUrl} alt={note.imageAlt || "小纸条图片"} /> : null}
      {note.videoUrl ? <video className="mb-3 max-h-64 w-full rounded-[1.25rem] bg-black" src={note.videoUrl} controls onClick={(event) => event.stopPropagation()} /> : null}
      {note.audioUrl ? <audio className="mb-3 w-full" src={note.audioUrl} controls onClick={(event) => event.stopPropagation()} /> : null}
      {note.content ? <p className="whitespace-pre-wrap text-sm leading-7 text-cocoa/78">{note.content}</p> : null}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {note.mood ? <span className="rounded-full bg-white/60 px-2.5 py-1 text-[11px] text-cocoa/62">{note.mood}</span> : null}
        <span className="rounded-full bg-cocoa/8 px-2.5 py-1 text-[11px] uppercase text-cocoa/55">{type}</span>
        {note.pinned ? <span className="rounded-full bg-blush/70 px-2.5 py-1 text-[11px] text-cocoa/65">置顶</span> : null}
      </div>
    </article>
  );
}
