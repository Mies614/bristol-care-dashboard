import { defaultAppData } from "./sampleData";
import { DAYS, type AppData, type CommonLink, type Course, type Deadline, type LoveNote, type PeriodRecord } from "./types";
import { normalizeBackgroundSettings } from "./background";
import { DEFAULT_PERIOD_SETTINGS, normalizePeriodSettings } from "./period";
import { normalizeThemeSettings } from "./theme";

const LEGACY_DEFAULT_NICKNAME = "\u5b9d\u5b9d";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
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

function isDeadline(value: unknown): value is Deadline {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.title) &&
    isString(value.dueDate) &&
    ["low", "medium", "high"].includes(String(value.priority)) &&
    ["todo", "done"].includes(String(value.status))
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

export function validateAppData(value: unknown): AppData {
  if (!isRecord(value)) {
    throw new Error("数据 JSON 格式不正确。请导入由本应用导出的完整数据文件。");
  }

  const courses = Array.isArray(value.courses) && value.courses.every(isCourse) ? value.courses : null;
  const deadlines = Array.isArray(value.deadlines) && value.deadlines.every(isDeadline) ? value.deadlines : null;
  const links = Array.isArray(value.links) && value.links.every(isCommonLink) ? value.links : null;
  const loveNotes = Array.isArray(value.loveNotes) && value.loveNotes.every(isLoveNote) ? value.loveNotes : defaultAppData.loveNotes;
  const periodRecords = Array.isArray(value.periodRecords) && value.periodRecords.every(isPeriodRecord) ? value.periodRecords : [];

  if (!courses || !deadlines || !links) {
    throw new Error("数据 JSON 缺少课程、deadline 或常用链接字段。请检查导入文件。");
  }

  return {
    nickname: isString(value.nickname) && value.nickname !== LEGACY_DEFAULT_NICKNAME ? value.nickname : defaultAppData.nickname,
    nextMeetDate: isString(value.nextMeetDate) ? value.nextMeetDate : "",
    semesterEndDate: isString(value.semesterEndDate) ? value.semesterEndDate : "",
    note: isString(value.note) ? value.note : defaultAppData.note,
    courses,
    deadlines,
    links,
    loveNotes,
    backgroundSettings: normalizeBackgroundSettings(value.backgroundSettings),
    themeSettings: normalizeThemeSettings(value.themeSettings),
    periodRecords,
    periodSettings: normalizePeriodSettings(value.periodSettings || DEFAULT_PERIOD_SETTINGS)
  };
}
