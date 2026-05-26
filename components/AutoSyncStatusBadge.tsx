"use client";

import { useAutoSync } from "@/hooks/useAutoSync";
import type { AutoSyncStatus } from "@/lib/autoSync";

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

export function AutoSyncStatusBadge({ className = "" }: { className?: string }) {
  const { status, pending } = useAutoSync();
  const text = label[status] || (pending ? "等待同步" : "");
  if (!text) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${tone[status]} ${className}`}>
      {text}
    </span>
  );
}
