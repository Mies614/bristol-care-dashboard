"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { NoteCard } from "@/components/NoteCard";
import { SharedAccessGate } from "@/components/SharedAccessGate";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { pickFeaturedLoveNote } from "@/lib/loveNotes";
import { buildRandomMemoryItems, pickRandomMemory, type RandomMemoryItem } from "@/lib/randomMemory";
import { buildMemoryTimelineItems, groupTimelineByMonth } from "@/lib/memoryTimeline";
import { loadAppData } from "@/lib/storage";
import type { AlbumItem, LoveNote } from "@/lib/types";

export default function MemoriesPage() {
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [randomMemory, setRandomMemory] = useState<RandomMemoryItem | null>(null);
  const [randomBusy, setRandomBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [nextMeetingDate, setNextMeetingDate] = useState("");
  const code = getDefaultSpaceCode();

  useEffect(() => {
    try {
      setNextMeetingDate(loadAppData().nextMeetDate || "");
    } catch {
      setNextMeetingDate("");
    }
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
  const randomItems = useMemo(() => buildRandomMemoryItems(notes, albums), [notes, albums]);
  const timelineGroups = useMemo(
    () => groupTimelineByMonth(buildMemoryTimelineItems({ notes, albums, nextMeetingDate })).slice(0, 4),
    [notes, albums, nextMeetingDate]
  );

  useEffect(() => {
    setRandomMemory((current) => {
      if (current && randomItems.some((item) => item.id === current.id)) return current;
      return pickRandomMemory(randomItems);
    });
  }, [randomItems]);

  function refreshRandomMemory() {
    setRandomBusy(true);
    setRandomMemory((current) => pickRandomMemory(randomItems, current?.id));
    window.setTimeout(() => setRandomBusy(false), 180);
  }

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

          <section className="soft-card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker mb-1">Random</p>
                <h2 className="font-semibold text-cocoa">随机看一张回忆</h2>
              </div>
              <button className="btn-secondary btn-small" disabled={!randomItems.length || randomBusy} onClick={refreshRandomMemory} type="button">
                {randomBusy ? "换一张..." : "↻ 换一张"}
              </button>
            </div>
            {randomMemory ? (
              <Link className="block overflow-hidden rounded-[1.5rem] bg-white/65 shadow-sm transition active:scale-[0.99] animate-[fadeIn_0.3s_ease-out]" key={randomMemory.id} href={randomMemory.href}>
                {randomMemory.imageUrl ? <img className="max-h-72 w-full object-cover" src={randomMemory.imageUrl} alt={randomMemory.title || "随机回忆"} /> : (
                  <div className="flex h-44 items-center justify-center bg-gradient-to-br from-cocoa/75 to-lilac/70 text-white">
                    {randomMemory.type === "audio" ? "AUDIO" : randomMemory.type === "video" || randomMemory.type === "live_photo" ? "▶" : "💌"}
                  </div>
                )}
                <div className="p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-cocoa/55">
                    <span className="rounded-full bg-white/70 px-2 py-1">{randomMemory.source === "note" ? "小纸条" : randomMemory.type === "live_photo" ? "实况" : randomMemory.type === "video" ? "视频" : "照片"}</span>
                    {randomMemory.createdAt ? <span>{new Date(randomMemory.createdAt).toLocaleDateString("zh-CN")}</span> : null}
                  </div>
                  <p className="font-medium text-cocoa">{randomMemory.title || (randomMemory.source === "note" ? "一张小纸条" : "未命名回忆")}</p>
                  {randomMemory.content ? <p className="mt-1 line-clamp-3 text-sm leading-6 text-cocoa/65">{randomMemory.content}</p> : null}
                  <span className="mt-3 inline-flex rounded-full bg-cocoa/85 px-3 py-1.5 text-xs text-white">查看详情</span>
                </div>
              </Link>
            ) : <p className="empty-state text-left">还没有可以随机看的回忆。</p>}
          </section>

          <section className="soft-card">
            <div className="mb-3">
              <p className="section-kicker mb-1">Timeline</p>
              <h2 className="font-semibold text-cocoa">关系时间线</h2>
            </div>
            {timelineGroups.length ? (
              <div className="space-y-4">
                {timelineGroups.map((group) => (
                  <div key={group.month}>
                    <p className="mb-2 text-sm font-semibold text-cocoa/70">{group.month}</p>
                    <div className="space-y-2 border-l border-roseSoft/45 pl-3">
                      {group.items.slice(0, 5).map((item) => (
                        <Link className="block rounded-[1.2rem] border border-white/70 bg-white/58 p-3 shadow-sm" href={item.href} key={item.id}>
                          <div className="flex gap-3">
                            {item.imageUrl ? <img className="h-14 w-14 shrink-0 rounded-2xl object-cover" src={item.imageUrl} alt={item.title} /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blush/65 text-xs text-cocoa/65">{item.type}</div>}
                            <div className="min-w-0">
                              <p className="font-medium text-cocoa">{item.title}</p>
                              <p className="mt-1 text-xs text-cocoa/50">{new Date(item.date).toLocaleDateString("zh-CN")}</p>
                              {item.content ? <p className="mt-1 line-clamp-2 text-sm leading-5 text-cocoa/65">{item.content}</p> : null}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="empty-state text-left">时间线还在等第一条回忆。</p>}
          </section>
        </div>
      </AppShell>
    </SharedAccessGate>
  );
}