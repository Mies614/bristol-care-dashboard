"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CourseCard } from "@/components/CourseCard";
import { downloadJson, readJsonFile } from "@/components/JsonImportExport";
import { PageHeader } from "@/components/PageHeader";
import { sampleCourses } from "@/lib/sampleData";
import { getCoursesForDay, getNextCourse, getTodayCourses } from "@/lib/schedule";
import { createAllCoursesIcs, createCourseIcs, downloadIcs, isCourseCalendarExportable, safeIcsFilename } from "@/lib/ics";
import { loadAppData, saveAppData } from "@/lib/storage";
import { DAYS, type AppData, type Course, type DayName } from "@/lib/types";
import { validateCourseArray } from "@/lib/validation";

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

  if (!data) return <AppShell><div className="soft-card">正在加载课程表...</div></AppShell>;

  return (
    <AppShell>
      <PageHeader title="一周课程表" subtitle="把 Bristol 的课程、地点和小提醒放在一个地方。" />
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link className="btn-secondary btn-small" href="/records">返回记录中心</Link>
      </div>
      <section className="soft-card mb-4">
        <p className="section-kicker mb-1">Today</p>
        <h2 className="font-semibold text-cocoa">今日课程</h2>
        <p className="mt-2 text-sm text-cocoa/65">今天 {todayCourses.length} 门课{nextCourse ? `，下一节是 ${nextCourse.name} ${nextCourse.startTime}` : "。"}</p>
      </section>

      <form className="soft-card mb-4 space-y-3 bg-gradient-to-br from-white/85 to-blush/45" onSubmit={submit}>
        <div>
          <p className="section-kicker mb-1">Course</p>
          <h2 className="font-semibold text-cocoa">{editingId ? "编辑课程" : "添加课程"}</h2>
        </div>
        <input className="field" placeholder="课程名称" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <select className="field" value={draft.day} onChange={(e) => setDraft({ ...draft, day: e.target.value as DayName })}>
            {DAYS.map((day) => <option key={day}>{day}</option>)}
          </select>
          <input className="field" type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
          <input className="field" type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} />
          <input className="field" type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} />
        </div>
        <input className="field" placeholder="地点" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
        <input className="field" placeholder="老师，可选" value={draft.teacher} onChange={(e) => setDraft({ ...draft, teacher: e.target.value })} />
        <textarea className="field min-h-20" placeholder="备注，可选" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        <div className="flex gap-2">
          <button className="btn-primary flex-1" type="submit">{editingId ? "保存修改" : "添加课程"}</button>
          {editingId ? <button className="btn-secondary" type="button" onClick={() => { setEditingId(null); setDraft(emptyCourse); }}>取消</button> : null}
        </div>
      </form>

      <section className="soft-card mb-4">
        <p className="section-kicker mb-1">Tools</p>
        <h2 className="mb-3 font-semibold text-cocoa">课程表工具</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => persist(sampleCourses)}>导入示例课程表</button>
          <button className="btn-danger" onClick={() => persist([])}>清空课程表</button>
          <button className="btn-secondary" onClick={exportAllCourses}>导出整周课程提醒</button>
          <button className="btn-secondary" onClick={() => downloadJson("bristol-schedule.json", data.courses)}>导出 JSON</button>
          <label className="btn-secondary cursor-pointer">
            导入 JSON
            <input
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
        {importMessage ? <p className="notice mt-3">{importMessage}</p> : null}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {DAYS.map((day) => (
          <section className="soft-card" key={day}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-cocoa">{day}</h2>
              <span className="rounded-full bg-cream/80 px-3 py-1 text-xs text-cocoa/55">{grouped[day].length} 门</span>
            </div>
            {grouped[day].length ? (
              <div className="space-y-2">
                {grouped[day].map((course) => (
                  <div key={course.id}>
                    <CourseCard course={course} />
                    <div className="mt-2 flex gap-2">
                      <button className="btn-secondary btn-small" onClick={() => { setEditingId(course.id); setDraft(course); }}>编辑</button>
                      <button className="btn-secondary btn-small" disabled={!isCourseCalendarExportable(course)} onClick={() => exportCourse(course)}>添加到日历</button>
                      <button className="btn-danger btn-small" onClick={() => persist(data.courses.filter((item) => item.id !== course.id))}>删除</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">这一天暂时没有课程。</p>
            )}
          </section>
        ))}
      </div>
    </AppShell>
  );
}
