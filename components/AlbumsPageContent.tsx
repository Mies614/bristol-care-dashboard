"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SharedAccessGate } from "@/components/SharedAccessGate";
import { useAccessibleMotion, safeTransition, safeVariants, staggerContainer, staggerItem } from "@/lib/design/motion";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import ContentInteractionBar from "@/components/ContentInteractionBar";
import { createUploadStageMessage, isLargeMediaFile } from "@/lib/mediaUpload";
import { validateAlbumImageFile, validateAlbumVideoFile } from "@/lib/albumValidation";
import { buildAlbumMetadataPayload, uploadAlbumFileDirectly, type UploadedAlbumFile } from "@/lib/albumUpload";
import { createThumbnailFileFromVideo, shouldGenerateVideoThumbnail } from "@/lib/videoThumbnail";
import { cleanupVideoElement } from "@/lib/media-utils";
import { SignedMediaImage } from "@/components/SignedMediaImage";
import { SignedMediaVideo } from "@/components/SignedMediaVideo";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppEmptyState } from "@/components/ui/AppEmptyState";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatApiError } from "@/lib/utils";
import { ApiClientError } from "@/lib/apiError";
import ContentComments from "@/components/ContentComments";
import type { CommentEntry } from "@/lib/contentInteractions";
import type { AlbumItem } from "@/lib/types";
import { getAlbumMediaDownloadLabel } from "@/lib/notesMedia";
import { downloadPrivateMedia } from "@/lib/downloadHelper";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import { X } from "lucide-react";
import { useCloudReadStates } from "@/hooks/useCloudReadStates";
import type { AppSide } from "@/lib/appIdentity";

const filters = [
  ["all", "全部"],
  ["favorite", "精选"],
  ["photo", "照片"],
  ["live_photo", "实况"],
  ["video", "视频"]
] as const;

function formatUploadError(stage: "generate_thumbnail" | "upload_image" | "upload_video" | "save_metadata", error: unknown) {
  const _detail = error instanceof Error ? error.message : String(error || "");
  const label =
    stage === "generate_thumbnail"
      ? "视频封面生成失败"
      : stage === "upload_image"
        ? "图片上传失败"
        : stage === "upload_video"
          ? "视频上传失败"
          : "相册保存失败";
  // Only show stage detail in development; user-facing message stays clean
  if (process.env.NODE_ENV === "development") {
    return `${label} · ${_detail}`;
  }
  return label + "，请稍后再试。";
}

export type AlbumsPageContentProps = {
  identityId?: string;
  appSide?: AppSide;
};

