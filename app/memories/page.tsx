"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { NoteCard } from "@/components/NoteCard";
import { SharedAccessGate } from "@/components/SharedAccessGate";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { pickFeaturedLoveNote } from "@/lib/loveNotes";
import type { AlbumItem, LoveNote } from "@/lib/types";

export default function MemoriesPage() {
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [message, setMessage] = useState("");
  const code = getDefaultSpaceCode();

  useEffect(() => {
    Promise.all([
      fetch(`/api/notes?code=${encodeURIComponent(code)}&sort=pinned`).then((response) => response.json()).catch(() => ({})),
      fetch(`/api/albums?code=${encodeURIComponent(code)}&filter=all`).then((response) => response.json()).catch(() => ({}))
    ]).then(([notePayload, albumPayload]) => {
      if (Array.isArray(notePayload.notes)) setNotes(notePayload.notes);
      if (Array.isArray(albumPayload.items)) setAlbums(albumPayload.items);
      if (!Array.isArray(notePayload.notes) && !Array.isArray(albumPayload.items)) setMessage("回忆内容暂时加载失败。");
    });
  }, [code]);

  const noteSummary = useMemo(() => {
    const featured = pickFeaturedLoveNote(notes);
    const rest = notes.filter((note) => note.id !== featured?.id);
    return [featured, ...rest].filter(Boolean).slice(0, 3) as LoveNote[];
  }, [notes]);
  const albumSummary = useMemo(() => {
    const favorites = albums.filter((item) => item.isFavorite);
    return (favorites.length ? favorites : albums).slice(0, 6);
  }, [albums]);

  return (
    <SharedAccessGate>
      <AppShell>
        <section className="mb-4 rounded-[2rem] border border-white/75 bg-gradient-to-br from-white/88 via-blush/55 to-skySoft/60 p-5 shadow-float backdrop-blur-xl">
          <p className="section-kicker mb-1">Memories</p>
          <h1 className="text-2xl font-semibold text-cocoa">回忆中心</h1>
          <p className="mt-2 text-sm leading-6 text-cocoa/65">把喜欢的瞬间和想说的话慢慢收起来。</p>
        </section>

        <div className="space-y-4">
          {message ? <p className="notice">{message}</p> : null}

          <section className="soft-card">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="section-kicker mb-1">Notes</p>
                <h2 className="font-semibold text-cocoa">小纸条墙</h2>
              </div>
              <Link className="btn-secondary btn-small" href="/notes">进入</Link>
            </div>
            {noteSummary.length ? (
              <div className="space-y-2">
                {noteSummary.map((note) => <NoteCard featured key={note.id} note={note} />)}
              </div>
            ) : <p className="empty-state text-left">还没有小纸条，之后慢慢贴上来。</p>}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link className="btn-primary text-center" href="/notes">去小纸条墙</Link>
              <Link className="btn-secondary text-center" href="/notes?compose=1">写一张小纸条</Link>
            </div>
          </section>

          <section className="soft-card">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="section-kicker mb-1">Albums</p>
                <h2 className="font-semibold text-cocoa">相册</h2>
              </div>
              <Link className="btn-secondary btn-small" href="/albums">进入</Link>
            </div>
            {albumSummary.length ? (
              <div className="grid grid-cols-3 gap-2">
                {albumSummary.map((item) => (
                  <Link className="relative overflow-hidden rounded-2xl bg-white/60 shadow-sm" href="/albums" key={item.id}>
                    {item.imageUrl ? (
                      <img className="aspect-square w-full object-cover" src={item.imageUrl} alt={item.title || "相册照片"} />
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-cocoa/75 text-white">▶</div>
                    )}
                    {item.type === "video" ? <span className="absolute right-1 top-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white">VIDEO</span> : null}
                  </Link>
                ))}
              </div>
            ) : <p className="empty-state text-left">还没有放进相册的照片，之后慢慢补上。</p>}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link className="btn-primary text-center" href="/albums">去相册</Link>
              <Link className="btn-secondary text-center" href="/albums?upload=1">上传回忆</Link>
            </div>
          </section>
        </div>
      </AppShell>
    </SharedAccessGate>
  );
}
