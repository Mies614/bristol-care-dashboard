"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SharedAccessGate } from "@/components/SharedAccessGate";
import { useAccessibleMotion, safeTransition, fadeInScale, staggerContainer, staggerItem } from "@/lib/design/motion";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { createUploadStageMessage, isLargeMediaFile } from "@/lib/mediaUpload";
import { validateAlbumImageFile, validateAlbumVideoFile } from "@/lib/albumValidation";
import { buildAlbumMetadataPayload, uploadAlbumFileDirectly, type UploadedAlbumFile } from "@/lib/albumUpload";
import { createThumbnailFileFromVideo, shouldGenerateVideoThumbnail } from "@/lib/videoThumbnail";
import { cleanupVideoElement } from "@/lib/media-utils";
import { ImageWithSkeleton } from "@/components/ImageWithSkeleton";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatApiError } from "@/lib/utils";
import type { AlbumItem } from "@/lib/types";

const filters = [
  ["all", "全部"],
  ["favorite", "精选"],
  ["photo", "照片"],
  ["live_photo", "实况"],
  ["video", "视频"]
] as const;

function formatUploadError(stage: "generate_thumbnail" | "upload_image" | "upload_video" | "save_metadata", error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "未知错误");
  const label =
    stage === "generate_thumbnail"
      ? "视频封面生成失败"
      : stage === "upload_image"
        ? "图片上传失败"
        : stage === "upload_video"
          ? "视频上传失败"
          : "相册保存失败";
  return `stage: ${stage} · error: ${label} · detail: ${message}`;
}

