import { defaultAppData } from "./sampleData";
import { DAYS, type AppData, type CommonLink, type Course, type LoveNote, type PeriodRecord } from "./types";
import { normalizeBackgroundSettings } from "./background";
import { DEFAULT_PERIOD_SETTINGS, normalizePeriodSettings } from "./period";
import { normalizeThemeSettings } from "./theme";
import { collectDeadlineCandidates, normalizeDeadlines } from "./deadlines";
import { ensureStringId } from "./id";

const LEGACY_DEFAULT_NICKNAME = "\u5b9d\u5b9d";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Validate a course object and repair missing/invalid id.
 * Returns the validated Course or null if essential fields are missing.
 */
function validateAndRepairCourse(value: unknown): Course | null {
  if (!isRecord(value)) return null;
  if (!isString(value.name) || !DAYS.includes(value.day as Course["day"]) || !isString(value.startTime) || !isString(value.endTime)) return null;
  return {
    id: ensureStringId(value.id, "course"),
    name: value.name as string,
    day: value.day as Course["day"],
    startTime: value.startTime as string,
    endTime: value.endTime as string,
    location: isString(value.location) ? value.location : undefined,
    teacher: isString(value.teacher) ? value.teacher : undefined,
    note: isString(value.note) ? value.note : undefined,
    color: isString(value.color) ? value.color : undefined,
    createdAt: isString(value.createdAt) ? value.createdAt : undefined,
    updatedAt: isString(value.updatedAt) ? value.updatedAt : undefined,
    deletedAt: isString(value.deletedAt) ? value.deletedAt : undefined
  };
}

function isCourse(value: unknown): value is Course {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.name) &&
    DAYS.includes(value.day as Course["day"]) &&
    isString(value.startTime) &&
    isString(value.endTime)
  );
}

function isCommonLink(value: unknown): value is CommonLink {
  if (!isRecord(value)) return false;
  return isString(value.id) && isString(value.title) && isString(value.url);
}

function isLoveNote(value: unknown): value is LoveNote {
  if (!isRecord(value)) return false;
  return isString(value.id) && (value.content === undefined || isString(value.content)) && typeof value.active === "boolean" && typeof value.pinned === "boolean";
}

function isPeriodRecord(value: unknown): value is PeriodRecord {
  if (!isRecord(value)) return false;
  return isString(value.id) && isString(value.startDate);
}

export function validateCourseArray(value: unknown): Course[] {
  if (!Array.isArray(value) || !value.every(isCourse)) {
    throw new Error("课程表 JSON 格式不正确。请导入由本应用导出的课程表文件。");
  }
  return value;
}

/**
 * Safely extract an array of Valid items, skipping invalid ones.
 * Never throws for per-item validation failures.
 */
function safeFilterArray<T>(value: unknown, validator: (item: unknown) => item is T): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter(validator);
}

/**
 * Validate and repair AppData. Invalid items in arrays are filtered out.
 * Never throws on per-field issues - uses fallbacks for missing top-level fields.
 */
export function validateAppData(value: unknown): AppData {
  if (!isRecord(value)) {
    return { ...defaultAppData, deadlines: [], courses: [], links: [] };
  }

  // Use validateAndRepairCourse to repair missing/invalid ids in courses
  const courses = Array.isArray(value.courses)
    ? value.courses.map(validateAndRepairCourse).filter((c): c is Course => c !== null)
    : [];
  const deadlines = normalizeDeadlines(collectDeadlineCandidates(value));
  const links = safeFilterArray(value.links, isCommonLink);
  const loveNotes = safeFilterArray(value.loveNotes, isLoveNote);
  const periodRecords = safeFilterArray(value.periodRecords, isPeriodRecord);

  const hasPartialCourses = Array.isArray(value.courses) && value.courses.some((v: unknown) => isRecord(v) && isString((v as Record<string, unknown>).name));

  return {
    nickname: isString(value.nickname) && value.nickname !== LEGACY_DEFAULT_NICKNAME ? value.nickname : defaultAppData.nickname,
    nextMeetDate: isString(value.nextMeetDate) ? value.nextMeetDate : "",
    semesterEndDate: isString(value.semesterEndDate) ? value.semesterEndDate : "",
    note: isString(value.note) ? value.note : defaultAppData.note,
    courses: courses.length ? courses : (hasPartialCourses ? [] : defaultAppData.courses),
    deadlines: deadlines.length ? deadlines : [],
    links: links.length ? links : [],
    loveNotes: loveNotes.length ? loveNotes : defaultAppData.loveNotes,
    backgroundSettings: normalizeBackgroundSettings(value.backgroundSettings),
    themeSettings: normalizeThemeSettings(value.themeSettings),
    periodRecords: periodRecords.length ? periodRecords : [],
    periodSettings: normalizePeriodSettings(value.periodSettings || DEFAULT_PERIOD_SETTINGS)
  };
}