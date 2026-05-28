"use client";

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return registration;
  } catch {
    return null;
  }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export async function subscribeToPush(
  publicKey: string
): Promise<PushSubscriptionJSON | null> {
  if (!isPushSupported()) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const registration = await registerServiceWorker();
    if (!registration) return null;

    const applicationServerKey: BufferSource | string | null = urlBase64ToUint8Array(publicKey) as unknown as BufferSource;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    return subscription.toJSON();
  } catch {
    return null;
  }
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