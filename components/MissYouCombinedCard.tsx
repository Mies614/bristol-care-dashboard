"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import { useAccessibleMotion, safeVariants, staggerItem } from "@/lib/design/motion";

interface MissYouData {
  todayCount: number;
  todayByAuthor: Record<string, number>;
  lastEvent: { created_at: string; author: string; message: string } | null;
  viewer: string | null;
  lastSeenAt: string | null;
  unreadFromOtherCount: number;
  unreadFromOtherEvents: Array<{ id: string; author: string; message: string; created_at: string }>;
}

const FEEDBACK_MESSAGES = [
  "收到啦，这一下会被好好收起来。",
  "我也会想你。",
  "这一刻已经放进今天的小心事里。",
  "想你这件事，今天也有记录啦。",
  "这一下轻轻的，但很重要。"
];

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

interface PendingItem {
  id: string;
  author: string;
  recipient: string;
  message: string;
  localDate: string;
  createdAt: string;
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

function getCardSubtitle(identityId: string): string {
  return identityId === "me" ? "给她发一个轻轻的想念。" : "点一下，就把这一刻收起来。";
}

export interface MissYouCombinedCardProps {
  spaceCode?: string;
  identityId?: string;
  appSide?: "partner" | "owner";
}

export function MissYouCombinedCard({ spaceCode: propSpaceCode, identityId: propIdentityId, appSide }: MissYouCombinedCardProps = {}) {
  const identityId = propIdentityId || DEFAULT_NORMAL_IDENTITY_ID;
  const spaceCode = propSpaceCode || getDefaultSpaceCode();

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
  const [animating, setAnimating] = useState(false);
  const [hearts, setHearts] = useState<Array<{ id: number; left: number }>>([]);
  const [markingSeen, setMarkingSeen] = useState(false);
  const localDate = getLocalDateKey();
  const reduceMotion = useAccessibleMotion();

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
          unreadFromOtherEvents: payload.unreadFromOtherEvents || []
        });
      }
    } catch {
      // Silent fail
    }
  }, [localDate, spaceCode, identityId]);

  const retryPending = useCallback(async () => {
    const pending = loadPendingQueue(identityId);
    if (pending.length === 0) return;
    const remaining: PendingItem[] = [];
    for (const item of pending) {
      try {
        const response = await fetch("/api/miss-you", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spaceCode,
            author: item.author,
            recipient: item.recipient,
            message: item.message,
            localDate: item.localDate
          })
        });
        const payload = await response.json();
        if (payload.ok) {
          setData((prev) => ({
            ...prev,
            todayCount: payload.todayCount,
            todayByAuthor: payload.todayByAuthor || {}
          }));
          toast.success("已同步成功 ✨");
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }
    savePendingQueue(identityId, remaining);
  }, [spaceCode, identityId]);

  useEffect(() => {
    fetchData();
    retryPending();
    const handleOnline = () => retryPending();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [fetchData, retryPending]);

  async function handleMarkSeen() {
    if (markingSeen) return;
    setMarkingSeen(true);
    try {
      const response = await fetch("/api/miss-you", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceCode, viewer: identityId, action: "mark_seen" })
      });
      const payload = await response.json();
      if (payload.ok) {
        setData((prev) => ({
          ...prev,
          unreadFromOtherCount: 0,
          unreadFromOtherEvents: [],
          lastSeenAt: payload.lastSeenAt
        }));
      }
    } catch {
      // Silent fail
    } finally {
      setMarkingSeen(false);
    }
  }

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      setAnimating(true);
      setHearts((prev) => [...prev, { id: Date.now(), left: 30 + Math.random() * 40 }]);

      const recipient = getRecipientForAuthor(identityId);
      const response = await fetch("/api/miss-you", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceCode,
          author: identityId,
          recipient,
          localDate
        })
      });
      const payload = await response.json();

      if (payload.ok) {
        setData((prev) => ({
          ...prev,
          todayCount: payload.todayCount,
          todayByAuthor: payload.todayByAuthor || {}
        }));
        const feedbackText = getMissYouFeedback(payload.todayCount);
        toast(feedbackText, {
          className: "!rounded-[var(--app-radius)] !border !border-[var(--app-card-border)] !bg-[var(--app-card-bg)] !text-[var(--app-text)]"
        });
      } else {
        const pending = loadPendingQueue(identityId);
        pending.push({
          id: crypto.randomUUID?.() || String(Date.now()),
          author: identityId,
          recipient,
          message: "想你一下",
          localDate,
          createdAt: new Date().toISOString()
        });
        savePendingQueue(identityId, pending);
        const offlineMsg = "网络有点慢，先帮你记在本机了。";
        toast(offlineMsg);
      }
    } catch {
      const pending = loadPendingQueue(identityId);
      pending.push({
        id: crypto.randomUUID?.() || String(Date.now()),
        author: identityId,
        recipient: getRecipientForAuthor(identityId),
        message: "想你一下",
        localDate,
        createdAt: new Date().toISOString()
      });
      savePendingQueue(identityId, pending);
      const offlineMsg = "网络有点慢，先帮你记在本机了。";
      toast(offlineMsg);
    } finally {
      setLoading(false);
      setTimeout(() => setAnimating(false), 600);
    }
  }

  const hasUnread = data.unreadFromOtherCount > 0;
  const todaysYouCount = data.todayByAuthor[identityId] || 0;
  const otherLabel = getOtherIdentityLabel(identityId);
  const buttonLabel = getSelfActionLabel(identityId);
  const cardTitle = getCardTitle(identityId);
  const cardSubtitle = getCardSubtitle(identityId);

  return (
    <motion.section
      className="soft-card relative overflow-hidden bg-gradient-to-br from-white/88 via-blush/45 to-roseSoft/30"
      variants={safeVariants(staggerItem, reduceMotion)}
    >
      {/* ── 飘浮爱心 ── */}
      {hearts.map((heart) => (
        <span
          key={heart.id}
          className="pointer-events-none absolute animate-float-up text-xl"
          style={{ left: `${heart.left}%`, bottom: "20%" }}
          onAnimationEnd={() => setHearts((prev) => prev.filter((h) => h.id !== heart.id))}
        >
          ♥
        </span>
      ))}

      <div className="relative z-10">
        {/* ── 一行标题 + 计数 ── */}
        <p className="text-sm font-semibold text-cocoa/70">
          {cardTitle}{todaysYouCount > 0 ? ` · 今天已想了 ${todaysYouCount} 次` : ""}
        </p>

        <p className="mt-0.5 text-xs text-cocoa/50">{cardSubtitle}</p>

        {/* ── 未读想念（对方发来的） ── */}
        {hasUnread && (
          <p className="mt-1 text-xs text-cocoa/50">
            💕 {otherLabel}也在想你 {data.unreadFromOtherCount} 次
            {data.unreadFromOtherEvents.length > 0 && ` · ${formatTime(data.unreadFromOtherEvents[0].created_at)}`}
          </p>
        )}

        {/* ── 按钮组 ── */}
        <div className="mt-2 flex items-center gap-2">
          <button
            className={`btn-primary btn-small transition-transform ${animating ? "scale-95" : ""}`}
            disabled={loading}
            onClick={handleClick}
          >
            {loading ? "..." : buttonLabel}
          </button>
          {hasUnread && (
            <button
              className="btn-secondary btn-small"
              disabled={markingSeen}
              onClick={handleMarkSeen}
            >
              {markingSeen ? "..." : "知道啦"}
            </button>
          )}
        </div>
      </div>
    </motion.section>
  );
}