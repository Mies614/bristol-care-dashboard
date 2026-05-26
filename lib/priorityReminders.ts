import { getDaysUntilDeadline, toDateTime } from "./date";
import { calculateNextPeriodStart, getCurrentCycleDay, getDaysUntilNextPeriod } from "./period";
import { getCurrentDayName } from "./schedule";
import type { Course, Deadline, PeriodRecord, PeriodSettings } from "./types";

export type PriorityReminder = {
  id: string;
  type: "course" | "deadline" | "period";
  title: string;
  subtitle?: string;
  datetime?: string;
  priority: "urgent" | "soon" | "normal" | "info";
  href: string;
  icon: string;
};

const priorityRank: Record<PriorityReminder["priority"], number> = {
  urgent: 0,
  soon: 1,
  normal: 2,
  info: 3
};

function minutesFromTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function courseDateTime(course: Course, now: Date, offsetDays = 0) {
  const date = addDays(now, offsetDays);
  const start = minutesFromTime(course.startTime);
  if (start === null) return undefined;
  date.setHours(Math.floor(start / 60), start % 60, 0, 0);
  return date.toISOString();
}

export function getCourseReminders(courses: Course[], now = new Date()): PriorityReminder[] {
  const today = getCurrentDayName(now);
  const tomorrow = getCurrentDayName(addDays(now, 1));
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const reminders: PriorityReminder[] = [];

  for (const course of courses) {
    const start = minutesFromTime(course.startTime);
    const end = minutesFromTime(course.endTime);
    if (start === null) continue;
    if (course.day === today) {
      const ongoing = end !== null && currentMinutes >= start && currentMinutes <= end;
      const withinHour = start >= currentMinutes && start - currentMinutes <= 60;
      const laterToday = start > currentMinutes;
      if (ongoing || withinHour) {
        reminders.push({
          id: `course-${course.id}`,
          type: "course",
          title: ongoing ? `正在上课：${course.name}` : `快上课了：${course.name}`,
          subtitle: `${course.startTime}-${course.endTime}${course.location ? ` · ${course.location}` : ""}`,
          datetime: courseDateTime(course, now),
          priority: "urgent",
          href: "/schedule",
          icon: "◴"
        });
      } else if (laterToday) {
        reminders.push({
          id: `course-${course.id}`,
          type: "course",
          title: `今日课程：${course.name}`,
          subtitle: `${course.startTime}-${course.endTime}${course.location ? ` · ${course.location}` : ""}`,
          datetime: courseDateTime(course, now),
          priority: "soon",
          href: "/schedule",
          icon: "◴"
        });
      }
    } else if (course.day === tomorrow) {
      reminders.push({
        id: `course-tomorrow-${course.id}`,
        type: "course",
        title: `明天课程：${course.name}`,
        subtitle: `${course.startTime}-${course.endTime}`,
        datetime: courseDateTime(course, now, 1),
        priority: "normal",
        href: "/schedule",
        icon: "◴"
      });
    }
  }
  return reminders;
}

