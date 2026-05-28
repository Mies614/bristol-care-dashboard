"use client";

import { useCallback, useEffect, useState } from "react";
import { getDefaultSpaceCode } from "@/lib/cloudSync";

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
  if (count >= 3) return "她又想你了。";
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

export function MissYouButton() {
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
  const [showUnread, setShowUnread] = useState(false);
  const [markingSeen, setMarkingSeen] = useState(false);
  const localDate = getLocalDateKey();

  const fetchData = useCallback(async () => {
    try {
      const code = getDefaultSpaceCode();
      // Fetch with viewer=xiaoguai to get unread info from admin
      const response = await fetch(
        `/api/miss-you?code=${encodeURIComponent(code)}&localDate=${localDate}&limit=1&viewer=xiaoguai`
      );
      const payload = await response.json();
      if (payload.ok) {
        const hasUnread = payload.unreadFromOtherCount > 0;
        setData({
          todayCount: payload.todayCount,
          todayByAuthor: payload.todayByAuthor || {},
          lastEvent: payload.lastEvent,
          viewer: payload.viewer,
          lastSeenAt: payload.lastSeenAt,
          unreadFromOtherCount: payload.unreadFromOtherCount,
          unreadFromOtherEvents: payload.unreadFromOtherEvents || []
        });
        if (hasUnread) setShowUnread(true);
      }
    } catch {
      // Silent fail, data stays as-is
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
          setData((prev) => ({ ...prev, todayCount: payload.todayCount, todayByAuthor: payload.todayByAuthor || {} }));
          setFeedback("已同步成功。");
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
      await fetch("/api/miss-you", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, viewer: "xiaoguai", action: "mark_seen" })
      });
      setShowUnread(false);
      setData((prev) => ({ ...prev, unreadFromOtherCount: 0, unreadFromOtherEvents: [] }));
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

      const code = getDefaultSpaceCode();
      const response = await fetch("/api/miss-you", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
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
        setFeedback(getMissYouFeedback(payload.todayCount));
      } else {
        // Save to pending queue
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
        setFeedback("已经先帮你记在本地，稍后再同步。");
      }
    } catch {
      // Network error - save to pending
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
      setFeedback("已经先帮你记在本地，稍后再同步。");
    } finally {
      setLoading(false);
      setTimeout(() => setAnimating(false), 600);
    }
  }

  // ── Unread card from admin ────────────────────────────────────────
  const unreadCard = showUnread && data.unreadFromOtherCount > 0 ? (
    <div className="mb-4 rounded-2xl bg-white/70 p-4 text-center shadow-sm">
      <div className="mb-1 text-sm text-cocoa/70">✨ 来自他的想念</div>
      <p className="text-base font-medium text-cocoa">
        你不在的时候，他想你了 <span className="text-xl">{data.unreadFromOtherCount}</span> 次。
      </p>
      {data.unreadFromOtherEvents.length > 0 && (
        <p className="mt-1 text-xs text-cocoa/55">
          最近一次：{formatTime(data.unreadFromOtherEvents[0].created_at)}
        </p>
      )}
      <p className="mt-1 text-xs text-cocoa/45">这些想念都帮你收好了。</p>
      <button
        className="btn-secondary btn-small mt-2"
        disabled={markingSeen}
        onClick={handleMarkSeen}
      >
        {markingSeen ? "..." : "知道啦"}
      </button>
    </div>
  ) : null;

  return (
    <section className="soft-card relative overflow-hidden text-center">
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
      <div>
        {unreadCard}

        <p className="section-kicker mb-1">Miss You</p>
        <h2 className="text-lg font-semibold text-cocoa">想你一下</h2>
        <p className="mt-2 text-sm leading-6 text-cocoa/70">
          {loading ? "正在记录..." : feedback || getMissYouFeedback(data.todayCount)}
        </p>
        <button
          className={`btn-primary mt-4 min-w-32 transition-transform ${animating ? "scale-95" : ""}`}
          disabled={loading}
          onClick={handleClick}
        >
          {loading ? "..." : "想你一下"}
        </button>
        {data.todayCount > 0 && (
          <p className="mt-3 text-xs text-cocoa/55">
            今天已经想你 {data.todayByAuthor["xiaoguai"] || data.todayCount} 次。
          </p>
        )}
      </div>
    </section>
  );
}