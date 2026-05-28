"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AutoSyncStatusBadge } from "@/components/AutoSyncStatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { SharedAccessGate } from "@/components/SharedAccessGate";
import { downloadIcs, safeIcsFilename } from "@/lib/ics";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import {
  calculateNextPeriodStart,
  calculatePeriodLength,
  createPeriodReminderIcs,
  DEFAULT_PERIOD_SETTINGS,
  getCurrentCycleDay,
  getDaysUntilNextPeriod
} from "@/lib/period";
import type { PeriodRecord, PeriodSettings } from "@/lib/types";

const symptoms = ["腹痛", "腰酸", "头痛", "疲惫", "情绪波动", "失眠", "食欲变化", "其他"];

type Draft = {
  startDate: string;
  endDate: string;
  flow: "" | "light" | "medium" | "heavy";
  symptoms: string[];
  mood: string;
  note: string;
};

const emptyDraft: Draft = { startDate: "", endDate: "", flow: "", symptoms: [], mood: "", note: "" };

function formatApiError(payload: Record<string, unknown>, fallback: string) {
  return [
    typeof payload.error === "string" ? payload.error : fallback,
    typeof payload.code === "string" ? `code: ${payload.code}` : "",
    typeof payload.step === "string" ? `step: ${payload.step}` : "",
    typeof payload.detail === "string" ? `detail: ${payload.detail}` : ""
  ].filter(Boolean).join(" · ");
}

