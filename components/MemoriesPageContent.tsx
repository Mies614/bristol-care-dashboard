"use client";
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { SharedAccessGate } from "@/components/SharedAccessGate";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppEmptyState } from "@/components/ui/AppEmptyState";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";
import { NoteCard } from "@/components/NoteCard";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import { pickFeaturedLoveNote } from "@/lib/loveNotes";
import { loadAppData } from "@/lib/storage";
import type { AlbumItem, LoveNote } from "@/lib/types";
import { useCloudReadStates } from "@/hooks/useCloudReadStates";
import {
  buildMemoryTimelineItems,
  groupTimelineByDay,
  type TimelineItem,
} from "@/lib/memoryTimeline";
import type { AppSide } from "@/lib/appIdentity";

export type MemoriesPageContentProps = {
  identityId?: string;
  appSide?: AppSide;
};

export function MemoriesPageContent({ identityId: propIdentityId, appSide = "partner" }: MemoriesPageContentProps = {}) {
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
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
      fetch(`/api/notes?code=${encodeURIComponent(code)}&sort=pinned`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/albums?code=${encodeURIComponent(code)}&filter=all`).then((r) => r.json()).catch(() => ({}))
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
    return (favorites.length ? favorites : albums).slice(0, 4);
  }, [albums]);

  const timelineItems = useMemo(
    () => buildMemoryTimelineItems({ notes, albums, nextMeetingDate, basePath: isOwner ? "/me" : "" }),
    [notes, albums, nextMeetingDate, isOwner]
  );

  const timelineDayGroups = useMemo(
    () => groupTimelineByDay(timelineItems),
    [timelineItems]
  );

  // Read states
  const noteIds = useMemo(
    () => noteSummary.filter((n) => !n.deletedAt && n.author !== identityId).map((n) => n.id),
    [noteSummary, identityId]
  );
  const { readKeySet: noteReadKeySet, markAsRead: markNoteRead } = useCloudReadStates({
    spaceCode: code, identity: identityId, contentType: "note", contentIds: noteIds,
  });

  const albumIds = useMemo(() => albumSummary.filter((a) => !a.deletedAt).map((a) => a.id), [albumSummary]);
  const { readKeySet: albumReadKeySet } = useCloudReadStates({
    spaceCode: code, identity: identityId, contentType: "album", contentIds: albumIds,
  });

  // Timeline read states
  const allNoteIds = useMemo(() => notes.filter((n) => !n.deletedAt && n.author !== identityId).map((n) => n.id), [notes, identityId]);
  const allAlbumIds = useMemo(() => albums.filter((a) => !a.deletedAt).map((a) => a.id), [albums]);

  const { readKeySet: timelineNoteRead } = useCloudReadStates({
    spaceCode: code, identity: identityId, contentType: "note", contentIds: allNoteIds,
  });
  const { readKeySet: timelineAlbumRead } = useCloudReadStates({
    spaceCode: code, identity: identityId, contentType: "album", contentIds: allAlbumIds,
  });

  const notesHref = isOwner ? "/me/notes" : "/notes";
  const albumsHref = isOwner ? "/me/albums" : "/albums";
  const unreadHref = isOwner ? "/me/memories/unread" : "/memories/unread";

  // Side-aware copy
  const heroTitle = isOwner ? "我的回忆" : "回忆";
  const heroSubtitle = isOwner
    ? "整理给小乖看的照片、小纸条和片段。"
    : "把一起留下的小片段，慢慢翻一遍。";
  const emptyTitle = isOwner ? "还没有整理回忆" : "还没有回忆";
  const emptyDesc = isOwner
    ? "先放一张照片，或写一张小纸条吧。"
    : "等第一张照片或第一张小纸条出现在这里。";

  function isUnreadTimeline(item: TimelineItem): boolean {
    if (item.sourceType === "note" && item.noteId) return !timelineNoteRead.has(`note:${item.noteId}`);
    if (item.sourceType === "album" && item.albumId) return !timelineAlbumRead.has(`album:${item.albumId}`);
    return false;
  }

  const sourceLabel = (type: string) => type === "note" ? "小纸条" : type === "album" ? "相册" : null;

  const hasContent = noteSummary.length > 0 || albumSummary.length > 0 || timelineDayGroups.length > 0;

  return (
    <SharedAccessGate>
    <AppShell>
      {/* Hero */}
      <header className={`mb-4 overflow-hidden rounded-[2rem] border border-white/75 p-5 shadow-float backdrop-blur-xl ${
        isOwner
          ? "bg-gradient-to-br from-white/88 via-indigo-50/50 to-white/80"
          : "bg-gradient-to-br from-white/88 via-blush/55 to-lilac/60"
      }`}>
        <h1 className="text-2xl font-semibold text-[var(--app-text)]">{heroTitle}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{heroSubtitle}</p>
        <div className="mt-3">
          <Link href={unreadHref}>
            <AppButton variant="secondary" size="sm">📬 未读回忆</AppButton>
          </Link>
        </div>
      </header>

      {message ? (
        <AppCard variant="soft">
          <p className="text-sm text-[var(--app-muted)]">{message}</p>
        </AppCard>
      ) : null}

      {hasContent ? (
        <div className="space-y-4">
          {/* Featured notes */}
          {noteSummary.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">💌 最近小纸条</p>
                  <h2 className="font-semibold text-[var(--app-text)]">小纸条墙</h2>
                </div>
                <Link href={notesHref}>
                  <AppButton variant="secondary" size="sm">全部</AppButton>
                </Link>
              </div>
              <div className="space-y-2">
                {noteSummary.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    identityId={identityId}
                    side={appSide}
                    readKeySet={noteReadKeySet}
                    onNoteRead={(id) => markNoteRead(id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Recent albums */}
          {albumSummary.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">📷 最近照片</p>
                  <h2 className="font-semibold text-[var(--app-text)]">相册</h2>
                </div>
                <Link href={albumsHref}>
                  <AppButton variant="secondary" size="sm">全部</AppButton>
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {albumSummary.map((item) => {
                  const unread = !item.deletedAt && item.createdBy !== identityId && !albumReadKeySet.has(`album:${item.id}`);
                  return (
                    <Link href={albumsHref} key={item.id}>
                      <AppCard interactive compact className="overflow-hidden p-0 relative">
                        {item.imageUrl ? (
                          <ImageWithSkeleton src={item.imageUrl} alt={item.title || "相册照片"} aspectRatio="square" showPlayIcon={item.type === "video"} />
                        ) : (
                          <div className="flex aspect-square items-center justify-center bg-cocoa/10 text-cocoa/40">▶</div>
                        )}
                        {unread && (
                          <div className="absolute top-2 right-2">
                            <UnreadBadge mode="dot" label="未读" />
                          </div>
                        )}
                      </AppCard>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Timeline with day grouping */}
          {timelineDayGroups.length > 0 && (
            <section>
              <div className="mb-3">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">⏳ 时间线</p>
                <h2 className="font-semibold text-[var(--app-text)]">关系时间线</h2>
              </div>
              <div className="space-y-4">
                {timelineDayGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-sm font-semibold text-[var(--app-muted)]">{group.label}</p>
                    <div className="space-y-2 border-l-2 border-[var(--app-accent)]/20 pl-3 sm:pl-4">
                      {group.items.map((item) => {
                        const unread = isUnreadTimeline(item);
                        const label = sourceLabel(item.sourceType);
                        return (
                          <Link href={item.href} key={item.id}>
                            <motion.div
                              className="rounded-[1.2rem] border border-white/70 bg-white/70 p-2.5 sm:p-3 shadow-sm relative hover:bg-white/90 transition"
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex gap-2 sm:gap-3">
                                {item.imageUrl ? (
                                  <img
                                    className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-2xl object-cover"
                                    src={item.imageUrl}
                                    alt={item.title}
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-accent-soft)] text-xs text-[var(--app-muted)]">
                                    {item.type}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-sm sm:text-base font-medium text-[var(--app-text)] truncate">{item.title}</p>
                                    {label && (
                                      <span className="shrink-0 rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] text-[var(--app-muted)]">{label}</span>
                                    )}
                                  </div>
                                  <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                                    {new Date(item.date).toISOString().slice(0, 10)}
                                  </p>
                                  {item.content && (
                                    <p className="mt-1 line-clamp-2 text-xs sm:text-sm leading-5 text-cocoa/65">{item.content}</p>
                                  )}
                                </div>
                              </div>
                              {unread && (
                                <div className="absolute top-2 right-2">
                                  <UnreadBadge mode="dot" label="未读" />
                                </div>
                              )}
                            </motion.div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <AppEmptyState title={emptyTitle} description={emptyDesc} icon={<span className="text-4xl">📖</span>} />
      )}
    </AppShell>
    </SharedAccessGate>
  );
}
