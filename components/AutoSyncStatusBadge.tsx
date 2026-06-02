"use client";

import { useAutoSync } from "@/hooks/useAutoSync";
import type { AutoSyncStatus } from "@/lib/autoSync";
import { useEffect, useState } from "react";
import { computeStorageMode, getStorageModeLabel, formatLastSyncTime } from "@/lib/syncStatus";
import type { StorageMode } from "@/lib/syncStatus";

const label: Record<AutoSyncStatus, string> = {
  idle: "",
  local_saved: "本地已保存",
  syncing: "正在同步...",
  synced: "已同步到云端",
  failed: "同步失败，稍后重试",
  queued: "等待网络恢复后同步",
  disabled: "自动同步已关闭"
};

const tone: Record<AutoSyncStatus, string> = {
  idle: "bg-white/55 text-cocoa/55",
  local_saved: "bg-butter/70 text-cocoa/70",
  syncing: "bg-skySoft/70 text-cocoa/70",
  synced: "bg-sage/20 text-cocoa/70",
  failed: "bg-[#fff0ef]/85 text-[#8a5148]",
  queued: "bg-butter/70 text-cocoa/70",
  disabled: "bg-white/55 text-cocoa/55"
};

function modeStyle(mode: StorageMode): string {
  if (mode === "cloud") return "bg-emerald/25 text-emerald";
  if (mode === "local") return "bg-amber/25 text-amber";
  if (mode === "offline") return "bg-stone/25 text-stone";
  return "bg-white/55 text-cocoa/55";
}

export function AutoSyncStatusBadge({ className = "" }: { className?: string }) {
  const { status, lastSyncAt } = useAutoSync();
  const [mode, setMode] = useState<StorageMode>("unknown");

  useEffect(() => {
    setMode(computeStorageMode());
  }, [status]);

  const text = label[status];
  const lastSyncText = lastSyncAt ? formatLastSyncTime(lastSyncAt) : null;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${modeStyle(mode)}`}>
        {getStorageModeLabel(mode)}
      </span>
      {text ? (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tone[status]}`}>
          {text}
        </span>
      ) : null}
      {lastSyncText && lastSyncText !== "尚未同步" ? (
        <span className="text-[10px] text-cocoa/35 hidden sm:inline">{lastSyncText}</span>
      ) : null}
    </span>
  );
}
