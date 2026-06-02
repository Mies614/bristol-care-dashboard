"use client";

import type { PushSubscribeFailureReason } from "@/lib/notificationState";

export interface SubscribeResult {
  subscription: PushSubscriptionJSON;
}

export interface SubscribeError {
  error: PushSubscribeFailureReason;
  detail?: string;
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Register the service worker and wait for it to be ready.
 * Returns null if SW registration fails or times out.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    // Wait for the SW to become active (or already active)
    await navigator.serviceWorker.ready;
    return registration;
  } catch {
    return null;
  }
}

/**
 * Convert a URL-safe base64 string to a Uint8Array suitable for applicationServerKey.
 * Throws if the input is empty or not valid base64.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  if (!base64String || base64String.trim().length === 0) {
    throw new Error("VAPID public key is empty");
  }

  const trimmed = base64String.trim();
  const padding = "=".repeat((4 - (trimmed.length % 4)) % 4);
  const base64 = (trimmed + padding).replace(/-/g, "+").replace(/_/g, "/");

  let rawData: string;
  try {
    rawData = atob(base64);
  } catch {
    throw new Error("VAPID public key is not valid base64");
  }

  if (rawData.length === 0) {
    throw new Error("VAPID public key decoded to empty buffer");
  }

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Subscribe to push notifications.
 *
 * Returns a SubscribeResult on success, or a SubscribeError with a specific
 * PushSubscribeFailureReason on failure.
 *
 * Never throws  all errors are returned as SubscribeError.
 */
export async function subscribeToPush(
  publicKey: string
): Promise<SubscribeResult | SubscribeError> {
  // 1. Browser capability checks
  if (typeof window === "undefined") {
    return { error: "unsupported_notification" };
  }

  if (!("Notification" in window)) {
    return { error: "unsupported_notification" };
  }

  if (!("serviceWorker" in navigator)) {
    return { error: "unsupported_service_worker" };
  }

  if (!("PushManager" in window)) {
    return { error: "unsupported_push_manager" };
  }

  // 2. Permission check
  if (Notification.permission === "denied") {
    return { error: "permission_denied" };
  }

  // 3. Request permission (if not already granted)
  if (Notification.permission !== "granted") {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return { error: "permission_denied" };
      }
    } catch {
      return { error: "permission_denied" };
    }
  }

  // 4. VAPID public key validation
  if (!publicKey || publicKey.trim().length === 0) {
    return { error: "vapid_public_key_missing" };
  }

  let applicationServerKey: Uint8Array;
  try {
    applicationServerKey = urlBase64ToUint8Array(publicKey);
  } catch {
    return { error: "vapid_public_key_invalid" };
  }

  // 5. Service worker registration
  let registration: ServiceWorkerRegistration | null;
  try {
    registration = await registerServiceWorker();
  } catch {
    registration = null;
  }

  if (!registration) {
    return { error: "service_worker_not_ready" };
  }

  // 6. Subscribe via PushManager
  let subscription: PushSubscription;
  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    });
  } catch (err) {
    return {
      error: "subscribe_failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  return {
    subscription: subscription.toJSON(),
  };
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await registerServiceWorker();
    if (!registration) return null;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function unsubscribePush(): Promise<boolean> {
  try {
    const subscription = await getExistingPushSubscription();
    if (!subscription) return true;
    await subscription.unsubscribe();
    return true;
  } catch {
    return false;
  }
}

export function getNotificationPermissionStatus(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}