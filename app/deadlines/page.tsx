"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AutoSyncStatusBadge } from "@/components/AutoSyncStatusBadge";
import { DeadlineCard } from "@/components/DeadlineCard";
import { getDaysUntilDeadline } from "@/lib/date";
import { createAllDeadlinesIcs, createDeadlineIcs, downloadIcs, isDeadlineCalendarExportable, safeIcsFilename } from "@/lib/ics";
import { loadAppData, saveAppData } from "@/lib/storage";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

  // Filter out soft-deleted deadlines (deletedAt set), then sort by due date ascending
  const sorted = useMemo(
    () => (data ? [...data.deadlines]
      .filter((d) => !d.deletedAt)
      .sort((a, b) => getDaysUntilDeadline(a) - getDaysUntilDeadline(b)) : []),
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

  if (!data) return <AppShell><AppCard>正在加载 deadline...</AppCard></AppShell>;

  return (
    <AppShell>
      {/* Hero */}
      <header className="mb-4 overflow-hidden rounded-[2rem] border border-white/75 bg-gradient-to-br from-white/88 via-blush/55 to-lilac/60 p-5 shadow-float backdrop-blur-xl">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">Deadlines</p>
        <h1 className="text-2xl font-semibold text-[var(--app-text)]">Deadline</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">按截止时间排序，把重要任务提前一点点处理。</p>
      </header>

      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href="/records">
          <AppButton variant="secondary" size="sm">返回记录中心</AppButton>
        </Link>
        <AutoSyncStatusBadge />
      </div>

      {/* Summary */}
      <AppCard className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">Summary</p>
        <h2 className="font-semibold text-[var(--app-text)]">DDL 摘要</h2>
        <p className="mt-2 text-sm text-[var(--app-muted)]">今天截止 {todayDue.length} 个，3 天内截止 {dueInThreeDays.length} 个，已逾期 {overdue.length} 个。</p>
      </AppCard>

      {/* Calendar Export */}
      <AppCard className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">Calendar</p>
        <h2 className="mb-3 font-semibold text-[var(--app-text)]">日历提醒</h2>
        <AppButton variant="secondary" onClick={exportAllDeadlines}>导出全部 DDL 提醒</AppButton>
        {message ? (
          <div className="mt-3 rounded-[var(--app-radius)] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-3 text-sm text-[var(--app-accent)]">{message}</div>
        ) : null}
      </AppCard>

      {/* Form */}
      <form className="mb-4 space-y-3" onSubmit={submit}>
        <AppCard className="space-y-3 bg-gradient-to-br from-white/85 to-butter/45">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">Task</p>
            <h2 className="font-semibold text-[var(--app-text)]">{editingId ? "编辑 deadline" : "添加 deadline"}</h2>
          </div>
          <Input placeholder="标题" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <Input placeholder="课程名，可选" value={draft.courseName} onChange={(e) => setDraft({ ...draft, courseName: e.target.value })} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
            <Input type="time" value={draft.dueTime} onChange={(e) => setDraft({ ...draft, dueTime: e.target.value })} />
            <select
              className="w-full rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: e.target.value as Deadline["priority"] })}
            >
              <option value="low">低优先级</option>
              <option value="medium">中优先级</option>
              <option value="high">高优先级</option>
            </select>
            <select
              className="w-full rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as Deadline["status"] })}
            >
              <option value="todo">待办</option>
              <option value="done">完成</option>
            </select>
          </div>
          <Textarea className="min-h-20" placeholder="备注，可选" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          <div className="flex gap-2">
            <AppButton variant="primary" className="flex-1" type="submit">{editingId ? "保存修改" : "添加 deadline"}</AppButton>
            {editingId ? (
              <AppButton variant="secondary" type="button" onClick={() => { setEditingId(null); setDraft(emptyDeadline); }}>取消</AppButton>
            ) : null}
          </div>
        </AppCard>
      </form>

      {/* Active deadlines - single column on mobile */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        )) : <div className="py-8 text-center text-sm text-[var(--app-muted)] sm:col-span-2">暂时没有 deadline。</div>}
      </div>

      {/* Completed */}
      {completedDeadlines.length ? (
        <AppCard className="mt-4">
          <button className="flex w-full items-center justify-between text-left" onClick={() => setShowDone((value) => !value)} type="button">
            <span>
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1 block">Done</span>
              <span className="font-semibold text-[var(--app-text)]">已完成 DDL（{completedDeadlines.length}）</span>
            </span>
            <AppButton variant="secondary" size="sm" type="button">{showDone ? "收起" : "展开"}</AppButton>
          </button>
          <div className={`grid transition-all duration-300 ${showDone ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="grid grid-cols-1 gap-3 overflow-hidden sm:grid-cols-2">
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
        </AppCard>
      ) : null}
    </AppShell>
  );
}