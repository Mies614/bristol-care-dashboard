"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SharedAccessGate } from "@/components/SharedAccessGate";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { createUploadStageMessage, isLargeMediaFile } from "@/lib/mediaUpload";
import { validateAlbumImageFile, validateAlbumVideoFile } from "@/lib/albumValidation";
import { buildAlbumMetadataPayload, uploadAlbumFileDirectly, type UploadedAlbumFile } from "@/lib/albumUpload";
import { createThumbnailFileFromVideo, shouldGenerateVideoThumbnail } from "@/lib/videoThumbnail";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AlbumItem } from "@/lib/types";

const filters = [
  ["all", "全部"],
  ["favorite", "精选"],
  ["photo", "照片"],
  ["live_photo", "实况"],
  ["video", "视频"]
] as const;

function formatApiError(payload: Record<string, unknown>, fallback: string) {
  return [
    typeof payload.error === "string" ? payload.error : fallback,
    typeof payload.code === "string" ? `code: ${payload.code}` : "",
    typeof payload.step === "string" ? `step: ${payload.step}` : "",
    typeof payload.detail === "string" ? `detail: ${payload.detail}` : ""
  ].filter(Boolean).join(" · ");
}

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
        setMessage(formatApiError(payload, "文件已上传，但记录保存失败，请重试保存。"));
        return;
      }
    } catch (error) {
      setMessage(formatUploadError(currentStage, error));
      return;
    } finally {
      setUploading(false);
      setUploadStage("");
    }
    setDraft({ title: "", note: "", takenAt: "", location: "", isFavorite: false });
    setImage(null);
    setVideo(null);
    setUploadOpen(false);
    setMessage(createUploadStageMessage("done"));
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

  return (
    <SharedAccessGate>
    <AppShell>
      {/* Hero */}
      <header className="mb-4 overflow-hidden rounded-[2rem] border border-white/75 bg-gradient-to-br from-white/88 via-blush/55 to-lilac/60 p-5 shadow-float backdrop-blur-xl">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">Albums</p>
        <h1 className="text-2xl font-semibold text-[var(--app-text)]">我们的相册</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">把喜欢的瞬间慢慢收起来。</p>
      </header>

      <div className="space-y-4">
        {/* Upload */}
        <AppCard className="bg-gradient-to-br from-white/85 to-blush/40">
          <button className="flex w-full items-center justify-between text-left" onClick={() => setUploadOpen((value) => !value)} type="button">
            <span>
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1 block">Upload</span>
              <span className="font-semibold text-[var(--app-text)]">添加一张回忆</span>
            </span>
            <AppButton variant="secondary" size="sm" type="button">{uploadOpen ? "收起" : "展开"}</AppButton>
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
              <div className="flex gap-2">
                <AppButton variant="primary" className="flex-1" disabled={uploading} type="submit">
                  {uploading ? uploadStage || "上传中..." : "上传到相册"}
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
          {message ? (
            <div className="mb-3 rounded-[var(--app-radius)] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-3 text-sm text-[var(--app-accent)]">
              {message}
            </div>
          ) : null}
          {items.length ? (
            <div className="grid grid-cols-2 gap-3">
              {items.map((item) => (
                <button
                  className="group relative overflow-hidden rounded-[1.35rem] bg-white/60 shadow-sm"
                  key={item.id}
                  onClick={() => { setSelected(item); setPlaying(false); }}
                  type="button"
                >
                  {item.imageUrl ? (
                    <img className="aspect-[3/4] w-full object-cover transition group-hover:scale-105" src={item.imageUrl} alt={item.title || "相册照片"} />
                  ) : item.videoUrl ? (
                    <div className="flex aspect-[3/4] items-center justify-center bg-[var(--app-text)]/80 text-3xl text-white">▶</div>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-2 text-left text-white">
                    <p className="truncate text-sm font-medium">{item.title || "未命名回忆"}</p>
                    <p className="text-xs opacity-80">{item.location || item.takenAt?.slice(0, 10) || ""}</p>
                  </div>
                  {item.type === "live_photo" ? (
                    <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">LIVE</span>
                  ) : null}
                  {item.type === "video" ? (
                    <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">VIDEO</span>
                  ) : null}
                  {item.isFavorite ? (
                    <span className="absolute left-2 top-2 rounded-full bg-white/75 px-2 py-1 text-xs">♡</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[var(--app-muted)]">还没有放进相册的照片，之后慢慢补上。</p>
          )}
        </AppCard>
      </div>

      {/* Lightbox */}
      {selected ? (
        <div
          className="fixed inset-0 z-50 bg-[var(--app-text)]/50 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div
            className="mx-auto max-h-[calc(var(--app-vh,1vh)*100-2rem)] max-h-[calc(100dvh-2rem)] max-w-md overflow-auto rounded-[1.75rem] bg-cream p-4 shadow-float"
            onClick={(e) => e.stopPropagation()}
          >
            {selected.videoUrl && (playing || !selected.imageUrl) ? (
              <video
                className="max-h-[calc(var(--app-vh,1vh)*60)] max-h-[60dvh] w-full rounded-[1.35rem] bg-black"
                src={selected.videoUrl}
                controls
                autoPlay
                onEnded={() => setPlaying(false)}
              />
            ) : selected.imageUrl ? (
              <img
                className="max-h-[calc(var(--app-vh,1vh)*60)] max-h-[60dvh] w-full rounded-[1.35rem] object-contain"
                src={selected.imageUrl}
                alt={selected.title || "相册照片"}
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
            <div className="mt-4 flex flex-wrap gap-2">
              <AppButton variant="secondary" size="sm" onClick={() => patchItem(selected.id, { action: "toggle_favorite" })}>
                {selected.isFavorite ? "取消精选" : "设为精选"}
              </AppButton>
              <AppButton variant="danger" size="sm" onClick={() => deleteItem(selected)}>
                删除
              </AppButton>
              <AppButton variant="secondary" size="sm" onClick={() => setSelected(null)}>
                关闭
              </AppButton>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
    </SharedAccessGate>
  );
}