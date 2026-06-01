"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { normalizeChecks, summarizeDebugHealth, formatDebugCopyText } from "@/lib/debug-classify";
import type { CheckLevel, CheckOutput } from "@/lib/debug-classify";

type Check = CheckOutput;

interface FetchError {
  status?: number;
  statusText?: string;
  message?: string;
  bodyPreview?: string;
}

function getLevelIcon(level: CheckLevel): string {
  switch (level) {
    case "success": return "✓";
    case "warning": return "⚠";
    case "optional": return "○";
    case "failed": return "✗";
  }
}

function getLevelLabel(level: CheckLevel): string {
  switch (level) {
    case "success": return "通过";
    case "warning": return "警告";
    case "optional": return "可选";
    case "failed": return "失败";
  }
}

function getLevelStyle(level: CheckLevel): string {
  switch (level) {
    case "success": return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "warning": return "border-amber-200 bg-amber-50 text-amber-700";
    case "optional": return "border-stone-200 bg-stone-50 text-stone-500";
    case "failed": return "border-rose-200 bg-rose-50 text-rose-700";
  }
}

export default function DebugPage() {
  const [client, setClient] = useState({ userAgent: "", storage: false, keyCount: 0, env: process.env.NODE_ENV || "unknown" });
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<FetchError | null>(null);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  function collectClient() {
    try {
      const key = "bristol_dashboard_debug_test";
      localStorage.setItem(key, "1");
      localStorage.removeItem(key);
      setClient({
        userAgent: navigator.userAgent,
        storage: true,
        keyCount: Object.keys(localStorage).filter((item) => item.startsWith("bristol") || item.startsWith("bristol-care")).length,
        env: process.env.NODE_ENV || "unknown"
      });
    } catch {
      setClient({ userAgent: navigator.userAgent, storage: false, keyCount: 0, env: process.env.NODE_ENV || "unknown" });
    }
  }

  async function refresh() {
    setLoading(true);
    setFetchError(null);
    setChecks(null);
    collectClient();

    try {
      const response = await fetch("/api/debug/supabase");

      const contentType = response.headers.get("content-type") || "";
      const bodyText = await response.text();

      if (!response.ok && response.status === 404) {
        setFetchError({
          status: 404,
          statusText: response.statusText || "Not Found",
          message: "诊断接口返回 404，说明线上未部署 /api/debug/supabase。请确认 Vercel 部署包含了此路由。",
          bodyPreview: bodyText.slice(0, 300)
        });
        setLoading(false);
        return;
      }

      if (contentType.includes("text/html")) {
        setFetchError({
          status: response.status,
          statusText: response.statusText || "",
          message: "诊断接口返回了 HTML，不是 JSON。说明 Next.js 没有识别此 API route，可能是部署问题。",
          bodyPreview: bodyText.slice(0, 300)
        });
        setLoading(false);
        return;
      }

      let payload;
      try {
        payload = JSON.parse(bodyText);
      } catch {
        setFetchError({
          status: response.status,
          statusText: response.statusText || "",
          message: "诊断接口返回了非 JSON 内容，无法解析。",
          bodyPreview: bodyText.slice(0, 300)
        });
        setLoading(false);
        return;
      }

      if (payload.ok && Array.isArray(payload.checks)) {
        setChecks(normalizeChecks(payload.checks as Array<Record<string, unknown>>));
      } else {
        setFetchError({ message: payload.error || "诊断响应格式不正确" });
      }
    } catch (err) {
      setFetchError({ message: err instanceof Error ? err.message : "诊断请求失败（网络错误）" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearProjectStorage() {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("bristol") || key.startsWith("bristol-care")) localStorage.removeItem(key);
      }
      setMessage("已清除本项目 localStorage。");
    } catch {
      setMessage("localStorage 不可用。");
    }
    collectClient();
  }

  // Sort: failed first, then warning, then optional, then success
  const sortedChecks = useMemo(() => {
    if (!checks) return [];
    const order: Record<CheckLevel, number> = { failed: 0, warning: 1, optional: 2, success: 3 };
    return [...checks].sort((a, b) => (order[a.level] ?? 4) - (order[b.level] ?? 4));
  }, [checks]);

  // Calculate health status
  const healthStatus = useMemo(() => {
    if (!checks) return { label: "检查中", color: "text-cocoa/50" };
    const status = summarizeDebugHealth(checks);
    if (status === "needs_attention") return { label: "需要关注", color: "text-rose" };
    if (status === "warning") return { label: "有警告", color: "text-amber" };
    return { label: "健康", color: "text-emerald" };
  }, [checks]);

  // Diagnostic report for clipboard
  const diagnosticReport = useMemo(() => {
    if (!checks) return "";
    return formatDebugCopyText(
      checks,
      { env: client.env, userAgent: client.userAgent, storage: client.storage, keyCount: client.keyCount },
      fetchError ? { status: fetchError.status, statusText: fetchError.statusText, message: fetchError.message } : null
    );
  }, [checks, client, fetchError]);

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(diagnosticReport);
      setCopied(true);
      setMessage("诊断报告已复制到剪贴板。");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("复制失败，请手动选择并复制下方内容。");
    }
  }

  return (
    <AppShell>
      <AppCard className="bg-gradient-to-br from-white/88 via-blush/55 to-skySoft/60 p-5">
        <p className="section-kicker mb-1">Debug</p>
        <h1 className="text-2xl font-semibold text-cocoa">Bristol Care 诊断</h1>
        <p className="mt-2 text-sm leading-6 text-cocoa/60">
          检查 Supabase 连接、localStorage 状态和各项服务。
          {checks && (
            <span className={`ml-2 font-semibold ${healthStatus.color}`}>
              · {healthStatus.label}
            </span>
          )}
        </p>
      </AppCard>

      <div className="space-y-4 mt-4">
        {/* Client Info */}
        <AppCard>
          <h2 className="font-semibold text-cocoa mb-3">设备信息</h2>
          <div className="grid gap-2 text-sm text-cocoa/70">
            <p><span className="font-medium text-cocoa/50">环境：</span>{client.env}</p>
            <p className="break-all"><span className="font-medium text-cocoa/50">UA：</span>{client.userAgent || "加载中…"}</p>
            <p><span className="font-medium text-cocoa/50">localStorage：</span>{client.storage ? `可用 (${client.keyCount} 个键)` : "不可用"}</p>
          </div>
        </AppCard>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <AppButton variant="primary" size="sm" onClick={refresh}>🔄 刷新诊断</AppButton>
          <AppButton variant="secondary" size="sm" onClick={copyReport} disabled={copied}>
            {copied ? "✅ 已复制" : "📋 复制诊断报告"}
          </AppButton>
          <AppButton variant="secondary" size="sm" onClick={clearProjectStorage}>🗑 清除 localStorage</AppButton>
          <Link href="/">
            <AppButton variant="secondary" size="sm">← 返回首页</AppButton>
          </Link>
        </div>
        {message ? (
          <div className="rounded-[var(--app-radius)] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-3 text-sm text-[var(--app-accent)] break-words">
            {message}
          </div>
        ) : null}

        {/* Supabase Checks */}
        <AppCard>
          <h2 className="font-semibold text-cocoa mb-3">服务检查</h2>

          {loading && (
            <p className="text-sm text-cocoa/50">正在检查...</p>
          )}

          {!loading && fetchError && (
            <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-3">
              <p className="font-medium text-rose-700">诊断请求失败</p>
              {fetchError.status ? (
                <p className="text-sm text-rose-600 break-all">status: {fetchError.status} {fetchError.statusText}</p>
              ) : null}
              {fetchError.message ? (
                <p className="text-sm text-rose-600 break-words">{fetchError.message}</p>
              ) : null}
              {fetchError.bodyPreview ? (
                <details className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-xs leading-5">
                  <summary className="cursor-pointer font-medium text-rose-600">查看返回内容预览</summary>
                  <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words text-rose-600">{fetchError.bodyPreview}</pre>
                </details>
              ) : null}
            </div>
          )}

          {!loading && !fetchError && sortedChecks.length === 0 && (
            <p className="text-sm text-cocoa/50">没有检查项。</p>
          )}

          {!loading && !fetchError && sortedChecks.length > 0 && (
            <div>
              {/* Summary bar */}
              {(() => {
                const failed = sortedChecks.filter((c) => c.level === "failed").length;
                const warning = sortedChecks.filter((c) => c.level === "warning").length;
                const optional = sortedChecks.filter((c) => c.level === "optional").length;
                const success = sortedChecks.filter((c) => c.level === "success").length;
                return (
                  <p className="mb-3 text-xs text-cocoa/50 leading-5">
                    ✓ {success} 项通过
                    {failed > 0 && <span className="text-rose ml-2">· ✗ {failed} 项失败</span>}
                    {warning > 0 && <span className="text-amber ml-2">· ⚠ {warning} 项警告</span>}
                    {optional > 0 && <span className="text-stone-400 ml-2">· ○ {optional} 项可选</span>}
                  </p>
                );
              })()}

              {/* Check list - failed first, then warning, optional, success */}
              <div className="space-y-2">
                {sortedChecks.map((check) => (
                  <details
                    className={`rounded-xl border px-3 py-2 ${getLevelStyle(check.level)}`}
                    key={check.name}
                    open={check.level === "failed"}
                  >
                    <summary className="cursor-pointer text-sm font-medium select-none">
                      {getLevelIcon(check.level)} {check.name}
                      {check.level !== "success" && (
                        <span className="ml-1.5 text-[10px] opacity-60">({getLevelLabel(check.level)})</span>
                      )}
                    </summary>
                    {check.detail ? (
                      <p className="mt-1.5 text-xs opacity-80 break-words whitespace-pre-wrap max-h-40 overflow-auto">
                        {check.detail}
                      </p>
                    ) : check.level === "optional" ? (
                      <p className="mt-1.5 text-xs opacity-60">暂无数据，不影响核心功能</p>
                    ) : null}
                  </details>
                ))}
              </div>
            </div>
          )}
        </AppCard>

        {/* Raw Report (for manual copy, collapsed by default) */}
        <AppCard>
          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-cocoa/50 uppercase tracking-wide select-none">
              📄 原始诊断报告
            </summary>
            <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-white/60 p-3 text-xs leading-relaxed text-cocoa/70 whitespace-pre-wrap break-words border border-white/60">
              {diagnosticReport}
            </pre>
          </details>
        </AppCard>
      </div>
    </AppShell>
  );
}