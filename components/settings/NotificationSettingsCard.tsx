"use client";

import { useEffect, useState, useCallback } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { Input } from "@/components/ui/input";
import {
  computePushState,
  getCurrentPermission,
  getPushStateInfo,
  isPushAvailable,
  getPushFailureMessages,
  parseApiSubscribeError,
  type PushState,
} from "@/lib/notificationState";
import {
  loadReminderPreferences,
  saveReminderPreferences,
  DEFAULT_REMINDER_PREFERENCES,
  type ReminderPreferences,
} from "@/lib/reminderConfig";
import {
  getExistingPushSubscription,
  subscribeToPush,
  unsubscribePush,
  type SubscribeError,
} from "@/lib/pushClient";

export function NotificationSettingsCard() {
  // Push state
  const [pushState, setPushState] = useState<PushState>("unsupported");
  const [_pushSubscribed, setPushSubscribed] = useState(false);
  const [vapidConfigured, setVapidConfigured] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [pushLoading, setPushLoading] = useState(false);

  // Reminder prefs
  const [prefs, setPrefs] = useState<ReminderPreferences>(DEFAULT_REMINDER_PREFERENCES);

  // Fetch VAPID config on mount (single useEffect)
  useEffect(() => {
    fetch("/api/push/status")
      .then((r) => r.json())
      .then((data: { supportedByServer?: boolean; publicKey?: string }) => {
        const configured = data.supportedByServer || false;
        setVapidConfigured(configured);
        if (data.publicKey) setVapidPublicKey(data.publicKey);
      })
      .catch(() => {});
  }, []);

  // Refresh push state
  const refreshPushState = useCallback(async () => {
    try {
      const permission = getCurrentPermission();
      const existingSub = await getExistingPushSubscription();
      const hasSub = existingSub !== null;
      setPushSubscribed(hasSub);

      const state = computePushState({
        isSupported: isPushAvailable(),
        permission,
        hasExistingSubscription: hasSub,
        isVapidConfigured: vapidConfigured,
      });
      setPushState(state);
    } catch {
      setPushState("unsupported");
    }
  }, [vapidConfigured]);

  useEffect(() => {
    refreshPushState();
  }, [refreshPushState]);

  // Load reminder prefs
  useEffect(() => {
    setPrefs(loadReminderPreferences());
  }, []);

  const updatePrefs = (partial: Partial<ReminderPreferences>) => {
    const next = { ...prefs, ...partial };
    setPrefs(next);
    saveReminderPreferences(next);
  };

  // Subscribe to push
  async function handleSubscribe() {
    setPushLoading(true);
    setPushMessage("");
    try {
      const key = vapidPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
      const result = await subscribeToPush(key);

      // Check if subscribeToPush returned an error
      if ("error" in result) {
        const err = result as SubscribeError;
        const msgs = getPushFailureMessages(err.error);
        // Log detailed reason to console for debugging
        console.warn("[Push Subscribe Failed]", err.error, err.detail || msgs.debugMessage);
        setPushMessage(msgs.userMessage);
      } else {
        // Success — now save to backend
        const subResult = result as { subscription: PushSubscriptionJSON };
        try {
          const res = await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subscription: subResult.subscription,
              role: "xiaoguai",
            }),
          });

          if (res.ok) {
            setPushMessage("通知已开启 💫");
            await refreshPushState();
          } else {
            const body = await res.json();
            console.warn("[Push Subscribe API Error]", body);
            const reason = parseApiSubscribeError(body);
            const msgs = getPushFailureMessages(reason);
            setPushMessage(msgs.userMessage);
          }
        } catch {
          // Network error calling API
          console.warn("[Push Subscribe Network Error] Failed to reach /api/push/subscribe");
          const msgs = getPushFailureMessages("save_failed");
          setPushMessage(msgs.userMessage);
        }
      }
    } catch {
      // Unexpected error (should not happen with new subscribeToPush)
      console.warn("[Push Subscribe Unexpected Error]");
      setPushMessage("订阅失败，请稍后重试。");
    } finally {
      setPushLoading(false);
    }
  }

  // Unsubscribe
  async function handleUnsubscribe() {
    setPushLoading(true);
    setPushMessage("");
    try {
      // Get existing subscription endpoint
      const existingSub = await getExistingPushSubscription();
      if (existingSub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existingSub.endpoint }),
        });
      }
      await unsubscribePush();
      setPushMessage("通知已关闭。");
      await refreshPushState();
    } catch {
      setPushMessage("取消订阅失败。");
    } finally {
      setPushLoading(false);
    }
  }

  // Send test notification
  async function handleTestNotification() {
    setPushLoading(true);
    setPushMessage("");
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "xiaoguai" }),
      });
      const data = await res.json();
      if (data.ok) {
        setPushMessage("测试通知已发送，稍后应该会收到推送 ✨");
      } else {
        setPushMessage(data.error || "测试通知发送失败");
      }
    } catch {
      setPushMessage("测试通知请求失败");
    } finally {
      setPushLoading(false);
    }
  }

  const statusInfo = getPushStateInfo(pushState);

  return (
    <div className="space-y-4">
      {/* Push Notification Status */}
      <AppCard className="shadow-sm">
        <p className="text-sm font-semibold text-cocoa mb-3">推送通知</p>

        {/* Status badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            pushState === "subscribed" ? "bg-emerald/25 text-emerald" :
            pushState === "permission-denied" ? "bg-rose/25 text-rose" :
            pushState === "misconfigured" ? "bg-amber/25 text-amber" :
            "bg-stone/25 text-stone"
          }`}>
            {statusInfo.label}
          </span>
        </div>
        <p className="text-xs text-cocoa/50 mb-3">{statusInfo.description}</p>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {pushState === "permission-default" && (
            <AppButton variant="primary" size="sm" onClick={handleSubscribe} disabled={pushLoading || !vapidPublicKey}>
              {pushLoading ? "处理中..." : "🔔 开启通知"}
            </AppButton>
          )}
          {pushState === "unsubscribed" && (
            <AppButton variant="primary" size="sm" onClick={handleSubscribe} disabled={pushLoading || !vapidPublicKey}>
              {pushLoading ? "处理中..." : "🔔 重新开启"}
            </AppButton>
          )}
          {pushState === "subscribed" && (
            <>
              <AppButton variant="secondary" size="sm" onClick={handleUnsubscribe} disabled={pushLoading}>
                关闭通知
              </AppButton>
              <AppButton variant="secondary" size="sm" onClick={handleTestNotification} disabled={pushLoading}>
                📬 发送测试通知
              </AppButton>
            </>
          )}
          {pushState === "permission-denied" && (
            <p className="text-[10px] text-rose/60">
              通知权限已被阻止。请在浏览器设置 → 隐私与安全 → 通知中重新允许本站通知。
            </p>
          )}
          {pushState === "unsupported" && (
            <p className="text-[10px] text-cocoa/40">
              你的浏览器不支持推送通知。可以试试用 Safari 或 Chrome 打开。
            </p>
          )}
          {pushState === "misconfigured" && (
            <p className="text-[10px] text-amber/70">
              通知服务暂未配置，请在管理后台完成密钥设置。
            </p>
          )}
        </div>

        {pushMessage ? (
          <p className="mt-3 text-xs text-cocoa/60">{pushMessage}</p>
        ) : null}
      </AppCard>

      {/* Reminder Preferences */}
      <AppCard className="shadow-sm">
        <p className="text-sm font-semibold text-cocoa mb-3">每日关怀提醒</p>
        <p className="text-xs text-cocoa/50 mb-3">
          选择你想收到的提醒。提醒会在每天设定的时间发送（需开启通知）。
        </p>

        {/* Reminder time */}
        <div className="mb-3">
          <label className="text-xs text-cocoa/50">提醒时间</label>
          <Input
            className="mt-1 w-32"
            type="time"
            value={prefs.reminderTime}
            onChange={(e) => updatePrefs({ reminderTime: e.target.value })}
          />
        </div>

        {/* Master toggle */}
        <label className="flex items-center gap-2 rounded-lg border border-white/80 bg-white/55 px-3 py-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            className="accent-[var(--app-accent)]"
            checked={prefs.enabled}
            onChange={(e) => updatePrefs({ enabled: e.target.checked })}
          />
          <span className="text-sm text-cocoa">启用每日提醒</span>
        </label>

        {/* Individual toggles */}
        <div className="space-y-1.5 pl-2">
          <label className="flex items-center gap-2 rounded-lg px-3 py-1.5 cursor-pointer">
            <input
              type="checkbox"
              className="accent-[var(--app-accent)]"
              checked={prefs.weatherReminder}
              onChange={(e) => updatePrefs({ weatherReminder: e.target.checked })}
              disabled={!prefs.enabled}
            />
            <span className="text-sm text-cocoa/70">天气 / 穿衣提醒</span>
          </label>
          <label className="flex items-center gap-2 rounded-lg px-3 py-1.5 cursor-pointer">
            <input
              type="checkbox"
              className="accent-[var(--app-accent)]"
              checked={prefs.deadlineReminder}
              onChange={(e) => updatePrefs({ deadlineReminder: e.target.checked })}
              disabled={!prefs.enabled}
            />
            <span className="text-sm text-cocoa/70">DDL 临近提醒</span>
          </label>
          <label className="flex items-center gap-2 rounded-lg px-3 py-1.5 cursor-pointer">
            <input
              type="checkbox"
              className="accent-[var(--app-accent)]"
              checked={prefs.missYouReminder}
              onChange={(e) => updatePrefs({ missYouReminder: e.target.checked })}
              disabled={!prefs.enabled}
            />
            <span className="text-sm text-cocoa/70">见面倒计时提醒</span>
          </label>
          <label className="flex items-center gap-2 rounded-lg px-3 py-1.5 cursor-pointer">
            <input
              type="checkbox"
              className="accent-[var(--app-accent)]"
              checked={prefs.periodReminder}
              onChange={(e) => updatePrefs({ periodReminder: e.target.checked })}
              disabled={!prefs.enabled}
            />
            <span className="text-sm text-cocoa/70">经期预测提醒</span>
          </label>
        </div>
      </AppCard>
    </div>
  );
}