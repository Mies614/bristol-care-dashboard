"use client";

import { useState } from "react";
import type { LoveNote } from "@/lib/types";

export function LoveNoteCard({ note, fallback, onRefresh }: { note?: LoveNote; fallback: string; onRefresh?: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const content = note?.content || fallback;

  return (
    <section className="soft-card relative overflow-hidden bg-gradient-to-br from-butter/80 via-white/85 to-lilac/55">
      <div className="absolute left-1/2 top-0 h-7 w-24 -translate-x-1/2 -translate-y-3 rounded-full bg-roseSoft/35 blur-[1px]" aria-hidden="true" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-kicker mb-1">Love Note</p>
          <h2 className="font-semibold text-cocoa">小纸条</h2>
        </div>
        {onRefresh ? (
          <button className="btn-secondary btn-small" onClick={onRefresh}>
            刷新小纸条
          </button>
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
      {imageFailed ? <p className="mt-3 rounded-2xl bg-white/60 px-3 py-2 text-sm text-cocoa/65">图片暂时加载失败。</p> : null}
    </section>
  );
}
