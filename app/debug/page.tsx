"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Check = { name: string; ok: boolean; detail?: string };

export default function DebugPage() {
  const [client, setClient] = useState({ userAgent: "", storage: false, keyCount: 0, env: process.env.NODE_ENV || "unknown" });
  const [checks, setChecks] = useState<Check[]>([]);
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
    collectClient();
    const response = await fetch("/api/debug/supabase");
    const payload = await response.json().catch(() => ({}));
    setChecks(payload.checks || []);
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
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-6 text-zinc-800">
      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-semibold">Bristol Care Debug</h1>
        <div className="mt-4 grid gap-2 text-sm">
          <p>environment: {client.env}</p>
          <p>userAgent: {client.userAgent || "loading"}</p>
          <p>localStorage: {client.storage ? "available" : "unavailable"}</p>
          <p>project key count: {client.keyCount}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white" onClick={refresh}>刷新诊断</button>
          <button className="rounded-full bg-zinc-100 px-4 py-2 text-sm" onClick={clearProjectStorage}>清除本项目 localStorage</button>
          <Link className="rounded-full bg-zinc-100 px-4 py-2 text-sm" href="/">返回首页</Link>
        </div>
        {message ? <p className="mt-3 text-sm">{message}</p> : null}
      </section>
      <section className="mt-4 rounded-3xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Supabase checks</h2>
        <div className="mt-3 space-y-2 text-sm">
          {checks.map((check) => (
            <p className={check.ok ? "text-emerald-700" : "text-rose-700"} key={check.name}>
              {check.ok ? "✓" : "×"} {check.name}{check.detail ? `：${check.detail}` : ""}
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}
