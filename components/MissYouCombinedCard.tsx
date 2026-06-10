"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import { useAccessibleMotion, safeVariants, staggerItem } from "@/lib/design/motion";

// ─── Types ───────────────────────────────────────────────

interface MissYouData {
  todayCount: number;
  todayByAuthor: Record<string, number>;
  lastEvent: { created_at: string; author: string; message: string } | null;
  viewer: string | null;
  lastSeenAt: string | null;
  unreadFromOtherCount: number;
  unreadFromOtherEvents: Array<{ id: string; author: string; message: string; created_at: string }>;
}

interface HeartSprite {
  id: number;
  x: number;
  delay: number;
  drift: "center" | "left" | "right";
  char: string;
  size: number;
}

interface PendingItem {
  id: string;
  author: string;
  recipient: string;
  message: string;
  localDate: string;
  createdAt: string;
}

// ─── Constants ───────────────────────────────────────────

const HEART_CHARS = ["♥", "♡", "❤", "💕", "💗"];
const DRIFT_DIRS: HeartSprite["drift"][] = ["center", "left", "right"];
const FEEDBACK_MESSAGES = [
  "收到啦，这一下会被好好收起来。",
  "我也会想你。",
  "这一刻已经放进今天的小心事里。",
  "想你这件事，今天也有记录啦。",
  "这一下轻轻的，但很重要。",
];

// ─── Intensity levels ────────────────────────────────────
// Based on the user's own todayCount

type Intensity = "quiet" | "warm" | "glowing" | "full" | "overflow";

function getIntensity(selfCount: number): Intensity {
  if (selfCount === 0) return "quiet";
  if (selfCount <= 2) return "warm";
  if (selfCount <= 5) return "glowing";
  if (selfCount <= 9) return "full";
  return "overflow";
}

function getIntensityLabel(intensity: Intensity, identityId: string): string {
  const isOwner = identityId === "me";
  switch (intensity) {
    case "quiet":
      return isOwner ? "今天还没想小乖" : "今天还没按下想你";
    case "warm":
      return isOwner ? "今天想了小乖几次" : "今天想了他几次";
    case "glowing":
      return isOwner ? "今天有点想小乖" : "今天有点想他";
    case "full":
      return isOwner ? "今天很想小乖" : "今天很想他";
    case "overflow":
      return isOwner ? "想念快装满了" : "想念快装满了";
  }
}

function getIntensityEmoji(intensity: Intensity): string {
  switch (intensity) {
    case "quiet": return "💭";
    case "warm": return "💕";
    case "glowing": return "💗";
    case "full": return "💝";
    case "overflow": return "💖";
  }
}

function getIntensityBg(intensity: Intensity): string {
  switch (intensity) {
    case "quiet":
      return "bg-gradient-to-br from-white/88 via-white/80 to-white/80";
    case "warm":
      return "bg-gradient-to-br from-white/88 via-blush/20 to-white/80";
    case "glowing":
      return "bg-gradient-to-br from-white/88 via-blush/35 to-roseSoft/20";
    case "full":
      return "bg-gradient-to-br from-white/90 via-blush/50 to-roseSoft/30";
    case "overflow":
      return "bg-gradient-to-br from-white/92 via-blush/60 to-roseSoft/40";
  }
}

function getIntensityGlow(intensity: Intensity): string {
  if (intensity === "quiet" || intensity === "warm") return "";
  if (intensity === "overflow") return "shadow-glow animate-heart-glow";
  if (intensity === "full") return "shadow-glow";
  return "shadow-soft";
}

function getHeartCount(intensity: Intensity): number {
  switch (intensity) {
    case "quiet": return 0;
    case "warm": return 0;
    case "glowing": return 2;
    case "full": return 3;
    case "overflow": return 5;
  }
}

// ─── Helpers ─────────────────────────────────────────────

function getLocalDateKey(): string {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

function getMissYouFeedback(count: number): string {
  if (count >= 5) return "今天的想念有点满。";
  if (count >= 3) return "又想你了。";
  if (count === 0) return "点一下，就把这一刻收起来。";
  return FEEDBACK_MESSAGES[Math.floor(Math.random() * FEEDBACK_MESSAGES.length)];
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return "刚刚";
    if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `今天 ${hours}:${minutes}`;
  } catch {
    return "";
  }
}

function getPendingKey(identityId: string): string {
  return `bristol_dashboard_pending_miss_you_${identityId}`;
}

