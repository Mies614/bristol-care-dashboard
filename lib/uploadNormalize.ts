import type { CloudSettings, CommonLink, Course, Deadline, LoveNote, PeriodRecord } from "./types";
import { defaultBackgroundSettings, normalizeBackgroundSettings, sanitizeBackgroundSettingsForCloud } from "./background";
import { DEFAULT_PERIOD_SETTINGS, normalizePeriodSettings } from "./period";
import { DEFAULT_THEME_SETTINGS, normalizeThemeSettings } from "./theme";
import { collectDeadlineCandidates, normalizeDeadlines } from "./deadlines";

type RecordValue = Record<string, unknown>;

export type NormalizedLocalData = {
  settings: Required<CloudSettings>;
  loveNotes: Array<Omit<LoveNote, "id"> & { id?: string }>;
  courses: Course[];
  deadlines: Deadline[];
  quickLinks: CommonLink[];
};

export function buildSettingsRows(settings: NormalizedLocalData["settings"], spaceId: string) {
  const updatedAt = new Date().toISOString();
  const rows = [
    {
      space_id: spaceId,
      key: "app_settings",
      value: safeSettingValue({
        girlfriendName: settings.girlfriendName || "小乖",
        nextMeetingDate: settings.nextMeetingDate || "",
        semesterEndDate: settings.semesterEndDate || ""
      }, {}),
      updated_at: updatedAt
    },
    {
      space_id: spaceId,
      key: "background_settings",
      value: safeSettingValue(sanitizeBackgroundSettingsForCloud(settings.backgroundSettings || defaultBackgroundSettings), defaultBackgroundSettings),
      updated_at: updatedAt
    },
    {
      space_id: spaceId,
      key: "theme_settings",
      value: safeSettingValue(normalizeThemeSettings(settings.themeSettings || DEFAULT_THEME_SETTINGS), DEFAULT_THEME_SETTINGS),
      updated_at: updatedAt
    },
    {
      space_id: spaceId,
      key: "period_settings",
      value: safeSettingValue(normalizePeriodSettings(settings.periodSettings || DEFAULT_PERIOD_SETTINGS), DEFAULT_PERIOD_SETTINGS),
      updated_at: updatedAt
    }
  ];

  // Include period_records if present
  if (settings.periodRecords && settings.periodRecords.length > 0) {
    rows.push({
      space_id: spaceId,
      key: "period_records",
      value: settings.periodRecords.map((r: PeriodRecord) => ({ ...r })),
      updated_at: updatedAt
    });
  }

  // Include auto_sync_settings if present
  if (settings.autoSyncSettings) {
    rows.push({
      space_id: spaceId,
      key: "auto_sync_settings",
      value: { ...settings.autoSyncSettings },
      updated_at: updatedAt
    });
  }

  return rows.map((row) => ({
    ...row,
    value: row.value === null || row.value === undefined ? "" : row.value
  }));
}

