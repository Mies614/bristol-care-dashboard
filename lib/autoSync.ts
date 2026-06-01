"use client";

import type { AppData } from "./types";

export type AutoSyncStatus = "idle" | "local_saved" | "syncing" | "synced" | "failed" | "queued" | "disabled";

export type SyncErrorDetail = {
  message: string;
  code?: string;
  step?: string;
  detail?: string;
};

export const AUTO_SYNC_ENABLED_KEY = "bristol_dashboard_auto_sync_enabled";
export const PENDING_SYNC_KEY = "bristol_dashboard_pending_sync";
export const AUTO_SYNC_LAST_SYNC_AT_KEY = "bristol_dashboard_last_sync_at";
export const AUTO_SYNC_LAST_ERROR_KEY = "bristol_dashboard_last_sync_error";
export const AUTO_SYNC_STATUS_KEY = "bristol_dashboard_auto_sync_status";
export const AUTO_SYNC_EVENT = "bristol-dashboard-auto-sync";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let suppressCount = 0;
let bootstrapped = false;
let syncInProgress = false;
let pendingRetryAfterSync = false;
let pendingReason = "";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitAutoSyncEvent() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(AUTO_SYNC_EVENT));
  } catch {
    // Status updates are optional.
  }
}

function setStatus(status: AutoSyncStatus) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(AUTO_SYNC_STATUS_KEY, status);
  } catch {
    // Ignore unavailable storage.
  }
  emitAutoSyncEvent();
}

function setError(error: string) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(AUTO_SYNC_LAST_ERROR_KEY, error);
  } catch {
    // Ignore unavailable storage.
  }
}

function setPending(value: boolean, reason = "") {
  if (!canUseStorage()) return;
  try {
    if (value) {
      window.localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify({ pending: true, reason, updatedAt: new Date().toISOString() }));
    } else {
      window.localStorage.removeItem(PENDING_SYNC_KEY);
    }
  } catch {
    // Ignore unavailable storage.
  }
  emitAutoSyncEvent();
}

export function getAutoSyncEnabled(): boolean {
  if (!canUseStorage()) return true;
  try {
    return window.localStorage.getItem(AUTO_SYNC_ENABLED_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setAutoSyncEnabled(enabled: boolean): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(AUTO_SYNC_ENABLED_KEY, enabled ? "true" : "false");
  } catch {
    // Ignore unavailable storage.
  }
  setStatus(enabled ? "idle" : "disabled");
}

export function getPendingSyncState() {
  if (!canUseStorage()) return { pending: false, status: "idle" as AutoSyncStatus, lastSyncAt: "", lastError: "" };
  try {
    const raw = window.localStorage.getItem(PENDING_SYNC_KEY);
    const parsed = raw ? JSON.parse(raw) as { pending?: boolean; reason?: string; updatedAt?: string } : {};
    return {
      pending: Boolean(parsed.pending),
      reason: parsed.reason || "",
      updatedAt: parsed.updatedAt || "",
      status: (window.localStorage.getItem(AUTO_SYNC_STATUS_KEY) as AutoSyncStatus | null) || (getAutoSyncEnabled() ? "idle" : "disabled"),
      lastSyncAt: window.localStorage.getItem(AUTO_SYNC_LAST_SYNC_AT_KEY) || "",
      lastError: window.localStorage.getItem(AUTO_SYNC_LAST_ERROR_KEY) || ""
    };
  } catch {
    return { pending: false, status: "idle" as AutoSyncStatus, lastSyncAt: "", lastError: "" };
  }
}

export function clearPendingSyncState() {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(PENDING_SYNC_KEY);
    window.localStorage.removeItem(AUTO_SYNC_LAST_ERROR_KEY);
  } catch {
    // Ignore unavailable storage.
  }
  setStatus(getAutoSyncEnabled() ? "idle" : "disabled");
}

export function isAutoSyncSuppressed() {
  return suppressCount > 0;
}

export function withAutoSyncSuppressed<T>(callback: () => T): T {
  suppressCount += 1;
  try {
    return callback();
  } finally {
    suppressCount = Math.max(0, suppressCount - 1);
  }
}

export async function withAutoSyncSuppressedAsync<T>(callback: () => Promise<T>): Promise<T> {
  suppressCount += 1;
  try {
    return await callback();
  } finally {
    suppressCount = Math.max(0, suppressCount - 1);
  }
}

