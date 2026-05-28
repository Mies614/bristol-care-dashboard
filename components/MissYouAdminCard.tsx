"use client";

import { useCallback, useEffect, useState } from "react";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { isPushSupported, subscribeToPush, unsubscribePush, registerServiceWorker } from "@/lib/pushClient";

interface MissYouStats {
  todayCount: number;
  totalCount: number;
  todayDate: string;
}

interface PushStatus {
  supportedByServer: boolean;
  publicKey: string | null;
  notificationPermission: NotificationPermission | "unsupported";
  subscriptionStatus: "unknown" | "subscribed" | "not-subscribed";
}

export function MissYouAdminCard() {
  const [stats, setStats] = useState<MissYouStats>({ todayCount: 0, totalCount: 0, todayDate: "" });
  const [loadingStats, setLoadingStats] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushStatus>({
    supportedByServer: false,
    publicKey: null,
    notificationPermission: "unsupported",
    subscriptionStatus: "unknown"
  });
  const [subscribing, setSubscribing] = useState(false);
  const [unsubscribing, setUnsubscribing] = useState(false);

  const localDate = new Date().toISOString().split("T")[0];

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const code = getDefaultSpaceCode();
      const response = await fetch(`/api/miss-you?code=${encodeURIComponent(code)}&localDate=${localDate}&limit=1`);
      const payload = await response.json();
      if (payload.ok) {
        setStats({
          todayCount: payload.todayCount,
          totalCount: 0,
          todayDate: localDate
        });
      }
    } catch {
      // Silent fail
    } finally {
      setLoadingStats(false);
    }
  }, [localDate]);

  const checkPushStatus = useCallback(async () => {
    // Check browser support
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

    // Check server status
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
          <p>今天（{stats.todayDate || localDate}）小乖已经想你 <strong className="text-cocoa">{stats.todayCount}</strong> 次。</p>
        )}
        <button className="btn-secondary btn-small mt-2" onClick={fetchStats}>刷新统计</button>
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