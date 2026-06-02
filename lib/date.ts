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
  if (isNaN(target.getTime())) return "还没有设置下次见面日期";
  const days = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "这次见面已经到啦";
  if (days === 0) return "今天就能见面";
  return `还有 ${days} 天见面`;
}

/**
 * Safe date formatting utilities.
 * All functions return a fallback string when input is invalid,
 * ensuring no "Invalid Date", "NaN", or "undefined" in UI.
 */

/**
 * Format an ISO string or Date to a friendly Chinese locale string.
 * Returns fallback if input is invalid.
 */
export function formatDateSafe(input: string | Date | null | undefined, fallback = "未知日期"): string {
  if (!input) return fallback;
  try {
    const d = typeof input === "string" ? new Date(input) : input;
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  } catch {
    return fallback;
  }
}

/**
 * Format to full date with time.
 */
export function formatDateTimeSafe(input: string | Date | null | undefined, fallback = "未知时间"): string {
  if (!input) return fallback;
  try {
    const d = typeof input === "string" ? new Date(input) : input;
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return fallback;
  }
}

/**
 * Format a relative time string ("刚刚", "3 分钟前", "2 小时前", "3 天前").
 */
export function formatRelativeTimeSafe(input: string | Date | null | undefined, fallback = ""): string {
  if (!input) return fallback;
  try {
    const d = typeof input === "string" ? new Date(input) : input;
    if (isNaN(d.getTime())) return fallback;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return fallback;

    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "刚刚";
    if (diffMin < 60) return `${diffMin} 分钟前`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} 小时前`;

    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} 天前`;

    return formatDateSafe(d, fallback);
  } catch {
    return fallback;
  }
}

/**
 * Format countdown from a target date string ("YYYY-MM-DD").
 * Returns gentle Chinese text.
 */
export function formatCountdownSafe(targetDate: string | null | undefined, now = Date.now()): string | null {
  if (!targetDate) return null;
  try {
    // Parse as midnight UTC to make countdown timezone-independent.
    // Input is always a YYYY-MM-DD date string, so UTC midnight
    // gives a consistent anchor regardless of the user's timezone.
    const target = new Date(`${targetDate}T00:00:00Z`);
    if (isNaN(target.getTime())) return null;
    const days = Math.ceil((target.getTime() - now) / (1000 * 60 * 60 * 24));
    if (days < 0) return "已经到啦";
    if (days === 0) return "今天";
    if (days === 1) return "明天";
    if (days <= 3) return `${days} 天后`;
    if (days <= 7) return `${days} 天后`;
    return `${days} 天后`;
  } catch {
    return null;
  }
}

/**
 * Parse an ISO date string to YYYY-MM-DD safely.
 */
export function toDateStringSafe(input: string | Date | null | undefined, fallback = ""): string {
  if (!input) return fallback;
  try {
    const d = typeof input === "string" ? new Date(input) : input;
    if (isNaN(d.getTime())) return fallback;
    return d.toISOString().slice(0, 10);
  } catch {
    return fallback;
  }
}

/**
 * Check if a date string is valid and parseable.
 */
export function isValidDateString(input: string | null | undefined): boolean {
  if (!input) return false;
  try {
    const d = new Date(input);
    return !isNaN(d.getTime());
  } catch {
    return false;
  }
}