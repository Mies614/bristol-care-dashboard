"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { SharedAccessGate } from "@/components/SharedAccessGate";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { getCurrentIdentity } from "@/lib/identity";
import { createUploadStageMessage, isLargeMediaFile } from "@/lib/mediaUpload";
import { validateAlbumImageFile, validateAlbumVideoFile } from "@/lib/albumValidation";
import { buildAlbumMetadataPayload, uploadAlbumFileDirectly, type UploadedAlbumFile } from "@/lib/albumUpload";
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

function formatUploadError(stage: "upload_image" | "upload_video" | "save_metadata", error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "未知错误");
  const label = stage === "upload_image" ? "图片上传失败" : stage === "upload_video" ? "视频上传失败" : "相册保存失败";
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
  const [draft, setDraft] = useState({ title: "", note: "", takenAt: "", location: "", isFavorite: false });
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);

  useEffect(() => {
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
    let currentStage: "upload_image" | "upload_video" | "save_metadata" = "upload_image";
    try {
      if (image) {
        currentStage = "upload_image";
        setUploadStage(`${createUploadStageMessage("upload_image")}${isLargeMediaFile(image, "image") ? "，文件较大，可能较慢" : ""}`);
        uploadedImage = await uploadAlbumFileDirectly(image, "image", code);
        if (cancelled) throw new Error("已取消");
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
        body: JSON.stringify(buildAlbumMetadataPayload({ code, draft, imageUpload: uploadedImage, videoUpload: uploadedVideo, createdBy: getCurrentIdentity() }))
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
      <PageHeader title="我们的相册" subtitle="把喜欢的瞬间慢慢收起来。" />
      <div className="space-y-4">
        <form className="soft-card space-y-3 bg-gradient-to-br from-white/85 to-blush/40" onSubmit={upload}>
          <div>
            <p className="section-kicker mb-1">Upload</p>
            <h2 className="font-semibold text-cocoa">添加一张回忆</h2>
          </div>
          <input className="field" placeholder="标题" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <textarea className="field min-h-24" placeholder="备注" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="field" type="date" value={draft.takenAt} onChange={(e) => setDraft({ ...draft, takenAt: e.target.value })} />
            <input className="field" placeholder="地点" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
          </div>
          <label className="check-card">
            <input checked={draft.isFavorite} type="checkbox" onChange={(e) => setDraft({ ...draft, isFavorite: e.target.checked })} />
            设为精选
          </label>
          <label className="file-panel">
            <span className="font-medium text-cocoa">封面图片</span>
            <span className="block text-xs text-cocoa/55">JPG / PNG / WebP / HEIC / HEIF，最大 30MB</span>
            <input className="mt-3 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif" onChange={(e) => setImage(e.currentTarget.files?.[0] || null)} />
          </label>
          <label className="file-panel">
            <span className="font-medium text-cocoa">视频 / 实况视频</span>
            <span className="block text-xs text-cocoa/55">MP4 / MOV / WebM，最大 100MB</span>
            <input className="mt-3 block w-full text-sm" type="file" accept="video/mp4,video/quicktime,video/webm,.mov,.mp4,.webm" onChange={(e) => setVideo(e.currentTarget.files?.[0] || null)} />
          </label>
          <div className="grid gap-2">
            {imagePreview ? <img className="max-h-56 w-full rounded-[1.35rem] object-cover shadow-sm" src={imagePreview} alt="图片预览" /> : null}
            {image?.type.includes("heic") || image?.type.includes("heif") ? <p className="notice">该格式可能无法在浏览器中预览，但可以上传保存。</p> : null}
            {videoPreview ? <video className="max-h-56 w-full rounded-[1.35rem] bg-black shadow-sm" src={videoPreview} controls /> : null}
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={uploading} type="submit">{uploading ? uploadStage || "上传中..." : "上传到相册"}</button>
            {uploading ? <button className="btn-secondary" type="button" onClick={() => { setCancelled(true); setUploading(false); setUploadStage(""); setMessage("已取消"); }}>取消</button> : null}
          </div>
        </form>

        <section className="soft-card">
          <div className="mb-3 flex flex-wrap gap-2">
            {filters.map(([value, label]) => (
              <button className={filter === value ? "btn-primary btn-small" : "btn-secondary btn-small"} key={value} onClick={() => setFilter(value)}>
                {label}
              </button>
            ))}
          </div>
          {message ? <p className="notice mb-3">{message}</p> : null}
          {items.length ? (
            <div className="grid grid-cols-2 gap-3">
              {items.map((item) => (
                <button className="group relative overflow-hidden rounded-[1.35rem] bg-white/60 shadow-sm" key={item.id} onClick={() => { setSelected(item); setPlaying(false); }}>
                  {item.imageUrl ? (
                    <img className="aspect-[3/4] w-full object-cover transition group-hover:scale-105" src={item.imageUrl} alt={item.title || "相册照片"} />
                  ) : item.videoUrl ? (
                    <div className="flex aspect-[3/4] items-center justify-center bg-cocoa/80 text-3xl text-white">▶</div>
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-2 text-left text-white">
                    <p className="truncate text-sm font-medium">{item.title || "未命名回忆"}</p>
                    <p className="text-xs opacity-80">{item.location || item.takenAt?.slice(0, 10) || ""}</p>
                  </div>
                  {item.type === "live_photo" ? <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">LIVE</span> : null}
                  {item.type === "video" ? <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">VIDEO</span> : null}
                  {item.isFavorite ? <span className="absolute left-2 top-2 rounded-full bg-white/75 px-2 py-1 text-xs">♡</span> : null}
                </button>
              ))}
            </div>
          ) : <p className="empty-state">还没有放进相册的照片，之后慢慢补上。</p>}
        </section>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 bg-cocoa/50 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="mx-auto max-h-[92vh] max-w-md overflow-auto rounded-[1.75rem] bg-cream p-4 shadow-float" onClick={(e) => e.stopPropagation()}>
            {selected.videoUrl && (playing || !selected.imageUrl) ? (
              <video className="max-h-[60vh] w-full rounded-[1.35rem] bg-black" src={selected.videoUrl} controls autoPlay onEnded={() => setPlaying(false)} />
            ) : selected.imageUrl ? (
              <img className="max-h-[60vh] w-full rounded-[1.35rem] object-contain" src={selected.imageUrl} alt={selected.title || "相册照片"} />
            ) : null}
            {selected.videoUrl ? (
              <button className="btn-secondary mt-3 w-full" onClick={() => setPlaying((value) => !value)}>{playing ? "回到封面" : "播放实况/视频"}</button>
            ) : null}
            {selected.videoUrl?.includes(".mov") || selected.videoPath?.endsWith(".mov") ? <p className="notice mt-3">如果 MOV 无法播放，请在浏览器中打开或下载查看。</p> : null}
            <div className="mt-4 space-y-2 text-sm text-cocoa/75">
              <h2 className="text-lg font-semibold text-cocoa">{selected.title || "未命名回忆"}</h2>
              {selected.takenAt ? <p>{selected.takenAt.slice(0, 10)}</p> : null}
              {selected.location ? <p>{selected.location}</p> : null}
              {selected.note ? <p className="leading-6">{selected.note}</p> : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-secondary btn-small" onClick={() => patchItem(selected.id, { action: "toggle_favorite" })}>{selected.isFavorite ? "取消精选" : "设为精选"}</button>
              <button className="btn-danger btn-small" onClick={() => deleteItem(selected)}>删除</button>
              <button className="btn-secondary btn-small" onClick={() => setSelected(null)}>关闭</button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
    </SharedAccessGate>
  );
}
