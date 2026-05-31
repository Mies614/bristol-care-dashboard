"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CourseCard } from "@/components/CourseCard";
import { DeadlineCard } from "@/components/DeadlineCard";
import { PageHeader } from "@/components/PageHeader";
import { PriorityReminderList } from "@/components/PriorityReminderList";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { getDaysUntilDeadline } from "@/lib/date";
import { createAllCoursesIcs, createAllDeadlinesIcs, downloadIcs, isCourseCalendarExportable, isDeadlineCalendarExportable } from "@/lib/ics";
import { calculateNextPeriodStart, createPeriodReminderIcs, DEFAULT_PERIOD_SETTINGS, getCurrentCycleDay, getDaysUntilNextPeriod } from "@/lib/period";
import { getTodayPriorityReminders } from "@/lib/priorityReminders";
import { getNextCourse, getTodayCourses } from "@/lib/schedule";
import { loadAppData } from "@/lib/storage";
import type { AppData, PeriodRecord, PeriodSettings } from "@/lib/types";

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
  const reminders = useMemo(() => getTodayPriorityReminders({
    courses: data?.courses || [],
    deadlines: data?.deadlines || [],
    periodRecords,
    periodSettings
  }), [data, periodRecords, periodSettings]);
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

  if (!data) return <AppShell><div className="soft-card">正在加载记录中心...</div></AppShell>;

  return (
    <AppShell>
      <PageHeader title="记录中心" subtitle="课程、DDL 和身体状态都放在这里。" />
      <div className="space-y-3.5">
        {/* 1. Hero - 今日摘要 */}
        <section className="rounded-[2rem] border border-white/75 bg-gradient-to-br from-white/88 via-butter/50 to-lilac/55 p-5 shadow-float backdrop-blur-xl">
          <p className="section-kicker mb-1">{todayLabel()}</p>
          <h1 className="text-2xl font-semibold text-cocoa">今日重点 {reminders.filter((item) => item.priority === "urgent" || item.priority === "soon").length} 条</h1>
          <p className="mt-2 text-sm leading-6 text-cocoa/65">先看最靠近时间的事，剩下的慢慢来。</p>
        </section>

        {/* 2. Priority - 醒目提醒 */}
        <section className="soft-card">
          <div className="mb-3">
            <p className="section-kicker mb-1">Priority</p>
            <h2 className="font-semibold text-cocoa">醒目提醒</h2>
          </div>
          <PriorityReminderList reminders={reminders} limit={5} />
        </section>

        {/* 3. Quick Actions - 快速操作，紧跟提醒之后 */}
        <section className="soft-card">
          <p className="section-kicker mb-1">Quick Actions</p>
          <h2 className="mb-3 font-semibold text-cocoa">快速操作</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link className="btn-secondary text-center" href="/schedule">添加课程</Link>
            <Link className="btn-secondary text-center" href="/deadlines">添加 DDL</Link>
            <Link className="btn-secondary text-center" href="/period">添加经期记录</Link>
            <button className="btn-primary" onClick={exportAllCalendar}>导出日历提醒</button>
          </div>
          {message ? <p className="notice mt-3">{message}</p> : null}
        </section>

        {/* 4. Schedule - 今日课程 */}
        <section className="soft-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="section-kicker mb-1">Schedule</p>
              <h2 className="font-semibold text-cocoa">今日课程</h2>
            </div>
            <Link className="btn-secondary btn-small" href="/schedule">查看全部</Link>
          </div>
          {nextCourse ? <p className="notice mb-3">下一节：{nextCourse.name}，{nextCourse.startTime} 开始。</p> : null}
          {todayCourses.length ? <div className="space-y-2">{todayCourses.map((course) => <CourseCard compact course={course} key={course.id} />)}</div> : <p className="empty-state text-left">今天没有课，可以慢慢安排自己的节奏。</p>}
        </section>

        {/* 5. Deadlines - DDL 摘要 */}
        <section className="soft-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="section-kicker mb-1">Deadlines</p>
              <h2 className="font-semibold text-cocoa">DDL 摘要</h2>
            </div>
            <Link className="btn-secondary btn-small" href="/deadlines">查看全部</Link>
          </div>
          <p className="mb-3 text-sm text-cocoa/65">今天截止 {todayDue.length} 个，3 天内截止 {soonDue.length} 个。</p>
          {incompleteDeadlines.length ? <div className="space-y-2">{incompleteDeadlines.slice(0, 3).map((deadline) => <DeadlineCard deadline={deadline} key={deadline.id} />)}</div> : <p className="empty-state text-left">最近没有未完成 DDL。</p>}
        </section>

        {/* 6. Cycle - 经期记录 */}
        <section className="soft-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="section-kicker mb-1">Cycle</p>
              <h2 className="font-semibold text-cocoa">经期记录</h2>
            </div>
            <Link className="btn-secondary btn-small" href="/period">查看记录</Link>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-cocoa/70">
            <div className="rounded-2xl bg-white/58 p-3">预计：<span className="font-semibold text-cocoa">{nextPeriodStart || "待记录"}</span></div>
            <div className="rounded-2xl bg-white/58 p-3">剩余：<span className="font-semibold text-cocoa">{periodDays === null ? "待记录" : `${periodDays} 天`}</span></div>
            <div className="col-span-2 rounded-2xl bg-white/58 p-3">当前周期：<span className="font-semibold text-cocoa">{cycleDay ? `第 ${cycleDay} 天` : "待记录"}</span></div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}