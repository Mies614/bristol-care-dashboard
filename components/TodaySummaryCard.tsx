"use client";

import Link from "next/link";
import { getCurrentDayName } from "@/lib/schedule";
import { calculateNextPeriodStart, getDaysUntilNextPeriod } from "@/lib/period";
import { getTopPriorityDdl, type DdlWithPriority } from "@/lib/ddlPriority";
import type { Course, Deadline, LoveNote, PeriodRecord, PeriodSettings } from "@/lib/types";
import type { RandomMemoryItem } from "@/lib/randomMemory";

export type TodaySummaryInput = {
  courses: Course[];
  deadlines: Deadline[];
  periodRecords: PeriodRecord[];
  periodSettings: PeriodSettings;
  unreadMissYouCount: number;
  featuredNote?: LoveNote | null;
  randomMemory?: RandomMemoryItem | null;
  now?: Date;
};

export type TodaySummaryResult = {
  /** 摘要类型：ddl / course / period / missyou / memory */
  type: "ddl" | "course" | "period" | "missyou" | "memory";
  /** 优先级标题 emoji + 文字 */
  label: string;
  /** 详细描述 */
  description: string;
  /** 跳转链接 */
  href?: string;
  /** 跳转文案 */
  actionLabel?: string;
  /** 被选中的 DDL 对象（用于去重排除） */
  selectedDdl?: DdlWithPriority;
};

export function buildTodaySummary(input: TodaySummaryInput): TodaySummaryResult {
  const now = input.now || new Date();
  const todayDay = getCurrentDayName();
  const todaysCourses = input.courses.filter((c) => c.day === todayDay).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // 1. 最高优先级 DDL（overdue / urgent）
  const topDdl = getTopPriorityDdl(input.deadlines, now);
  if (topDdl && (topDdl.priority === "overdue" || topDdl.priority === "urgent")) {
    if (topDdl.priority === "overdue") {
      return {
        type: "ddl",
        label: "⚠️ 已逾期",
        description: `「${topDdl.deadline.title}」已经过期了，今天先抓最关键的一步。`,
        href: "/deadlines",
        actionLabel: "查看 DDL",
        selectedDdl: topDdl
      };
    }
    return {
      type: "ddl",
      label: "⚠️ 紧急截止",
      description: `「${topDdl.deadline.title}」${topDdl.daysUntil <= 0 ? "今天截止" : "明天截止"}，优先处理这一步。`,
      href: "/deadlines",
      actionLabel: "查看 DDL",
      selectedDdl: topDdl
    };
  }

  // 2. 今天/明天课程
  if (todaysCourses.length > 0) {
    const next = todaysCourses[0];
    return {
      type: "course",
      label: "📚 下一节课",
      description: `${next.startTime} ${next.name}${next.location ? ` · ${next.location}` : ""}`,
      href: "/schedule",
      actionLabel: "课程表"
    };
  }

  const tomorrowDay = getTomorrowDayName();
  const tomorrowCourses = input.courses.filter((c) => c.day === tomorrowDay).sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (tomorrowCourses.length > 0) {
    return {
      type: "course",
      label: "📚 明天有课",
      description: `${tomorrowCourses[0].startTime} ${tomorrowCourses[0].name}，今晚可以早点休息。`,
      href: "/schedule",
      actionLabel: "课程表"
    };
  }

  // 3. 即将截止的 DDL（soon / upcoming）
  if (topDdl && (topDdl.priority === "soon" || topDdl.priority === "upcoming")) {
    return {
      type: "ddl",
      label: "📋 即将截止",
      description: `「${topDdl.deadline.title}」还有 ${topDdl.daysUntil} 天，提前安排一下。`,
      href: "/deadlines",
      actionLabel: "查看 DDL",
      selectedDdl: topDdl
    };
  }

  // 4. 经期进行中或临近
  const daysUntilPeriod = getDaysUntilNextPeriod(input.periodRecords, input.periodSettings, now);
  const nextPeriodStart = calculateNextPeriodStart(input.periodRecords, input.periodSettings);
  if (daysUntilPeriod !== null && daysUntilPeriod >= 0 && daysUntilPeriod <= 3) {
    const label = daysUntilPeriod === 0 ? "🌸 经期预计今天" : `🌸 经期临近（约 ${daysUntilPeriod} 天）`;
    return {
      type: "period",
      label,
      description: `预计${nextPeriodStart || "这几天"}附近开始，今天对身体温柔一点。`,
      href: "/period",
      actionLabel: "经期记录"
    };
  }

  if (daysUntilPeriod !== null && daysUntilPeriod < 0) {
    return {
      type: "period",
      label: "🌸 经期延迟",
      description: `预计 ${nextPeriodStart || "之前"} 开始，已经过了 ${Math.abs(daysUntilPeriod)} 天，留意身体变化。`,
      href: "/period",
      actionLabel: "经期记录"
    };
  }

  // 5. 未读想念
  if (input.unreadMissYouCount > 0) {
    return {
      type: "missyou",
      label: "💕 他也想你啦",
      description: `你不在的时候，他想你了 ${input.unreadMissYouCount} 次。`,
      href: undefined,
      actionLabel: undefined
    };
  }

  // 6. 温柔回忆/小纸条
  if (input.featuredNote?.content) {
    const snippet = input.featuredNote.content.length > 24
      ? input.featuredNote.content.slice(0, 24) + "…"
      : input.featuredNote.content;
    return {
      type: "memory",
      label: "💌 今日小纸条",
      description: snippet,
      href: "/notes",
      actionLabel: "小纸条墙"
    };
  }
  if (input.randomMemory?.title) {
    return {
      type: "memory",
      label: "📷 一张回忆",
      description: input.randomMemory.title,
      href: "/albums",
      actionLabel: "相册"
    };
  }

  // 默认：温柔无压力
  return {
    type: "memory",
    label: "✨ 今天也很棒",
    description: "没有特别紧急的事，从最容易的一小步开始。",
    href: undefined,
    actionLabel: undefined
  };
}

function getTomorrowDayName(): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const jsDay = new Date().getDay(); // 0=Sun...6=Sat
  const tomorrowJsDay = (jsDay + 1) % 7;
  const tomorrowName = days[tomorrowJsDay];
  // Map to DAYS array: Monday=0...Sunday=6
  // JS Sunday=0 → DAYS[6], JS Monday=1 → DAYS[0], etc.
  // Just return tomorrowName directly — we use it to filter courses by day
  return tomorrowName;
}

export function TodaySummaryCard({ summary }: { summary: TodaySummaryResult }) {
  return (
    <section className="soft-card bg-gradient-to-br from-white/88 via-butter/45 to-blush/45">
      <p className="section-kicker mb-1">今日照顾</p>
      <h2 className="text-lg font-semibold text-cocoa">{summary.label}</h2>
      <p className="mt-2 text-sm leading-6 text-cocoa/70">{summary.description}</p>
      {summary.href && summary.actionLabel ? (
        <Link
          className="mt-3 inline-block rounded-full border border-white/70 bg-white/62 px-4 py-1.5 text-xs font-medium text-sage shadow-sm hover:bg-white/80 transition"
          href={summary.href}
        >
          {summary.actionLabel}
        </Link>
      ) : null}
    </section>
  );
}