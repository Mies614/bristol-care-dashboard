"use client";

import { isCloudConfigured, getCloudConnection, getLastSyncTime } from "./cloudSync";
import { getAutoSyncEnabled, getPendingSyncState, type AutoSyncStatus } from "./autoSync";

export type StorageMode = "cloud" | "local" | "offline" | "unknown";

export interface SyncStatusSnapshot {
  storageMode: StorageMode;
  syncStatus: AutoSyncStatus;
  lastSyncAt: string | null;
  lastError: string | null;
  cloudConnected: boolean;
  autoSyncEnabled: boolean;
}

function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

export function computeStorageMode(): StorageMode {
  if (!isOnline()) return "offline";
  if (!isCloudConfigured()) return "local";
  const connection = getCloudConnection();
  if (!connection) return "local";
  return "cloud";
}

export function getSyncStatusSnapshot(): SyncStatusSnapshot {
  const state = getPendingSyncState();
  const cloudConnected = Boolean(getCloudConnection());

  return {
    storageMode: computeStorageMode(),
    syncStatus: state.status,
    lastSyncAt: state.lastSyncAt || getLastSyncTime() || null,
    lastError: state.lastError || null,
    cloudConnected,
    autoSyncEnabled: getAutoSyncEnabled(),
  };
}

export function formatLastSyncTime(iso: string | null): string {
  if (!iso) return "尚未同步";
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "刚刚";
    if (diffMin < 60) return `${diffMin} 分钟前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} 小时前`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} 天前`;
    return date.toLocaleDateString("zh-CN");
  } catch {
    return iso.slice(0, 10);
  }
}

export function friendlySyncError(raw: string | null): string | null {
  if (!raw) return null;
  if (raw.includes("Failed to fetch") || raw.includes("NetworkError") || raw.includes("network"))
    return "网络连接失败，设备可能处于离线状态";
  if (raw.includes("timeout") || raw.includes("超时"))
    return "同步超时，服务器或网络较慢";
  if (raw.includes("JWT") || raw.includes("token") || raw.includes("auth"))
    return "云端认证失败，请检查连接配置";
  if (raw.includes("permission") || raw.includes("denied") || raw.includes("not authorized"))
    return "云端权限不足，请检查访问码";
  if (raw.includes("not found") || raw.includes("404"))
    return "云端空间未找到，请确认访问码正确";
  return "同步遇到一点问题，稍后会自动重试。";
}

export function getStorageModeLabel(mode: StorageMode): string {
  switch (mode) {
    case "cloud": return "云同步";
    case "local": return "本地";
    case "offline": return "离线";
    default: return "未知";
  }
}

export function getSyncStatusLabel(status: AutoSyncStatus): string {
  switch (status) {
    case "idle": return "待机";
    case "local_saved": return "本地已保存";
    case "syncing": return "同步中";
    case "synced": return "已同步";
    case "failed": return "同步失败";
    case "queued": return "等待联网";
    case "disabled": return "已关闭";
    default: return "未知";
  }
}
