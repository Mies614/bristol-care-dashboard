"use client";

/**
 * Push notification state utilities.
 * Pure functions that classify the current Push/Notification state.
 * Does NOT trigger permission requests or subscriptions.
 */

export type PushState =
  | "unsupported"
  | "permission-default"
  | "permission-denied"
  | "subscribed"
  | "unsubscribed"
  | "misconfigured";

export interface PushStatusInfo {
  state: PushState;
  label: string;
  description: string;
  actionLabel?: string;
}

const STATUS_MAP: Record<PushState, PushStatusInfo> = {
  unsupported: {
    state: "unsupported",
    label: "不支持",
    description: "你的浏览器不支持推送通知。可以试试用 Safari 或 Chrome 打开。",
  },
  "permission-default": {
    state: "permission-default",
    label: "待开启",
    description: "还没有选择是否接收通知。点击下方按钮开启。",
    actionLabel: "开启通知",
  },
  "permission-denied": {
    state: "permission-denied",
    label: "已关闭",
    description: "通知权限已被浏览器阻止。需要在浏览器设置中重新允许通知。",
  },
  subscribed: {
    state: "subscribed",
    label: "已开启",
    description: "推送通知已启用，重要更新会及时告诉你。",
    actionLabel: "关闭通知",
  },
  unsubscribed: {
    state: "unsubscribed",
    label: "未订阅",
    description: "通知权限已允许但未订阅。点击下方按钮开启。",
    actionLabel: "开启通知",
  },
  misconfigured: {
    state: "misconfigured",
    label: "暂未配置",
    description: "通知服务暂未配置，等待管理员完成 Push 设置。",
  },
};

export function getPushStateInfo(state: PushState): PushStatusInfo {
  return { ...STATUS_MAP[state] };
}

/**
 * Compute push state from browser APIs and optional VAPID config.
 * Pure — does NOT mutate any state.
 */
export function computePushState(opts: {
  isSupported: boolean;
  permission: NotificationPermission | "unsupported";
  hasExistingSubscription: boolean;
  isVapidConfigured: boolean;
}): PushState {
  if (!opts.isSupported) return "unsupported";
  if (!opts.isVapidConfigured) return "misconfigured";
  if (opts.permission === "denied") return "permission-denied";
  if (opts.permission === "granted") {
    return opts.hasExistingSubscription ? "subscribed" : "unsubscribed";
  }
  return "permission-default";
}

/**
 * Check if push is supported in the browser.
 * Safe to call outside of browser context (returns false).
 */
export function isPushAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Get current notification permission.
 * Safe to call outside of browser context.
 */
export function getCurrentPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}
