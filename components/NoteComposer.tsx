"use client";

import { useState } from "react";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { uploadNoteMediaDirectly, type UploadedNoteMedia } from "@/lib/noteUpload";
import { validateNoteAudioFile, validateNoteImageFile, validateNoteVideoFile } from "@/lib/noteValidation";
import { VoiceRecorder } from "./VoiceRecorder";

type Draft = {
  author: "me" | "xiaoguai";
  content: string;
  displayStyle: "sticky" | "postcard" | "bubble" | "photo_card" | "timeline";
  mood: string;
};

const moods = ["", "开心", "想你", "累了", "记录一下", "加油", "今日小事"];

function formatError(stage: string, error: unknown) {
  return `stage: ${stage} · detail: ${error instanceof Error ? error.message : String(error || "未知错误")}`;
}

export function NoteComposer({ onCreated }: { onCreated: () => Promise<void> | void }) {
  const [draft, setDraft] = useState<Draft>({ author: "xiaoguai", content: "", displayStyle: "sticky", mood: "" });
  const [image, setImage] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | Blob | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    const code = getDefaultSpaceCode();
    let uploadedImage: UploadedNoteMedia | null = null;
    let uploadedVideo: UploadedNoteMedia | null = null;
    let uploadedAudio: UploadedNoteMedia | null = null;
    try {
      if (image) {
        setMessage("正在上传图片...");
        uploadedImage = await uploadNoteMediaDirectly(image, "images", code);
      }
      if (audio) {
        setMessage("正在上传语音...");
        uploadedAudio = await uploadNoteMediaDirectly(audio, "audio", code);
      }
      if (video) {
        setMessage("正在上传视频...");
        uploadedVideo = await uploadNoteMediaDirectly(video, "videos", code);
      }
      setMessage("正在贴到小纸条墙...");
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          author: draft.author,
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
        setMessage([payload.error || "相册保存失败。", payload.code ? `code: ${payload.code}` : "", payload.step ? `step: ${payload.step}` : "", payload.detail ? `detail: ${payload.detail}` : ""].filter(Boolean).join(" · "));
        return;
      }
      setDraft({ author: "xiaoguai", content: "", displayStyle: "sticky", mood: "" });
      setImage(null);
      setVideo(null);
      setAudio(null);
      setMessage("已经贴到小纸条墙。");
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
      <div className="grid grid-cols-2 gap-2">
        <select className="field" value={draft.author} onChange={(event) => setDraft({ ...draft, author: event.target.value as Draft["author"] })}>
          <option value="xiaoguai">小乖发的</option>
          <option value="me">我发的</option>
        </select>
        <select className="field" value={draft.displayStyle} onChange={(event) => setDraft({ ...draft, displayStyle: event.target.value as Draft["displayStyle"] })}>
          <option value="sticky">便签</option>
          <option value="postcard">明信片</option>
          <option value="bubble">聊天气泡</option>
          <option value="photo_card">照片卡</option>
          <option value="timeline">时间线</option>
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
      <button className="btn-primary w-full" disabled={submitting} type="submit">{submitting ? "提交中..." : "贴到小纸条墙"}</button>
    </form>
  );
}
