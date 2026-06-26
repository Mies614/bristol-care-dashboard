"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { NoteCard } from "@/components/NoteCard";
import { SharedAccessGate } from "@/components/SharedAccessGate";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppEmptyState } from "@/components/ui/AppEmptyState";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import { SignedMediaImage } from "@/components/SignedMediaImage";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import type { AlbumItem, LoveNote } from "@/lib/types";
import { useCloudReadStates } from "@/hooks/useCloudReadStates";
import type { AppSide } from "@/lib/appIdentity";

export type UnreadMemoriesPageContentProps = {
  identityId?: string;
  appSide?: AppSide;
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

  const candidateNoteIds = useMemo(
    () => notes.filter((n) => !n.deletedAt && n.author !== identityId).map((n) => n.id),
    [notes, identityId]
  );
  const { readKeySet: noteReadKeySet, markAsRead: markNoteRead } = useCloudReadStates({
    spaceCode: code, identity: identityId, contentType: "note", contentIds: candidateNoteIds,
  });

  const candidateAlbumIds = useMemo(
    () => albums.filter((a) => !a.deletedAt && a.createdBy !== identityId).map((a) => a.id),
    [albums, identityId]
  );
  const { readKeySet: albumReadKeySet, markAsRead: markAlbumRead } = useCloudReadStates({
    spaceCode: code, identity: identityId, contentType: "album", contentIds: candidateAlbumIds,
  });

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

  // Side-aware copy
  const heroTitle = isOwner ? "小乖还没看的" : "新的回忆";
  const heroSubtitle = isOwner
    ? "这些是小乖还没看过的回忆。"
    : "这些是还没看过的小片段。";
  const emptyTitle = isOwner ? "小乖都看过了" : "都看完了";
  const emptyDesc = isOwner
    ? "目前没有小乖还没看的内容，晚点再来看看。"
    : "新的回忆出现时，会在这里等你。";

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
          {totalUnread === 0 && (
            <p className="mt-2 text-sm text-[var(--app-muted)]">都看过啦 · 新的回忆看完了，晚点再来看看。</p>
          )}
          <div className="mt-3">
            <Link href={memoriesHref}>
              <AppButton variant="secondary" size="sm">← 返回回忆</AppButton>
            </Link>
          </div>
        </header>

        <div className="space-y-4">
          {message && <AppCard variant="soft"><p className="text-sm text-[var(--app-muted)]">{message}</p></AppCard>}

          {/* Unread notes */}
          {unreadNotes.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">💌 未读小纸条</p>
                  <h2 className="font-semibold text-[var(--app-text)]">{unreadNotes.length} 条还没看</h2>
                </div>
                <Link href={notesHref}>
                  <AppButton variant="secondary" size="sm">全部</AppButton>
                </Link>
              </div>
              <div className="space-y-2">
                {unreadNotes.map((note) => (
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

          {/* Unread albums */}
          {unreadAlbums.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">📷 未读相册</p>
                  <h2 className="font-semibold text-[var(--app-text)]">{unreadAlbums.length} 张还没看</h2>
                </div>
                <Link href={albumsHref}>
                  <AppButton variant="secondary" size="sm">全部</AppButton>
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {unreadAlbums.map((item) => (
                  <Link href={albumsHref} key={item.id} onClick={() => markAlbumRead(item.id)}>
                    <AppCard interactive compact className="overflow-hidden p-0 relative">
                      {item.imageUrl ? (
                        <SignedMediaImage path={item.imagePath} bucket="couple-albums" url={item.imageUrl} alt={item.title || "相册照片"} aspectRatio="square" showPlayIcon={item.type === "video"} />
                      ) : (
                        <div className="flex aspect-square items-center justify-center bg-cocoa/10 text-cocoa/40">▶</div>
                      )}
                      <div className="absolute top-2 right-2">
                        <UnreadBadge mode="dot" label="未读" />
                      </div>
                    </AppCard>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {totalUnread === 0 && (
            <AppEmptyState
              title={emptyTitle}
              description={emptyDesc}
              icon={<span className="text-4xl">✨</span>}
              action={
                <Link href={memoriesHref}>
                  <AppButton variant="secondary" size="sm">返回回忆中心</AppButton>
                </Link>
              }
            />
          )}
        </div>
      </AppShell>
    </SharedAccessGate>
  );
}
