"use client";

import { useEffect, useState, useCallback } from "react";
import { AppButton } from "@/components/ui/AppButton";

interface RunLog {
  id: string;
  checkedAt: string;
  triggerType: string;
  ok: boolean;
  spacesChecked: number;
  notificationsGenerated: number;
  notificationsSent: number;
  skipped: Array<{ reason: string; count: number }>;
  errors: Array<{ scope: string; message: string }>;
  durationMs?: number;
}

interface ReminderStatus {
  ok?: boolean;
  status?: string;
  config?: {
    cronSecret: string;
    vapid: string;
    supabase: string;
    activePushSubscriptions: number;
    reminderPreferences: number;
  };
  recentLogs: RunLog[];
  stats?: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    notificationsGenerated: number;
    notificationsSent: number;
    commonSkippedReasons: Array<{ reason: string; count: number }>;
    commonErrors: Array<{ message: string; count: number }>;
  };
}

interface DryRunResult {
  ok?: boolean;
  dryRun?: boolean;
  triggeredAt?: string;
  note?: string;
  spacesChecked: number;
  notificationsWouldSend: number;
  summary?: Array<{ type: string; spaceCode: string; title: string; body: string }>;
  skipped?: Array<{ reason: string; count: number }>;
  errors?: Array<{ scope: string; message: string }>;
  durationMs?: number;
}

interface ReminderMonitorTabProps {
  password: string;
}

