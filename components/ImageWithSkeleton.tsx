"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAccessibleMotion } from "@/lib/design/motion";

interface ImageWithSkeletonProps {
  src: string;
  alt: string;
  className?: string;
  /** 如果为 true 使用 3:4 比例（相册卡片），否则 square */
  aspectRatio?: "square" | "portrait" | "video";
  /** 视频封面 fallback */
  showPlayIcon?: boolean;
}

/**
 * 图片加载前显示骨架屏，加载完成后 opacity fade-in。
 * 加载失败显示优雅 fallback，不撑破卡片。
 * skeleton 颜色使用 CSS 变量，跟随主题。
 * 支持 prefers-reduced-motion。
 */
export function ImageWithSkeleton({
  src,
  alt,
  className,
  aspectRatio = "square",
  showPlayIcon = false,
}: ImageWithSkeletonProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const reduceMotion = useAccessibleMotion();

  const aspectClass =
    aspectRatio === "portrait"
      ? "aspect-[3/4]"
      : aspectRatio === "video"
        ? "aspect-video"
        : "aspect-square";

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => setError(true), []);

  return (
    <div className={cn("relative overflow-hidden bg-[var(--app-card-border)]", aspectClass, className)}>
      {/* Skeleton — 使用主题变量颜色，尊重 reduced-motion */}
      {!loaded && !error && (
        <motion.div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(110deg, var(--app-card-bg, #f5f0eb) 30%, var(--app-card-border, #e8e0d8) 50%, var(--app-card-bg, #f5f0eb) 70%)",
            backgroundSize: "200% 100%",
          }}
          animate={
            reduceMotion
              ? { opacity: 0.5 }
              : {
                  opacity: [0.4, 0.7, 0.4],
                  transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" },
                }
          }
        />
      )}

      {/* Error fallback */}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--app-card-bg)] text-[var(--app-muted)]">
          <span className="text-2xl">{showPlayIcon ? "▶" : "🖼"}</span>
          <span className="mt-1 text-[10px]">图片加载失败</span>
        </div>
      ) : (
        <motion.img
          src={src}
          alt={alt}
          className={cn(
            "h-full w-full object-cover",
            !loaded && "invisible",
          )}
          initial={reduceMotion ? undefined : { opacity: 0 }}
          animate={loaded ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}

      {/* 视频播放图标覆盖层 */}
      {showPlayIcon && loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <span className="text-3xl text-white drop-shadow-lg">▶</span>
        </div>
      )}
    </div>
  );
}