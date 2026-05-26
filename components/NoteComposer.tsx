"use client";

import { useRef, useState } from "react";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { createUploadStageMessage, isLargeMediaFile } from "@/lib/mediaUpload";
import { uploadNoteMediaDirectly, type UploadedNoteMedia } from "@/lib/noteUpload";
import { validateNoteAudioFile, validateNoteImageFile, validateNoteVideoFile } from "@/lib/noteValidation";
import { VoiceRecorder } from "./VoiceRecorder";

type Draft = {
  content: string;
  displayStyle: "sticky" | "postcard" | "bubble" | "photo_card" | "timeline" | "minimal" | "romantic";
  mood: string;
};

const moods = ["", "开心", "想你", "累了", "记录一下", "加油", "今日小事", "重要", "悄悄话"];

function formatError(stage: string, error: unknown) {
  return `stage: ${stage} · detail: ${error instanceof Error ? error.message : String(error || "未知错误")}`;
}

export function NoteComposer({ onCreated }: { onCreated: () => Promise<void> | void }) {
  const [draft, setDraft] = useState<Draft>({ content: "", displayStyle: "sticky", mood: "" });
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | Blob | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const cancelRef = useRef(false);

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
    cancelRef.current = false;
    const code = getDefaultSpaceCode();
    let uploadedImage: UploadedNoteMedia | null = null;
    let uploadedVideo: UploadedNoteMedia | null = null;
    let uploadedAudio: UploadedNoteMedia | null = null;
    try {
      if (image) {
        setMessage(`${createUploadStageMessage("upload_image")}${isLargeMediaFile(image, "image") ? "，文件较大，可能较慢" : ""}`);
        uploadedImage = await uploadNoteMediaDirectly(image, "images", code);
        if (cancelRef.current) throw new Error("上传已取消。");
      }
      if (audio) {
        setMessage(createUploadStageMessage("upload_audio"));
        uploadedAudio = await uploadNoteMediaDirectly(audio, "audio", code);
        if (cancelRef.current) throw new Error("上传已取消。");
      }
      if (video) {
        setMessage(`${createUploadStageMessage("upload_video")}${isLargeMediaFile(video, "video") ? "，手机端上传可能较慢" : ""}`);
        uploadedVideo = await uploadNoteMediaDirectly(video, "videos", code);
        if (cancelRef.current) throw new Error("上传已取消。");
      }
      setMessage(createUploadStageMessage("save"));
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          author: "xiaoguai",
          content: draft.content,
          display_style: draft.displayStyle,
          mood: draft.mood || undefined,
          image_url: uploadedImage?.url,
          image_path: uploadedImage?.path,
          audio_url: uploadedAudio?.url,
          audio_path: uploadedAudio?.path,
          video_url: uploadedVideo?.url,
          video_path: uploadedVideo?.path,
          media_size: (uploadedImage?.size || 0) + (uploadedAudio?.size || 0) + (uploadedVideo?.size || 0)
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage([payload.error || "文件已上传，但记录保存失败，请重试保存。", payload.code ? `code: ${payload.code}` : "", payload.step ? `step: ${payload.step}` : "", payload.detail ? `detail: ${payload.detail}` : ""].filter(Boolean).join(" · "));
        return;
      }
      setDraft({ content: "", displayStyle: "sticky", mood: "" });
      setImage(null);
      setVideo(null);
      setAudio(null);
      setMessage(createUploadStageMessage("done"));
      await onCreated();
    } catch (error) {
      setMessage(formatError("upload_or_save_note", error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="soft-card space-y-3 bg-gradient-to-br from-white/85 to-blush/45" onSubmit={submit}>
      <div>
        <p className="section-kicker mb-1">Write</p>
        <h2 className="font-semibold text-cocoa">写一张小纸条</h2>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <select className="field" value={draft.displayStyle} onChange={(event) => setDraft({ ...draft, displayStyle: event.target.value as Draft["displayStyle"] })}>
          <option value="sticky">便签</option>
          <option value="postcard">明信片</option>
          <option value="bubble">聊天气泡</option>
          <option value="photo_card">照片卡</option>
          <option value="timeline">时间线</option>
          <option value="minimal">极简</option>
          <option value="romantic">浪漫</option>
        </select>
      </div>
      <select className="field" value={draft.mood} onChange={(event) => setDraft({ ...draft, mood: event.target.value })}>
        {moods.map((mood) => <option key={mood || "empty"} value={mood}>{mood || "选择心情标签"}</option>)}
      </select>
      <textarea className="field min-h-32" placeholder="想写的话，可以很短，也可以慢慢说。" value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} />
      <VoiceRecorder onChange={setAudio} />
      <label className="file-panel">
        <span className="font-medium text-cocoa">上传已有音频</span>
        <input className="mt-3 block w-full text-sm" type="file" accept="audio/*,.m4a,.mp3,.wav,.webm,.aac" onChange={(event) => setAudio(event.currentTarget.files?.[0] || audio)} />
      </label>
      <label className="file-panel">
        <span className="font-medium text-cocoa">照片</span>
        <input className="mt-3 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif" onChange={(event) => setImage(event.currentTarget.files?.[0] || null)} />
      </label>
      <label className="file-panel">
        <span className="font-medium text-cocoa">视频</span>
        <input className="mt-3 block w-full text-sm" type="file" accept="video/mp4,video/quicktime,video/webm,.mov,.mp4,.webm" onChange={(event) => setVideo(event.currentTarget.files?.[0] || null)} />
      </label>
      {message ? <p className="notice">{message}</p> : null}
      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={submitting} type="submit">{submitting ? "提交中..." : "贴到小纸条墙"}</button>
        {submitting ? <button className="btn-secondary" type="button" onClick={() => { cancelRef.current = true; setMessage("正在取消上传..."); }}>取消</button> : null}
      </div>
    </form>
  );
}
