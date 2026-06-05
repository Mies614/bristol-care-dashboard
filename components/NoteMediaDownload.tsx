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

  return (
    <a
      href={url}
      download
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1.5 text-xs font-medium text-cocoa/65 hover:bg-white/80 transition-colors ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {getNoteMediaDownloadLabel(note)}
    </a>
  );
}