export function prepareAutoSyncData(data: AppData): AppData {
  // Strip imageDataUrl from background settings for cloud storage
  // as it's too large to store in Supabase and only valid locally
  const bg = data.backgroundSettings ? { ...data.backgroundSettings } : undefined;
  if (bg) {
    delete bg.imageDataUrl;
    // Don't change mode — leave it as-is; the upload route will handle sanitization
  }

  return {
    ...data,
    note: "",
    loveNotes: [],
    backgroundSettings: bg || data.backgroundSettings
  };
}

export function markLocalChange(source: string): void {
  if (isAutoSyncSuppressed()) return;
  if (!getAutoSyncEnabled()) {
    setStatus("disabled");
    return;
  }
  setPending(true, source);
  setStatus("local_saved");
}

export function scheduleAutoSync(reason: string): void {
  if (isAutoSyncSuppressed()) return;
  if (!getAutoSyncEnabled()) {
    setStatus("disabled");
    return;
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setPending(true, reason);
    setStatus("queued");
    return;
  }
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    runAutoSyncNow(reason).catch(() => {
      // runAutoSyncNow stores the failure state.
    });
  }, 2500);
}

export async function runAutoSyncNow(reason = "manual"): Promise<void> {
  if (!getAutoSyncEnabled()) {
    setStatus("disabled");
    return;
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setPending(true, reason);
    setStatus("queued");
    return;
  }

  // Concurrency control: if a sync is already in progress, mark a pending retry
  if (syncInProgress) {
    pendingRetryAfterSync = true;
    pendingReason = reason;
    console.log("[autoSync] sync already in progress — will retry after current sync completes");
    return;
  }

  syncInProgress = true;
  setStatus("syncing");

  try {
    const [{ getDefaultSpaceCode, uploadLocalDataToCloud }, { loadAppData }] = await Promise.all([
      import("./cloudSync"),
      import("./storage")
    ]);
    // Read fresh data from localStorage *just before* uploading
    const freshData = loadAppData();
    const result = await uploadLocalDataToCloud(getDefaultSpaceCode(), prepareAutoSyncData(freshData));
    if (!result.ok) {
      throw new Error([result.error || "同步失败", result.code, result.step, result.detail].filter(Boolean).join(" · "));
    }
    if (canUseStorage()) {
      window.localStorage.setItem(AUTO_SYNC_LAST_SYNC_AT_KEY, new Date().toISOString());
      window.localStorage.removeItem(AUTO_SYNC_LAST_ERROR_KEY);
    }
    setPending(false);
    setStatus("synced");
  } catch (error) {
    const message = error instanceof Error ? error.message : "同步失败，稍后重试";
    setError(message);
    setPending(true, reason);
    setStatus("failed");
    // Do not schedule a retry for retry attempts themselves; prevents infinite retry loops.
    if (!retryTimer && reason !== "retry") {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        runAutoSyncNow("retry").catch(() => {
          // Keep pending for next page load or manual retry.
        });
      }, 30000);
    }
  } finally {
    syncInProgress = false;
    // If a new sync was requested while we were running, trigger it now
    if (pendingRetryAfterSync) {
      pendingRetryAfterSync = false;
      const retryReason = pendingReason;
      pendingReason = "";
      // Small delay to allow any pending localStorage writes to complete
      setTimeout(() => {
        runAutoSyncNow(retryReason).catch(() => {});
      }, 200);
    }
  }
}

/**
 * Test-only: reset all module-level state so tests start clean.
 * Not exported in production bundles.
 */
export function resetAutoSyncForTests(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  syncInProgress = false;
  pendingRetryAfterSync = false;
  pendingReason = "";
  suppressCount = 0;
  bootstrapped = false;
}

export function bootstrapAutoSync() {
  if (typeof window === "undefined") return;
  if (bootstrapped) return;
  bootstrapped = true;
  const state = getPendingSyncState();
  if (!getAutoSyncEnabled()) {
    setStatus("disabled");
    return;
  }
  if (state.pending) scheduleAutoSync("pending_on_load");
  window.addEventListener("online", () => {
    if (getPendingSyncState().pending) runAutoSyncNow("online").catch(() => {});
  });
}