export function safeSettingValue(value: unknown, fallback: unknown = "") {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string") return value;
  return value;
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function asStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function isUuid(value: unknown): boolean {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function omitInvalidUuidId<T extends RecordValue>(record: T): T {
  if (!("id" in record) || isUuid(record.id)) return record;
  const rest = { ...record };
  delete rest.id;
  return rest as T;
}

function normalizeCourse(value: unknown): Course | null {
  if (!isRecord(value)) return null;
  const name = asStringOrNull(value.name);
  const day = asStringOrNull(value.day);
  const startTime = asStringOrNull(value.startTime) || asStringOrNull(value.start_time);
  const endTime = asStringOrNull(value.endTime) || asStringOrNull(value.end_time);
  if (!name || !day || !startTime || !endTime) return null;
  return {
    id: typeof value.id === "string" ? value.id : crypto.randomUUID(),
    name,
    day: day as Course["day"],
    startTime,
    endTime,
    location: asStringOrNull(value.location) || undefined,
    teacher: asStringOrNull(value.teacher) || undefined,
    note: asStringOrNull(value.note) || undefined,
    color: asStringOrNull(value.color) || undefined
  };
}

function normalizeQuickLink(value: unknown): CommonLink | null {
  if (!isRecord(value)) return null;
  const title = asStringOrNull(value.title);
  const url = asStringOrNull(value.url);
  if (!title || !url) return null;
  return {
    id: typeof value.id === "string" ? value.id : crypto.randomUUID(),
    title,
    url,
    category: asStringOrNull(value.category) || "general",
    sortOrder: typeof value.sortOrder === "number" ? value.sortOrder : typeof value.sort_order === "number" ? value.sort_order : 0
  };
}

function normalizeLoveNote(value: unknown): (Omit<LoveNote, "id"> & { id?: string }) | null {
  if (typeof value === "string") {
    const content = value.trim();
    return content ? { content, active: true, pinned: true, visibleFrom: new Date().toISOString() } : null;
  }
  if (!isRecord(value)) return null;
  const content = asStringOrNull(value.content) || asStringOrNull(value.note);
  if (!content) return null;
  return {
    ...(typeof value.id === "string" ? { id: value.id } : {}),
    content,
    active: typeof value.active === "boolean" ? value.active : true,
    pinned: typeof value.pinned === "boolean" ? value.pinned : false,
    visibleFrom: asStringOrNull(value.visibleFrom) || asStringOrNull(value.visible_from) || new Date().toISOString(),
    createdAt: asStringOrNull(value.createdAt) || asStringOrNull(value.created_at) || undefined,
    createdBy: asStringOrNull(value.createdBy) || asStringOrNull(value.created_by) || "local",
    imageUrl: asStringOrNull(value.imageUrl) || asStringOrNull(value.image_url) || undefined,
    imagePath: asStringOrNull(value.imagePath) || asStringOrNull(value.image_path) || undefined,
    imageAlt: asStringOrNull(value.imageAlt) || asStringOrNull(value.image_alt) || undefined
  };
}

function normalizePeriodRecord(value: unknown): PeriodRecord | null {
  if (!isRecord(value)) return null;
  const startDate = asStringOrNull(value.startDate) || asStringOrNull(value.start_date);
  if (!startDate) return null;
  return {
    id: typeof value.id === "string" ? value.id : crypto.randomUUID(),
    startDate,
    endDate: asStringOrNull(value.endDate) || asStringOrNull(value.end_date) || undefined,
    flow: ["light", "medium", "heavy"].includes(String(value.flow)) ? (value.flow as PeriodRecord["flow"]) : undefined,
    symptoms: Array.isArray(value.symptoms) ? value.symptoms.filter((s: unknown): s is string => typeof s === "string") : undefined,
    mood: asStringOrNull(value.mood) || undefined,
    note: asStringOrNull(value.note) || undefined,
    createdAt: asStringOrNull(value.createdAt) || asStringOrNull(value.created_at) || undefined,
    updatedAt: asStringOrNull(value.updatedAt) || asStringOrNull(value.updated_at) || undefined,
    deletedAt: asStringOrNull(value.deletedAt) || asStringOrNull(value.deleted_at) || undefined
  };
}

export function normalizeLocalData(data: unknown): NormalizedLocalData {
  if (!isRecord(data)) throw new Error("本地数据格式不正确。");
  const settings = isRecord(data.settings) ? data.settings : {};
  const girlfriendName =
    asStringOrNull(data.nickname) ||
    asStringOrNull(data.girlfriendName) ||
    asStringOrNull(settings.girlfriendName) ||
    "小乖";
  const nextMeetingDate =
    asStringOrNull(data.nextMeetDate) ||
    asStringOrNull(data.nextMeetingDate) ||
    asStringOrNull(settings.nextMeetingDate);
  const semesterEndDate =
    asStringOrNull(data.semesterEndDate) ||
    asStringOrNull(settings.semesterEndDate);
  const backgroundSettings = normalizeBackgroundSettings(data.backgroundSettings || settings.backgroundSettings);
  const themeSettings = normalizeThemeSettings(data.themeSettings || settings.themeSettings);
  const periodSettings = normalizePeriodSettings(data.periodSettings || settings.periodSettings);

  // Extract period records - check both data.periodRecords and settings.period_records
  const rawPeriodRecords = asArray<RecordValue>(data.periodRecords || (settings.period_records as Record<string, unknown>[] | undefined));
  const periodRecords: PeriodRecord[] = rawPeriodRecords
    .map(normalizePeriodRecord)
    .filter((r): r is PeriodRecord => Boolean(r));

  // Extract auto_sync_settings
  const rawAutoSync = isRecord(data.autoSyncSettings) ? data.autoSyncSettings : undefined;
  const autoSyncSettings = rawAutoSync ? {
    enabled: typeof rawAutoSync.enabled === "boolean" ? rawAutoSync.enabled : true,
    ...rawAutoSync
  } : undefined;

  const rawLoveNotes = [
    ...asArray(data.loveNotes),
    ...asArray(data.notes),
    data.note,
    data.loveNote
  ].filter(Boolean);

  // Backward compatibility: parse quick_actions from old data but don't actively use them
  let quickActionsStr = "";
  const rawQA = isRecord(data)
    ? data.quickActions || data.quick_actions || (settings.quick_actions)
    : undefined;
  if (typeof rawQA === "string") {
    quickActionsStr = rawQA;
  } else if (rawQA !== undefined) {
    quickActionsStr = JSON.stringify(rawQA);
  }

  return {
    settings: {
      girlfriendName,
      nextMeetingDate,
      semesterEndDate,
      backgroundSettings,
      themeSettings,
      periodSettings,
      periodRecords,
      autoSyncSettings: autoSyncSettings || { enabled: true },
      quickActions: quickActionsStr
    },
    loveNotes: rawLoveNotes.map(normalizeLoveNote).filter((note): note is Omit<LoveNote, "id"> & { id?: string } => Boolean(note)),
    courses: [...asArray(data.courses), ...asArray(data.schedule), ...asArray(data.timetable)].map(normalizeCourse).filter((course): course is Course => Boolean(course)),
    deadlines: normalizeDeadlines(collectDeadlineCandidates(data)),
    quickLinks: [...asArray(data.quickLinks), ...asArray(data.links)].map(normalizeQuickLink).filter((link): link is CommonLink => Boolean(link))
  };
}
