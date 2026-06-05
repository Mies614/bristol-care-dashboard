"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { NoteCard } from "@/components/NoteCard";
import { SharedAccessGate } from "@/components/SharedAccessGate";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import type { AlbumItem, LoveNote } from "@/lib/types";
import { useCloudReadStates } from "@/hooks/useCloudReadStates";

export type UnreadMemoriesPageContentProps = {
  identityId?: string;
  appSide?: "partner" | "owner";
};

export function UnreadMemoriesPageContent({ identityId: propIdentityId, appSide = "partner" }: UnreadMemoriesPageContentProps = {}) {
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [message, setMessage] = useState("");
  const code = getDefaultSpaceCode();
  const identityId = propIdentityId || DEFAULT_NORMAL_IDENTITY_ID;
  const isOwner = appSide === "owner";

  useEffect(() => {
    Promise.all([
      fetch(`/api/notes?code=${encodeURIComponent(code)}&sort=pinned`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/albums?code=${encodeURIComponent(code)}&filter=all`).then((r) => r.json()).catch(() => ({}))
    ]).then(([notePayload, albumPayload]) => {
      if (Array.isArray(notePayload.notes)) setNotes(notePayload.notes);
      if (Array.isArray(albumPayload.items)) setAlbums(albumPayload.items);
      if (!Array.isArray(notePayload.notes) && !Array.isArray(albumPayload.items)) setMessage("暂时加载失败。");
    });
  }, [code]);

  // Potentially unread note IDs (not authored by current identity)
  const candidateNoteIds = useMemo(
    () => notes.filter((n) => !n.deletedAt && n.author !== identityId).map((n) => n.id),
    [notes, identityId]
  );

  const { readKeySet: noteReadKeySet, markAsRead: markNoteRead } = useCloudReadStates({
    spaceCode: code,
    identity: identityId,
    contentType: "note",
    contentIds: candidateNoteIds,
  });

  // Potentially unread album IDs
  const candidateAlbumIds = useMemo(
    () => albums.filter((a) => !a.deletedAt && a.createdBy !== identityId).map((a) => a.id),
    [albums, identityId]
  );

  const { readKeySet: albumReadKeySet, markAsRead: markAlbumRead } = useCloudReadStates({
    spaceCode: code,
    identity: identityId,
    contentType: "album",
    contentIds: candidateAlbumIds,
  });

  // Filter to only unread items
  const unreadNotes = useMemo(
    () => notes.filter((n) => !n.deletedAt && n.author !== identityId && !noteReadKeySet.has(`note:${n.id}`)),
    [notes, identityId, noteReadKeySet]
  );

  const unreadAlbums = useMemo(
    () => albums.filter((a) => !a.deletedAt && a.createdBy !== identityId && !albumReadKeySet.has(`album:${a.id}`)),
    [albums, identityId, albumReadKeySet]
  );

  const totalUnread = unreadNotes.length + unreadAlbums.length;

  const notesHref = isOwner ? "/me/notes" : "/notes";
  const albumsHref = isOwner ? "/me/albums" : "/albums";
  const memoriesHref = isOwner ? "/me/memories" : "/memories";

  return (
    <SharedAccessGate>
      <AppShell>
        <header className="mb-4 overflow-hidden rounded-[2rem] border border-white/75 bg-gradient-to-br from-white/88 via-blush/35 to-roseSoft/30 p-5 shadow-float backdrop-blur-xl">
          <p className="section-kicker mb-1">Unread</p>
          <h1 className="text-2xl font-semibold text-cocoa">{isOwner ? "我的未读回忆" : "未读回忆"}</h1>
          <p className="mt-2 text-sm leading-6 text-cocoa/65">这些是还没看过的新照片、小纸条和回忆。</p>
          {totalUnread === 0 && (
            <p className="mt-2 text-sm leading-6 text-cocoa/50">都看过啦 · 新的回忆看完了，晚点再来看看。</p>
          )}
        </header>

        <div className="space-y-4">
          {message ? <p className="notice">{message}</p> : null}

          {/* Unread notes */}
          {unreadNotes.length > 0 && (
            <section className="soft-card">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="section-kicker mb-1">💌 未读小纸条</p>
                  <h2 className="font-semibold text-cocoa">{unreadNotes.length} 条还没看</h2>
                </div>
                <Link className="btn-secondary btn-small rounded-full px-3 py-1 text-xs" href={notesHref}>全部</Link>
              </div>
              <div className="space-y-2">
                {unreadNotes.map((note) => (
                  <NoteCard featured key={note.id} note={note} identityId={identityId} readKeySet={noteReadKeySet} onNoteRead={(id) => markNoteRead(id)} />
                ))}
              </div>
            </section>
          )}

          {/* Unread albums */}
          {unreadAlbums.length > 0 && (
            <section className="soft-card">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="section-kicker mb-1">📷 未读相册</p>
                  <h2 className="font-semibold text-cocoa">{unreadAlbums.length} 张还没看</h2>
                </div>
                <Link className="btn-secondary btn-small rounded-full px-3 py-1 text-xs" href={albumsHref}>全部</Link>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {unreadAlbums.map((item) => (
                  <Link
                    className="relative overflow-hidden rounded-2xl bg-white/60 shadow-sm"
                    href={albumsHref}
                    key={item.id}
                    onClick={() => markAlbumRead(item.id)}
                  >
                    {item.imageUrl ? (
                      <img className="aspect-square w-full object-cover" src={item.imageUrl} alt={item.title || "相册照片"} loading="lazy" />
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-cocoa/75 text-white">▶</div>
                    )}
                    {item.type === "video" ? (
                      <span className="absolute right-1 top-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white">VIDEO</span>
                    ) : null}
                    <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-400 ring-2 ring-white" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {totalUnread === 0 && (
            <div className="py-10 text-center">
              <p className="text-2xl mb-2">✨</p>
              <p className="text-cocoa/50 text-sm">都看过啦</p>
              <p className="text-cocoa/30 text-xs mt-1">新的回忆看完了，晚点再来看看。</p>
              <Link className="btn-secondary btn-small mt-4 inline-flex" href={memoriesHref}>返回回忆中心</Link>
            </div>
          )}
        </div>
      </AppShell>
    </SharedAccessGate>
  );
}