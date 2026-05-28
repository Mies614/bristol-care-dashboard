import type { CloudSettings, CommonLink, Course, Deadline, LoveNote } from "./types";
import { defaultBackgroundSettings, normalizeBackgroundSettings, sanitizeBackgroundSettingsForCloud } from "./background";
import { DEFAULT_PERIOD_SETTINGS, normalizePeriodSettings } from "./period";
import { DEFAULT_THEME_SETTINGS, normalizeThemeSettings } from "./theme";

type RecordValue = Record<string, unknown>;

export type NormalizedLocalData = {
  settings: Required<CloudSettings>;
  loveNotes: Array<Omit<LoveNote, "id"> & { id?: string }>;
  courses: Course[];
  deadlines: Deadline[];
  quickLinks: CommonLink[];
};

function safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

export function buildSettingsRows(settings: NormalizedLocalData["settings"], spaceId: string) {
  const updatedAt = new Date().toISOString();
  const rows = [
    {
      space_id: spaceId,
      key: "girlfriend_name",
      value: safeSettingValue(settings.girlfriendName, "小乖"),
      updated_at: updatedAt
    },
    {
      space_id: spaceId,
      key: "next_meeting_date",
      value: safeSettingValue(settings.nextMeetingDate, ""),
      updated_at: updatedAt
    },
    {
      space_id: spaceId,
      key: "semester_end_date",
      value: safeSettingValue(settings.semesterEndDate, ""),
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
    },
    {
      space_id: spaceId,
      key: "quick_actions",
      value: safeSettingValue(safeStringify(settings.quickActions), ""),
      updated_at: updatedAt
    }
  ];

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

function normalizeDeadline(value: unknown): Deadline | null {
  if (!isRecord(value)) return null;
  const title = asStringOrNull(value.title);
  const dueDate = asStringOrNull(value.dueDate) || asStringOrNull(value.due_date);
  if (!title || !dueDate) return null;
  return {
    id: typeof value.id === "string" ? value.id : crypto.randomUUID(),
    title,
    courseName: asStringOrNull(value.courseName) || asStringOrNull(value.course_name) || undefined,
    dueDate,
    dueTime: asStringOrNull(value.dueTime) || asStringOrNull(value.due_time) || undefined,
    priority: (asStringOrNull(value.priority) || "medium") as Deadline["priority"],
    status: (asStringOrNull(value.status) || "todo") as Deadline["status"],
    note: asStringOrNull(value.note) || undefined
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

  const rawLoveNotes = [
    ...asArray(data.loveNotes),
    ...asArray(data.notes),
    data.note,
    data.loveNote
  ].filter(Boolean);

  // Extract quick_actions from the raw data (may be JSON string or already an object)
  let quickActionsStr: string | undefined;
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
      quickActions: quickActionsStr ?? ""
    },
    loveNotes: rawLoveNotes.map(normalizeLoveNote).filter((note): note is Omit<LoveNote, "id"> & { id?: string } => Boolean(note)),
    courses: [...asArray(data.courses), ...asArray(data.schedule), ...asArray(data.timetable)].map(normalizeCourse).filter((course): course is Course => Boolean(course)),
    deadlines: [...asArray(data.deadlines), ...asArray(data.assignments), ...asArray(data.tasks)].map(normalizeDeadline).filter((deadline): deadline is Deadline => Boolean(deadline)),
    quickLinks: [...asArray(data.quickLinks), ...asArray(data.links)].map(normalizeQuickLink).filter((link): link is CommonLink => Boolean(link))
  };
}