export function AlbumsPageContent({ identityId: propIdentityId, appSide }: AlbumsPageContentProps = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [items, setItems] = useState<AlbumItem[]>([]);
  const [selected, setSelected] = useState<AlbumItem | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number][0]>("all");
  const [message, setMessage] = useState("");
  const code = getDefaultSpaceCode();
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", note: "", takenAt: "", location: "", isFavorite: false });
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);

  const identity = propIdentityId || DEFAULT_NORMAL_IDENTITY_ID;
  const isOwner = appSide === "owner";

  // Cloud-synced read states for album grid
  const albumIds = useMemo(
    () => items.filter((a) => !a.deletedAt && a.createdBy !== identity).map((a) => a.id),
    [items, identity]
  );

  const { readKeySet, markAsRead } = useCloudReadStates({
    spaceCode: code,
    identity,
    contentType: "album",
    contentIds: albumIds,
  });

  const [selectedComments, setSelectedComments] = useState<CommentEntry[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("upload=1")) setUploadOpen(true);
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Keyboard: Escape closes lightbox
  useEffect(() => {
    if (!selected) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [selected]);

  const imagePreview = useMemo(() => (image ? URL.createObjectURL(image) : ""), [image]);
  const videoPreview = useMemo(() => (video ? URL.createObjectURL(video) : ""), [video]);

  async function loadItems() {
    const response = await fetch(`/api/albums?code=${encodeURIComponent(code)}&filter=${filter}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(formatApiError(payload, "相册加载失败。"));
    setItems(payload.items || []);
  }

  async function patchItem(id: string, body: Record<string, unknown>) {
    setMessage("");
    const response = await fetch("/api/albums", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, id, ...body })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(formatApiError(payload, "更新失败。"));
      return;
    }
    if (payload.deleted) {
      setSelected(null);
      toast.success("已删除。");
    }
    await loadItems();
  }

  async function deleteItem(item: AlbumItem) {
    if (!confirm("确定删除这张回忆吗？")) return;
    const response = await fetch("/api/albums", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, id: item.id })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return setMessage(formatApiError(payload, "删除失败。"));
    }
    setSelected(null);
    toast.success("已删除。");
    await loadItems();
  }

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!image && !video) return setMessage("至少选择一张图片或视频。");
    if (image) {
      const validation = validateAlbumImageFile(image);
      if (!validation.ok) return setMessage(validation.error || "图片不符合要求。");
    }
    if (video) {
      const validation = validateAlbumVideoFile(video);
      if (!validation.ok) return setMessage(validation.error || "视频不符合要求。");
    }

    setUploading(true);
    setCancelled(false);
    setMessage("");
    let uploadedImage: UploadedAlbumFile | null = null;
    let uploadedVideo: UploadedAlbumFile | null = null;
    let generatedThumbnail = false;

    try {
      if (image) {
        setUploadStage(createUploadStageMessage("upload_image"));
        uploadedImage = await uploadAlbumFileDirectly(image, "image", code, identity);
        if (cancelled) throw new Error("上传已取消。");
      }
      if (video) {
        setUploadStage(`${createUploadStageMessage("upload_video")}${isLargeMediaFile(video, "video") ? "，手机端上传可能较慢" : ""}`);
        uploadedVideo = await uploadAlbumFileDirectly(video, "video", code, identity);
        if (cancelled) throw new Error("上传已取消。");
        if (uploadedVideo && shouldGenerateVideoThumbnail(video)) {
          setUploadStage("生成视频封面...");
          generatedThumbnail = true; void await createThumbnailFileFromVideo(video);
        }
      }
      setUploadStage(createUploadStageMessage("save"));
      const response = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildAlbumMetadataPayload({
          code,
          imageUpload: uploadedImage,
          
          videoUpload: uploadedVideo,
          createdBy: identity,
          typeOverride: generatedThumbnail ? "video" as const : undefined,
          
          draft
        }))
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(formatApiError(payload, "文件已上传但保存失败，请重试。"));
        return;
      }
      toast.success("已经放进相册了。");
      setUploadOpen(false);
      setDraft({ title: "", note: "", takenAt: "", location: "", isFavorite: false });
      setImage(null);
      setVideo(null);
      await loadItems();
    } catch (error) {
      setMessage(formatUploadError(
        image && !uploadedImage ? "upload_image" : video && !uploadedVideo ? "upload_video" : "save_metadata",
        error
      ));
    } finally {
      setUploading(false);
      setUploadStage("");
    }
  }

  async function loadAlbumComments(contentId: string) {
    setCommentsLoading(true);
    try {
      const res = await fetch(
        `/api/comments?spaceCode=${encodeURIComponent(code)}&contentType=album&contentId=${encodeURIComponent(contentId)}&identity=${encodeURIComponent(identity)}`
      );
      const payload = await res.json();
      if (payload.ok && Array.isArray(payload.comments)) {
        const entries: CommentEntry[] = payload.comments.map((c: Record<string, unknown>) => ({
          id: c.id as string,
          identity: c.identity as string,
          body: c.body as string,
          createdAt: c.createdAt as string,
          deletedAt: c.deletedAt as string | undefined,
          updatedAt: c.updatedAt as string | undefined,
          isDeleted: Boolean(c.deletedAt),
          isMine: c.identity === identity,
        }));
        setSelectedComments(entries);
      }
    } catch {
      // Non-critical
    } finally {
      setCommentsLoading(false);
    }
  }

  async function handleAddAlbumComment(body: string, _identity: string) {
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaceCode: code, contentType: "album", contentId: selected?.id, identity, body }),
    });
    const payload = await res.json();
    if (!payload.ok) {
      if (res.status >= 400 && res.status < 500) throw new ApiClientError(payload.error || "发送失败");
      throw new Error(payload.error || "发送失败");
    }
    if (selected) await loadAlbumComments(selected.id);
  }

  async function handleDeleteAlbumComment(commentId: string, _identity: string) {
    const res = await fetch("/api/comments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaceCode: code, commentId, identity }),
    });
    const payload = await res.json();
    if (!payload.ok) {
      if (res.status >= 400 && res.status < 500) throw new ApiClientError(payload.error || "删除失败");
      throw new Error(payload.error || "删除失败");
    }
    if (selected) await loadAlbumComments(selected.id);
  }

  // Side-aware open lightbox — mark as read
  function openLightbox(item: AlbumItem) {
    setSelected(item);
    setPlaying(false);
    setSelectedComments([]);
    // Mark as read if it's not mine
    if (item.createdBy !== identity) {
      markAsRead(item.id);
    }
  }

  const selectedDownloadLabel = selected ? getAlbumMediaDownloadLabel(selected) : "";

  const reduceMotion = useAccessibleMotion();
  const isUnread = (item: AlbumItem) => !readKeySet.has(`album:${item.id}`) && item.createdBy !== identity && !item.deletedAt;

  // Side-aware copy
  const heroTitle = isOwner ? "我的相册" : "相册";
  const heroSubtitle = isOwner ? "整理给小乖看的照片和视频。" : "把照片和视频都轻轻放在这里。";
  const emptyTitle = isOwner ? "还没有整理照片" : "相册还在等第一张回忆";
  const emptyDesc = isOwner ? "先放一张照片或视频给小乖吧。" : "等他放一张照片进来吧。";
  const commentPlaceholder = isOwner ? "给这张照片留个话..." : "说点什么吧...";

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
      </header>

      <div className="space-y-3.5">
        {/* Upload entry */}
        <AppCard className={isOwner ? "bg-gradient-to-br from-white/85 to-indigo-50/40" : "bg-gradient-to-br from-white/85 to-blush/40"}>
          <button
            className="flex w-full items-center justify-between text-left"
            onClick={() => setUploadOpen((v) => !v)}
            type="button"
          >
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">
                {isOwner ? "📷 整理照片" : "📷 放进相册"}
              </p>
              <p className="font-semibold text-[var(--app-text)]">
                {isOwner ? "放一张照片或视频给小乖" : "放一张回忆进来"}
              </p>
            </div>
            <AppButton variant={uploadOpen ? "secondary" : "primary"} size="sm" type="button">
              {uploadOpen ? "收起" : isOwner ? "上传" : "放一张"}
            </AppButton>
          </button>
          <div className={`grid transition-all duration-300 ${uploadOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"}`}>
            <div className="overflow-hidden">
              <form className="soft-card space-y-3 bg-gradient-to-br from-white/85 to-blush/45" onSubmit={upload}>
                <Input placeholder="标题（可选）" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                <Textarea placeholder="想说的话（可选）" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1.5 text-xs font-medium text-cocoa/65 hover:bg-white/85 transition cursor-pointer">
                    🖼️ 照片
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif" className="sr-only" onChange={(e) => setImage(e.currentTarget.files?.[0] || null)} aria-label="选择照片" />
                  </label>
                  <label className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1.5 text-xs font-medium text-cocoa/65 hover:bg-white/85 transition cursor-pointer">
                    🎬 视频
                    <input type="file" accept="video/mp4,video/quicktime,video/webm,.mov,.mp4,.webm" className="sr-only" onChange={(e) => setVideo(e.currentTarget.files?.[0] || null)} aria-label="选择视频" />
                  </label>
                </div>
                {imagePreview && (
                  <div className="rounded-lg bg-white/60 px-3 py-1.5 text-xs text-cocoa/60">已选照片：{image?.name}</div>
                )}
                {videoPreview && (
                  <div className="rounded-lg bg-white/60 px-3 py-1.5 text-xs text-cocoa/60">已选视频：{video?.name}</div>
                )}
                {uploading && (
                  <div className="space-y-2">
                    <div className="rounded-full h-1.5 w-full overflow-hidden bg-[var(--app-card-border)]">
                      <motion.div className="h-full rounded-full bg-[var(--app-accent)]" animate={{ width: ["0%", "65%", "85%"] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
                    </div>
                    <p className="text-center text-xs text-[var(--app-muted)]">{uploadStage || "正在放进相册..."}</p>
                  </div>
                )}
                {message && !uploading && <p className="text-xs text-rose/60">{message}</p>}
                <div className="flex gap-2">
                  <button className="btn-primary flex-1" disabled={uploading} type="submit">
                    {uploading ? "请稍候..." : isOwner ? "放进相册" : "放进去"}
                  </button>
                  {uploading && (
                    <button className="btn-secondary" type="button" onClick={() => { setCancelled(true); setMessage("正在取消..."); }}>
                      取消
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </AppCard>

        {/* Filter tabs */}
        <AppCard>
          <div className="-mx-1 mb-2 flex flex-nowrap gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none">
            {filters.map(([value, label]) => (
              <AppButton
                variant={filter === value ? "primary" : "secondary"}
                size="sm"
                className="shrink-0 whitespace-nowrap"
                key={value}
                onClick={() => setFilter(value)}
              >
                {label}
              </AppButton>
            ))}
          </div>
        </AppCard>

        {/* Grid */}
        {items.length > 0 ? (
          <motion.div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            variants={safeVariants(staggerContainer, reduceMotion)}
            initial="hidden"
            animate="visible"
          >
            {items.map((item) => {
              const unread = isUnread(item);
              return (
                <motion.div
                  key={item.id}
                  variants={safeVariants(staggerItem, reduceMotion)}
                >
                  <AppCard
                    interactive
                    compact
                    className="overflow-hidden p-0"
                    onClick={() => openLightbox(item)}
                  >
                    <div className="relative">
                      <SignedMediaImage
                        path={item.imagePath}
                        bucket="couple-albums"
                        url={item.imageUrl}
                        alt={item.title || "相册照片"}
                        aspectRatio="square"
                        showPlayIcon={Boolean(item.videoUrl)}
                      />
                      {unread && (
                        <div className="absolute top-2 right-2">
                          <UnreadBadge mode="dot" label="未读" />
                        </div>
                      )}
                    </div>
                    {item.title && (
                      <p className="px-3 py-2 text-xs font-medium text-cocoa/70 truncate">{item.title}</p>
                    )}
                  </AppCard>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <AppEmptyState
            title={emptyTitle}
            description={emptyDesc}
            icon={<span className="text-4xl">📷</span>}
          />
        )}

        {/* Message banner */}
        {message && !uploading && !uploadOpen && (
          <div className="rounded-[var(--app-radius)] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-3 text-sm text-[var(--app-accent)]">{message}</div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selected ? (
          <motion.div
            className="fixed inset-0 z-50 bg-cocoa/50 p-4 backdrop-blur-sm"
            onClick={() => setSelected(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={safeTransition({ duration: 0.2 }, reduceMotion)}
          >
            <motion.div
              className="mx-auto max-h-[92dvh] max-w-md overflow-auto rounded-[1.75rem] bg-cream p-4 shadow-float pb-[calc(1rem+env(safe-area-inset-bottom,0px)+64px)]"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              onAnimationComplete={(definition) => {
                if (definition === "exit" || definition === undefined) {
                  setPlaying(false);
                  cleanupVideoElement(videoRef.current);
                }
              }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={safeTransition({ duration: 0.22, ease: [0.25, 0.25, 0.25, 1] }, reduceMotion)}
            >
              {/* Close button */}
              <button
                onClick={(e) => { e.stopPropagation(); setSelected(null); }}
                className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-cocoa/60 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-cocoa active:scale-90"
                aria-label="关闭"
              >
                <X size={18} strokeWidth={2} />
              </button>

              {/* Media display */}
              {selected.videoPath && (playing || !selected.imagePath) ? (
                <SignedMediaVideo
                  className="max-h-[60dvh] w-full rounded-[1.35rem] bg-black"
                  path={selected.videoPath}
                  bucket="couple-albums"
                  url={selected.videoUrl}
                  controls
                  autoPlay
                />
              ) : selected.imagePath ? (
                <SignedMediaImage
                  path={selected.imagePath}
                  bucket="couple-albums"
                  url={selected.imageUrl}
                  alt={selected.title || "相册照片"}
                  aspectRatio="video"
                  className="max-h-[60dvh] w-full rounded-[1.35rem] object-contain"
                />
              ) : null}

              {/* Media action row */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {selected.videoPath && (
                  <AppButton variant="secondary" size="sm" onClick={() => setPlaying((v) => !v)}>
                    {playing ? "回到封面" : "播放"}
                  </AppButton>
                )}
                {selected && selected.id && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        await downloadPrivateMedia({
                          contentType: "album",
                          contentId: selected.id,
                          field: selected.videoUrl ? "video" : "image",
                        });
                      } catch {
                        toast.error("下载失败");
                      }
                    }}
                    aria-label={selectedDownloadLabel}
                    className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-white/60 bg-white/60 px-3 py-1.5 text-xs font-medium text-cocoa shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white/85 active:scale-[var(--tap-scale)] min-h-[40px] min-w-[40px]"
                  >
                    {selected.videoUrl ? (
                      <svg className="h-3.5 w-3.5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    ) : (
                      <svg className="h-3.5 w-3.5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                    )}
                    <svg className="h-3.5 w-3.5" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    <span>{selectedDownloadLabel}</span>
                  </button>
                )}
              </div>

              {/* MOV hint */}
              {(selected.videoPath?.endsWith(".mov")) ? (
                <div className="mt-3 rounded-[var(--app-radius)] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-3 text-sm text-[var(--app-accent)] break-words">
                  如果 MOV 无法播放，请在浏览器中打开或下载查看。
                </div>
              ) : null}

              {/* Metadata */}
              <div className="mt-4 space-y-2 text-sm text-[var(--app-muted)]">
                <h2 className="text-lg font-semibold text-[var(--app-text)]">{selected.title || "未命名回忆"}</h2>
                {selected.takenAt ? <p>{selected.takenAt.slice(0, 10)}</p> : null}
                {selected.location ? <p>{selected.location}</p> : null}
                {selected.note ? <p className="leading-6">{selected.note}</p> : null}
              </div>

              {/* Interactions */}
              <ContentInteractionBar
                spaceCode={code}
                contentType="album"
                contentId={selected.id}
                identityId={identity}
                onOpenComments={() => loadAlbumComments(selected.id).catch(() => {})}
              />

              {/* Comments */}
              <ContentComments
                contentType="album"
                contentId={selected.id}
                spaceCode={code}
                identity={identity}
                appSide={appSide}
                comments={selectedComments}
                loading={commentsLoading}
                onAddComment={handleAddAlbumComment}
                onDeleteComment={handleDeleteAlbumComment}
                placeholder={commentPlaceholder}
                maxLength={200}
              />

              {/* Admin row */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <AppButton variant="secondary" size="sm" onClick={() => patchItem(selected.id, { action: "toggle_favorite" })}>
                  {selected.isFavorite ? "取消精选" : "设为精选"}
                </AppButton>
                <AppButton variant="danger" size="sm" onClick={() => deleteItem(selected)}>
                  删除
                </AppButton>
                <div className="flex-1" />
                <AppButton variant="secondary" size="sm" onClick={() => setSelected(null)}>
                  关闭
                </AppButton>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AppShell>
    </SharedAccessGate>
  );
}
