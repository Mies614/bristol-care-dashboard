"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CourseCard } from "@/components/CourseCard";
import { DeadlineCard } from "@/components/DeadlineCard";
import { PageHeader } from "@/components/PageHeader";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { getDaysUntilDeadline } from "@/lib/date";
import { createAllCoursesIcs, createAllDeadlinesIcs, downloadIcs, isCourseCalendarExportable, isDeadlineCalendarExportable } from "@/lib/ics";
import { calculateNextPeriodStart, createPeriodReminderIcs, DEFAULT_PERIOD_SETTINGS, getCurrentCycleDay, getDaysUntilNextPeriod } from "@/lib/period";
import { getTodayCourses } from "@/lib/schedule";
import { loadAppData } from "@/lib/storage";
import type { AppData, PeriodRecord, PeriodSettings } from "@/lib/types";
import { AppCard } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { useAccessibleMotion, safeVariants, staggerContainer, staggerItem } from "@/lib/design/motion";
import { motion } from "framer-motion";

function todayLabel() {
  return new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });
}

function mergeIcsCalendars(contents: string[]) {
  const body = contents.flatMap((content) =>
    content.split(/\r?\n/).filter((line) => !["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bristol Care//Dashboard//CN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "END:VCALENDAR"].includes(line))
  );
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bristol Care//Dashboard//CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...body,
    "END:VCALENDAR"
  ].join("\r\n");
}

export default function RecordsPage() {
  const [data, setData] = useState<AppData | null>(null);
  const [periodRecords, setPeriodRecords] = useState<PeriodRecord[]>([]);
  const [periodSettings, setPeriodSettings] = useState<PeriodSettings>(DEFAULT_PERIOD_SETTINGS);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setData(loadAppData());
    fetch(`/api/period?code=${encodeURIComponent(getDefaultSpaceCode())}`)
      .then((response) => response.json())
      .then((payload) => {
        if (Array.isArray(payload.records)) setPeriodRecords(payload.records);
        if (payload.settings) setPeriodSettings(payload.settings);
      })
      .catch(() => {
        // Records center should still render local course and DDL data.
      });
  }, []);

  const todayCourses = useMemo(() => data ? getTodayCourses(data.courses) : [], [data]);
  const incompleteDeadlines = useMemo(() => data ? data.deadlines.filter((deadline) => deadline.status !== "done").sort((a, b) => getDaysUntilDeadline(a) - getDaysUntilDeadline(b)) : [], [data]);
  const todayDue = incompleteDeadlines.filter((deadline) => getDaysUntilDeadline(deadline) === 0);
  const soonDue = incompleteDeadlines.filter((deadline) => {
    const days = getDaysUntilDeadline(deadline);
    return days > 0 && days <= 3;
  });
  const nextPeriodStart = useMemo(() => calculateNextPeriodStart(periodRecords, periodSettings), [periodRecords, periodSettings]);
  const periodDays = useMemo(() => getDaysUntilNextPeriod(periodRecords, periodSettings), [periodRecords, periodSettings]);
  const cycleDay = useMemo(() => getCurrentCycleDay(periodRecords), [periodRecords]);

  function exportAllCalendar() {
    if (!data) return;
    const courses = data.courses.filter(isCourseCalendarExportable);
    const deadlines = data.deadlines.filter((deadline) => deadline.status !== "done" && isDeadlineCalendarExportable(deadline));
    const parts = [
      createAllCoursesIcs(courses, { semesterEndDate: data.semesterEndDate }),
      createAllDeadlinesIcs(deadlines),
      nextPeriodStart ? createPeriodReminderIcs(nextPeriodStart, periodSettings) : ""
    ];
    downloadIcs("bristol-records-reminders.ics", mergeIcsCalendars(parts.filter(Boolean)));
    setMessage("已生成日历文件。");
  }

  const reduceMotion = useAccessibleMotion();

  if (!data) return <AppShell><div className="soft-card">正在加载…</div></AppShell>;

  return (
    <AppShell>
      <PageHeader title="生活安排总览" subtitle="课程、DDL 和身体节奏，一目了然。" />

      <motion.div
        className="space-y-4"
        variants={safeVariants(staggerContainer, reduceMotion)}
        initial="hidden"
        animate="visible"
      >
        {/* ── 1. 今日总览 —— 三类数据一行三格 ── */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <AppCard className="bg-gradient-to-br from-white/88 via-butter/45 to-lilac/50">
            <p className="section-kicker mb-1">{todayLabel()}</p>
            <h1 className="text-xl font-semibold text-cocoa">今日总览</h1>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Link href="/schedule" className="rounded-xl bg-white/55 px-2 py-3 transition hover:bg-white/80 hover:shadow-sm">
                <p className="text-lg font-semibold text-cocoa">{todayCourses.length}</p>
                <p className="text-xs text-cocoa/55">今日课</p>
              </Link>
              <Link href="/deadlines" className="rounded-xl bg-white/55 px-2 py-3 transition hover:bg-white/80 hover:shadow-sm">
                <p className="text-lg font-semibold text-cocoa">{incompleteDeadlines.length}</p>
                <p className="text-xs text-cocoa/55">未完成</p>
              </Link>
              <Link href="/period" className="rounded-xl bg-white/55 px-2 py-3 transition hover:bg-white/80 hover:shadow-sm">
                <p className="text-lg font-semibold text-cocoa">{cycleDay || "—"}</p>
                <p className="text-xs text-cocoa/55">周期天数</p>
              </Link>
            </div>
            <p className="mt-3 text-sm leading-6 text-cocoa/65">
              {todayDue.length > 0 && `今天截止 ${todayDue.length} 个 DDL。`}
              {soonDue.length > 0 && `${todayDue.length > 0 ? " " : ""}${soonDue.length} 个在 3 天内。`}
              {todayDue.length === 0 && soonDue.length === 0 && "最近没有紧急 DDL。"}
            </p>
          </AppCard>
        </motion.div>

        {/* ── 2. 快速操作 —— 三类明确，少而精 ── */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <AppCard>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="section-kicker mb-1">Quick Care</p>
                <h2 className="font-semibold text-cocoa">快速操作</h2>
              </div>
              <AppButton variant="secondary" size="sm" onClick={exportAllCalendar}>📅 导出日历</AppButton>
            </div>
            {message ? <p className="notice mb-3">{message}</p> : null}
            <p className="mb-2 text-xs text-cocoa/50">添加课程、DDL 或经期记录</p>
            <div className="grid grid-cols-3 gap-2">
              <Link className="rounded-2xl border border-white/70 bg-[var(--app-card-bg)] px-3 py-3 text-center text-sm font-medium text-[var(--app-text)] shadow-sm transition hover:bg-white/80" href="/schedule">📚 课程</Link>
              <Link className="rounded-2xl border border-white/70 bg-[var(--app-card-bg)] px-3 py-3 text-center text-sm font-medium text-[var(--app-text)] shadow-sm transition hover:bg-white/80" href="/deadlines">📋 DDL</Link>
              <Link className="rounded-2xl border border-white/70 bg-[var(--app-card-bg)] px-3 py-3 text-center text-sm font-medium text-[var(--app-text)] shadow-sm transition hover:bg-white/80" href="/period">🌸 经期</Link>
            </div>
          </AppCard>
        </motion.div>

        {/* ── 3. 今日课程（含下一节课提醒） ── */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <section className="soft-card bg-gradient-to-br from-white/85 via-skySoft/30 to-white/80">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="section-kicker mb-1">📚 课程</p>
                <h2 className="font-semibold text-cocoa">今日课程</h2>
              </div>
              <Link className="text-xs font-medium text-sage hover:underline" href="/schedule">全部课程 →</Link>
            </div>
            {todayCourses.length ? (
              <div className="space-y-2">{todayCourses.map((course) => <CourseCard compact course={course} key={course.id} />)}</div>
            ) : (
              <p className="empty-state py-4 text-left text-sm">今天没有课，属于自己的节奏。</p>
            )}
            <Link className="mt-3 inline-block text-xs text-sage/70 hover:underline" href="/schedule">
              查看课程表（含非今日课程）→
            </Link>
          </section>
        </motion.div>

        {/* ── 4. DDL 列表 —— DDL 区清晰，独立边界 ── */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <section className="soft-card bg-gradient-to-br from-white/85 via-amber-50/35 to-white/80">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="section-kicker mb-1">📋 DDL</p>
                <h2 className="font-semibold text-cocoa">待办 DDL</h2>
              </div>
              <Link className="text-xs font-medium text-sage hover:underline" href="/deadlines">全部 DDL →</Link>
            </div>
            {incompleteDeadlines.length ? (
              <div className="space-y-2">
                {incompleteDeadlines.slice(0, 5).map((deadline) => (
                  <DeadlineCard deadline={deadline} key={deadline.id} />
                ))}
                {incompleteDeadlines.length > 5 ? (
                  <p className="text-xs text-cocoa/40 pt-1">还有 {incompleteDeadlines.length - 5} 个未展示。</p>
                ) : null}
              </div>
            ) : (
              <p className="empty-state py-4 text-left text-sm">最近没有未完成 DDL，真棒。</p>
            )}
            <Link className="mt-3 inline-block text-xs text-sage/70 hover:underline" href="/deadlines">
              管理所有 DDL（含已完成）→
            </Link>
          </section>
        </motion.div>

        {/* ── 5. 经期状态 —— 经期区清晰，独立边界 ── */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <section className="soft-card bg-gradient-to-br from-white/85 via-blush/35 to-white/80">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="section-kicker mb-1">🌸 经期</p>
                <h2 className="font-semibold text-cocoa">经期状态</h2>
              </div>
              <Link className="text-xs font-medium text-sage hover:underline" href="/period">记录 →</Link>
            </div>
            {periodRecords.length === 0 ? (
              <p className="empty-state py-4 text-left text-sm">还没有经期记录，可以先去补一条。</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-sm text-cocoa/70">
                <div className="rounded-2xl bg-white/58 p-3">
                  <p className="text-xs text-cocoa/45">预计开始</p>
                  <p className="font-semibold text-cocoa">{nextPeriodStart || "计算中"}</p>
                </div>
                <div className="rounded-2xl bg-white/58 p-3">
                  <p className="text-xs text-cocoa/45">距离现在</p>
                  <p className="font-semibold text-cocoa">{periodDays === null ? "—" : `${periodDays} 天`}</p>
                </div>
                <div className="col-span-2 rounded-2xl bg-white/58 p-3">
                  <p className="text-xs text-cocoa/45">当前周期</p>
                  <p className="font-semibold text-cocoa">{cycleDay ? `第 ${cycleDay} 天` : "—"}</p>
                </div>
              </div>
            )}
            <Link className="mt-3 inline-block text-xs text-sage/70 hover:underline" href="/period">
              经期记录详情 →
            </Link>
          </section>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}