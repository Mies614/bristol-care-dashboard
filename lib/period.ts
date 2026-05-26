import type { PeriodRecord, PeriodSettings } from "./types";

export const DEFAULT_PERIOD_SETTINGS: PeriodSettings = {
  averageCycleLength: 28,
  averagePeriodLength: 5,
  reminderDaysBefore: 2
};

function parseLocalDate(value?: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateString(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysBetween(start: Date, end: Date) {
  const startDay = new Date(start);
  const endDay = new Date(end);
  startDay.setHours(0, 0, 0, 0);
  endDay.setHours(0, 0, 0, 0);
  return Math.round((endDay.getTime() - startDay.getTime()) / 86400000);
}

export function calculatePeriodLength(startDate: string, endDate?: string) {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate || startDate);
  if (!start || !end || end < start) return 0;
  return daysBetween(start, end) + 1;
}

function activeRecords(records: PeriodRecord[]) {
  return records
    .filter((record) => !record.deletedAt && parseLocalDate(record.startDate))
    .sort((a, b) => (parseLocalDate(b.startDate)?.getTime() || 0) - (parseLocalDate(a.startDate)?.getTime() || 0));
}

export function calculateNextPeriodStart(records: PeriodRecord[], settings: PeriodSettings = DEFAULT_PERIOD_SETTINGS) {
  const valid = activeRecords(records);
  if (!valid.length) return "";
  const latest = parseLocalDate(valid[0].startDate);
  if (!latest) return "";

  let cycleLength = settings.averageCycleLength || DEFAULT_PERIOD_SETTINGS.averageCycleLength;
  if (valid.length >= 2) {
    const ascending = [...valid].sort((a, b) => (parseLocalDate(a.startDate)?.getTime() || 0) - (parseLocalDate(b.startDate)?.getTime() || 0));
    const intervals: number[] = [];
    for (let index = 1; index < ascending.length; index += 1) {
      const prev = parseLocalDate(ascending[index - 1].startDate);
      const next = parseLocalDate(ascending[index].startDate);
      if (prev && next) {
        const interval = daysBetween(prev, next);
        if (interval >= 15 && interval <= 60) intervals.push(interval);
      }
    }
    if (intervals.length) {
      cycleLength = Math.round(intervals.reduce((sum, value) => sum + value, 0) / intervals.length);
    }
  }

  const next = new Date(latest);
  next.setDate(next.getDate() + cycleLength);
  return toDateString(next);
}

export function getCurrentCycleDay(records: PeriodRecord[], now = new Date()) {
  const valid = activeRecords(records);
  const latest = parseLocalDate(valid[0]?.startDate);
  if (!latest) return null;
  return Math.max(1, daysBetween(latest, now) + 1);
}

export function getDaysUntilNextPeriod(records: PeriodRecord[], settings: PeriodSettings = DEFAULT_PERIOD_SETTINGS, now = new Date()) {
  const next = parseLocalDate(calculateNextPeriodStart(records, settings));
  if (!next) return null;
  return daysBetween(now, next);
}

export function normalizePeriodSettings(value: unknown): PeriodSettings {
  const record = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  const averageCycleLength = Number(record.averageCycleLength);
  const averagePeriodLength = Number(record.averagePeriodLength);
  const reminderDaysBefore = Number(record.reminderDaysBefore);
  return {
    averageCycleLength: Number.isFinite(averageCycleLength) && averageCycleLength > 0 ? averageCycleLength : DEFAULT_PERIOD_SETTINGS.averageCycleLength,
    averagePeriodLength: Number.isFinite(averagePeriodLength) && averagePeriodLength > 0 ? averagePeriodLength : DEFAULT_PERIOD_SETTINGS.averagePeriodLength,
    reminderDaysBefore: Number.isFinite(reminderDaysBefore) && reminderDaysBefore >= 0 ? reminderDaysBefore : DEFAULT_PERIOD_SETTINGS.reminderDaysBefore
  };
}

export function normalizePeriodRecord(row: Record<string, unknown>): PeriodRecord {
  return {
    id: String(row.id || ""),
    startDate: String(row.start_date || row.startDate || ""),
    endDate: typeof row.end_date === "string" ? row.end_date : typeof row.endDate === "string" ? row.endDate : undefined,
    flow: row.flow === "light" || row.flow === "medium" || row.flow === "heavy" ? row.flow : undefined,
    symptoms: Array.isArray(row.symptoms) ? row.symptoms.filter((item): item is string => typeof item === "string") : undefined,
    mood: typeof row.mood === "string" ? row.mood : undefined,
    note: typeof row.note === "string" ? row.note : undefined,
    createdAt: typeof row.created_at === "string" ? row.created_at : typeof row.createdAt === "string" ? row.createdAt : undefined,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : typeof row.updatedAt === "string" ? row.updatedAt : undefined,
    deletedAt: typeof row.deleted_at === "string" ? row.deleted_at : typeof row.deletedAt === "string" ? row.deletedAt : undefined
  };
}

export function validatePeriodRecord(input: unknown): { ok: true; record: Omit<PeriodRecord, "id"> } | { ok: false; error: string } {
  const record = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const startDate = typeof record.startDate === "string" ? record.startDate : typeof record.start_date === "string" ? record.start_date : "";
  if (!parseLocalDate(startDate)) return { ok: false, error: "开始日期不能为空。" };
  const endDate = typeof record.endDate === "string" ? record.endDate : typeof record.end_date === "string" ? record.end_date : "";
  if (endDate && !parseLocalDate(endDate)) return { ok: false, error: "结束日期格式不正确。" };
  return {
    ok: true,
    record: {
      startDate,
      endDate: endDate || undefined,
      flow: record.flow === "light" || record.flow === "medium" || record.flow === "heavy" ? record.flow : undefined,
      symptoms: Array.isArray(record.symptoms) ? record.symptoms.filter((item): item is string => typeof item === "string") : [],
      mood: typeof record.mood === "string" ? record.mood : undefined,
      note: typeof record.note === "string" ? record.note : undefined
    }
  };
}

export function periodRecordToRow(record: Omit<PeriodRecord, "id">, spaceId: string) {
  return {
    space_id: spaceId,
    start_date: record.startDate,
    end_date: record.endDate || null,
    flow: record.flow || null,
    symptoms: record.symptoms || [],
    mood: record.mood || null,
    note: record.note || null,
    updated_at: new Date().toISOString()
  };
}
