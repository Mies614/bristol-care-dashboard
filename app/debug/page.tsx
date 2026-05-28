"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

type Check = { name: string; ok: boolean; detail?: string };

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

  return (
    <AppShell>
      <section className="soft-card">
        <h1 className="text-2xl font-semibold">Bristol Care Debug</h1>
        <div className="mt-4 grid gap-2 text-sm">
          <p>environment: {client.env}</p>
          <p>userAgent: {client.userAgent || "loading"}</p>
          <p>localStorage: {client.storage ? "available" : "unavailable"}</p>
          <p>project key count: {client.keyCount}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary btn-small" onClick={refresh}>刷新诊断</button>
          <button className="btn-secondary btn-small" onClick={clearProjectStorage}>清除本项目 localStorage</button>
          <Link className="btn-secondary btn-small" href="/">返回首页</Link>
        </div>
        {message ? <p className="notice mt-3">{message}</p> : null}
      </section>

      <section className="soft-card mt-4">
        <h2 className="font-semibold">Supabase checks</h2>
        <div className="mt-3 space-y-2 text-sm">
          {loading && (
            <p className="text-[var(--app-muted)]">正在检查...</p>
          )}

          {!loading && fetchError && (
            <div className="space-y-2 rounded-2xl border border-[var(--app-danger)]/30 bg-[var(--app-danger)]/8 p-3">
              <p className="font-medium text-[var(--app-text)]">诊断请求失败</p>
              {fetchError.status ? (
                <p className="text-sm text-[var(--app-danger)]">status: {fetchError.status} {fetchError.statusText}</p>
              ) : null}
              {fetchError.message ? (
                <p className="text-sm text-[var(--app-danger)]">{fetchError.message}</p>
              ) : null}
              {fetchError.bodyPreview ? (
                <details className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-xs leading-5">
                  <summary className="cursor-pointer font-medium text-[var(--app-danger)]">查看返回内容预览</summary>
                  <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words text-[var(--app-danger)]">{fetchError.bodyPreview}</pre>
                </details>
              ) : null}
            </div>
          )}

          {!loading && !fetchError && checks !== null && checks.length === 0 && (
            <p className="text-[var(--app-muted)]">没有检查项。</p>
          )}

          {!loading && !fetchError && checks !== null && checks.length > 0 && (
            <div className="space-y-2">
              {checks.map((check) => (
                <p className={check.ok ? "text-emerald-700" : "text-rose-700"} key={check.name}>
                  {check.ok ? "✓" : "×"} {check.name}
                  {check.detail ? <span className="text-[var(--app-muted)]">：{check.detail}</span> : null}
                </p>
              ))}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}