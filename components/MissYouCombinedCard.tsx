"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
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

const PENDING_KEY = "bristol_dashboard_pending_miss_you_xiaoguai";

function loadPendingQueue(): PendingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePendingQueue(items: PendingItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(items));
  } catch {
    // Storage unavailable
  }
}

/**
 * MissYouCombinedCard
 *
 * 合并"未读想念"和"想你一下"两个卡片为一个。
 * 同时展示：
 *   - 他想你了 N 次（仅当有未读）
 *   - 你今天想了 N 次
 *   - 最近一次时间
 *   - 想你一下按钮
 *   - 知道啦按钮（仅当有未读）
 */
export function MissYouCombinedCard() {
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
  const [feedback, setFeedback] = useState("");
  const [animating, setAnimating] = useState(false);
  const [hearts, setHearts] = useState<Array<{ id: number; left: number }>>([]);
  const [markingSeen, setMarkingSeen] = useState(false);
  const localDate = getLocalDateKey();
  const reduceMotion = useAccessibleMotion();

  const fetchData = useCallback(async () => {
    try {
      const code = getDefaultSpaceCode();
      const response = await fetch(
        `/api/miss-you?code=${encodeURIComponent(code)}&localDate=${localDate}&limit=1&viewer=xiaoguai&includeUnread=true`
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
  }, [localDate]);

  const retryPending = useCallback(async () => {
    const pending = loadPendingQueue();
    if (pending.length === 0) return;
    const remaining: PendingItem[] = [];
    for (const item of pending) {
      try {
        const code = getDefaultSpaceCode();
        const response = await fetch("/api/miss-you", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
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
    savePendingQueue(remaining);
  }, []);

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
      const code = getDefaultSpaceCode();
      const response = await fetch("/api/miss-you", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, viewer: "xiaoguai", action: "mark_seen" })
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

      const response = await fetch("/api/miss-you", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: getDefaultSpaceCode(),
          author: "xiaoguai",
          recipient: "admin",
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
        setFeedback(feedbackText);
        toast(feedbackText, {
          className: "!rounded-[var(--app-radius)] !border !border-[var(--app-card-border)] !bg-[var(--app-card-bg)] !text-[var(--app-text)]"
        });
      } else {
        const pending = loadPendingQueue();
        pending.push({
          id: crypto.randomUUID?.() || String(Date.now()),
          author: "xiaoguai",
          recipient: "admin",
          message: "想你一下",
          localDate,
          createdAt: new Date().toISOString()
        });
        savePendingQueue(pending);
        const offlineMsg = "已经先帮你记在本地，稍后再同步。";
        setFeedback(offlineMsg);
        toast(offlineMsg);
      }
    } catch {
      const pending = loadPendingQueue();
      pending.push({
        id: crypto.randomUUID?.() || String(Date.now()),
        author: "xiaoguai",
        recipient: "admin",
        message: "想你一下",
        localDate,
        createdAt: new Date().toISOString()
      });
      savePendingQueue(pending);
      const offlineMsg = "已经先帮你记在本地，稍后再同步。";
      setFeedback(offlineMsg);
      toast(offlineMsg);
    } finally {
      setLoading(false);
      setTimeout(() => setAnimating(false), 600);
    }
  }

  const hasUnread = data.unreadFromOtherCount > 0;
  const todaysYouCount = data.todayByAuthor["xiaoguai"] || data.todayCount;

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
        <p className="section-kicker mb-1">想你</p>

        {/* ── 两行计数 ── */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-cocoa">今天也想你</h2>
          {todaysYouCount > 0 && (
            <span className="text-sm font-medium text-cocoa/50 tabular-nums">
              今天已想你 {todaysYouCount} 次
            </span>
          )}
        </div>

        {/* ── 未读想念（admin 端发来的） ── */}
        {hasUnread && (
          <div className="mt-2 rounded-2xl bg-white/65 px-3 py-2">
            <p className="text-sm font-medium text-cocoa">
              💕 他也想你啦 · 你不在时他想你了 <span className="text-base font-bold">{data.unreadFromOtherCount}</span> 次
            </p>
            {data.unreadFromOtherEvents.length > 0 && (
              <p className="mt-0.5 text-xs text-cocoa/50">
                最近一次：{data.unreadFromOtherEvents[0].message} · {formatTime(data.unreadFromOtherEvents[0].created_at)}
              </p>
            )}
          </div>
        )}

        {/* ── 反馈文案 ── */}
        <p className="mt-2.5 text-sm leading-6 text-cocoa/65">
          {loading ? "正在记录..." : feedback || getMissYouFeedback(todaysYouCount)}
        </p>

        {/* ── 按钮组 ── */}
        <div className="mt-3 flex items-center gap-2">
          <button
            className={`btn-primary btn-small transition-transform ${animating ? "scale-95" : ""}`}
            disabled={loading}
            onClick={handleClick}
          >
            {loading ? "..." : "想你一下"}
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