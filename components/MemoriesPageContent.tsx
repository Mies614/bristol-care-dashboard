"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { NoteCard } from "@/components/NoteCard";
import { SharedAccessGate } from "@/components/SharedAccessGate";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import { pickFeaturedLoveNote } from "@/lib/loveNotes";
import { buildRandomMemoryItems, pickRandomMemory, type RandomMemoryItem } from "@/lib/randomMemory";
import { buildMemoryTimelineItems, groupTimelineByMonth } from "@/lib/memoryTimeline";
import { loadAppData } from "@/lib/storage";
import type { AlbumItem, LoveNote } from "@/lib/types";
import { useCloudReadStates } from "@/hooks/useCloudReadStates";

export type MemoriesPageContentProps = {
  identityId?: string;
  appSide?: "partner" | "owner";
};

export function MemoriesPageContent({ identityId: propIdentityId, appSide = "partner" }: MemoriesPageContentProps = {}) {
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [randomMemory, setRandomMemory] = useState<RandomMemoryItem | null>(null);
  const [randomBusy, setRandomBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [nextMeetingDate, setNextMeetingDate] = useState("");
  const code = getDefaultSpaceCode();
  const identityId = propIdentityId || DEFAULT_NORMAL_IDENTITY_ID;
  const isOwner = appSide === "owner";

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

  // Cloud-synced read states for notes in memories
  const noteIds = useMemo(
    () => noteSummary.filter((n) => !n.deletedAt && n.author !== identityId).map((n) => n.id),
    [noteSummary, identityId]
  );

  const { readKeySet: noteReadKeySet, markAsRead: markNoteRead } = useCloudReadStates({
    spaceCode: code,
    identity: identityId,
    contentType: "note",
    contentIds: noteIds,
  });

  // Cloud-synced read states for albums in memories
  const albumIds = useMemo(
    () => albumSummary.filter((a) => !a.deletedAt).map((a) => a.id),
    [albumSummary]
  );

  const { readKeySet: albumReadKeySet } = useCloudReadStates({
    spaceCode: code,
    identity: identityId,
    contentType: "album",
    contentIds: albumIds,
  });

  // Link prefix based on side
  const notesHref = isOwner ? "/me/notes" : "/notes";
  const albumsHref = isOwner ? "/me/albums" : "/albums";

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
        <header className="mb-4 overflow-hidden rounded-[2rem] border border-white/75 bg-gradient-to-br from-white/88 via-blush/55 to-skySoft/60 p-5 shadow-float backdrop-blur-xl">
          <p className="section-kicker mb-1">回忆</p>
          <h1 className="text-2xl font-semibold text-cocoa">回忆中心</h1>
          <p className="mt-2 text-sm leading-6 text-cocoa/65">翻一翻以前说过的话、放进去的照片，就知道我们已经走了多远。</p>
        </header>

        <div className="space-y-4">
          {message ? <p className="notice">{message}</p> : null}

          {/* 1. 随机回忆 */}
          <section className="soft-card bg-gradient-to-br from-white/88 via-blush/38 to-lilac/45">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker mb-1">✨ 翻一张回忆</p>
                <h2 className="font-semibold text-cocoa">随机看一张</h2>
              </div>
              <button
                className={`btn-secondary btn-small transition ${randomBusy ? "opacity-60" : ""}`}
                disabled={!randomItems.length || randomBusy}
                onClick={refreshRandomMemory}
                type="button"
              >
                {randomBusy ? "正在换…" : "↻ 再翻一张"}
              </button>
            </div>
            {randomMemory ? (
              <Link
                className="block overflow-hidden rounded-[1.5rem] bg-white/65 shadow-sm transition active:scale-[0.99] animate-[fadeIn_0.3s_ease-out]"
                key={randomMemory.id}
                href={randomMemory.href}
              >
                {randomMemory.imageUrl ? (
                  <img className="max-h-72 w-full object-cover" src={randomMemory.imageUrl} alt={randomMemory.title || "随机回忆"} />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-gradient-to-br from-cocoa/75 to-lilac/70 text-white">
                    {randomMemory.type === "audio" ? "🎤 语音纸条" : randomMemory.type === "video" || randomMemory.type === "live_photo" ? "▶ 视频回忆" : "💌 小纸条"}
                  </div>
                )}
                <div className="p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-cocoa/55">
                    <span className="rounded-full bg-white/70 px-2 py-1">
                      {randomMemory.source === "note" ? "小纸条" : randomMemory.type === "live_photo" ? "实况" : randomMemory.type === "video" ? "视频" : "照片"}
                    </span>
                    {randomMemory.createdAt ? <span>{new Date(randomMemory.createdAt).toLocaleDateString("zh-CN")}</span> : null}
                  </div>
                  <p className="font-medium text-cocoa">{randomMemory.title || (randomMemory.source === "note" ? "一张小纸条" : "未命名回忆")}</p>
                  {randomMemory.content ? <p className="mt-1 line-clamp-3 text-sm leading-6 text-cocoa/65">{randomMemory.content}</p> : null}
                  <span className="mt-3 inline-flex rounded-full bg-cocoa/85 px-3 py-1.5 text-xs text-white">查看详情</span>
                </div>
              </Link>
            ) : (
              <p className="py-6 text-center text-sm text-cocoa/45">等这里攒了一些回忆之后，就可以随手翻一张看了。</p>
            )}
          </section>

          {/* 2. 最近小纸条 */}
          <section className="soft-card">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="section-kicker mb-1">💌 最近纸条</p>
                <h2 className="font-semibold text-cocoa">小纸条</h2>
              </div>
              <Link className="btn-secondary btn-small rounded-full px-3 py-1 text-xs" href={notesHref}>
                全部
              </Link>
            </div>
            {noteSummary.length ? (
              <div className="space-y-2">
                {noteSummary.map((note) => (
                  <NoteCard featured key={note.id} note={note} identityId={identityId} readKeySet={noteReadKeySet} onNoteRead={(id) => markNoteRead(id)} />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-cocoa/45">还没有小纸条，从这里开始写下第一张吧。</p>
            )}
          </section>

          {/* 3. 最近相册 */}
          <section className="soft-card">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="section-kicker mb-1">📷 最近照片</p>
                <h2 className="font-semibold text-cocoa">相册</h2>
              </div>
              <Link className="btn-secondary btn-small rounded-full px-3 py-1 text-xs" href={albumsHref}>
                全部
              </Link>
            </div>
            {albumSummary.length ? (
              <div className="grid grid-cols-2 gap-2">
                {albumSummary.map((item) => (
                  <Link className="relative overflow-hidden rounded-2xl bg-white/60 shadow-sm" href={albumsHref} key={item.id}>
                    {item.imageUrl ? (
                      <img className="aspect-square w-full object-cover" src={item.imageUrl} alt={item.title || "相册照片"} loading="lazy" />
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-cocoa/75 text-white">▶</div>
                    )}
                    {item.type === "video" ? (
                      <span className="absolute right-1 top-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white">VIDEO</span>
                    ) : null}
                    {!item.deletedAt && !albumReadKeySet.has(`album:${item.id}`) ? (
                      <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-400 ring-2 ring-white" />
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-cocoa/45">照片会慢慢变多，到时候想翻就能翻到。</p>
            )}
          </section>

          {/* 4. 时间线 */}
          <section className="soft-card">
            <div className="mb-3">
              <p className="section-kicker mb-1">时间线</p>
              <h2 className="font-semibold text-cocoa">关系时间线</h2>
            </div>
            {timelineGroups.length ? (
              <div className="space-y-4">
                {timelineGroups.map((group) => (
                  <div key={group.month}>
                    <p className="mb-2 text-sm font-semibold text-cocoa/70">{group.month}</p>
                <div className="space-y-2 border-l-2 border-roseSoft/35 pl-3 sm:pl-4">
                  {group.items.slice(0, 5).map((item) => (
                    <Link className="block rounded-[1.2rem] border border-white/70 bg-white/58 p-2.5 sm:p-3 shadow-sm" href={item.href} key={item.id}>
                      <div className="flex gap-2 sm:gap-3">
                        {item.imageUrl ? <img className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-2xl object-cover" src={item.imageUrl} alt={item.title} /> : <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-blush/65 text-xs text-cocoa/65">{item.type}</div>}
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-medium text-cocoa">{item.title}</p>
                          <p className="mt-0.5 text-xs text-cocoa/50">{new Date(item.date).toLocaleDateString("zh-CN")}</p>
                          {item.content ? <p className="mt-1 line-clamp-2 text-xs sm:text-sm leading-5 text-cocoa/65">{item.content}</p> : null}
                        </div>
                      </div>
                    </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="py-6 text-center text-sm text-cocoa/45">等第一条回忆进来，时间线就会自己长出来。</p>}
          </section>
        </div>
      </AppShell>
    </SharedAccessGate>
  );
}