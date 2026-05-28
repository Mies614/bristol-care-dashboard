"use client";

import { useCallback, useEffect, useState } from "react";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { isPushSupported, subscribeToPush, unsubscribePush, registerServiceWorker } from "@/lib/pushClient";

interface MissYouStats {
  todayCount: number;
  todayByAuthor: Record<string, number>;
  todayDate: string;
  viewer: string | null;
  lastSeenAt: string | null;
  unreadFromOtherCount: number;
  unreadFromOtherEvents: Array<{ id: string; author: string; message: string; created_at: string }>;
}

interface PushStatus {
  supportedByServer: boolean;
  publicKey: string | null;
  notificationPermission: NotificationPermission | "unsupported";
  subscriptionStatus: "unknown" | "subscribed" | "not-subscribed";
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

export function MissYouAdminCard() {
  const [stats, setStats] = useState<MissYouStats>({
    todayCount: 0,
    todayByAuthor: {},
    todayDate: "",
    viewer: null,
    lastSeenAt: null,
    unreadFromOtherCount: 0,
    unreadFromOtherEvents: []
  });
  const [loadingStats, setLoadingStats] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushStatus>({
    supportedByServer: false,
    publicKey: null,
    notificationPermission: "unsupported",
    subscriptionStatus: "unknown"
  });
  const [subscribing, setSubscribing] = useState(false);
  const [unsubscribing, setUnsubscribing] = useState(false);
  const [showUnread, setShowUnread] = useState(false);
  const [markingSeen, setMarkingSeen] = useState(false);
  const [sendingMissYou, setSendingMissYou] = useState(false);
  const [sendFeedback, setSendFeedback] = useState("");

  const localDate = new Date().toISOString().split("T")[0];

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const code = getDefaultSpaceCode();
      // Fetch with viewer=admin to get unread from xiaoguai
      const response = await fetch(
        `/api/miss-you?code=${encodeURIComponent(code)}&localDate=${localDate}&limit=10&viewer=admin`
      );
      const payload = await response.json();
      if (payload.ok) {
        const hasUnread = payload.unreadFromOtherCount > 0;
        setStats({
          todayCount: payload.todayCount,
          todayByAuthor: payload.todayByAuthor || {},
          todayDate: localDate,
          viewer: payload.viewer,
          lastSeenAt: payload.lastSeenAt,
          unreadFromOtherCount: payload.unreadFromOtherCount,
          unreadFromOtherEvents: payload.unreadFromOtherEvents || []
        });
        if (hasUnread) setShowUnread(true);
      }
    } catch {
      // Silent fail
    } finally {
      setLoadingStats(false);
    }
  }, [localDate]);

  const checkPushStatus = useCallback(async () => {
    const browserSupported = isPushSupported();
    if (!browserSupported) {
      setPushStatus((prev) => ({
        ...prev,
        notificationPermission: "unsupported",
        subscriptionStatus: "not-subscribed"
      }));
      return;
    }

    const permission = Notification.permission;
    const registration = await registerServiceWorker();
    let existingSub: PushSubscription | null = null;
    if (registration) {
      existingSub = await registration.pushManager.getSubscription();
    }

    let serverStatus = { supportedByServer: false, publicKey: null as string | null };
    try {
      const statusRes = await fetch("/api/push/status");
      const statusPayload = await statusRes.json();
      if (statusPayload.ok) {
        serverStatus = {
          supportedByServer: statusPayload.supportedByServer,
          publicKey: statusPayload.publicKey || null
        };
      }
    } catch {
      // Server status check failed
    }

    setPushStatus({
      supportedByServer: serverStatus.supportedByServer,
      publicKey: serverStatus.publicKey,
      notificationPermission: permission,
      subscriptionStatus: existingSub ? "subscribed" : "not-subscribed"
    });
  }, []);

  useEffect(() => {
    fetchStats();
    checkPushStatus();
  }, [fetchStats, checkPushStatus]);

  async function handleSubscribe() {
    if (subscribing || !pushStatus.publicKey) return;
    setSubscribing(true);
    try {
      const subscription = await subscribeToPush(pushStatus.publicKey);
      if (subscription) {
        const code = getDefaultSpaceCode();
        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            subscription,
            userAgent: navigator.userAgent,
            role: "admin"
          })
        });
        const payload = await response.json();
        if (payload.ok) {
          setPushStatus((prev) => ({ ...prev, subscriptionStatus: "subscribed" }));
        }
      }
    } catch {
      // Subscribe failed
    } finally {
      setSubscribing(false);
    }
  }

  async function handleUnsubscribe() {
    if (unsubscribing) return;
    setUnsubscribing(true);
    try {
      await unsubscribePush();
      setPushStatus((prev) => ({ ...prev, subscriptionStatus: "not-subscribed" }));
    } catch {
      // Unsubscribe failed
    } finally {
      setUnsubscribing(false);
    }
  }

  async function handleMarkSeen() {
    if (markingSeen) return;
    setMarkingSeen(true);
    try {
      const code = getDefaultSpaceCode();
      await fetch("/api/miss-you", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, viewer: "admin", action: "mark_seen" })
      });
      setShowUnread(false);
      setStats((prev) => ({ ...prev, unreadFromOtherCount: 0, unreadFromOtherEvents: [] }));
    } catch {
      // Silent fail
    } finally {
      setMarkingSeen(false);
    }
  }

  async function handleSendMissYou() {
    if (sendingMissYou) return;
    setSendingMissYou(true);
    setSendFeedback("");
    try {
      const code = getDefaultSpaceCode();
      const response = await fetch("/api/miss-you", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          author: "admin",
          recipient: "xiaoguai",
          message: "我也想你一下",
          localDate
        })
      });
      const payload = await response.json();
      if (payload.ok) {
        setStats((prev) => ({
          ...prev,
          todayCount: payload.todayCount,
          todayByAuthor: payload.todayByAuthor || {}
        }));
        setSendFeedback("已经悄悄放进她的小首页。");
      } else {
        setSendFeedback("记录失败，稍后再试。");
      }
    } catch {
      setSendFeedback("网络暂时不可用，稍后再试。");
    } finally {
      setSendingMissYou(false);
    }
  }

  // ── Unread card from xiaoguai ─────────────────────────────────────
  const unreadCard = showUnread && stats.unreadFromOtherCount > 0 ? (
    <div className="rounded-2xl bg-white/70 p-4 text-center shadow-sm">
      <div className="mb-1 text-sm text-cocoa/70">💕 来自小乖的想念</div>
      <p className="text-base font-medium text-cocoa">
        上次之后，小乖想你 <span className="text-xl">{stats.unreadFromOtherCount}</span> 次。
      </p>
      {stats.unreadFromOtherEvents.length > 0 && (
        <div className="mt-1 text-xs text-cocoa/55">
          {stats.unreadFromOtherEvents.slice(0, 3).map((ev) => (
            <p key={ev.id}>
              {formatTime(ev.created_at)} · {ev.message}
            </p>
          ))}
        </div>
      )}
      <p className="mt-1 text-xs text-cocoa/45">这些小小的想念都在这里。</p>
      <button
        className="btn-secondary btn-small mt-2"
        disabled={markingSeen}
        onClick={handleMarkSeen}
      >
        {markingSeen ? "..." : "我看到了"}
      </button>
    </div>
  ) : null;

  return (
    <section className="soft-card space-y-3">
      <div>
        <p className="section-kicker mb-1">Miss You</p>
        <h2 className="font-semibold text-cocoa">想你一下 · 管理</h2>
      </div>

      {/* Stats */}
      <div className="rounded-2xl bg-white/58 p-3 text-sm text-cocoa/70">
        {loadingStats ? (
          <p>加载中...</p>
        ) : (
          <>
            <p>
              今天（{stats.todayDate || localDate}）小乖想你 <strong className="text-cocoa">{stats.todayByAuthor["xiaoguai"] || 0}</strong> 次，
              你想她 <strong className="text-cocoa">{stats.todayByAuthor["admin"] || 0}</strong> 次。
            </p>
            <p className="mt-1 text-xs text-cocoa/45">共 {stats.todayCount} 次</p>
          </>
        )}
        <button className="btn-secondary btn-small mt-2" onClick={fetchStats}>刷新统计</button>
      </div>

      {/* Unread from xiaoguai */}
      {unreadCard}

      {/* Admin send miss you */}
      <div className="rounded-2xl bg-white/58 p-3 text-center">
        <p className="text-sm font-medium text-cocoa">我也想你一下</p>
        <button
          className="btn-primary mt-2 min-w-32"
          disabled={sendingMissYou}
          onClick={handleSendMissYou}
        >
          {sendingMissYou ? "..." : "想她一下"}
        </button>
        {sendFeedback && (
          <p className="mt-2 text-xs text-cocoa/55">{sendFeedback}</p>
        )}
      </div>

      {/* Push Notification Status */}
      <div className="space-y-2 text-sm text-cocoa/70">
        <p className="font-medium text-cocoa">推送通知状态</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/58 p-2.5 text-xs">
            浏览器支持: {pushStatus.notificationPermission === "unsupported" ? "❌ 不支持" : "✅ 支持"}
          </div>
          <div className="rounded-2xl bg-white/58 p-2.5 text-xs">
            权限状态: {pushStatus.notificationPermission === "granted" ? "✅ 已授权" : pushStatus.notificationPermission === "denied" ? "❌ 已拒绝" : pushStatus.notificationPermission === "unsupported" ? "—" : "⏳ 未请求"}
          </div>
          <div className="rounded-2xl bg-white/58 p-2.5 text-xs">
            服务器配置: {pushStatus.supportedByServer ? "✅ 已配置" : "❌ 未配置"}
          </div>
          <div className="rounded-2xl bg-white/58 p-2.5 text-xs">
            订阅状态: {pushStatus.subscriptionStatus === "subscribed" ? "✅ 已订阅" : pushStatus.subscriptionStatus === "not-subscribed" ? "⏳ 未订阅" : "—"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {pushStatus.subscriptionStatus === "not-subscribed" && pushStatus.supportedByServer && (
            <button className="btn-primary btn-small" disabled={subscribing} onClick={handleSubscribe}>
              {subscribing ? "订阅中..." : "订阅推送通知"}
            </button>
          )}
          {pushStatus.subscriptionStatus === "subscribed" && (
            <button className="btn-secondary btn-small" disabled={unsubscribing} onClick={handleUnsubscribe}>
              {unsubscribing ? "取消中..." : "取消推送订阅"}
            </button>
          )}
          <button className="btn-secondary btn-small" onClick={checkPushStatus}>刷新状态</button>
        </div>
        {!pushStatus.supportedByServer && (
          <p className="text-xs text-cocoa/55">
            提示: 需要在 .env.local 中配置 VAPID keys 才能启用推送。运行 <code className="rounded bg-white/60 px-1">npm run generate:vapid</code> 生成。
          </p>
        )}
      </div>
    </section>
  );
}