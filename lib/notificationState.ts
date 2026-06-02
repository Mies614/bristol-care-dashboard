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

// ─── Push Subscribe Failure Diagnostics ───

/**
 * Precise failure reasons for push subscription attempts.
 * Used by subscribeToPush() in pushClient.ts and consumed by UI / tests.
 */
export type PushSubscribeFailureReason =
  | "unsupported_notification"
  | "unsupported_service_worker"
  | "unsupported_push_manager"
  | "permission_denied"
  | "service_worker_not_ready"
  | "vapid_public_key_missing"
  | "vapid_public_key_invalid"
  | "subscribe_failed"
  | "save_failed"
  | "supabase_unavailable";

export interface PushFailureMessages {
  /** Gentle user-facing message for the UI */
  userMessage: string;
  /** Technical message for console / debug panel */
  debugMessage: string;
}

const FAILURE_MESSAGE_MAP: Record<PushSubscribeFailureReason, PushFailureMessages> = {
  unsupported_notification: {
    userMessage: "你的浏览器不支持通知功能。",
    debugMessage: "Browser does not support Notification API.",
  },
  unsupported_service_worker: {
    userMessage: "你的浏览器不支持后台服务。",
    debugMessage: "Browser does not support Service Worker.",
  },
  unsupported_push_manager: {
    userMessage: "你的浏览器不支持推送通知。",
    debugMessage: "Browser does not support PushManager API.",
  },
  permission_denied: {
    userMessage: "通知权限已被阻止，请在浏览器设置中重新允许。",
    debugMessage: "Notification.permission is 'denied' or user declined the permission prompt.",
  },
  service_worker_not_ready: {
    userMessage: "后台服务未就绪，请刷新页面后重试。",
    debugMessage: "Service Worker registration failed or not yet active.",
  },
  vapid_public_key_missing: {
    userMessage: "通知服务暂未配置，请联系管理员。",
    debugMessage: "VAPID public key is empty or not set. Check NEXT_PUBLIC_VAPID_PUBLIC_KEY.",
  },
  vapid_public_key_invalid: {
    userMessage: "通知服务配置有误，请联系管理员。",
    debugMessage: "VAPID public key is not valid URL-safe base64.",
  },
  subscribe_failed: {
    userMessage: "订阅失败，请稍后重试。",
    debugMessage: "pushManager.subscribe() threw an error. Check browser console for details.",
  },
  save_failed: {
    userMessage: "订阅保存失败，请检查网络后重试。",
    debugMessage: "Backend /api/push/subscribe returned an error or network request failed.",
  },
  supabase_unavailable: {
    userMessage: "云端服务暂不可用，请稍后重试。",
    debugMessage: "Supabase is not configured or unreachable.",
  },
};

/**
 * Convert a PushSubscribeFailureReason into user + debug messages.
 */
export function getPushFailureMessages(reason: PushSubscribeFailureReason): PushFailureMessages {
  return { ...FAILURE_MESSAGE_MAP[reason] };
}

/**
 * Determine the PushSubscribeFailureReason from an API error response.
 */
export function parseApiSubscribeError(body: { code?: string; error?: string }): PushSubscribeFailureReason {
  switch (body.code) {
    case "SUPABASE_UNAVAILABLE":
      return "supabase_unavailable";
    case "PUSH_SUBSCRIBE_FAILED":
      return "save_failed";
    case "SPACE_NOT_FOUND":
      return "save_failed";
    default:
      return "save_failed";
  }
}