"use client";

import Link from "next/link";
import { getCurrentDayName } from "@/lib/schedule";
import { getDaysUntilNextPeriod } from "@/lib/period";
import { getTopPriorityDdl } from "@/lib/ddlPriority";
import type { Course, Deadline, LoveNote, PeriodRecord, PeriodSettings } from "@/lib/types";
import type { RandomMemoryItem } from "@/lib/randomMemory";
import type { TodaySummaryResult } from "@/components/TodaySummaryCard";
import { getSideHref } from "@/lib/navigation";
import type { AppSide } from "@/lib/appIdentity";

export type NextImportantInput = {
  courses: Course[];
  deadlines: Deadline[];
  periodRecords: PeriodRecord[];
  periodSettings: PeriodSettings;
  unreadMissYouCount: number;
  featuredNote?: LoveNote | null;
  randomMemory?: RandomMemoryItem | null;
  /** 已在 TodaySummaryCard 中展示的类型，跳过同样类型 */
  skipType: TodaySummaryResult["type"];
  /** 已在 TodaySummaryCard 排除的 DDL ID set */
  excludedDdlIds: Set<string>;
  now?: Date;
  /** Which app side this card is for (affects link hrefs) */
  appSide: AppSide;
};

export type NextImportantResult = {
  /** 摘要类型 */
  type: TodaySummaryResult["type"] | "flat";
  label: string;
  description: string;
  href?: string;
  actionLabel?: string;
  /** 是否为空（所有候选项都已被 TodaySummaryCard 覆盖） */
  isEmpty: boolean;
  /** 被选中的 DDL ID（用于去重排除） */
  selectedDdlId?: string;
};

export function buildNextImportant(input: NextImportantInput): NextImportantResult {
  const now = input.now || new Date();
  const todayDay = getCurrentDayName();

  /**
   * 按今日照顾优先级逐一判断，但跳过 TodaySummaryCard 已展示的类型。
   * 优先级：course → ddl → period → memory → flat
   */

  // 1. 尝试找今天或明天的下一门课（如果 TodaySummaryCard 不是 course 类型）
  if (input.skipType !== "course") {
    const todaysCourses = input.courses
      .filter((c) => c.day === todayDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (todaysCourses.length > 0) {
      const next = todaysCourses[0];
      return {
        type: "course",
        label: "📚 下一节课",
        description: `${next.startTime} ${next.name}${next.location ? ` · ${next.location}` : ""}`,
        href: getSideHref(input.appSide, "/schedule"),
        actionLabel: "课程表",
        isEmpty: false
      };
    }
    const tomorrowDay = getTomorrowDayName();
    const tomorrowCourses = input.courses
      .filter((c) => c.day === tomorrowDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (tomorrowCourses.length > 0) {
      return {
        type: "course",
        label: "📚 明天有课",
        description: `${tomorrowCourses[0].startTime} ${tomorrowCourses[0].name}，今晚可以早点休息。`,
        href: getSideHref(input.appSide, "/schedule"),
        actionLabel: "课程表",
        isEmpty: false
      };
    }
  }

  // 2. 下一个重要 DDL（跳过已排除的 TodaySummaryCard DDL）
  if (input.skipType !== "ddl") {
    const activeDeadlines = input.deadlines.filter((d) => d.status !== "done" && !input.excludedDdlIds.has(d.id));
    const topDdl = getTopPriorityDdl(activeDeadlines, now);
    if (topDdl) {
      const daysText = topDdl.daysUntil <= 0
        ? (topDdl.priority === "overdue" ? "已过期" : "今天截止")
        : `${topDdl.daysUntil} 天`;
      return {
        type: "ddl",
        label: topDdl.priority === "overdue" ? "⚠️ 还有 DDL 过期" : "📋 下一个 DDL",
        description: `「${topDdl.deadline.title}」${daysText}，别忘了。`,
        href: getSideHref(input.appSide, "/deadlines"),
        actionLabel: "查看 DDL",
        isEmpty: false,
        selectedDdlId: topDdl.deadline.id
      };
    }
  }

  // 3. 经期状态
  if (input.skipType !== "period") {
    const daysUntilPeriod = getDaysUntilNextPeriod(input.periodRecords, input.periodSettings, now);
    if (daysUntilPeriod !== null && daysUntilPeriod >= 0 && daysUntilPeriod <= 5) {
      return {
        type: "period",
        label: daysUntilPeriod === 0 ? "🌸 经期预计今天" : `🌸 经期临近（约 ${daysUntilPeriod} 天）`,
        description: "今天对身体温柔一点，不要吃冰的。",
        href: getSideHref(input.appSide, "/period"),
        actionLabel: "经期记录",
        isEmpty: false
      };
    }
    if (daysUntilPeriod !== null && daysUntilPeriod < 0) {
      return {
        type: "period",
        label: "🌸 经期延迟",
        description: `已经过了 ${Math.abs(daysUntilPeriod)} 天，留意身体变化。`,
        href: getSideHref(input.appSide, "/period"),
        actionLabel: "经期记录",
        isEmpty: false
      };
    }
  }

  // 4. 小纸条 / 回忆（如果 TodaySummaryCard 不是 memory 类型）
  if (input.skipType !== "memory") {
    if (input.featuredNote?.content) {
      const snippet = input.featuredNote.content.length > 30
        ? input.featuredNote.content.slice(0, 30) + "…"
        : input.featuredNote.content;
      return {
        type: "memory",
        label: "💌 今日小纸条",
        description: snippet,
        href: getSideHref(input.appSide, "/notes"),
        actionLabel: "小纸条墙",
        isEmpty: false
      };
    }
    if (input.randomMemory?.title) {
      return {
        type: "memory",
        label: "📷 一张回忆",
        description: input.randomMemory.title,
        href: getSideHref(input.appSide, "/albums"),
        actionLabel: "相册",
        isEmpty: false
      };
    }
  }

  // 所有候选项都已被覆盖 → 返回空状态
  return {
    type: "flat",
    label: "",
    description: "",
    href: undefined,
    actionLabel: undefined,
    isEmpty: true
  };
}

function getTomorrowDayName(): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const jsDay = new Date().getDay();
  const tomorrowJsDay = (jsDay + 1) % 7;
  return days[tomorrowJsDay];
}

export function NextImportantCard({ next }: { next: NextImportantResult }) {
  if (next.isEmpty) return null;

  return (
    <section className="soft-card bg-gradient-to-br from-white/85 via-skySoft/35 to-white/80">
      <p className="section-kicker mb-1">下一件重要事项</p>
      <h2 className="text-lg font-semibold text-cocoa">{next.label}</h2>
      <p className="mt-2 text-sm leading-6 text-cocoa/70">{next.description}</p>
      {next.href && next.actionLabel ? (
        <Link
          className="mt-3 inline-block rounded-full border border-white/70 bg-white/62 px-4 py-1.5 text-xs font-medium text-sage shadow-sm hover:bg-white/80 transition"
          href={next.href}
        >
          {next.actionLabel}
        </Link>
      ) : null}
    </section>
  );
}
