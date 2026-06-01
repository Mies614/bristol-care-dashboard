"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { fadeInScale, useAccessibleMotion, safeTransition } from "@/lib/design/motion";
import { AutoSyncStatusBadge } from "@/components/AutoSyncStatusBadge";
import { CourseCard } from "@/components/CourseCard";
import { downloadJson, readJsonFile } from "@/components/JsonImportExport";
import { sampleCourses } from "@/lib/sampleData";
import { getCoursesForDay, getNextCourse, getTodayCourses } from "@/lib/schedule";
import { createAllCoursesIcs, createCourseIcs, downloadIcs, isCourseCalendarExportable, safeIcsFilename } from "@/lib/ics";
import { loadAppData, saveAppData } from "@/lib/storage";
import { DAYS, type AppData, type Course, type DayName } from "@/lib/types";
import { validateCourseArray } from "@/lib/validation";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const emptyCourse: Omit<Course, "id"> = {
  name: "",
  day: "Monday",
  startTime: "09:00",
  endTime: "10:00",
  location: "",
  teacher: "",
  note: "",
  color: "#f7b6a6"
};

export default function SchedulePage() {
  const [data, setData] = useState<AppData | null>(null);
  const [draft, setDraft] = useState<Omit<Course, "id">>(emptyCourse);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => setData(loadAppData()), []);

  function persist(courses: Course[]) {
    if (!data) return;
    const next = { ...data, courses };
    saveAppData(next);
    setData(next);
    setImportMessage("");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    const course: Course = {
      ...draft,
      id: editingId || crypto.randomUUID(),
      name: draft.name.trim()
    };
    const courses = editingId ? data!.courses.map((item) => (item.id === editingId ? course : item)) : [...data!.courses, course];
    persist(courses);
    setDraft(emptyCourse);
    setEditingId(null);
  }

  function exportCourse(course: Course) {
    if (!isCourseCalendarExportable(course)) {
      setImportMessage("课程时间不正确，暂时不能生成日历文件。");
      return;
    }
    downloadIcs(`bristol-course-${safeIcsFilename(course.name)}.ics`, createCourseIcs(course, { semesterEndDate: data?.semesterEndDate }));
    setImportMessage("已生成日历文件，请在手机日历中导入。如果没有自动下载，请长按或在浏览器中打开。");
  }

  function exportAllCourses() {
    if (!data) return;
    const exportable = data.courses.filter(isCourseCalendarExportable);
    if (!exportable.length) {
      setImportMessage("没有可导出的课程提醒，请先检查课程时间。");
      return;
    }
    downloadIcs("bristol-weekly-courses.ics", createAllCoursesIcs(exportable, { semesterEndDate: data.semesterEndDate }));
    setImportMessage("已生成日历文件，请在手机日历中导入。如果没有自动下载，请长按或在浏览器中打开。");
  }

  const grouped = useMemo(
    () => Object.fromEntries(DAYS.map((day) => [day, data ? getCoursesForDay(data.courses, day) : []])) as Record<DayName, Course[]>,
    [data]
  );
  const todayCourses = useMemo(() => data ? getTodayCourses(data.courses) : [], [data]);
  const nextCourse = useMemo(() => data ? getNextCourse(data.courses) : undefined, [data]);

  const reduceMotion = useAccessibleMotion();

  if (!data) return <AppShell><AppCard>正在加载课程表...</AppCard></AppShell>;

  return (
    <AppShell>
      {/* Hero */}
      <motion.header
        className="mb-4 overflow-hidden rounded-[2rem] border border-white/75 bg-gradient-to-br from-white/88 via-blush/55 to-lilac/60 p-5 shadow-float backdrop-blur-xl"
        variants={fadeInScale}
        initial="hidden"
        animate="visible"
        transition={safeTransition({ duration: 0.26, ease: "easeOut" }, reduceMotion)}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">课程表</p>
        <h1 className="text-2xl font-semibold text-[var(--app-text)]">一周课程表</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">把 Bristol 的课程、地点和小提醒放在一个地方。</p>
      </motion.header>

      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href="/records">
          <AppButton variant="secondary" size="sm">返回记录中心</AppButton>
        </Link>
        <AutoSyncStatusBadge />
      </div>

      {/* Today summary */}
      <AppCard className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">今日课程</p>
        <h2 className="font-semibold text-[var(--app-text)]">今日课程</h2>
        <p className="mt-2 text-sm text-[var(--app-muted)]">今天 {todayCourses.length} 门课{nextCourse ? `，下一节是 ${nextCourse.name} ${nextCourse.startTime}` : "。"}</p>
      </AppCard>

      {/* Add/Edit form */}
      <form className="mb-4 space-y-3" onSubmit={submit}>
        <AppCard className="space-y-3 bg-gradient-to-br from-white/85 to-blush/45">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">课程</p>
            <h2 className="font-semibold text-[var(--app-text)]">{editingId ? "编辑课程" : "添加课程"}</h2>
          </div>
          <Input placeholder="课程名称" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              className="w-full rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
              value={draft.day}
              onChange={(e) => setDraft({ ...draft, day: e.target.value as DayName })}
            >
              {DAYS.map((day) => <option key={day}>{day}</option>)}
            </select>
            <Input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
            <Input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} />
            <Input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} />
          </div>
          <Input placeholder="地点" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
          <Input placeholder="老师，可选" value={draft.teacher} onChange={(e) => setDraft({ ...draft, teacher: e.target.value })} />
          <Textarea className="min-h-20" placeholder="备注，可选" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          <div className="flex gap-2">
            <AppButton variant="primary" className="flex-1" type="submit">{editingId ? "保存修改" : "添加课程"}</AppButton>
            {editingId ? (
              <AppButton variant="secondary" type="button" onClick={() => { setEditingId(null); setDraft(emptyCourse); }}>取消</AppButton>
            ) : null}
          </div>
        </AppCard>
      </form>

      {/* Tools */}
      <AppCard className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">工具</p>
        <h2 className="mb-3 font-semibold text-[var(--app-text)]">课程表工具</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <AppButton variant="secondary" className="w-full" onClick={() => persist(sampleCourses)}>导入示例</AppButton>
          <AppButton variant="secondary" className="w-full" onClick={exportAllCourses}>导出日历</AppButton>
          <AppButton variant="secondary" className="w-full" onClick={() => downloadJson("bristol-schedule.json", data.courses)}>导出 JSON</AppButton>
          <AppButton variant="danger" className="w-full" onClick={() => persist([])}>清空课程表</AppButton>
          <label className="col-span-2 inline-flex w-full items-center justify-center gap-2 rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-4 py-2 text-sm font-medium text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-accent-soft)] cursor-pointer sm:col-span-1">
            导入 JSON
            <Input
              className="hidden"
              type="file"
              accept="application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  persist(validateCourseArray(await readJsonFile<unknown>(file)));
                  setImportMessage("课程表导入成功。");
                } catch (error) {
                  setImportMessage(error instanceof Error ? error.message : "课程表导入失败。");
                } finally {
                  e.currentTarget.value = "";
                }
              }}
            />
          </label>
        </div>
        {importMessage ? (
          <div className="mt-3 rounded-[var(--app-radius)] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-3 text-sm text-[var(--app-accent)]">
            {importMessage}
          </div>
        ) : null}
      </AppCard>

      {/* Courses by day - single column on mobile */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {DAYS.map((day) => (
          <AppCard key={day}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-[var(--app-text)]">{day}</h2>
              <span className="rounded-full bg-cream/80 px-3 py-1 text-xs text-[var(--app-muted)]">{grouped[day].length} 门</span>
            </div>
            {grouped[day].length ? (
              <div className="space-y-2">
                {grouped[day].map((course) => (
                  <div key={course.id}>
                    <CourseCard course={course} />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <AppButton variant="secondary" size="sm" onClick={() => { setEditingId(course.id); setDraft(course); }}>编辑</AppButton>
                      <AppButton variant="secondary" size="sm" disabled={!isCourseCalendarExportable(course)} onClick={() => exportCourse(course)}>添加到日历</AppButton>
                      <AppButton variant="danger" size="sm" onClick={() => persist(data.courses.filter((item) => item.id !== course.id))}>删除</AppButton>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-[var(--app-muted)]">这一天暂时没有课程。</p>
            )}
          </AppCard>
        ))}
      </div>
    </AppShell>
  );
}