export default function PeriodPage() {
  const code = getDefaultSpaceCode();
  const [records, setRecords] = useState<PeriodRecord[]>([]);
  const [settings, setSettings] = useState<PeriodSettings>(DEFAULT_PERIOD_SETTINGS);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    loadPeriod();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latest = records[0];
  const nextStart = useMemo(() => calculateNextPeriodStart(records, settings), [records, settings]);
  const cycleDay = useMemo(() => getCurrentCycleDay(records), [records]);
  const daysUntil = useMemo(() => getDaysUntilNextPeriod(records, settings), [records, settings]);
  const visibleRecords = showAllHistory ? records : records.slice(0, 3);

  async function loadPeriod() {
    const response = await fetch(`/api/period?code=${encodeURIComponent(code)}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(formatApiError(payload, "经期记录加载失败。"));
      return;
    }
    setRecords(payload.records || []);
    setSettings(payload.settings || DEFAULT_PERIOD_SETTINGS);
  }

  function toggleSymptom(value: string) {
    setDraft((current) => ({
      ...current,
      symptoms: current.symptoms.includes(value) ? current.symptoms.filter((item) => item !== value) : [...current.symptoms, value]
    }));
  }

  async function saveRecord(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const body = {
      code,
      id: editingId || undefined,
      startDate: draft.startDate,
      endDate: draft.endDate || undefined,
      flow: draft.flow || undefined,
      symptoms: draft.symptoms,
      mood: draft.mood,
      note: draft.note
    };
    const response = await fetch("/api/period", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setMessage(formatApiError(payload, "经期记录保存失败。"));
      return;
    }
    setDraft(emptyDraft);
    setEditingId("");
    setMessage("已保存。");
    await loadPeriod();
  }

  async function deleteRecord(id: string) {
    if (!confirm("确定删除这条记录吗？")) return;
    const response = await fetch("/api/period", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, id, action: "delete" })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(formatApiError(payload, "删除失败。"));
      return;
    }
    setMessage("已删除。");
    await loadPeriod();
  }

  async function saveSettings() {
    const response = await fetch("/api/period", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, action: "settings", settings })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(formatApiError(payload, "设置保存失败。"));
      return;
    }
    setMessage("设置已保存。");
    await loadPeriod();
  }

  function editRecord(record: PeriodRecord) {
    setEditingId(record.id);
    setDraft({
      startDate: record.startDate,
      endDate: record.endDate || "",
      flow: record.flow || "",
      symptoms: record.symptoms || [],
      mood: record.mood || "",
      note: record.note || ""
    });
  }

  function exportReminder() {
    if (!nextStart) {
      setMessage("需要先添加一条记录，才能生成提醒。");
      return;
    }
    downloadIcs(`${safeIcsFilename(`period-${nextStart}`)}.ics`, createPeriodReminderIcs(nextStart, settings));
    setMessage("已生成日历文件。");
  }

  return (
    <SharedAccessGate>
      <AppShell>
        <PageHeader title="经期记录" subtitle="记录开始日、结束日和下次预计时间。" />
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Link className="btn-secondary btn-small" href="/records">返回记录中心</Link>
            <AutoSyncStatusBadge />
          </div>
          <section className="soft-card bg-gradient-to-br from-white/85 via-blush/35 to-lilac/35">
            <p className="section-kicker mb-1">Cycle</p>
            <h2 className="font-semibold text-cocoa">下次预计</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-cocoa/72">
              <div className="rounded-2xl bg-white/58 p-3 shadow-sm">
                <p className="text-xs text-cocoa/50">最近开始</p>
                <p className="mt-1 font-semibold text-cocoa">{latest?.startDate || "还没有记录"}</p>
              </div>
              <div className="rounded-2xl bg-white/58 p-3 shadow-sm">
                <p className="text-xs text-cocoa/50">当前周期</p>
                <p className="mt-1 font-semibold text-cocoa">{cycleDay ? `第 ${cycleDay} 天` : "待记录"}</p>
              </div>
              <div className="rounded-2xl bg-white/58 p-3 shadow-sm">
                <p className="text-xs text-cocoa/50">预计开始</p>
                <p className="mt-1 font-semibold text-cocoa">{nextStart || "待记录"}</p>
              </div>
              <div className="rounded-2xl bg-white/58 p-3 shadow-sm">
                <p className="text-xs text-cocoa/50">距离预计</p>
                <p className="mt-1 font-semibold text-cocoa">{daysUntil === null ? "待记录" : daysUntil >= 0 ? `${daysUntil} 天` : `已过 ${Math.abs(daysUntil)} 天`}</p>
              </div>
            </div>
            <button className="btn-secondary mt-4 w-full sm:w-auto" onClick={exportReminder}>导出日历提醒</button>
          </section>

          <form className="soft-card space-y-3" onSubmit={saveRecord}>
            <div className="flex items-center justify-between">
              <div>
                <p className="section-kicker mb-1">Record</p>
                <h2 className="font-semibold text-cocoa">{editingId ? "编辑记录" : "添加记录"}</h2>
              </div>
              {editingId ? <button className="btn-secondary btn-small" type="button" onClick={() => { setEditingId(""); setDraft(emptyDraft); }}>取消编辑</button> : null}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="text-sm text-cocoa/70">开始日期<input className="field mt-1" required type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></label>
              <label className="text-sm text-cocoa/70">结束日期<input className="field mt-1" type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} /></label>
            </div>
            <select className="field" value={draft.flow} onChange={(e) => setDraft({ ...draft, flow: e.target.value as Draft["flow"] })}>
              <option value="">流量</option>
              <option value="light">较少</option>
              <option value="medium">中等</option>
              <option value="heavy">较多</option>
            </select>
            <div className="flex flex-wrap gap-2">
              {symptoms.map((item) => (
                <button className={draft.symptoms.includes(item) ? "btn-primary btn-small" : "btn-secondary btn-small"} key={item} type="button" onClick={() => toggleSymptom(item)}>{item}</button>
              ))}
            </div>
            <input className="field" placeholder="心情" value={draft.mood} onChange={(e) => setDraft({ ...draft, mood: e.target.value })} />
            <textarea className="field min-h-24" placeholder="备注" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
            <button className="btn-primary w-full" disabled={loading} type="submit">{loading ? "保存中..." : "保存记录"}</button>
          </form>

          <section className="soft-card space-y-3">
            <div>
              <p className="section-kicker mb-1">Settings</p>
              <h2 className="font-semibold text-cocoa">周期设置</h2>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="text-xs text-cocoa/65">周期（天）<input className="field mt-1" min={1} type="number" value={settings.averageCycleLength} onChange={(e) => setSettings({ ...settings, averageCycleLength: Number(e.target.value) })} /></label>
              <label className="text-xs text-cocoa/65">经期（天）<input className="field mt-1" min={1} type="number" value={settings.averagePeriodLength} onChange={(e) => setSettings({ ...settings, averagePeriodLength: Number(e.target.value) })} /></label>
              <label className="text-xs text-cocoa/65">提前提醒（天）<input className="field mt-1" min={0} type="number" value={settings.reminderDaysBefore} onChange={(e) => setSettings({ ...settings, reminderDaysBefore: Number(e.target.value) })} /></label>
            </div>
            <button className="btn-secondary w-full" onClick={saveSettings}>保存周期设置</button>
          </section>

          <section className="soft-card">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker mb-1">History</p>
                <h2 className="font-semibold text-cocoa">历史记录</h2>
              </div>
              {records.length > 3 ? <button className="btn-secondary btn-small" onClick={() => setShowAllHistory((value) => !value)}>{showAllHistory ? "收起" : `展开 ${records.length} 条`}</button> : null}
            </div>
            {message ? <p className="notice mb-3">{message}</p> : null}
            {records.length ? (
              <div className="space-y-2 transition-all duration-300">
                {visibleRecords.map((record) => (
                  <article className="rounded-[1.35rem] border border-white/70 bg-white/58 p-3 text-sm text-cocoa/72 shadow-sm" key={record.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-cocoa">{record.startDate}{record.endDate ? ` - ${record.endDate}` : ""}</p>
                        <p className="mt-1 text-xs">持续 {calculatePeriodLength(record.startDate, record.endDate)} 天</p>
                        {record.symptoms?.length ? <p className="mt-2">{record.symptoms.join("、")}</p> : null}
                        {record.note ? <p className="mt-2 leading-6 break-words">{record.note}</p> : null}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button className="btn-secondary btn-small" onClick={() => editRecord(record)}>编辑</button>
                        <button className="btn-danger btn-small" onClick={() => deleteRecord(record.id)}>删除</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : <p className="empty-state text-left">还没有记录，可以先补一条。</p>}
          </section>
        </div>
      </AppShell>
    </SharedAccessGate>
  );
}