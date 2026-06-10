"use client";

import type { Deadline } from "@/lib/types";
import { getDaysUntilDeadline, getDeadlineTone } from "@/lib/date";

const toneClass = {
  normal: "border-white/80 bg-white/70",
  watch: "border-[#f4d98a]/70 bg-[#fff7d8]/75",
  soon: "border-[#f2c198]/70 bg-[#fff0e3]/80",
  urgent: "border-[#efb6b1]/75 bg-[#fff0ef]/85",
  done: "border-zinc-200/70 bg-zinc-100/70 text-zinc-500"
};

export function DeadlineCard({
  deadline,
  onToggle,
  onEdit,
  onDelete,
  onCalendar
}: {
  deadline: Deadline;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCalendar?: () => void;
}) {
  const tone = getDeadlineTone(deadline);
  const days = getDaysUntilDeadline(deadline);
  const label = deadline.status === "done" ? "已完成" : days < 0 ? "已过期" : days === 0 ? "今天截止" : `${days} 天后`;

  return (
    <article className={`rounded-[1.35rem] border p-3 shadow-sm backdrop-blur ${toneClass[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium">{deadline.title}</h3>
          <p className="mt-1 text-sm opacity-70">
            {deadline.courseName ? `${deadline.courseName} · ` : ""}
            {deadline.dueDate} {deadline.dueTime || ""}
          </p>
          {deadline.note ? <p className="mt-2 text-sm opacity-75">{deadline.note}</p> : null}
        </div>
        <span className="shrink-0 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs shadow-sm">{label}</span>
      </div>
      {(onToggle || onEdit || onDelete || onCalendar) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {onToggle ? (
            <button className="btn-secondary btn-small" onClick={onToggle} aria-label={deadline.status === "done" ? "标记为未完成" : "标记为已完成"}>
              {deadline.status === "done" ? "标为待办" : "标记完成"}
            </button>
          ) : null}
          {onEdit ? (
            <button className="btn-secondary btn-small" onClick={onEdit} aria-label="编辑 DDL">
              编辑
            </button>
          ) : null}
          {onCalendar ? (
            <button className="btn-secondary btn-small" disabled={deadline.status === "done"} onClick={onCalendar} aria-label="添加到日历">
              添加提醒
            </button>
          ) : null}
          {onDelete ? (
            <button className="btn-danger btn-small" onClick={onDelete} aria-label="删除 DDL">
              删除
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}
