"use client";

import { useAutoSync } from "@/hooks/useAutoSync";
import { getSyncStatusSnapshot, getStorageModeLabel, formatLastSyncTime, friendlySyncError } from "@/lib/syncStatus";

const modeColor: Record<string, string> = {
  cloud: "text-emerald",
  local: "text-amber",
  offline: "text-stone",
};

const statusColor: Record<string, string> = {
  syncing: "text-sky",
  synced: "text-emerald",
  failed: "text-rose",
  queued: "text-amber",
  disabled: "text-stone",
  idle: "text-stone",
  local_saved: "text-amber",
};

export function SyncStatusCard() {
  const { enabled } = useAutoSync();
  const snapshot = getSyncStatusSnapshot();
  const lastSyncText = formatLastSyncTime(snapshot.lastSyncAt);
  const friendlyError = friendlySyncError(snapshot.lastError);

  return (
    <div className="rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-4 shadow-sm space-y-3">
      {/* Storage mode */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--app-muted)]">存储模式</span>
        <span className={`text-sm font-semibold ${modeColor[snapshot.storageMode] || "text-stone"}`}>
          {getStorageModeLabel(snapshot.storageMode)}
        </span>
      </div>

      {/* Sync status */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--app-muted)]">同步状态</span>
        <span className={`text-sm font-medium ${statusColor[snapshot.syncStatus] || "text-stone"}`}>
          {snapshot.syncStatus === "syncing" ? (
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              同步中...
            </span>
          ) : snapshot.syncStatus === "synced" ? (
            "已同步 ✓"
          ) : snapshot.syncStatus === "failed" ? (
            "同步失败 ✗"
          ) : snapshot.syncStatus === "queued" ? (
            "等待联网"
          ) : snapshot.syncStatus === "local_saved" ? (
            "等待同步"
          ) : snapshot.syncStatus === "disabled" ? (
            "已关闭"
          ) : (
            "待机"
          )}
        </span>
      </div>

      {/* Last sync time */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--app-muted)]">最近同步</span>
        <span className="text-sm text-[var(--app-muted)]">{lastSyncText}</span>
      </div>

      {/* Auto sync toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--app-muted)]">自动同步</span>
        <span className={`text-sm ${enabled ? "text-emerald" : "text-stone"}`}>
          {enabled ? "已开启" : "已关闭"}
        </span>
      </div>

      {/* Error detail */}
      {friendlyError && snapshot.syncStatus === "failed" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs text-rose-700">
          {friendlyError}
        </div>
      ) : null}

      {/* Cloud connection hint */}
      {snapshot.storageMode === "local" && !snapshot.cloudConnected ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-700">
          尚未连接云同步，数据仅保存在本地。输入访问码后可开启云端同步。
        </div>
      ) : null}
    </div>
  );
}
