import type { Course, Deadline } from "./types";

type CourseIcsOptions = {
  semesterEndDate?: string;
  now?: Date;
};

const dayIndex: Record<Course["day"], number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6
};

export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function formatIcsDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    "Z"
  ].join("");
}

export function downloadIcs(filename: string, content: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function calendarEnvelope(events: string[]) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bristol Care//Dashboard//CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR"
  ].join("\r\n");
}

function parseTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateWithTime(date: Date, time: string) {
  const parsed = parseTime(time);
  if (!parsed) return null;
  const result = new Date(date);
  result.setHours(parsed.hour, parsed.minute, 0, 0);
  return result;
}

function nextCourseDate(day: Course["day"], now = new Date()) {
  const result = new Date(now);
  result.setHours(0, 0, 0, 0);
  const diff = (dayIndex[day] - result.getDay() + 7) % 7;
  result.setDate(result.getDate() + diff);
  return result;
}

export function isCourseCalendarExportable(course: Course) {
  const start = parseTime(course.startTime);
  const end = parseTime(course.endTime);
  if (!start || !end) return false;
  return end.hour * 60 + end.minute > start.hour * 60 + start.minute;
}

export function isDeadlineCalendarExportable(deadline: Deadline) {
  return Boolean(parseDate(deadline.dueDate));
}

function createCourseEvent(course: Course, options: CourseIcsOptions = {}) {
  const baseDate = nextCourseDate(course.day, options.now);
  const start = dateWithTime(baseDate, course.startTime);
  const end = dateWithTime(baseDate, course.endTime);
  if (!start || !end || end <= start) return "";
  const description = [
    course.teacher ? `老师：${course.teacher}` : "",
    course.note || "",
    "来自 Bristol Care Dashboard"
  ].filter(Boolean).join("\n");
  const rrule = options.semesterEndDate
    ? `RRULE:FREQ=WEEKLY;UNTIL=${formatIcsDate(new Date(`${options.semesterEndDate}T23:59:59`))}`
    : "RRULE:FREQ=WEEKLY;COUNT=16";

  return [
    "BEGIN:VEVENT",
    `UID:course-${escapeIcsText(course.id)}@bristol-care`,
    `DTSTAMP:${formatIcsDate(options.now || new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(course.name)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(course.location || "")}`,
    rrule,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(`30 分钟后上课：${course.name}`)}`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(`10 分钟后上课：${course.name}`)}`,
    "END:VALARM",
    "END:VEVENT"
  ].join("\r\n");
}

export function createCourseIcs(course: Course, options: CourseIcsOptions = {}): string {
  return calendarEnvelope([createCourseEvent(course, options)].filter(Boolean));
}

export function createAllCoursesIcs(courses: Course[], options: CourseIcsOptions = {}): string {
  return calendarEnvelope(courses.map((course) => createCourseEvent(course, options)).filter(Boolean));
}

function createDeadlineEvent(deadline: Deadline, now = new Date()) {
  const dueDate = parseDate(deadline.dueDate);
  if (!dueDate) return "";
  const due = dateWithTime(dueDate, deadline.dueTime || "09:00");
  if (!due) return "";
  const end = new Date(due.getTime() + 30 * 60 * 1000);
  const morning = new Date(dueDate);
  morning.setHours(9, 0, 0, 0);
  const description = [
    deadline.courseName ? `课程：${deadline.courseName}` : "",
    `优先级：${deadline.priority}`,
    deadline.note || "",
    "来自 Bristol Care Dashboard"
  ].filter(Boolean).join("\n");

  return [
    "BEGIN:VEVENT",
    `UID:deadline-${escapeIcsText(deadline.id)}@bristol-care`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART:${formatIcsDate(due)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(`DDL：${deadline.title}`)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "LOCATION:",
    "BEGIN:VALARM",
    "TRIGGER:-P3D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(`3 天后截止：${deadline.title}`)}`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(`明天截止：${deadline.title}`)}`,
    "END:VALARM",
    "BEGIN:VALARM",
    `TRIGGER;VALUE=DATE-TIME:${formatIcsDate(morning)}`,
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(`今天截止：${deadline.title}`)}`,
    "END:VALARM",
    "END:VEVENT"
  ].join("\r\n");
}

export function createDeadlineIcs(deadline: Deadline): string {
  return calendarEnvelope([createDeadlineEvent(deadline)].filter(Boolean));
}

export function createAllDeadlinesIcs(deadlines: Deadline[]): string {
  return calendarEnvelope(deadlines.filter((deadline) => deadline.status !== "done").map((deadline) => createDeadlineEvent(deadline)).filter(Boolean));
}

export function safeIcsFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-").slice(0, 80) || "bristol-care";
}
