"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { createUploadStageMessage, isLargeMediaFile } from "@/lib/mediaUpload";
import { uploadNoteMediaDirectly, type UploadedNoteMedia } from "@/lib/noteUpload";
import { validateNoteAudioFile, validateNoteImageFile, validateNoteVideoFile } from "@/lib/noteValidation";
import { VoiceRecorder } from "./VoiceRecorder";
import { classifyUploadError } from "@/lib/uploadError";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import { enqueueSyncItem } from "@/lib/syncQueue";
import type { AppSide } from "@/lib/appIdentity";

type Draft = {
  content: string;
  displayStyle: "sticky" | "postcard" | "bubble" | "photo_card" | "timeline" | "minimal" | "romantic";
  mood: string;
};

const CORE_STYLES = [
  { value: "sticky" as const, label: "便签" },
  { value: "postcard" as const, label: "明信片" },
  { value: "minimal" as const, label: "极简" },
];

const EXTRA_STYLES = [
  { value: "bubble" as const, label: "气泡" },
  { value: "photo_card" as const, label: "照片卡" },
  { value: "timeline" as const, label: "时间线" },
  { value: "romantic" as const, label: "浪漫" },
];

const moods = ["开心", "想你", "累了", "记录一下", "加油", "今日小事", "重要", "悄悄话"];