export default function AlbumsPage() {
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

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("upload=1")) setUploadOpen(true);
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const imagePreview = useMemo(() => (image ? URL.createObjectURL(image) : ""), [image]);
  const videoPreview = useMemo(() => (video ? URL.createObjectURL(video) : ""), [video]);

  async function loadItems() {
    const response = await fetch(`/api/albums?code=${encodeURIComponent(code)}&filter=${filter}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(formatApiError(payload, "相册加载失败。"));
      return;
    }
    setItems(payload.items || []);
  }

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!image && !video) {
      setMessage("请至少选择一张图片或一个视频。");
      return;
    }
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
    let uploadedImage: UploadedAlbumFile | null = null;
    let uploadedVideo: UploadedAlbumFile | null = null;
    let generatedThumbnail = false;
    let currentStage: "generate_thumbnail" | "upload_image" | "upload_video" | "save_metadata" = "upload_image";
    try {
      if (image) {
        currentStage = "upload_image";
        setUploadStage(`${createUploadStageMessage("upload_image")}${isLargeMediaFile(image, "image") ? "，文件较大，可能较慢" : ""}`);
        uploadedImage = await uploadAlbumFileDirectly(image, "image", code);
        if (cancelled) throw new Error("已取消");
      }
      if (shouldGenerateVideoThumbnail(image, video) && video) {
        currentStage = "generate_thumbnail";
        setUploadStage("正在生成视频封面");
        try {
          const thumbnailFile = await createThumbnailFileFromVideo(video);
          currentStage = "upload_image";
          setUploadStage("正在上传封面");
          uploadedImage = await uploadAlbumFileDirectly(thumbnailFile, "image", code);
          generatedThumbnail = true;
          if (cancelled) throw new Error("已取消");
        } catch {
          uploadedImage = null;
          generatedThumbnail = false;
        }
      }
      if (video) {
        currentStage = "upload_video";
        setUploadStage(`${createUploadStageMessage("upload_video")}${isLargeMediaFile(video, "video") ? "，手机端上传可能较慢" : ""}`);
        uploadedVideo = await uploadAlbumFileDirectly(video, "video", code);
        if (cancelled) throw new Error("已取消");
      }
      currentStage = "save_metadata";
      setUploadStage(createUploadStageMessage("save"));
      const response = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildAlbumMetadataPayload({
          code,
          draft,
          imageUpload: uploadedImage,
          videoUpload: uploadedVideo,
          createdBy: "xiaoguai",
          typeOverride: generatedThumbnail ? "video" : undefined
        }))
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errMsg = formatApiError(payload, "文件已上传，但记录保存失败，请重试保存。");
        setMessage(errMsg);
        toast.error(errMsg);
        return;
      }
    } catch (error) {
      const errMsg = formatUploadError(currentStage, error);
      setMessage(errMsg);
      toast.error("上传失败，请重试");
      return;
    } finally {
      setUploading(false);
      setUploadStage("");
    }
    setDraft({ title: "", note: "", takenAt: "", location: "", isFavorite: false });
    setImage(null);
    setVideo(null);
    setUploadOpen(false);
    toast.success("回忆已加入相册 ✨");
    await loadItems();
  }

  async function patchItem(id: string, body: Record<string, unknown>) {
    const response = await fetch("/api/albums", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, id, ...body })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(formatApiError(payload, body.action === "delete" ? "删除失败。" : "精选状态更新失败。"));
      return;
    }
    setMessage(payload.deleted ? "已删除这张回忆。" : "已更新。");
    setSelected(null);
    await loadItems();
  }

  function deleteItem(item: AlbumItem) {
    if (!confirm("确定删除这张回忆吗？删除后首页和相册不会再显示。")) return;
    patchItem(item.id, { action: "delete" });
  }

  const reduceMotion = useAccessibleMotion();

  return (
    <SharedAccessGate>
    <AppShell>
      {/* Hero */}
      <motion.header
        className="mb-4 overflow-hidden rounded-[2rem] border border-white/75 bg-gradient-to-br from-white/88 via-blush/55 to-lilac/60 p-5 shadow-float backdrop-blur-xl"
        variants={fadeInScale}
        initial="hidden"
        animate="visible"
        transition={safeTransition({ duration: 0.26, ease: "easeOut" }, reduceMotion)}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">Albums</p>
        <h1 className="text-2xl font-semibold text-[var(--app-text)]">我们的相册</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">每张照片都是一个很小的故事，慢慢翻才会发现。</p>
      </motion.header>

      <div className="space-y-4">
        {/* Upload — 轻量化折叠入口 */}
        <AppCard className="bg-gradient-to-br from-white/85 to-blush/40">
          <button className="flex w-full items-center justify-between text-left" onClick={() => setUploadOpen((value) => !value)} type="button">
            <span>
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1 block">+ Add Memory</span>
              <span className="font-semibold text-[var(--app-text)]">添加一张回忆</span>
            </span>
            <AppButton variant={uploadOpen ? "secondary" : "primary"} size="sm" type="button">{uploadOpen ? "收起" : "添加"}</AppButton>
          </button>
          <form className={`grid transition-all duration-300 ${uploadOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`} onSubmit={upload}>
            <div className="space-y-3 overflow-hidden">
              <Input placeholder="标题" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              <Textarea className="min-h-24" placeholder="备注" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={draft.takenAt} onChange={(e) => setDraft({ ...draft, takenAt: e.target.value })} />
                <Input placeholder="地点" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-4 py-3 shadow-sm cursor-pointer">
                <input checked={draft.isFavorite} type="checkbox" className="accent-[var(--app-accent)]" onChange={(e) => setDraft({ ...draft, isFavorite: e.target.checked })} />
                <span className="text-sm text-[var(--app-text)]">设为精选</span>
              </label>
              <label className="block rounded-[var(--app-radius)] border border-dashed border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-4 shadow-sm cursor-pointer hover:border-[var(--app-accent)] transition">
                <span className="font-medium text-[var(--app-text)]">封面图片</span>
                <span className="mt-1 block text-xs text-[var(--app-muted)]">JPG / PNG / WebP / HEIC / HEIF，最大 30MB</span>
                <Input className="mt-3 block w-full cursor-pointer" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif" onChange={(e) => setImage(e.currentTarget.files?.[0] || null)} />
              </label>
              <label className="block rounded-[var(--app-radius)] border border-dashed border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-4 shadow-sm cursor-pointer hover:border-[var(--app-accent)] transition">
                <span className="font-medium text-[var(--app-text)]">视频 / 实况视频</span>
                <span className="mt-1 block text-xs text-[var(--app-muted)]">MP4 / MOV / WebM，最大 100MB</span>
                <Input className="mt-3 block w-full cursor-pointer" type="file" accept="video/mp4,video/quicktime,video/webm,.mov,.mp4,.webm" onChange={(e) => setVideo(e.currentTarget.files?.[0] || null)} />
              </label>
              <div className="grid gap-2">
                {imagePreview ? <img className="max-h-56 w-full rounded-[1.35rem] object-cover shadow-sm" src={imagePreview} alt="图片预览" /> : null}
                {image?.type.includes("heic") || image?.type.includes("heif") ? (
                  <div className="rounded-[var(--app-radius)] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-3 text-sm text-[var(--app-accent)]">
                    该格式可能无法在浏览器中预览，但可以上传保存。
                  </div>
                ) : null}
                {videoPreview ? <video className="max-h-56 w-full rounded-[1.35rem] bg-black shadow-sm" src={videoPreview} controls /> : null}
              </div>
              {uploading ? (
                <div className="space-y-2">
                  <div className="rounded-full h-1.5 w-full overflow-hidden bg-[var(--app-card-border)]">
                    <motion.div
                      className="h-full rounded-full bg-[var(--app-accent)]"
                      animate={{ width: ["0%", "70%", "85%", "90%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", times: [0, 0.4, 0.7, 1] }}
                    />
                  </div>
                  <p className="text-center text-xs text-[var(--app-muted)]">{uploadStage || "上传中..."}</p>
                </div>
              ) : null}
              <div className="flex gap-2">
                <AppButton variant="primary" className="flex-1" disabled={uploading} type="submit">
                  {uploading ? "请稍候..." : "上传到相册"}
                </AppButton>
                {uploading ? (
                  <AppButton variant="secondary" type="button" onClick={() => { setCancelled(true); setUploading(false); setUploadStage(""); setMessage("已取消"); }}>
                    取消
                  </AppButton>
                ) : null}
              </div>
            </div>
          </form>
        </AppCard>

        {/* Filter & Grid */}
        <AppCard>
          <div className="mb-3 flex flex-wrap gap-2">
            {filters.map(([value, label]) => (
              <AppButton
                variant={filter === value ? "primary" : "secondary"}
                size="sm"
                key={value}
                onClick={() => setFilter(value)}
              >
                {label}
              </AppButton>
            ))}
          </div>
          {/* 上传状态提示 — 醒目但轻量 */}
          {uploading ? (
            <div className="mb-3 flex items-center gap-2 rounded-[var(--app-radius)] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] px-4 py-3 text-sm text-[var(--app-accent)]">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--app-accent)]" />
              <span>{uploadStage || "准备上传…"}</span>
            </div>
          ) : null}
          {message && !uploading ? (
            <div className="mb-3 rounded-[var(--app-radius)] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-3 text-sm text-[var(--app-accent)]">
              {message}
            </div>
          ) : null}
          {items.length ? (
            <motion.div
              className="grid grid-cols-2 gap-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              key={items.length}
            >
              {items.map((item) => (
                <motion.button
                  className="group relative overflow-hidden rounded-[1.35rem] bg-white/60 shadow-sm"
                  key={item.id}
                  variants={staggerItem}
                  onClick={() => { setSelected(item); setPlaying(false); }}
                  type="button"
                >
                  {item.imageUrl ? (
                    <ImageWithSkeleton
                      src={item.imageUrl}
                      alt={item.title || "相册照片"}
                      aspectRatio="portrait"
                      className="transition group-hover:scale-105"
                    />
                  ) : item.videoUrl ? (
                    <div className="aspect-[3/4] flex items-center justify-center bg-gradient-to-br from-cocoa/65 to-lilac/60">
                      <span className="text-4xl text-white/80 drop-shadow-lg">▶</span>
                    </div>
                  ) : (
                    <div className="aspect-[3/4] flex items-center justify-center bg-gradient-to-br from-cocoa/40 to-blush/35">
                      <span className="text-3xl text-white/60">🖼</span>
                    </div>
                  )}
                  {/* 类型标签 — 清晰但不遮挡内容 */}
                  {item.type === "video" ? (
                    <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white ring-1 ring-white/20 backdrop-blur-sm">
                      ▶ VIDEO
                    </span>
                  ) : item.type === "live_photo" ? (
                    <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white ring-1 ring-white/20 backdrop-blur-sm">
                      ◉ LIVE
                    </span>
                  ) : null}
                  {item.isFavorite ? (
                    <span className="absolute right-2 top-2 rounded-full bg-white/80 px-2 py-1 text-[10px] font-medium text-cocoa shadow-sm">★</span>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent p-2.5 text-left text-white">
                    <p className="truncate text-sm font-medium leading-snug">{item.title || "未命名回忆"}</p>
                    <p className="mt-0.5 text-[11px] opacity-70">{item.location || item.takenAt?.slice(0, 10) || ""}</p>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <p className="py-8 text-center text-sm text-[var(--app-muted)]">还没有放进相册的照片，之后慢慢补上。</p>
          )}
        </AppCard>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selected ? (
          <motion.div
            className="fixed inset-0 z-50 bg-[var(--app-text)]/50 p-4 backdrop-blur-sm"
            onClick={() => setSelected(null)}
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={safeTransition({ duration: 0.2 }, reduceMotion)}
          >
            <motion.div
              className="mx-auto max-h-[calc(var(--app-vh,1vh)*100-2rem)] max-h-[calc(100dvh-2rem)] max-w-md overflow-auto rounded-[1.75rem] bg-cream p-4 shadow-float"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              onAnimationComplete={(definition) => {
                // 关闭后释放视频 src，避免后台消耗资源
                if (definition === "exit" || definition === undefined) {
                  setPlaying(false);
                  cleanupVideoElement(videoRef.current);
                }
              }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={safeTransition({ duration: 0.22, ease: [0.25, 0.25, 0.25, 1] }, reduceMotion)}
            >
            {selected.videoUrl && (playing || !selected.imageUrl) ? (
              <video
                ref={videoRef}
                className="max-h-[calc(var(--app-vh,1vh)*60)] max-h-[60dvh] w-full rounded-[1.35rem] bg-black"
                src={selected.videoUrl}
                controls
                autoPlay
                preload="metadata"
                onEnded={() => setPlaying(false)}
              />
            ) : selected.imageUrl ? (
              <ImageWithSkeleton
                src={selected.imageUrl}
                alt={selected.title || "相册照片"}
                aspectRatio="video"
                className="max-h-[calc(var(--app-vh,1vh)*60)] max-h-[60dvh] w-full rounded-[1.35rem] object-contain"
              />
            ) : null}
            {selected.videoUrl ? (
              <AppButton variant="secondary" className="mt-3 w-full" onClick={() => setPlaying((value) => !value)}>
                {playing ? "回到封面" : "播放实况/视频"}
              </AppButton>
            ) : null}
            {(selected.videoUrl?.includes(".mov") || selected.videoPath?.endsWith(".mov")) ? (
              <div className="mt-3 rounded-[var(--app-radius)] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-3 text-sm text-[var(--app-accent)] break-words">
                如果 MOV 无法播放，请在浏览器中打开或下载查看。
              </div>
            ) : null}
            <div className="mt-4 space-y-2 text-sm text-[var(--app-muted)]">
              <h2 className="text-lg font-semibold text-[var(--app-text)]">{selected.title || "未命名回忆"}</h2>
              {selected.takenAt ? <p>{selected.takenAt.slice(0, 10)}</p> : null}
              {selected.location ? <p>{selected.location}</p> : null}
              {selected.note ? <p className="leading-6">{selected.note}</p> : null}
            </div>
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