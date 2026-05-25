"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DeadlineCard } from "@/components/DeadlineCard";
import { PageHeader } from "@/components/PageHeader";
import { getDaysUntilDeadline } from "@/lib/date";
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

  const sorted = useMemo(
    () => (data ? [...data.deadlines].sort((a, b) => getDaysUntilDeadline(a) - getDaysUntilDeadline(b)) : []),
    [data]
  );

  if (!data) return <AppShell><div className="soft-card">正在加载 deadline...</div></AppShell>;

  return (
    <AppShell>
      <PageHeader title="Deadline" subtitle="按截止时间排序，把重要任务提前一点点处理。" />

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
        {sorted.length ? sorted.map((deadline) => (
          <DeadlineCard
            deadline={deadline}
            key={deadline.id}
            onDelete={() => persist(data.deadlines.filter((item) => item.id !== deadline.id))}
            onEdit={() => { setEditingId(deadline.id); setDraft(deadline); }}
            onToggle={() =>
              persist(data.deadlines.map((item) =>
                item.id === deadline.id ? { ...item, status: item.status === "done" ? "todo" : "done" } : item
              ))
            }
          />
        )) : <div className="empty-state">暂时没有 deadline。</div>}
      </div>
    </AppShell>
  );
}
