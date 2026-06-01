/**
 * DDL Priority Helper
 * 
 * 统一 DDL 优先级分类，确保同一个 DDL 不会同时出现在多处首页提醒中。
 * 
 * 优先级规则（从高到低）：
 * - overdue:  已过期且未完成（dueDate < today）
 * - urgent:   24 小时内截止
 * - soon:     3 天内截止
 * - upcoming: 7 天内截止
 * - normal:   7 天以上
 * 
 * 规则：
 * - completed (status === "done") 的 DDL 不参与任何优先级分类
 * - deletedAt 不为空的 DDL 不参与（软删除）
 * - 每个 DDL 归入唯一优先级（最高匹配）
 */

import type { Deadline } from "@/lib/types";
import { toDateTime } from "@/lib/date";

export type DdlPriority = "overdue" | "urgent" | "soon" | "upcoming" | "normal" | "none";

export interface DdlWithPriority {
  deadline: Deadline;
  priority: DdlPriority;
  daysUntil: number;
}

/**
 * 判断一个 DDL 是否应该参与首页提醒。
 * done / deletedAt 的 DDL 返回 false。
 */
export function isActiveDdl(deadline: Deadline): boolean {
  if (deadline.status === "done") return false;
  if ((deadline as Record<string, unknown>).deletedAt) return false;
  return true;
}

/**
 * 获取 DDL 的唯一优先级（最高匹配优先）。
 * 不活跃的 DDL 返回 "none"。
 */
export function getDdlPriority(deadline: Deadline, now: Date = new Date()): DdlPriority {
  if (!isActiveDdl(deadline)) return "none";

  const days = getDaysUntil(deadline, now);

  if (days < 0) return "overdue";
  if (days <= 1) return "urgent";
  if (days <= 3) return "soon";
  if (days <= 7) return "upcoming";
  return "normal";
}

/**
 * 计算距离 DDL 截止的天数（同 getDaysUntilDeadline 逻辑）。
 * 负数表示已过期。
 */
export function getDaysUntil(deadline: Deadline, now: Date = new Date()): number {
  const due = toDateTime(deadline.dueDate, deadline.dueTime);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 从 DDL 列表中提取活跃 DDL 并按优先级分组。
 * 返回 Map<DdlPriority, DdlWithPriority[]>，同一 DDL 不会出现在多个组中。
 */
export function groupDdlsByPriority(ddls: Deadline[], now: Date = new Date()): Map<DdlPriority, DdlWithPriority[]> {
  const groups = new Map<DdlPriority, DdlWithPriority[]>();

  const active = ddls
    .filter(isActiveDdl)
    .map((d) => ({
      deadline: d,
      priority: getDdlPriority(d, now),
      daysUntil: getDaysUntil(d, now)
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  for (const item of active) {
    const existing = groups.get(item.priority) || [];
    existing.push(item);
    groups.set(item.priority, existing);
  }

  return groups;
}

/**
 * 获取最高优先级的 DDL（用于 TodaySummaryCard 等单项选择）。
 * 返回 undefined 表示没有活跃 DDL。
 */
export function getTopPriorityDdl(ddls: Deadline[], now: Date = new Date()): DdlWithPriority | undefined {
  const active = ddls
    .filter(isActiveDdl)
    .map((d) => ({
      deadline: d,
      priority: getDdlPriority(d, now),
      daysUntil: getDaysUntil(d, now)
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return active[0];
}

/**
 * 获取不包含指定 DDL ID 的优先级分组。
 * 用于排除已在 TodaySummaryCard 中展示的 DDL。
 */
export function groupDdlsExcluding(
  ddls: Deadline[],
  excludeIds: Set<string>,
  now: Date = new Date()
): Map<DdlPriority, DdlWithPriority[]> {
  const groups = new Map<DdlPriority, DdlWithPriority[]>();

  const active = ddls
    .filter(isActiveDdl)
    .filter((d) => !excludeIds.has(d.id))
    .map((d) => ({
      deadline: d,
      priority: getDdlPriority(d, now),
      daysUntil: getDaysUntil(d, now)
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  for (const item of active) {
    const existing = groups.get(item.priority) || [];
    existing.push(item);
    groups.set(item.priority, existing);
  }

  return groups;
}