function loadPendingQueue(identityId: string): PendingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getPendingKey(identityId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePendingQueue(identityId: string, items: PendingItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getPendingKey(identityId), JSON.stringify(items));
  } catch {
    // Storage unavailable
  }
}

function getRecipientForAuthor(author: string): string {
  return author === "me" ? "xiaoguai" : "me";
}

function getOtherIdentityLabel(identityId: string): string {
  return identityId === "me" ? "小乖" : "他";
}

function getSelfActionLabel(identityId: string): string {
  return identityId === "me" ? "想小乖一下" : "想他一下";
}

function getCardTitle(identityId: string): string {
  return identityId === "me" ? "想小乖" : "想你";
}

// ─── Component ───────────────────────────────────────────

export interface MissYouCombinedCardProps {
  spaceCode?: string;
  identityId?: string;
  appSide?: "partner" | "owner";
  variant?: "default" | "compact";
}

let heartIdCounter = 0;

export function MissYouCombinedCard({ spaceCode: propSpaceCode, identityId: propIdentityId, appSide: _appSide, variant = "default" }: MissYouCombinedCardProps = {}) {
  const identityId = propIdentityId || DEFAULT_NORMAL_IDENTITY_ID;
  const spaceCode = propSpaceCode || getDefaultSpaceCode();
  const isCompact = variant === "compact";
  const isOwner = identityId === "me";

  const [data, setData] = useState<MissYouData>({
    todayCount: 0,
    todayByAuthor: {},
    lastEvent: null,
    viewer: null,
    lastSeenAt: null,
    unreadFromOtherCount: 0,
    unreadFromOtherEvents: []
  });
  const [loading, setLoading] = useState(false);
  const [sprites, setSprites] = useState<HeartSprite[]>([]);
  const [countBump, setCountBump] = useState(false);
  const [markingSeen, setMarkingSeen] = useState(false);
  const localDate = getLocalDateKey();
  const reduceMotion = useAccessibleMotion();
  const spriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup sprite timer on unmount
  useEffect(() => {
    return () => {
      if (spriteTimerRef.current) clearTimeout(spriteTimerRef.current);
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/miss-you?spaceCode=${encodeURIComponent(spaceCode)}&localDate=${localDate}&limit=1&viewer=${encodeURIComponent(identityId)}&includeUnread=true`
      );
      const payload = await response.json();
      if (payload.ok) {
        setData({
          todayCount: payload.todayCount,
          todayByAuthor: payload.todayByAuthor || {},
          lastEvent: payload.lastEvent,
          viewer: payload.viewer,
          lastSeenAt: payload.lastSeenAt,
          unreadFromOtherCount: payload.unreadFromOtherCount,
          unreadFromOtherEvents: payload.unreadFromOtherEvents || [],
        });
      }
    } catch {
      // Silently fail — miss-you data is optional for first paint
    }
  }, [spaceCode, localDate, identityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Handle mark-seen ──────────────────

  const handleMarkSeen = useCallback(async () => {
    if (!data.unreadFromOtherEvents.length) return;
    setMarkingSeen(true);
    try {
      const lastTime = data.unreadFromOtherEvents[0].created_at;
      await fetch("/api/miss-you", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceCode,
          action: "markSeen",
          lastSeenAt: lastTime,
          viewer: identityId,
        }),
      });
      setData((prev) => ({ ...prev, unreadFromOtherCount: 0, unreadFromOtherEvents: [] }));
    } catch {
      // Mark-seen failures are non-blocking
    } finally {
      setMarkingSeen(false);
    }
  }, [data.unreadFromOtherEvents, spaceCode, identityId]);

  // ─── Handle click — heart burst + mutation ──────────────────

  const handleClick = useCallback(async () => {
    setLoading(true);
    setCountBump(true);
    setTimeout(() => setCountBump(false), 400);

    // Spawn heart sprites
    if (!reduceMotion) {
      const count = isCompact ? 2 : 4;
      const newSprites: HeartSprite[] = [];
      for (let i = 0; i < count; i++) {
        newSprites.push({
          id: ++heartIdCounter,
          x: 20 + Math.random() * 60,           // 20-80% from left
          delay: i * 60 + Math.random() * 40,    // staggered 60-100ms apart
          drift: DRIFT_DIRS[Math.floor(Math.random() * DRIFT_DIRS.length)],
          char: HEART_CHARS[Math.floor(Math.random() * HEART_CHARS.length)],
          size: 0.8 + Math.random() * 0.8,       // 0.8-1.6rem scale
        });
      }
      setSprites((prev) => [...prev, ...newSprites]);

      // Cleanup sprites after animation completes
      if (spriteTimerRef.current) clearTimeout(spriteTimerRef.current);
      spriteTimerRef.current = setTimeout(() => {
        setSprites((prev) => prev.filter((s) => !newSprites.includes(s)));
      }, 1500);
    }

    try {
      const response = await fetch("/api/miss-you", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceCode,
          author: identityId,
          recipient: getRecipientForAuthor(identityId),
          message: "想你一下",
          localDate,
        }),
      });
      const payload = await response.json();
      if (payload.ok) {
        // Optimistically update count
        setData((prev) => {
          const byAuthor = { ...prev.todayByAuthor };
          byAuthor[identityId] = (byAuthor[identityId] || 0) + 1;
          return {
            ...prev,
            todayCount: prev.todayCount + 1,
            todayByAuthor: byAuthor,
            lastEvent: payload.event || prev.lastEvent,
          };
        });
        const feedback = getMissYouFeedback((data.todayByAuthor[identityId] || 0) + 1);
        toast(feedback);
      } else {
        // Queue locally
        const pending = loadPendingQueue(identityId);
        pending.push({
          id: `pending_${Date.now()}`,
          author: identityId,
          recipient: getRecipientForAuthor(identityId),
          message: "想你一下",
          localDate,
          createdAt: new Date().toISOString()
        });
        savePendingQueue(identityId, pending);
        toast("网络慢了一点，先帮你存在本机。");
      }
    } catch {
      const pending = loadPendingQueue(identityId);
      pending.push({
        id: `pending_${Date.now()}`,
        author: identityId,
        recipient: getRecipientForAuthor(identityId),
        message: "想你一下",
        localDate,
        createdAt: new Date().toISOString()
      });
      savePendingQueue(identityId, pending);
      toast("网络慢了一点，先帮你存在本机。");
    } finally {
      setLoading(false);
      
    }
  }, [spaceCode, identityId, localDate, reduceMotion, isCompact, data.todayByAuthor]);

  const hasUnread = data.unreadFromOtherCount > 0;
  const todaysYouCount = data.todayByAuthor[identityId] || 0;
  const otherLabel = getOtherIdentityLabel(identityId);
  const buttonLabel = getSelfActionLabel(identityId);
  const cardTitle = getCardTitle(identityId);
  const partnerIdentity = identityId === "me" ? DEFAULT_NORMAL_IDENTITY_ID : "me";
  const partnerTodayCount = data.todayByAuthor[partnerIdentity] || 0;
  const partnerLatestEvent = data.unreadFromOtherEvents?.[0] ?? data.lastEvent;
  const partnerLatestTime: string | null = partnerLatestEvent && partnerLatestEvent.author === partnerIdentity
    ? formatTime(partnerLatestEvent.created_at)
    : null;

  const intensity = getIntensity(todaysYouCount);
  const intensityLabel = getIntensityLabel(intensity, identityId);
  const intensityEmoji = getIntensityEmoji(intensity);
  const bgClass = getIntensityBg(intensity);
  const glowClass = getIntensityGlow(intensity);
  const ambientHearts = getHeartCount(intensity);

  // ── Shared button component ─────────────────────────────

  const missYouButton = (
    <button
      className={`btn-primary btn-small text-[11px] transition-all duration-200 active:scale-[0.96] ${
        countBump ? "animate-count-bump" : ""
      }`}
      disabled={loading}
      onClick={handleClick}
      aria-label={buttonLabel}
    >
      {loading ? "..." : buttonLabel}
    </button>
  );

  const markSeenButton = hasUnread ? (
    <button
      className="btn-secondary btn-small text-[11px]"
      disabled={markingSeen}
      onClick={handleMarkSeen}
      aria-label="标记为已读"
    >
      {markingSeen ? "..." : "知道啦"}
    </button>
  ) : null;

  // ── Heart sprites render helper ─────────────────────────

  const renderSprites = () => {
    if (reduceMotion || sprites.length === 0) return null;
    return sprites.map((sprite) => {
      const animClass =
        sprite.drift === "left" ? "animate-heart-float-left"
        : sprite.drift === "right" ? "animate-heart-float-right"
        : "animate-heart-float";
      return (
        <span
          key={sprite.id}
          className={`pointer-events-none absolute z-20 ${animClass}`}
          style={{
            left: `${sprite.x}%`,
            bottom: "20%",
            animationDelay: `${sprite.delay}ms`,
            fontSize: `${sprite.size}rem`,
          }}
          aria-hidden="true"
        >
          {sprite.char}
        </span>
      );
    });
  };

  // ── Ambient heart cluster ───────────────────────────────

  const renderAmbientHearts = () => {
    if (ambientHearts === 0 || isCompact) return null;
    return (
      <div className="mt-1.5 flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: ambientHearts }).map((_, i) => (
          <span
            key={i}
            className="inline-block animate-heart-pop text-xs text-rose-300/70"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            ♥
          </span>
        ))}
        {todaysYouCount > 5 && (
          <span className="ml-1 text-[10px] text-rose-300/60">
            ×{todaysYouCount}
          </span>
        )}
      </div>
    );
  };

  // ── Compact mode ────────────────────────────────────────

  if (isCompact) {
    return (
      <motion.section
        className={`soft-card relative overflow-hidden ${bgClass}`}
        variants={safeVariants(staggerItem, reduceMotion)}
      >
        {renderSprites()}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-cocoa/70">
              {intensityEmoji} {cardTitle}
              {partnerTodayCount > 0 ? ` · ${otherLabel}今天想你 ${partnerTodayCount} 次` : ""}
            </p>
            {partnerTodayCount > 0 && partnerLatestTime ? (
              <p className="mt-0.5 text-xs text-cocoa/45">
                上次想你 {partnerLatestTime}
              </p>
            ) : partnerTodayCount === 0 ? (
              <p className="mt-0.5 text-xs text-cocoa/40">
                还没收到{otherLabel}今天的想念
              </p>
            ) : null}
            {todaysYouCount > 0 && (
              <p className={`mt-0.5 text-xs ${countBump ? "animate-count-bump" : ""} ${intensity === "quiet" ? "text-cocoa/30" : intensity === "warm" ? "text-rose-400/70" : "text-rose-500/80"}`}>
                {intensityLabel}
              </p>
            )}
            {reduceMotion && todaysYouCount > 2 && renderAmbientHearts()}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {markSeenButton}
            {missYouButton}
          </div>
        </div>
      </motion.section>
    );
  }

  // ── Default mode ────────────────────────────────────────

  return (
    <motion.section
      className={`soft-card relative overflow-hidden ${bgClass} ${glowClass}`}
      variants={safeVariants(staggerItem, reduceMotion)}
    >
      {renderSprites()}

      <div className="relative z-10">
        {/* ── 标题 + 强度提示 ── */}
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-cocoa/70">
            {cardTitle}
            {todaysYouCount > 0 ? ` · 今天已想了 ${todaysYouCount} 次` : ""}
          </p>
          {todaysYouCount > 0 && (
            <span
              className={`inline-block text-xs font-medium ${countBump ? "animate-count-bump" : ""} ${
                intensity === "quiet" ? "text-cocoa/30"
                : intensity === "warm" ? "text-rose-400/60"
                : intensity === "glowing" ? "text-rose-400/80"
                : intensity === "full" ? "text-rose-500/90"
                : "text-rose-500"
              }`}
            >
              {intensityLabel}
            </span>
          )}
        </div>

        <p className="mt-0.5 text-xs text-cocoa/50">
          {isOwner ? "给她发一个轻轻的想念。" : "点一下，就把这一刻收起来。"}
        </p>

        {/* ── 强度爱心指示 ── */}
        <div className="mt-2 flex items-center gap-3">
          {/* Ambient heart cluster */}
          {intensity !== "quiet" && renderAmbientHearts()}

          {/* Count display for reduced motion */}
          {reduceMotion && todaysYouCount > 0 && (
            <span className="text-xs text-rose-400/70">
              {intensityEmoji} {intensityLabel}
            </span>
          )}
        </div>

        {/* ── 收到统计 ── */}
        {partnerTodayCount > 0 ? (
          <p className="mt-1.5 text-xs text-cocoa/50">
            💕 {otherLabel}今天想你 {partnerTodayCount} 次
            {partnerLatestTime ? ` · 上次 ${partnerLatestTime}` : ""}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-cocoa/40">
            还没收到{otherLabel}今天的想念
          </p>
        )}

        {/* ── 按钮组 ── */}
        <div className="mt-2.5 flex items-center gap-2">
          {missYouButton}
          {markSeenButton}
        </div>
      </div>
    </motion.section>
  );
}
