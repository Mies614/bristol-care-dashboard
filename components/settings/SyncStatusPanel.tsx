"use client";

import { useEffect, useState, useCallback } from "react";
import { getPendingSyncCount, getFailedSyncCount, clearFailedSyncItems, flushSyncQueue } from "@/lib/syncQueue";
import { getSyncStatusSnapshot, formatLastSyncTime } from "@/lib/syncStatus";
import { runAutoSyncNow, AUTO_SYNC_EVENT } from "@/lib/autoSync";
import { AppButton } from "@/components/ui/AppButton";
import { RefreshCw, Trash2 } from "lucide-react";

interface SyncStatusPanelProps {
  /** Show full controls including discarding failed items (owner side). */
  showAdvanced?: boolean;
}

/**
 * Compact sync-queue status panel.
 * Shows pending/failed counts and a manual retry button.
 * Owner side can also discard permanently failed items.
 */
export function SyncStatusPanel({ showAdvanced = false }: SyncStatusPanelProps) {
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [done, setDone] = useState(false);

  const refresh = useCallback(() => {
    setPending(getPendingSyncCount());
    setFailed(getFailedSyncCount());
    const snap = getSyncStatusSnapshot();
    setLastSync(snap.lastSyncAt);
  }, []);

  useEffect(() => {
    refresh();
    const onSync = () => refresh();
    window.addEventListener(AUTO_SYNC_EVENT, onSync);
    return () => window.removeEventListener(AUTO_SYNC_EVENT, onSync);
  }, [refresh]);

  const handleRetry = async () => {
    setRetrying(true);
    setDone(false);
    try {
      await flushSyncQueue();
      await runAutoSyncNow("manual_queue_retry");
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch {
      // flushSyncQueue / runAutoSyncNow handle their own error logging
    } finally {
      setRetrying(false);
      refresh();
    }
  };

  const handleClearFailed = () => {
    clearFailedSyncItems();
    refresh();
  };

  const lastSyncText = formatLastSyncTime(lastSync);

  // Nothing to show when queue is empty and last sync is recent
  if (pending === 0 && failed === 0 && lastSyncText === "尚未同步") return null;

  return (
    <div className="rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-[var(--app-text)]">同步队列</h3>

      <div className="space-y-2 text-sm">
        {pending > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-[var(--app-muted)]">待同步</span>
            <span className="font-medium text-amber-600">{pending} 项</span>
          </div>
        )}

        {failed > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-[var(--app-muted)]">同步失败</span>
            <span className="font-medium text-rose-600">{failed} 项</span>
          </div>
        )}

        {lastSync && (
          <div className="flex items-center justify-between">
            <span className="text-[var(--app-muted)]">上次同步</span>
            <span className="text-[var(--app-muted)]">{lastSyncText}</span>
          </div>
        )}

        {pending === 0 && failed === 0 && (
          <p className="text-xs text-[var(--app-muted)]">队列为空，所有数据已同步。</p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        <AppButton
          size="sm"
          variant="secondary"
          onClick={handleRetry}
          loading={retrying}
          icon={done ? undefined : <RefreshCw className="h-3.5 w-3.5" />}
        >
          {done ? "✓ 已重试" : retrying ? "重试中..." : "手动重试"}
        </AppButton>

        {showAdvanced && failed > 0 && (
          <AppButton
            size="sm"
            variant="ghost"
            onClick={handleClearFailed}
            icon={<Trash2 className="h-3.5 w-3.5" />}
          >
            清除失败项
          </AppButton>
        )}
      </div>
    </div>
  );
}