export function ReminderMonitorTab({ password }: ReminderMonitorTabProps) {
  const [status, setStatus] = useState<ReminderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [dryRunning, setDryRunning] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [showDryRunDetail, setShowDryRunDetail] = useState(false);
  const [message, setMessage] = useState("");

  const fetchStatus = useCallback(async () => {
    if (!password) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reminders/status", {
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (data.status === "unavailable") {
        setMessage(data.message || "Supabase 未配置，提醒监控不可用。");
      } else if (data.error) {
        setMessage(data.error);
      } else {
        setStatus(data);
        setMessage("");
      }
    } catch {
      setMessage("获取提醒状态失败。");
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleDryRun() {
    setDryRunning(true);
    setDryRunResult(null);
    setMessage("");
    try {
      const res = await fetch("/api/admin/reminders/dry-run", {
        method: "POST",
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (data.ok) {
        setDryRunResult(data);
        setMessage(data.note || "Dry-run 完成。");
        // Refresh status after dry-run (since it writes a run log)
        fetchStatus();
      } else {
        setMessage(data.error || data.message || "Dry-run 失败。");
      }
    } catch {
      setMessage("Dry-run 请求失败。");
    } finally {
      setDryRunning(false);
    }
  }

  function formatTime(iso: string) {
    try {
      return new Date(iso).toLocaleString("zh-CN");
    } catch {
      return iso;
    }
  }

  // Diagnostic hints
  function getDiagnostics() {
    if (!status?.config) return [];
    const hints: string[] = [];
    const config = status.config;

    if (config.cronSecret === "missing") {
      hints.push("Cron 密钥还没配置，Vercel 定时任务不会执行。");
    }
    if (config.vapid === "missing") {
      hints.push("Push 密钥未配置，提醒可以生成但无法发送。");
    }
    if (config.activePushSubscriptions === 0) {
      hints.push("还没有设备订阅通知，可以先在设置页开启通知。");
    }
    if (config.reminderPreferences === 0) {
      hints.push("还没有云端提醒偏好，打开设置页保存一次提醒设置。");
    }
    if (
      status.recentLogs.length > 0 &&
      status.recentLogs[0].ok &&
      status.recentLogs[0].notificationsSent === 0 &&
      hints.length === 0
    ) {
      hints.push("Cron 正常运行，但当前没有符合条件的提醒或订阅。");
    }
    return hints;
  }

  const diagnostics = getDiagnostics();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-cocoa/50">
          查看 Cron 最近运行情况、发送统计和系统诊断。
        </p>
        <div className="flex gap-2">
          <AppButton variant="secondary" size="sm" onClick={fetchStatus} disabled={loading || !password}>
            {loading ? "加载中..." : "🔄 刷新"}
          </AppButton>
          <AppButton variant="secondary" size="sm" onClick={handleDryRun} disabled={dryRunning || !password}>
            {dryRunning ? "运行中..." : "🧪 模拟运行"}
          </AppButton>
        </div>
      </div>

      {/* Diagnostics */}
      {diagnostics.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800 space-y-1">
          {diagnostics.map((hint, i) => (
            <div key={i}>💡 {hint}</div>
          ))}
        </div>
      )}

      {/* Config summary */}
      {status?.config && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-white/55 px-3 py-2">
            <span className="text-cocoa/40">Cron 密钥</span>
            <span className={`ml-2 font-medium ${status.config.cronSecret === "configured" ? "text-emerald" : "text-rose"}`}>
              {status.config.cronSecret === "configured" ? "已配置" : "未配置"}
            </span>
          </div>
          <div className="rounded-lg bg-white/55 px-3 py-2">
            <span className="text-cocoa/40">Push 密钥</span>
            <span className={`ml-2 font-medium ${status.config.vapid === "configured" ? "text-emerald" : "text-amber"}`}>
              {status.config.vapid === "configured" ? "已配置" : "未配置"}
            </span>
          </div>
          <div className="rounded-lg bg-white/55 px-3 py-2">
            <span className="text-cocoa/40">活跃订阅</span>
            <span className="ml-2 font-medium text-cocoa/70">{status.config.activePushSubscriptions}</span>
          </div>
          <div className="rounded-lg bg-white/55 px-3 py-2">
            <span className="text-cocoa/40">提醒偏好</span>
            <span className="ml-2 font-medium text-cocoa/70">{status.config.reminderPreferences}</span>
          </div>
        </div>
      )}

      {/* 7-day stats */}
      {status?.stats && status.stats.totalRuns > 0 && (
        <div className="rounded-lg bg-white/55 px-3 py-2 text-xs text-cocoa/60 space-y-1">
          <div className="flex items-center justify-between">
            <span>最近 7 天运行</span>
            <span className="tabular-nums">{status.stats.totalRuns} 次</span>
          </div>
          <div className="flex items-center justify-between">
            <span>成功 / 失败</span>
            <span className="tabular-nums">
              <span className="text-emerald">{status.stats.successfulRuns}</span>
              {status.stats.failedRuns > 0 && <span className="text-rose"> / {status.stats.failedRuns}</span>}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>生成通知</span>
            <span className="tabular-nums">{status.stats.notificationsGenerated}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>发送成功</span>
            <span className="tabular-nums">{status.stats.notificationsSent}</span>
          </div>
          {status.stats.commonSkippedReasons.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer text-[10px] text-cocoa/40">跳过原因</summary>
              <div className="mt-1 space-y-0.5">
                {status.stats.commonSkippedReasons.map((s, i) => (
                  <div key={i} className="text-[10px] text-cocoa/40">{s.reason} × {s.count}</div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Recent run logs */}
      {status?.recentLogs && status.recentLogs.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-cocoa/40 font-medium">最近运行记录</p>
          {status.recentLogs.map((log) => (
            <div
              key={log.id}
              className={`rounded-lg border px-3 py-2 text-xs ${
                log.ok ? "border-emerald-200 bg-emerald-50/60" : "border-rose-200 bg-rose-50/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${log.ok ? "text-emerald" : "text-rose"}`}>
                    {log.ok ? "✓" : "✗"}
                  </span>
                  <span className="text-cocoa/50">{log.triggerType}</span>
                  <span className="text-cocoa/30">{formatTime(log.checkedAt)}</span>
                </div>
                <span className="text-cocoa/40">
                  {log.notificationsGenerated}g / {log.notificationsSent}s
                  {log.durationMs ? ` · ${log.durationMs}ms` : ""}
                </span>
              </div>
              {log.skipped.length > 0 && (
                <div className="mt-1 text-[10px] text-cocoa/30 truncate">
                  跳过: {log.skipped.map((s) => `${s.reason}×${s.count}`).join(", ")}
                </div>
              )}
              {log.errors.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-[10px] text-rose/50">错误 ({log.errors.length})</summary>
                  <div className="mt-1 space-y-0.5">
                    {log.errors.map((e, i) => (
                      <div key={i} className="text-[10px] text-rose/50">
                        {e.scope}: {e.message}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No data hint */}
      {!loading && !status?.recentLogs?.length && !message && (
        <p className="text-xs text-cocoa/40">还没有运行记录，Cron 可能尚未触发或日志表还未创建。</p>
      )}

      {/* Dry-run result */}
      {dryRunResult && (
        <div className="rounded-lg border border-sage/40 bg-sage/10 px-3 py-2 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sage">🧪 模拟运行结果</span>
            <button
              className="text-[10px] text-sage/60 hover:underline"
              onClick={() => setShowDryRunDetail(!showDryRunDetail)}
            >
              {showDryRunDetail ? "收起" : "详情"}
            </button>
          </div>
          <div className="text-cocoa/60">
            {dryRunResult.note && <p className="mb-1">{dryRunResult.note}</p>}
            <span>空间 {dryRunResult.spacesChecked} · 将发送 {dryRunResult.notificationsWouldSend} 条</span>
            {dryRunResult.durationMs ? <span> · {dryRunResult.durationMs}ms</span> : null}
          </div>
          {showDryRunDetail && dryRunResult.summary && dryRunResult.summary.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-auto">
              {dryRunResult.summary.map((s, i) => (
                <div key={i} className="rounded bg-white/60 px-2 py-1 text-[10px]">
                  <span className="font-medium text-cocoa/50">{s.type}</span>
                  <span className="text-cocoa/30 mx-1">·</span>
                  <span className="text-cocoa/60">{s.title}</span>
                  <div className="text-cocoa/40 truncate">{s.body}</div>
                </div>
              ))}
            </div>
          )}
          {showDryRunDetail && dryRunResult.skipped && dryRunResult.skipped.length > 0 && (
            <div className="text-[10px] text-cocoa/30">
              跳过: {dryRunResult.skipped.map((s) => `${s.reason}×${s.count}`).join(", ")}
            </div>
          )}
        </div>
      )}

      {message ? (
        <div className="rounded-lg border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-2 text-xs break-words">
          {message}
        </div>
      ) : null}
    </div>
  );
}
