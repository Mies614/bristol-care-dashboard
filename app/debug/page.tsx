"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";

type Check = { name: string; ok: boolean; detail?: string; optional?: boolean };

interface FetchError {
  status?: number;
  statusText?: string;
  message?: string;
  bodyPreview?: string;
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
        setChecks(payload.checks);
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

  // Sort: failed (non-optional) first, then optional/warnings, then passed
  const sortedChecks = useMemo(() => {
    if (!checks) return [];
    const fatal = checks.filter((c) => !c.ok && !c.optional);
    const optional = checks.filter((c) => !c.ok && c.optional);
    const passed = checks.filter((c) => c.ok);
    return [...fatal, ...optional, ...passed];
  }, [checks]);

  // Diagnostic report for clipboard
  const diagnosticReport = useMemo(() => {
    const lines: string[] = [];
    lines.push("=== Bristol Care Diagnostics ===");
    lines.push(`Time: ${new Date().toLocaleString("zh-CN")}`);
    lines.push(`Env: ${client.env}`);
    lines.push(`UserAgent: ${client.userAgent}`);
    lines.push(`localStorage: ${client.storage ? "available" : "unavailable"} (${client.keyCount} keys)`);
    lines.push("");

    if (fetchError) {
      lines.push("--- Fetch Error ---");
      if (fetchError.status) lines.push(`Status: ${fetchError.status} ${fetchError.statusText}`);
      if (fetchError.message) lines.push(`Message: ${fetchError.message}`);
      lines.push("");
    }

    if (sortedChecks.length) {
      const fatal = sortedChecks.filter((c) => !c.ok && !c.optional);
      const optional = sortedChecks.filter((c) => !c.ok && c.optional);
      const passed = sortedChecks.filter((c) => c.ok);
      lines.push(`--- Checks: ${passed.length} passed${fatal.length ? `, ${fatal.length} failed` : ""}${optional.length ? `, ${optional.length} optional` : ""} ---`);
      for (const check of sortedChecks) {
        const icon = check.ok ? "PASS" : check.optional ? "WARN" : "FAIL";
        const detailSuffix = check.detail ? ` - ${check.detail}` : "";
        lines.push(`[${icon}] ${check.name}${check.optional ? " (optional)" : ""}${detailSuffix}`);
      }
    }

    return lines.join("\n");
  }, [sortedChecks, fetchError, client]);

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
        <p className="mt-2 text-sm leading-6 text-cocoa/60">检查 Supabase 连接、localStorage 状态和各项服务。</p>
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
          <h2 className="font-semibold text-cocoa mb-3">Supabase 检查</h2>

          {loading && (
            <p className="text-sm text-cocoa/50">正在检查...</p>
          )}

          {!loading && fetchError && (
            <div className="space-y-2 rounded-2xl border border-[var(--app-danger)]/30 bg-[var(--app-danger)]/8 p-3">
              <p className="font-medium text-cocoa">诊断请求失败</p>
              {fetchError.status ? (
                <p className="text-sm text-[var(--app-danger)] break-all">status: {fetchError.status} {fetchError.statusText}</p>
              ) : null}
              {fetchError.message ? (
                <p className="text-sm text-[var(--app-danger)] break-words">{fetchError.message}</p>
              ) : null}
              {fetchError.bodyPreview ? (
                <details className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-xs leading-5">
                  <summary className="cursor-pointer font-medium text-[var(--app-danger)]">查看返回内容预览</summary>
                  <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words text-[var(--app-danger)]">{fetchError.bodyPreview}</pre>
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
                const fatal = sortedChecks.filter((c) => !c.ok && !c.optional);
                const optional = sortedChecks.filter((c) => !c.ok && c.optional);
                const passed = sortedChecks.filter((c) => c.ok);
                return (
                  <p className="mb-3 text-xs text-cocoa/50 leading-5">
                    ✓ {passed.length} 通过{fatal.length > 0 ? ` · ✗ ${fatal.length} 失败` : ""}{optional.length > 0 ? ` · ⚠ ${optional.length} 无可选数据` : ""}
                  </p>
                );
              })()}

              {/* Check list - failures first, optional after, passed last */}
              <div className="space-y-2">
                {sortedChecks.map((check) => {
                  if (check.optional && !check.ok) {
                    return (
                      <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2" key={check.name}>
                        <p className="text-sm text-stone-500">
                          <span className="font-medium">⚠ {check.name}</span>
                          <span className="ml-1.5 text-[10px] text-stone-400">(optional)</span>
                        </p>
                        {check.detail ? (
                          <p className="mt-1 text-xs text-stone-400 break-words">{check.detail}</p>
                        ) : (
                          <p className="mt-1 text-xs text-stone-400">暂无数据，不影响核心功能</p>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div
                      className={`rounded-xl border px-3 py-2 ${check.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}
                      key={check.name}
                    >
                      <p className={`text-sm font-medium ${check.ok ? "text-emerald-700" : "text-rose-700"}`}>
                        {check.ok ? "✓" : "✗"} {check.name}
                      </p>
                      {check.detail ? (
                        <p className="mt-1 text-xs break-words text-cocoa/50">{check.detail}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </AppCard>

        {/* Raw Report (for manual copy) */}
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