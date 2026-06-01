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
import { getNextCourse, getTodayCourses } from "@/lib/schedule";
import { loadAppData } from "@/lib/storage";
import type { AppData, PeriodRecord, PeriodSettings } from "@/lib/types";
import { AppCard } from "@/components/ui/AppCard";

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
  const nextCourse = useMemo(() => data ? getNextCourse(data.courses) : undefined, [data]);
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

  if (!data) return <AppShell><div className="soft-card">正在加载…</div></AppShell>;

  return (
    <AppShell>
      <PageHeader title="生活安排" subtitle="课程、DDL 和身体状态，按类看得清楚。" />

      <div className="space-y-4">
        {/* ── 1. 今日总览卡片 ── */}
        <AppCard className="bg-gradient-to-br from-white/88 via-butter/45 to-lilac/50">
          <p className="section-kicker mb-1">{todayLabel()}</p>
          <h1 className="text-xl font-semibold text-cocoa">今日总览</h1>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/55 p-2">
              <p className="text-lg font-semibold text-cocoa">{todayCourses.length}</p>
              <p className="text-[11px] text-cocoa/55">今日课</p>
            </div>
            <div className="rounded-xl bg-white/55 p-2">
              <p className="text-lg font-semibold text-cocoa">{incompleteDeadlines.length}</p>
              <p className="text-[11px] text-cocoa/55">未完成 DDL</p>
            </div>
            <div className="rounded-xl bg-white/55 p-2">
              <p className="text-lg font-semibold text-cocoa">{cycleDay || "—"}</p>
              <p className="text-[11px] text-cocoa/55">周期第几天</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-cocoa/65">
            今天截止 {todayDue.length} 个 DDL，{soonDue.length} 个在 3 天内。{nextCourse ? `下一节：${nextCourse.name} ${nextCourse.startTime} 开始。` : ""}
          </p>
        </AppCard>

        {/* ── 2. 快速添加 ── */}
        <AppCard>
          <p className="section-kicker mb-1">Quick Add</p>
          <h2 className="mb-3 font-semibold text-cocoa">快速添加</h2>
          <div className="grid grid-cols-3 gap-2">
            <Link className="btn-secondary text-center text-xs py-2" href="/schedule">+ 课程</Link>
            <Link className="btn-secondary text-center text-xs py-2" href="/deadlines">+ DDL</Link>
            <Link className="btn-secondary text-center text-xs py-2" href="/period">+ 经期</Link>
          </div>
          <button className="btn-primary w-full mt-2 text-xs" onClick={exportAllCalendar}>导出日历提醒</button>
          {message ? <p className="notice mt-3">{message}</p> : null}
        </AppCard>

        {/* ── 3. 今日课程 ── */}
        <section className="soft-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="section-kicker mb-1">Courses</p>
              <h2 className="font-semibold text-cocoa">今日课程</h2>
            </div>
            <Link className="btn-secondary btn-small" href="/schedule">全部</Link>
          </div>
          {todayCourses.length ? (
            <div className="space-y-2">{todayCourses.map((course) => <CourseCard compact course={course} key={course.id} />)}</div>
          ) : (
            <p className="empty-state text-left">今天没有课，属于自己的节奏。</p>
          )}
        </section>

        {/* ── 4. DDL 摘要 ── */}
        <section className="soft-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="section-kicker mb-1">Deadlines</p>
              <h2 className="font-semibold text-cocoa">DDL 列表</h2>
            </div>
            <Link className="btn-secondary btn-small" href="/deadlines">全部</Link>
          </div>
          {incompleteDeadlines.length ? (
            <div className="space-y-2">
              {incompleteDeadlines.slice(0, 5).map((deadline) => (
                <DeadlineCard deadline={deadline} key={deadline.id} />
              ))}
            </div>
          ) : (
            <p className="empty-state text-left">最近没有未完成 DDL，真棒。</p>
          )}
        </section>

        {/* ── 5. 经期状态 ── */}
        <section className="soft-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="section-kicker mb-1">Cycle</p>
              <h2 className="font-semibold text-cocoa">经期状态</h2>
            </div>
            <Link className="btn-secondary btn-small" href="/period">记录</Link>
          </div>
          {periodRecords.length === 0 ? (
            <p className="empty-state text-left">还没有经期记录，可以先去补一条。</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-sm text-cocoa/70">
              <div className="rounded-2xl bg-white/58 p-3">
                预计：<span className="font-semibold text-cocoa">{nextPeriodStart || "计算中"}</span>
              </div>
              <div className="rounded-2xl bg-white/58 p-3">
                距离：<span className="font-semibold text-cocoa">{periodDays === null ? "—" : `${periodDays} 天`}</span>
              </div>
              <div className="col-span-2 rounded-2xl bg-white/58 p-3">
                当前周期：<span className="font-semibold text-cocoa">{cycleDay ? `第 ${cycleDay} 天` : "—"}</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}