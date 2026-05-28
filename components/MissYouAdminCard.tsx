"use client";

import { useCallback, useEffect, useState } from "react";
import { getDefaultSpaceCode } from "@/lib/cloudSync";

interface MissYouRecord {
  id: string;
  author: string;
  created_at: string;
}

export function MissYouAdminCard() {
  const [code] = useState(getDefaultSpaceCode());
  const [records, setRecords] = useState<MissYouRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/miss-you?code=${encodeURIComponent(code)}&includeUnread=true`);
      const payload = await response.json();
      if (Array.isArray(payload.records)) setRecords(payload.records.slice(0, 20));
      else setRecords([]);
    } catch {
      setRecords([]);
    }
    setLoading(false);
  }, [code]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  async function handleThinkHer() {
    try {
      const response = await fetch("/api/miss-you", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, author: "admin" })
      });
      if (response.ok) {
        setMessage("💭 已想她一下");
        await loadRecords();
      } else {
        const payload = await response.json();
        setMessage(payload.error || "失败");
      }
    } catch {
      setMessage("网络错误");
    }
  }

  // Group by date
  const grouped = records.reduce<Record<string, MissYouRecord[]>>((acc, record) => {
    const date = record.created_at ? new Date(record.created_at).toLocaleDateString("zh-CN") : "未知";
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <section className="soft-card bg-gradient-to-br from-white/85 to-blush/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="section-kicker mb-1">Miss You</p>
            <h2 className="font-semibold text-[var(--app-text)]">想她记录</h2>
          </div>
          <button className="btn-secondary btn-small" onClick={loadRecords} disabled={loading}>
            {loading ? "刷新..." : "刷新"}
          </button>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
          每次点击「想她一下」都会在这里留下一笔记录。
        </p>
        <button className="btn-primary w-full mt-4" onClick={handleThinkHer}>
          💭 想她一下
        </button>
        {message && (
          <p className="notice mt-3">{message}</p>
        )}
      </section>

      <section className="soft-card">
        <div>
          <p className="section-kicker mb-1">History</p>
          <h2 className="font-semibold text-[var(--app-text)]">历史记录</h2>
        </div>
        {Object.keys(grouped).length === 0 ? (
          <p className="empty-state mt-3">还没有记录，点一下上面的按钮试试。</p>
        ) : (
          <div className="mt-3 space-y-4">
            {Object.entries(grouped).map(([date, dateRecords]) => (
              <div key={date}>
                <p className="text-xs font-medium text-[var(--app-muted)] mb-2">{date}</p>
                <div className="space-y-2">
                  {dateRecords.map((record) => (
                    <div className="rounded-2xl border border-white/70 bg-white/55 p-3 text-sm" key={record.id}>
                      <span className="font-medium">{record.author === "admin" ? "我" : "小乖"}</span>
                      <span className="text-[var(--app-muted)]"> 在 {record.created_at ? new Date(record.created_at).toLocaleTimeString("zh-CN") : "未知时间"} 想你了</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}