import type { AlbumItem, CloudSettings, CommonLink, Course, Deadline, LoveNote } from "./types";
import { defaultBackgroundSettings, normalizeBackgroundSettings, sanitizeBackgroundSettingsForCloud } from "./background";
import { DEFAULT_PERIOD_SETTINGS, normalizePeriodSettings } from "./period";
import { DEFAULT_THEME_SETTINGS, normalizeThemeSettings } from "./theme";

type CourseRow = {
  id: string;
  name: string;
  day: Course["day"];
  start_time: string;
  end_time: string;
  location?: string | null;
  teacher?: string | null;
  note?: string | null;
  color?: string | null;
};

type DeadlineRow = {
  id: string;
  title: string;
  course_name?: string | null;
  due_date: string;
  due_time?: string | null;
  priority: Deadline["priority"];
  status: Deadline["status"];
  note?: string | null;
};

type LoveNoteRow = {
  id: string;
  content: string;
  active: boolean;
  pinned: boolean;
  author?: LoveNote["author"] | null;
  note_type?: LoveNote["noteType"] | null;
  display_style?: LoveNote["displayStyle"] | null;
  mood?: LoveNote["mood"] | null;
  visible_from?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  image_alt?: string | null;
  audio_url?: string | null;
  audio_path?: string | null;
  video_url?: string | null;
  video_path?: string | null;
  media_size?: number | null;
  deleted_at?: string | null;
  updated_at?: string | null;
};

type QuickLinkRow = {
  id: string;
  title: string;
  url: string;
  category?: string | null;
  sort_order?: number | null;
};

type AlbumItemRow = {
  id: string;
  title?: string | null;
  note?: string | null;
  taken_at?: string | null;
  location?: string | null;
  type: AlbumItem["type"];
  image_url?: string | null;
  image_path?: string | null;
  video_url?: string | null;
  video_path?: string | null;
  width?: number | null;
  height?: number | null;
  file_size?: number | null;
  is_favorite?: boolean | null;
  created_by?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
};

function withOptionalUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? { id } : {};
}

export function courseFromRow(row: CourseRow): Course {
  return {
    id: row.id,
    name: row.name,
    day: row.day,
    startTime: row.start_time,
    endTime: row.end_time,
    location: row.location || undefined,
    teacher: row.teacher || undefined,
    note: row.note || undefined,
    color: row.color || undefined
  };
}

export function courseToRow(course: Course, spaceId?: string) {
  return {
    ...(spaceId ? { space_id: spaceId } : {}),
    ...withOptionalUuid(course.id),
    name: course.name,
    day: course.day,
    start_time: course.startTime,
    end_time: course.endTime,
    location: course.location || null,
    teacher: course.teacher || null,
    note: course.note || null,
    color: course.color || "rose"
  };
}

export function deadlineFromRow(row: DeadlineRow): Deadline {
  return {
    id: row.id,
    title: row.title,
    courseName: row.course_name || undefined,
    dueDate: row.due_date,
    dueTime: row.due_time || undefined,
    priority: row.priority,
    status: row.status,
    note: row.note || undefined
  };
}

export function deadlineToRow(deadline: Deadline, spaceId?: string) {
  return {
    ...(spaceId ? { space_id: spaceId } : {}),
    ...withOptionalUuid(deadline.id),
    title: deadline.title,
    course_name: deadline.courseName || null,
    due_date: deadline.dueDate,
    due_time: deadline.dueTime || null,
    priority: deadline.priority,
    status: deadline.status,
    note: deadline.note || null
  };
}

export function loveNoteFromRow(row: LoveNoteRow): LoveNote {
  return {
    id: row.id,
    content: row.content,
    active: row.active,
    pinned: row.pinned,
    author: row.author || undefined,
    noteType: row.note_type || undefined,
    displayStyle: row.display_style || undefined,
    mood: row.mood || undefined,
    visibleFrom: row.visible_from || undefined,
    createdAt: row.created_at || undefined,
    createdBy: row.created_by || undefined,
    imageUrl: row.image_url || undefined,
    imagePath: row.image_path || undefined,
    imageAlt: row.image_alt || undefined,
    audioUrl: row.audio_url || undefined,
    audioPath: row.audio_path || undefined,
    videoUrl: row.video_url || undefined,
    videoPath: row.video_path || undefined,
    mediaSize: row.media_size ?? undefined,
    deletedAt: row.deleted_at || undefined,
    updatedAt: row.updated_at || undefined
  };
}

