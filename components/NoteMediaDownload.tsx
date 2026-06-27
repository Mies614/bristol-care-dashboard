"use client";

import { useState } from "react";
import type { LoveNote } from "@/lib/types";
import { hasNoteDownloadableMedia } from "@/lib/notesMedia";
import { downloadPrivateMedia, type DownloadType } from "@/lib/downloadHelper";
import { toast } from "sonner";

export interface NoteMediaDownloadProps {
  note: LoveNote;
  className?: string;
}

function getMediaType(note: LoveNote): DownloadType | null {
  if (note.videoPath) return "video";
  if (note.imagePath) return "image";
  if (note.audioPath) return "audio";
  return null;
}

function getMediaLabel(note: LoveNote): string {
  if (note.videoPath) return "保存视频";
  if (note.imagePath) return "保存图片";
  if (note.audioPath) return "保存语音";
  return "下载";
}

export function NoteMediaDownload({ note, className = "" }: NoteMediaDownloadProps) {
  const [loading, setLoading] = useState(false);

  if (!hasNoteDownloadableMedia(note)) return null;

  const mediaType = getMediaType(note);
  if (!mediaType || !note.id) return null;

  const label = getMediaLabel(note);
  const isVideo = Boolean(note.videoPath);
  const icon = isVideo ? "🎬" : note.imagePath ? "🖼️" : "🎵";

  async function handleDownload(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (loading) return;

    setLoading(true);
    try {
      await downloadPrivateMedia({
        contentType: "note",
        contentId: note.id,
        field: mediaType as DownloadType,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "下载失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-cocoa/65 hover:bg-white/90 hover:text-cocoa/80 active:scale-95 transition-all disabled:opacity-50 ${className}`}
    >
      <span aria-hidden="true" className="text-[11px]">{icon}</span>
      {loading ? "下载中…" : label}
    </button>
  );
}
