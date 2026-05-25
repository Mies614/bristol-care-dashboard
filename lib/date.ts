import type { Deadline } from "./types";

export function toDateTime(date: string, time?: string): Date {
  return new Date(`${date}T${time || "23:59"}:00`);
}

export function getDaysUntilDeadline(deadline: Deadline, now = new Date()): number {
  const due = toDateTime(deadline.dueDate, deadline.dueTime);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDeadlineTone(deadline: Deadline, now = new Date()) {
  if (deadline.status === "done") return "done";
  const hours = (toDateTime(deadline.dueDate, deadline.dueTime).getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hours < 24) return "urgent";
  const days = Math.ceil(hours / 24);
  if (days <= 3) return "soon";
  if (days <= 7) return "watch";
  return "normal";
}

export function formatCountdown(targetDate: string, now = new Date()) {
  if (!targetDate) return "还没有设置下次见面日期";
  const target = new Date(`${targetDate}T00:00:00`);
  const days = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "这次见面已经到啦";
  if (days === 0) return "今天就能见面";
  return `还有 ${days} 天见面`;
}
