"use client";
import type { AppData, PeriodRecord, PeriodSettings } from "@/lib/types";
import { PriorityReminderList } from "@/components/PriorityReminderList";
import { getTodayPriorityReminders } from "@/lib/priorityReminders";

interface Props {
  careData: AppData;
  carePeriods: PeriodRecord[];
  carePeriodSettings: PeriodSettings;
  latestNote?: string;
  missYouCounts: { xiaoguai: number; admin: number };
  onRefresh: () => void;
}

export function AdminOverviewCard({ careData, carePeriods, carePeriodSettings, latestNote, missYouCounts, onRefresh }: Props) {
  const adminReminders = getTodayPriorityReminders({
    courses: careData.courses,
    deadlines: careData.deadlines,
    periodRecords: carePeriods,
    periodSettings: carePeriodSettings
  });

  // Generate care suggestions based on data
  const suggestions: string[] = [];
  const urgentDeadlines = careData.deadlines.filter((d) => d.status !== "done").slice(0, 2);
  if (urgentDeadlines.length > 0) {
    suggestions.push(`有 ${urgentDeadlines.length} 个未完成 DDL，可以提醒她先完成一点点`);
  }
  const todayCourses = careData.courses.filter((c) => c.day === new Date().toLocaleDateString("en-US", { weekday: "long" }));
  if (todayCourses.length > 0) {
    const next = todayCourses[0];
    suggestions.push(`今天有课「${next.name}」，可以提醒她出门或休息`);
  }
  if (carePeriodSettings?.averageCycleLength) {
    suggestions.push(`经期临近时，可以提醒她早点休息`);
  }
  if (suggestions.length === 0) {
    suggestions.push(`今天没有特别提醒，可以发一张小纸条关心一下`);
  }

  return (
    <section className="soft-card space-y-3 bg-gradient-to-br from-white/88 via-blush/38 to-skySoft/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-kicker mb-1">Care Console</p>
          <h2 className="font-semibold text-[var(--app-text)]">今日照顾摘要</h2>
        </div>
        <button className="btn-secondary btn-small" onClick={onRefresh}>刷新</button>
      </div>

      <PriorityReminderList reminders={adminReminders} limit={3} empty="今天暂时没有特别紧急的提醒。" />

      <div className="grid grid-cols-2 gap-2 text-sm text-[var(--app-muted)]">
        <div className="rounded-2xl bg-white/58 p-3">课程 {careData.courses.length}</div>
        <div className="rounded-2xl bg-white/58 p-3">DDL {careData.deadlines.filter((d) => d.status !== "done").length}</div>
        <div className="rounded-2xl bg-white/58 p-3">想你 小乖×{missYouCounts.xiaoguai} 我×{missYouCounts.admin}</div>
        <div className="rounded-2xl bg-white/58 p-3 truncate">最新纸条 {latestNote || "暂无"}</div>
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/55 p-3 shadow-sm">
        <p className="text-sm font-medium text-[var(--app-text)] mb-2">💡 今日可以关心她什么</p>
        <ul className="space-y-1.5">
          {suggestions.map((s, i) => (
            <li key={i} className="text-sm text-[var(--app-muted)] flex items-start gap-2">
              <span className="mt-0.5 shrink-0">·</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}