export function getDeadlineReminders(deadlines: Deadline[], now = new Date()): PriorityReminder[] {
  const reminders: Array<PriorityReminder | null> = deadlines
    .filter((deadline) => deadline.status !== "done")
    .map((deadline): PriorityReminder | null => {
      const days = getDaysUntilDeadline(deadline, now);
      const due = toDateTime(deadline.dueDate, deadline.dueTime);
      const dueDay = new Date(due);
      const nowDay = new Date(now);
      dueDay.setHours(0, 0, 0, 0);
      nowDay.setHours(0, 0, 0, 0);
      const isToday = dueDay.getTime() === nowDay.getTime();
      if (days < 0) {
        return {
          id: `deadline-${deadline.id}`,
          type: "deadline" as const,
          title: `已逾期：${deadline.title}`,
          subtitle: deadline.courseName || "未完成 DDL",
          datetime: due.toISOString(),
          priority: "urgent" as const,
          href: "/deadlines",
          icon: "✓"
        };
      }
      if (isToday || days === 0) {
        return {
          id: `deadline-${deadline.id}`,
          type: "deadline" as const,
          title: `今天截止：${deadline.title}`,
          subtitle: deadline.courseName || "今天需要处理",
          datetime: due.toISOString(),
          priority: "urgent" as const,
          href: "/deadlines",
          icon: "✓"
        };
      }
      if (days <= 3) {
        return {
          id: `deadline-${deadline.id}`,
          type: "deadline" as const,
          title: `${days} 天内截止：${deadline.title}`,
          subtitle: deadline.courseName || "可以提前安排",
          datetime: due.toISOString(),
          priority: "soon" as const,
          href: "/deadlines",
          icon: "✓"
        };
      }
      if (days <= 7) {
        return {
          id: `deadline-${deadline.id}`,
          type: "deadline" as const,
          title: `${days} 天后截止：${deadline.title}`,
          subtitle: deadline.courseName || "本周任务",
          datetime: due.toISOString(),
          priority: "normal" as const,
          href: "/deadlines",
          icon: "✓"
        };
      }
      return null;
    });
  return reminders.filter((item): item is PriorityReminder => item !== null);
}

export function getPeriodReminders(records: PeriodRecord[], settings: PeriodSettings, now = new Date()): PriorityReminder[] {
  if (!records.length) {
    return [{
      id: "period-empty",
      type: "period",
      title: "还没有经期记录",
      subtitle: "可以去补一条记录",
      priority: "info",
      href: "/period",
      icon: "☾"
    }];
  }
  const days = getDaysUntilNextPeriod(records, settings, now);
  const nextStart = calculateNextPeriodStart(records, settings);
  const cycleDay = getCurrentCycleDay(records, now);
  if (days === null || !nextStart) return [];
  if (days === 0) {
    return [{
      id: "period-today",
      type: "period",
      title: "预计今天开始",
      subtitle: cycleDay ? `当前周期第 ${cycleDay} 天` : undefined,
      datetime: `${nextStart}T09:00:00.000Z`,
      priority: "urgent",
      href: "/period",
      icon: "☾"
    }];
  }
  if (days >= 1 && days <= 3) {
    return [{
      id: "period-soon",
      type: "period",
      title: `预计 ${days} 天后开始`,
      subtitle: `预计日期 ${nextStart}`,
      datetime: `${nextStart}T09:00:00.000Z`,
      priority: "soon",
      href: "/period",
      icon: "☾"
    }];
  }
  if (days > 3 && days <= 7) {
    return [{
      id: "period-normal",
      type: "period",
      title: `预计 ${days} 天后开始`,
      subtitle: `预计日期 ${nextStart}`,
      datetime: `${nextStart}T09:00:00.000Z`,
      priority: "normal",
      href: "/period",
      icon: "☾"
    }];
  }
  return [];
}

export function sortPriorityReminders(reminders: PriorityReminder[]) {
  return [...reminders].sort((a, b) => {
    const priority = priorityRank[a.priority] - priorityRank[b.priority];
    if (priority !== 0) return priority;
    const aTime = a.datetime ? new Date(a.datetime).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.datetime ? new Date(b.datetime).getTime() : Number.POSITIVE_INFINITY;
    return aTime - bTime;
  });
}

export function getTodayPriorityReminders(input: {
  courses?: Course[];
  deadlines?: Deadline[];
  periodRecords?: PeriodRecord[];
  periodSettings?: PeriodSettings;
  now?: Date;
}) {
  const now = input.now || new Date();
  return sortPriorityReminders([
    ...getCourseReminders(input.courses || [], now),
    ...getDeadlineReminders(input.deadlines || [], now),
    ...getPeriodReminders(input.periodRecords || [], input.periodSettings || {
      averageCycleLength: 28,
      averagePeriodLength: 5,
      reminderDaysBefore: 2
    }, now)
  ]);
}
