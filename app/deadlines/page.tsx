"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AutoSyncStatusBadge } from "@/components/AutoSyncStatusBadge";
import { DeadlineCard } from "@/components/DeadlineCard";
import { PageHeader } from "@/components/PageHeader";
import { getDaysUntilDeadline } from "@/lib/date";
import { createAllDeadlinesIcs, createDeadlineIcs, downloadIcs, isDeadlineCalendarExportable, safeIcsFilename } from "@/lib/ics";
import { loadAppData, saveAppData } from "@/lib/storage";
import type { AppData, Deadline } from "@/lib/types";

const emptyDeadline: Omit<Deadline, "id"> = {
  title: "",
  courseName: "",
  dueDate: new Date().toISOString().slice(0, 10),
  dueTime: "23:59",
  priority: "medium",
  status: "todo",
  note: ""
};

export default function DeadlinesPage() {
  const [data, setData] = useState<AppData | null>(null);
  const [draft, setDraft] = useState<Omit<Deadline, "id">>(emptyDeadline);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showDone, setShowDone] = useState(false);

  useEffect(() => setData(loadAppData()), []);

  function persist(deadlines: Deadline[]) {
    if (!data) return;
    const next = { ...data, deadlines };
    saveAppData(next);
    setData(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const deadline: Deadline = { ...draft, id: editingId || crypto.randomUUID(), title: draft.title.trim() };
    const deadlines = editingId
      ? data!.deadlines.map((item) => (item.id === editingId ? deadline : item))
      : [...data!.deadlines, deadline];
    persist(deadlines);
    setDraft(emptyDeadline);
    setEditingId(null);
  }

  function exportDeadline(deadline: Deadline) {
    if (!isDeadlineCalendarExportable(deadline)) {
      setMessage("Deadline 日期不正确，暂时不能生成日历文件。");
      return;
    }
    downloadIcs(`bristol-ddl-${safeIcsFilename(deadline.title)}-${deadline.dueDate}.ics`, createDeadlineIcs(deadline));
    setMessage("已生成日历文件，请在手机日历中导入。如果没有自动下载，请长按或在浏览器中打开。");
  }

  function exportAllDeadlines() {
    if (!data) return;
    const exportable = data.deadlines.filter((deadline) => deadline.status !== "done" && isDeadlineCalendarExportable(deadline));
    if (!exportable.length) {
      setMessage("没有可导出的未完成 DDL 提醒。");
      return;
    }
    downloadIcs("bristol-deadlines.ics", createAllDeadlinesIcs(exportable));
    setMessage("已生成日历文件，请在手机日历中导入。如果没有自动下载，请长按或在浏览器中打开。");
  }

  const sorted = useMemo(
    () => (data ? [...data.deadlines].sort((a, b) => getDaysUntilDeadline(a) - getDaysUntilDeadline(b)) : []),
    [data]
  );
  const todayDue = sorted.filter((deadline) => deadline.status !== "done" && getDaysUntilDeadline(deadline) === 0);
  const dueInThreeDays = sorted.filter((deadline) => {
    const days = getDaysUntilDeadline(deadline);
    return deadline.status !== "done" && days > 0 && days <= 3;
  });
  const overdue = sorted.filter((deadline) => deadline.status !== "done" && getDaysUntilDeadline(deadline) < 0);
  const activeDeadlines = sorted.filter((deadline) => deadline.status !== "done");
  const completedDeadlines = sorted.filter((deadline) => deadline.status === "done");

  if (!data) return <AppShell><div className="soft-card">正在加载 deadline...</div></AppShell>;

  return (
    <AppShell>
      <PageHeader title="Deadline" subtitle="按截止时间排序，把重要任务提前一点点处理。" />
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link className="btn-secondary btn-small" href="/records">返回记录中心</Link>
        <AutoSyncStatusBadge />
      </div>
      <section className="soft-card mb-4">
        <p className="section-kicker mb-1">Summary</p>
        <h2 className="font-semibold text-cocoa">DDL 摘要</h2>
        <p className="mt-2 text-sm text-cocoa/65">今天截止 {todayDue.length} 个，3 天内截止 {dueInThreeDays.length} 个，已逾期 {overdue.length} 个。</p>
      </section>
      <section className="soft-card mb-4">
        <p className="section-kicker mb-1">Calendar</p>
        <h2 className="mb-3 font-semibold text-cocoa">日历提醒</h2>
        <button className="btn-secondary" onClick={exportAllDeadlines}>导出全部 DDL 提醒</button>
        {message ? <p className="notice mt-3">{message}</p> : null}
      </section>

      <form className="soft-card mb-4 space-y-3 bg-gradient-to-br from-white/85 to-butter/45" onSubmit={submit}>
        <div>
          <p className="section-kicker mb-1">Task</p>
          <h2 className="font-semibold text-cocoa">{editingId ? "编辑 deadline" : "添加 deadline"}</h2>
        </div>
        <input className="field" placeholder="标题" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <input className="field" placeholder="课程名，可选" value={draft.courseName} onChange={(e) => setDraft({ ...draft, courseName: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className="field" type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
          <input className="field" type="time" value={draft.dueTime} onChange={(e) => setDraft({ ...draft, dueTime: e.target.value })} />
          <select className="field" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Deadline["priority"] })}>
            <option value="low">低优先级</option>
            <option value="medium">中优先级</option>
            <option value="high">高优先级</option>
          </select>
          <select className="field" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Deadline["status"] })}>
            <option value="todo">待办</option>
            <option value="done">完成</option>
          </select>
        </div>
        <textarea className="field min-h-20" placeholder="备注，可选" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        <div className="flex gap-2">
          <button className="btn-primary flex-1" type="submit">{editingId ? "保存修改" : "添加 deadline"}</button>
          {editingId ? <button className="btn-secondary" type="button" onClick={() => { setEditingId(null); setDraft(emptyDeadline); }}>取消</button> : null}
        </div>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {activeDeadlines.length ? activeDeadlines.map((deadline) => (
          <DeadlineCard
            deadline={deadline}
            key={deadline.id}
            onDelete={() => persist(data.deadlines.filter((item) => item.id !== deadline.id))}
            onEdit={() => { setEditingId(deadline.id); setDraft(deadline); }}
            onCalendar={() => exportDeadline(deadline)}
            onToggle={() =>
              persist(data.deadlines.map((item) =>
                item.id === deadline.id ? { ...item, status: item.status === "done" ? "todo" : "done" } : item
              ))
            }
          />
        )) : <div className="empty-state">暂时没有 deadline。</div>}
      </div>
      {completedDeadlines.length ? (
        <section className="soft-card mt-4">
          <button className="flex w-full items-center justify-between text-left" onClick={() => setShowDone((value) => !value)} type="button">
            <span>
              <span className="section-kicker mb-1 block">Done</span>
              <span className="font-semibold text-cocoa">已完成 DDL（{completedDeadlines.length}）</span>
            </span>
            <span className="btn-secondary btn-small">{showDone ? "收起" : "展开"}</span>
          </button>
          <div className={`grid transition-all duration-300 ${showDone ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="grid gap-3 overflow-hidden md:grid-cols-2">
              {completedDeadlines.map((deadline) => (
                <DeadlineCard
                  deadline={deadline}
                  key={deadline.id}
                  onDelete={() => persist(data.deadlines.filter((item) => item.id !== deadline.id))}
                  onEdit={() => { setEditingId(deadline.id); setDraft(deadline); }}
                  onCalendar={() => exportDeadline(deadline)}
                  onToggle={() =>
                    persist(data.deadlines.map((item) =>
                      item.id === deadline.id ? { ...item, status: item.status === "done" ? "todo" : "done" } : item
                    ))
                  }
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
