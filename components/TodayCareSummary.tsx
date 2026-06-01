"use client";

import { getDaysUntilDeadline } from "@/lib/date";
import { getCurrentDayName } from "@/lib/schedule";
import { calculateNextPeriodStart, getDaysUntilNextPeriod } from "@/lib/period";
import type { Course, Deadline, LoveNote, PeriodRecord, PeriodSettings } from "@/lib/types";
import type { RandomMemoryItem } from "@/lib/randomMemory";
import type { PriorityReminder } from "@/lib/priorityReminders";

export type TodayCareInput = {
  courses: Course[];
  deadlines: Deadline[];
  periodRecords: PeriodRecord[];
  periodSettings: PeriodSettings;
  unreadMissYouCount: number;
  featuredNote?: LoveNote | null;
  randomMemory?: RandomMemoryItem | null;
  topPriorityReminder?: PriorityReminder | null;
  now?: Date;
};

export type TodayCareSegment = {
  id: string;
  /** segment 标题 emoji + 文字 */
  label: string;
  /** 详细数据摘要 */
  summary: string;
  /** 辅助文本 */
  detail?: string;
  /** 跳转链接 */
  href?: string;
  /** 跳转文案 */
  actionLabel?: string;
};

/**
 * TodayCareSummary 生成首页“今日照顾摘要”的多个片段（segment），
 * 供首页在 TodaySummaryCard 之下列出。
 *
 * 产出风格：温柔、如好友一般提醒她今天最重要的事。
 */
export function buildTodayCareSegments(input: TodayCareInput): TodayCareSegment[] {
  const now = input.now || new Date();
  const segments: TodayCareSegment[] = [];

  // 1. 下一件重要事项（topPriorityReminder 或第一个课程）
  if (input.topPriorityReminder) {
    const r = input.topPriorityReminder;
    segments.push({
      id: "next-important",
      label: r.type === "course" ? "📚 下一节课" : r.type === "deadline" ? "📌 下一个 DDL" : "🌸 身体节奏",
      summary: r.title,
      detail: r.careText || r.subtitle,
      href: r.href,
      actionLabel: "去看看"
    });
  }

  // 2. 未读想念
  if (input.unreadMissYouCount > 0) {
    segments.push({
      id: "miss-you-unread",
      label: "💕 他也想你啦",
      summary: `你不在的时候，他想你了 ${input.unreadMissYouCount} 次。`,
      detail: "这些想念都帮你收好了。",
      href: undefined,
      actionLabel: undefined
    });
  }

  // 3. 今日课程摘要
  const todayDay = getCurrentDayName(now);
  const todaysCourses = input.courses.filter((c) => c.day === todayDay).sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (todaysCourses.length > 0) {
    const names = todaysCourses.slice(0, 2).map((c) => `${c.startTime} ${c.name}`).join("、");
    const more = todaysCourses.length > 2 ? ` 等 ${todaysCourses.length} 节` : "";
    segments.push({
      id: "today-courses",
      label: "📖 今日课程",
      summary: `${names}${more}`,
      detail: "记得把水和要用的东西带好。",
      href: "/schedule",
      actionLabel: "课程表"
    });
  } else {
    segments.push({
      id: "no-course-today",
      label: "☁️ 今天没有课",
      summary: "属于自己的节奏，慢慢来。",
      detail: undefined,
      href: "/schedule",
      actionLabel: "课程表"
    });
  }

  // 4. 最近 DDL
  const activeDeadlines = input.deadlines.filter((d) => d.status !== "done");
  const sortedDeadlines = activeDeadlines
    .map((d) => ({ d, days: getDaysUntilDeadline(d, now) }))
    .sort((a, b) => a.days - b.days);
  const nextDdl = sortedDeadlines[0];
  if (nextDdl) {
    const label = nextDdl.days <= 0 ? "⚠️ DDL 今天截止" : nextDdl.days <= 3 ? "⏳ DDL 将近" : "📋 最近 DDL";
    const summary = nextDdl.days < 0
      ? `「${nextDdl.d.title}」已逾期`
      : nextDdl.days <= 0
      ? `「${nextDdl.d.title}」今天截止`
      : `「${nextDdl.d.title}」还有 ${nextDdl.days} 天`;
    segments.push({
      id: "next-ddl",
      label,
      summary,
      detail: "做一点也算往前走。",
      href: "/deadlines",
      actionLabel: "DDL 列表"
    });
  } else if (activeDeadlines.length === 0) {
    segments.push({
      id: "no-ddl",
      label: "✅ 没有待办 DDL",
      summary: "今天不用追赶什么。",
      href: "/deadlines",
      actionLabel: "DDL 列表"
    });
  }

  // 5. 经期状态
  const daysUntilPeriod = getDaysUntilNextPeriod(input.periodRecords, input.periodSettings, now);
  const nextPeriodStart = calculateNextPeriodStart(input.periodRecords, input.periodSettings);
  if (daysUntilPeriod !== null && nextPeriodStart) {
    if (daysUntilPeriod === 0) {
      segments.push({
        id: "period-today",
        label: "🌸 经期预计今天",
        summary: "今天对自己温柔一点，节奏可以放慢。",
        detail: `预计日期 ${nextPeriodStart}`,
        href: "/period",
        actionLabel: "经期记录"
      });
    } else if (daysUntilPeriod > 0 && daysUntilPeriod <= 3) {
      segments.push({
        id: "period-soon",
        label: "🌸 经期临近",
        summary: `约 ${daysUntilPeriod} 天后开始，提前做好温柔准备。`,
        detail: `预计 ${nextPeriodStart}`,
        href: "/period",
        actionLabel: "经期记录"
      });
    } else if (daysUntilPeriod < 0) {
      segments.push({
        id: "period-late",
        label: "🌸 经期延迟",
        summary: `预计 ${nextPeriodStart} 开始，已过 ${Math.abs(daysUntilPeriod)} 天。`,
        detail: "留意身体变化，别担心。",
        href: "/period",
        actionLabel: "经期记录"
      });
    } else {
      segments.push({
        id: "period-ok",
        label: "🌿 经期还远",
        summary: `约 ${daysUntilPeriod} 天后，身体节奏暂时平和。`,
        detail: undefined,
        href: "/period",
        actionLabel: "经期记录"
      });
    }
  } else {
    segments.push({
      id: "period-no-data",
      label: "🌿 经期记录",
      summary: "还没有记录，需要时可以补上。",
      href: "/period",
      actionLabel: "补一条"
    });
  }

  // 6. 置顶小纸条摘要
  const pinnedNotes = input.featuredNote ? [input.featuredNote] : [];
  if (pinnedNotes.length > 0 && pinnedNotes[0].content) {
    const snippet = pinnedNotes[0].content.length > 28
      ? pinnedNotes[0].content.slice(0, 28) + "…"
      : pinnedNotes[0].content;
    segments.push({
      id: "pinned-note",
      label: "💌 小纸条",
      summary: snippet,
      detail: "去看看最近的纸条墙吧。",
      href: "/notes",
      actionLabel: "纸条墙"
    });
  }

  // 7. 最近回忆
  if (input.randomMemory?.title) {
    segments.push({
      id: "random-memory",
      label: "📷 一张回忆",
      summary: input.randomMemory.title,
      detail: "翻一翻相册，那些日子都好好。",
      href: "/albums",
      actionLabel: "相册"
    });
  }

  return segments;
}