export function NoteComposer({ onCreated, identityId: propIdentityId, side }: { onCreated: () => Promise<void> | void; identityId?: string; side?: AppSide }) {
  const [draft, setDraft] = useState<Draft>({ content: "", displayStyle: "sticky", mood: "" });
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | Blob | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadCanRetry, setUploadCanRetry] = useState(false);
  const [showExtraStyles, setShowExtraStyles] = useState(false);
  const cancelRef = useRef(false);

  const code = getDefaultSpaceCode();
  const author = propIdentityId || DEFAULT_NORMAL_IDENTITY_ID;
  const isOwner = side === "owner";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!draft.content.trim() && !image && !video && !audio) {
      setMessage("小纸条至少需要文字、语音、图片或视频中的一种。");
      return;
    }
    if (image) {
      const validation = validateNoteImageFile(image);
      if (!validation.ok) return setMessage(validation.error || "图片不符合要求。");
    }
    if (video) {
      const validation = validateNoteVideoFile(video);
      if (!validation.ok) return setMessage(validation.error || "视频不符合要求。");
    }
    if (audio) {
      const validation = validateNoteAudioFile(audio as Blob & { name?: string });
      if (!validation.ok) return setMessage(validation.error || "语音不符合要求。");
    }

    setSubmitting(true);
    setUploadCanRetry(false);
    cancelRef.current = false;
    let uploadedImage: UploadedNoteMedia | null = null;
    let uploadedVideo: UploadedNoteMedia | null = null;
    let uploadedAudio: UploadedNoteMedia | null = null;
    try {
      if (image) {
        setMessage(`${createUploadStageMessage("upload_image")}${isLargeMediaFile(image, "image") ? "，文件较大，可能较慢" : ""}`);
        uploadedImage = await uploadNoteMediaDirectly(image, "images", code, author);
        if (cancelRef.current) throw new Error("上传已取消。");
      }
      if (audio) {
        setMessage(createUploadStageMessage("upload_audio"));
        uploadedAudio = await uploadNoteMediaDirectly(audio, "audio", code, author);
        if (cancelRef.current) throw new Error("上传已取消。");
      }
      if (video) {
        setMessage(`${createUploadStageMessage("upload_video")}${isLargeMediaFile(video, "video") ? "，手机端上传可能较慢" : ""}`);
        uploadedVideo = await uploadNoteMediaDirectly(video, "videos", code, author);
        if (cancelRef.current) throw new Error("上传已取消。");
      }
      setMessage(createUploadStageMessage("save"));
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          author,
          identity: author,
          content: draft.content,
          display_style: draft.displayStyle,
          mood: draft.mood || undefined,
          image_path: uploadedImage?.path,
          audio_path: uploadedAudio?.path,
          video_path: uploadedVideo?.path,
          media_size: (uploadedImage?.size || 0) + (uploadedAudio?.size || 0) + (uploadedVideo?.size || 0)
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage([payload.error || "文件已上传，但记录保存失败，请重试保存。", payload.code ? `code: ${payload.code}` : "", payload.step ? `step: ${payload.step}` : "", payload.detail ? `detail: ${payload.detail}` : ""].filter(Boolean).join(" · "));
        setUploadCanRetry(true);
        enqueueSyncItem({ type: "note", method: "POST", url: "/api/notes", body: { code, author, identity: author, content: draft.content, display_style: draft.displayStyle, mood: draft.mood || undefined }, spaceCode: code, identity: author });
        return;
      }
      setDraft({ content: "", displayStyle: "sticky", mood: "" });
      setImage(null);
      setVideo(null);
      setAudio(null);
      setUploadCanRetry(false);
      toast.success("小纸条已贴到墙上 ✨");
      await onCreated();
    } catch (error) {
      const info = classifyUploadError(error, {
        fileKind: video ? "video" : image ? "image" : audio ? "audio" : undefined,
        fileSize: video?.size || image?.size || (audio as Blob)?.size || undefined,
        fileType: video?.type || image?.type || (audio as Blob)?.type || undefined,
      });
      setMessage(info.friendlyMessage);
      setUploadCanRetry(info.canRetry);
      toast.error(info.friendlyMessage);
    } finally {
      setSubmitting(false);
    }
  }

  const isCoreStyle = CORE_STYLES.some((s) => s.value === draft.displayStyle);

  return (
    <form className="soft-card space-y-3 bg-gradient-to-br from-white/85 to-blush/45" onSubmit={submit}>
      {/* Header */}
      <div>
        <h2 className="font-semibold text-cocoa">{isOwner ? "写给小乖" : "写一张小纸条"}</h2>
      </div>

      {/* Style selector — 3 core + foldable extras */}
      <div>
        <p className="text-xs text-cocoa/40 mb-1.5">样式</p>
        <div className="flex flex-wrap gap-1.5">
          {CORE_STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                draft.displayStyle === s.value
                  ? "bg-rose-400 text-white shadow-sm"
                  : "bg-white/60 text-cocoa/60 hover:bg-white/85"
              }`}
              onClick={() => setDraft({ ...draft, displayStyle: s.value })}
              aria-label={`样式：${s.label}`}
            >
              {s.label}
            </button>
          ))}
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              !isCoreStyle
                ? "bg-rose-400 text-white shadow-sm"
                : "bg-white/60 text-cocoa/60 hover:bg-white/85"
            }`}
            onClick={() => setShowExtraStyles(!showExtraStyles)}
            aria-label={showExtraStyles ? "收起更多样式" : "更多样式"}
          >
            {showExtraStyles ? "收起" : !isCoreStyle ? EXTRA_STYLES.find((s) => s.value === draft.displayStyle)?.label || "更多" : "更多"}
          </button>
        </div>
        {showExtraStyles && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {EXTRA_STYLES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  draft.displayStyle === s.value
                    ? "bg-rose-400 text-white shadow-sm"
                    : "bg-white/60 text-cocoa/60 hover:bg-white/85"
                }`}
                onClick={() => setDraft({ ...draft, displayStyle: s.value })}
                aria-label={`样式：${s.label}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mood — compact chips */}
      <div>
        <p className="text-xs text-cocoa/40 mb-1.5">心情</p>
        <div className="flex flex-wrap gap-1.5">
          {moods.map((mood) => (
            <button
              key={mood}
              type="button"
              className={`rounded-full px-2.5 py-1 text-xs transition ${
                draft.mood === mood
                  ? "bg-rose-400 text-white shadow-sm"
                  : "bg-white/60 text-cocoa/60 hover:bg-white/85"
              }`}
              onClick={() => setDraft({ ...draft, mood: draft.mood === mood ? "" : mood })}
              aria-label={`心情：${mood}${draft.mood === mood ? "（已选）" : ""}`}
            >
              {mood}
            </button>
          ))}
        </div>
      </div>

      {/* Text input */}
      <textarea
        className="field min-h-28"
        placeholder={isOwner ? "想对小乖说什么？" : "今天想写点什么？"}
        value={draft.content}
        onChange={(event) => setDraft({ ...draft, content: event.target.value })}
        aria-label="小纸条内容"
      />

      {/* Voice recorder */}
      <VoiceRecorder onChange={setAudio} />

      {/* Media buttons — one row */}
      <div>
        <p className="text-xs text-cocoa/40 mb-1.5">添加</p>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1.5 text-xs font-medium text-cocoa/65 hover:bg-white/85 transition cursor-pointer">
            📷 照片
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
              className="sr-only"
              onChange={(event) => setImage(event.currentTarget.files?.[0] || null)}
              aria-label="添加照片"
            />
          </label>
          <label className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1.5 text-xs font-medium text-cocoa/65 hover:bg-white/85 transition cursor-pointer">
            🎬 视频
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm,.mov,.mp4,.webm"
              className="sr-only"
              onChange={(event) => setVideo(event.currentTarget.files?.[0] || null)}
              aria-label="添加视频"
            />
          </label>
          <label className="inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1.5 text-xs font-medium text-cocoa/65 hover:bg-white/85 transition cursor-pointer">
            🎵 音频
            <input
              type="file"
              accept="audio/*,.m4a,.mp3,.wav,.webm,.aac"
              className="sr-only"
              onChange={(event) => setAudio(event.currentTarget.files?.[0] || audio)}
              aria-label="添加音频文件"
            />
          </label>
        </div>
      </div>

      {/* File preview state */}
      {image && (
        <div className="rounded-lg bg-white/60 px-3 py-1.5 text-xs text-cocoa/60">
          已选照片：{image.name}
        </div>
      )}
      {video && (
        <div className="rounded-lg bg-white/60 px-3 py-1.5 text-xs text-cocoa/60">
          已选视频：{video.name}
        </div>
      )}
      {(audio instanceof File) && (
        <div className="rounded-lg bg-white/60 px-3 py-1.5 text-xs text-cocoa/60">
          已选音频：{audio.name}
        </div>
      )}

      {/* Upload progress */}
      {submitting ? (
        <div className="space-y-2">
          <div className="rounded-full h-1.5 w-full overflow-hidden bg-[var(--app-card-border)]">
            <motion.div
              className="h-full rounded-full bg-[var(--app-accent)]"
              animate={{ width: ["0%", "65%", "80%", "88%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", times: [0, 0.4, 0.7, 1] }}
            />
          </div>
          <p className="text-center text-xs text-[var(--app-muted)]">{message || "上传中..."}</p>
        </div>
      ) : message ? (
        <p className="text-xs text-rose/60">{message}</p>
      ) : null}

      {/* Submit + cancel */}
      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={submitting} type="submit">
          {submitting ? "请稍候..." : (isOwner ? "写给小乖" : "贴到墙上")}
        </button>
        {submitting ? (
          <button className="btn-secondary" type="button" onClick={() => { cancelRef.current = true; setMessage("正在取消上传..."); }}>
            取消
          </button>
        ) : uploadCanRetry && message ? (
          <button className="btn-secondary" type="submit">重试上传</button>
        ) : null}
      </div>
    </form>
  );
}
