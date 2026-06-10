"use client";

import { cn } from "@/lib/utils";
import { Download, Image as ImageIcon, Video, Music } from "lucide-react";

type MediaType = "image" | "video" | "audio";

interface MediaActionButtonProps {
  mediaType?: MediaType;
  downloadUrl?: string;
  label?: string;
  className?: string;
}

const mediaTypeIcon: Record<MediaType, React.ReactNode> = {
  image: <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />,
  video: <Video className="h-3.5 w-3.5" aria-hidden="true" />,
  audio: <Music className="h-3.5 w-3.5" aria-hidden="true" />,
};

const mediaTypeLabel: Record<MediaType, string> = {
  image: "保存图片",
  video: "保存视频",
  audio: "保存音频",
};

export function MediaActionButton({
  mediaType = "image",
  downloadUrl,
  label,
  className,
}: MediaActionButtonProps) {
  if (!downloadUrl) return null;

  return (
    <a
      href={downloadUrl}
      download
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label || mediaTypeLabel[mediaType]}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-white/60 bg-white/60 px-3 py-1.5 text-xs font-medium text-cocoa shadow-sm backdrop-blur-sm transition-all duration-200",
        "hover:bg-white/85 active:scale-[var(--tap-scale)]",
        "min-h-[40px] min-w-[40px]",
        className
      )}
    >
      {mediaTypeIcon[mediaType]}
      <Download className="h-3.5 w-3.5" />
      <span>{label || mediaTypeLabel[mediaType]}</span>
    </a>
  );
}