export function loveNoteToRow(note: (Omit<LoveNote, "id"> & { id?: string }), spaceId?: string) {
  return {
    ...(spaceId ? { space_id: spaceId } : {}),
    ...(note.id ? withOptionalUuid(note.id) : {}),
    content: note.content || "",
    active: note.active,
    pinned: note.pinned,
    author: note.author || "admin",
    note_type: note.noteType || "text",
    display_style: note.displayStyle || "sticky",
    mood: note.mood || null,
    visible_from: note.visibleFrom || new Date().toISOString(),
    created_by: note.createdBy || "admin",
    image_url: note.imageUrl || null,
    image_path: note.imagePath || null,
    image_alt: note.imageAlt || null,
    audio_url: note.audioUrl || null,
    audio_path: note.audioPath || null,
    video_url: note.videoUrl || null,
    video_path: note.videoPath || null,
    media_size: note.mediaSize ?? null,
    deleted_at: note.deletedAt || null,
    updated_at: note.updatedAt || null
  };
}

export function quickLinkFromRow(row: QuickLinkRow): CommonLink {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    category: row.category || "general",
    sortOrder: row.sort_order ?? 0
  };
}

export function quickLinkToRow(link: CommonLink, spaceId?: string) {
  return {
    ...(spaceId ? { space_id: spaceId } : {}),
    ...withOptionalUuid(link.id),
    title: link.title,
    url: link.url,
    category: link.category || "general",
    sort_order: link.sortOrder ?? 0
  };
}

export function albumItemFromRow(row: AlbumItemRow): AlbumItem {
  return {
    id: row.id,
    title: row.title || undefined,
    note: row.note || undefined,
    takenAt: row.taken_at || undefined,
    location: row.location || undefined,
    type: row.type,
    imageUrl: row.image_url || undefined,
    imagePath: row.image_path || undefined,
    videoUrl: row.video_url || undefined,
    videoPath: row.video_path || undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    fileSize: row.file_size ?? undefined,
    isFavorite: row.is_favorite ?? false,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at || undefined,
    deletedAt: row.deleted_at || undefined
  };
}

export function albumItemToRow(item: Omit<AlbumItem, "id"> & { id?: string }, spaceId?: string) {
  return {
    ...(spaceId ? { space_id: spaceId } : {}),
    ...(item.id ? withOptionalUuid(item.id) : {}),
    title: item.title || null,
    note: item.note || null,
    taken_at: item.takenAt || null,
    location: item.location || null,
    type: item.type,
    image_url: item.imageUrl || null,
    image_path: item.imagePath || null,
    video_url: item.videoUrl || null,
    video_path: item.videoPath || null,
    width: item.width ?? null,
    height: item.height ?? null,
    file_size: item.fileSize ?? null,
    is_favorite: item.isFavorite ?? false,
    created_by: item.createdBy || "admin",
    deleted_at: item.deletedAt || null
  };
}

export function settingsRowsToCloudSettings(rows: Array<{ key: string; value: unknown }>, fallbackName = "小乖"): CloudSettings {
  const result: CloudSettings = { girlfriendName: fallbackName, backgroundSettings: defaultBackgroundSettings, themeSettings: DEFAULT_THEME_SETTINGS, periodSettings: DEFAULT_PERIOD_SETTINGS };
  for (const row of rows) {
    if (row.key === "girlfriend_name" && typeof row.value === "string") result.girlfriendName = row.value || fallbackName;
    if (row.key === "next_meeting_date" && (typeof row.value === "string" || row.value === null)) result.nextMeetingDate = row.value || null;
    if (row.key === "semester_end_date" && (typeof row.value === "string" || row.value === null)) result.semesterEndDate = row.value || null;
    if (row.key === "background_settings") result.backgroundSettings = normalizeBackgroundSettings(row.value);
    if (row.key === "theme_settings") result.themeSettings = normalizeThemeSettings(row.value);
    if (row.key === "period_settings") result.periodSettings = normalizePeriodSettings(row.value);
  }
  return result;
}

export function cloudSettingsToRows(settings: CloudSettings, spaceId: string) {
  return [
    { space_id: spaceId, key: "girlfriend_name", value: settings.girlfriendName || "小乖" },
    { space_id: spaceId, key: "next_meeting_date", value: settings.nextMeetingDate || "" },
    { space_id: spaceId, key: "semester_end_date", value: settings.semesterEndDate || "" },
    { space_id: spaceId, key: "background_settings", value: sanitizeBackgroundSettingsForCloud(settings.backgroundSettings || defaultBackgroundSettings) },
    { space_id: spaceId, key: "theme_settings", value: normalizeThemeSettings(settings.themeSettings || DEFAULT_THEME_SETTINGS) },
    { space_id: spaceId, key: "period_settings", value: normalizePeriodSettings(settings.periodSettings || DEFAULT_PERIOD_SETTINGS) }
  ];
}