/**
 * NextImportantCard —— 首页最顶部的“下一件重要事项”卡片。
 * 是 TodaySummaryCard 的紧凑补充，使用同一个 TodaySummaryResult 类型。
 */
export type NextImportantInput = {
  courses: Course[];
  deadlines: Deadline[];
  periodRecords: PeriodRecord[];
  periodSettings: PeriodSettings;
  now?: Date;
};

export type NextImportantResult = {
  type: "course" | "deadline" | "period" | "none";
  label: string;
  title: string;
  detail?: string;
  href?: string;
};

export function buildNextImportant(input: NextImportantInput): NextImportantResult {
  const now = input.now || new Date();
  const todayDay = getCurrentDayName(now);

  // 1. 今天正在上或马上就要上的课
  const todaysCourses = input.courses.filter((c) => c.day === todayDay).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (const c of todaysCourses) {
    const [sh, sm] = c.startTime.split(":").map(Number);
    const [eh, em] = c.endTime.split(":").map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (Number.isFinite(start) && Number.isFinite(end)) {
      if (nowMinutes >= start && nowMinutes <= end) {
        return {
          type: "course",
          label: "📚 正在进行",
          title: c.name,
          detail: `${c.startTime}-${c.endTime}${c.location ? ` · ${c.location}` : ""} — 先专心把这一节上完。`,
          href: "/schedule"
        };
      }
      if (nowMinutes < start && start - nowMinutes <= 60) {
        return {
          type: "course",
          label: "📚 快上课了",
          title: c.name,
          detail: `${c.startTime} 开始，可以提前出门不用赶。`,
          href: "/schedule"
        };
      }
    }
  }

  // 2. 最近 DDL
  const activeDeadlines = input.deadlines
    .filter((d) => d.status !== "done")
    .map((d) => ({ d, days: getDaysUntilDeadline(d, now) }))
    .sort((a, b) => a.days - b.days);
  if (activeDeadlines.length > 0 && activeDeadlines[0].days <= 3) {
    const ddl = activeDeadlines[0];
    return {
      type: "deadline",
      label: ddl.days <= 0 ? "⚠️ 今天截止" : "⏳ 即将截止",
      title: ddl.d.title,
      detail: ddl.days <= 0 ? "今天先抓最关键的一步。" : `还有 ${ddl.days} 天，提前安排一下。`,
      href: "/deadlines"
    };
  }

  // 3. 经期接近
  const daysUntilPeriod = getDaysUntilNextPeriod(input.periodRecords, input.periodSettings, now);
  if (daysUntilPeriod !== null && daysUntilPeriod >= 0 && daysUntilPeriod <= 3) {
    return {
      type: "period",
      label: "🌸 经期临近",
      title: daysUntilPeriod === 0 ? "预计今天开始" : `约 ${daysUntilPeriod} 天后`,
      detail: "今天对身体温柔一点，节奏可以放慢。",
      href: "/period"
    };
  }

  return {
    type: "none",
    label: "✨ 今天也很棒",
    title: "没有特别紧急的事",
    detail: "从最容易的一小步开始吧。",
    href: undefined
  };
}