"use client";

import type { LoveNote } from "@/lib/types";
import { getNoteMediaDownloadUrl, getNoteMediaDownloadLabel } from "@/lib/notesMedia";

export interface NoteMediaDownloadProps {
  note: LoveNote;
  className?: string;
}

export function NoteMediaDownload({ note, className = "" }: NoteMediaDownloadProps) {
  const url = getNoteMediaDownloadUrl(note);
  if (!url) return null;

  const label = getNoteMediaDownloadLabel(note);
  const isVideo = Boolean(note.videoUrl);
  const icon = isVideo ? "🎬" : note.imageUrl ? "🖼️" : "🎵";

  return (
    <a
      href={url}
      download
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-cocoa/65 hover:bg-white/90 hover:text-cocoa/80 active:scale-95 transition-all ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span aria-hidden="true" className="text-[11px]">{icon}</span>
      {label}
    </a>
  );
}
