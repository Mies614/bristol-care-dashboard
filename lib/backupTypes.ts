/**
 * Backup schema types.
 * Defines the shape of exported/imported backup JSON files.
 */



import type { PeriodSettings } from "./types";

export const BACKUP_SCHEMA_VERSION = "1.0.0";

export type StorageModeHint = "supabase" | "localStorage" | "mixed";

export interface BackupPayload {
  /** Schema version for validation */
  schemaVersion: string;
  /** ISO timestamp when backup was created */
  exportedAt: string;
  /** App version identifier */
  appVersion: string;
  /** Where the data came from */
  storageMode: StorageModeHint;
  /** Space code used at export time */
  spaceCode: string;

  /** Data sections */
  data: {
    notes: BackupNote[];
    albums?: BackupAlbum[];
    deadlines: BackupDeadline[];
    courses: BackupCourse[];
    periodRecords?: BackupPeriodRecord[];
    periodSettings?: PeriodSettings;
    appSettings?: {
      nickname: string;
      nextMeetDate: string;
      semesterEndDate?: string;
    };
  };
}

export interface BackupNote {
  id: string;
  content?: string;
  active: boolean;
  pinned: boolean;
  author?: string;
  noteType?: string;
  displayStyle?: string;
  mood?: string;
  createdAt?: string;
  createdBy?: string;
  imageUrl?: string;
  imagePath?: string;
  imageAlt?: string;
  audioUrl?: string;
  audioPath?: string;
  videoUrl?: string;
  videoPath?: string;
  mediaSize?: number;
  deletedAt?: string;
}

export interface BackupAlbum {
  id: string;
  title?: string;
  note?: string;
  takenAt?: string;
  location?: string;
  type: string;
  imageUrl?: string;
  imagePath?: string;
  videoUrl?: string;
  videoPath?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  isFavorite?: boolean;
  createdBy?: string;
  createdAt?: string;
  deletedAt?: string;
}

export interface BackupDeadline {
  id: string;
  title: string;
  courseName?: string;
  dueDate: string;
  dueTime?: string;
  priority: string;
  status: string;
  note?: string;
  createdAt?: string;
  deletedAt?: string;
}

export interface BackupCourse {
  id: string;
  name: string;
  day: string;
  startTime: string;
  endTime: string;
  location?: string;
  teacher?: string;
  note?: string;
  color?: string;
  createdAt?: string;
  deletedAt?: string;
}

export interface BackupPeriodRecord {
  id: string;
  startDate: string;
  endDate?: string;
  flow?: string;
  symptoms?: string[];
  mood?: string;
  note?: string;
  createdAt?: string;
  deletedAt?: string;
}

export interface BackupImportSummary {
  notes: number;
  albums: number;
  deadlines: number;
  courses: number;
  periodRecords: number;
}

export interface BackupValidateResult {
  valid: boolean;
  error?: string;
  summary?: BackupImportSummary;
  payload?: BackupPayload;
}

/**
 * Validate a backup JSON object.
 * Returns structured result with error or summary.
 */
export function validateBackupPayload(raw: unknown): BackupValidateResult {
  if (!raw || typeof raw !== "object") {
    return { valid: false, error: "备份文件格式不正确，需要是一个 JSON 对象。" };
  }

  const obj = raw as Record<string, unknown>;

  // Check schemaVersion
  if (typeof obj.schemaVersion !== "string" || !obj.schemaVersion) {
    return {
      valid: false,
      error: "备份文件缺少 schemaVersion，可能是旧版格式或损坏的文件。",
    };
  }

  // Support current and future compatible versions
  // For now only 1.x.x is supported
  if (!obj.schemaVersion.startsWith("1.")) {
    return {
      valid: false,
      error: `不支持的备份版本 ${obj.schemaVersion}，请使用 v1.x 版本的备份文件。`,
    };
  }

  // Check data section exists
  if (!obj.data || typeof obj.data !== "object") {
    return { valid: false, error: "备份文件缺少 data 字段，文件可能不完整。" };
  }

  const data = obj.data as Record<string, unknown>;

  // Validate arrays (they can be empty, that's fine)
  const notes = Array.isArray(data.notes) ? data.notes : [];
  const albums = Array.isArray(data.albums) ? data.albums : [];
  const deadlines = Array.isArray(data.deadlines) ? data.deadlines : [];
  const courses = Array.isArray(data.courses) ? data.courses : [];
  const periodRecords = Array.isArray(data.periodRecords) ? data.periodRecords : [];

  const summary: BackupImportSummary = {
    notes: notes.length,
    albums: albums.length,
    deadlines: deadlines.length,
    courses: courses.length,
    periodRecords: periodRecords.length,
  };

  return {
    valid: true,
    summary,
    payload: {
      schemaVersion: obj.schemaVersion as string,
      exportedAt: (obj.exportedAt as string) || new Date().toISOString(),
      appVersion: (obj.appVersion as string) || "1.0.0",
      storageMode: (obj.storageMode as StorageModeHint) || "localStorage",
      spaceCode: (obj.spaceCode as string) || "unknown",
      data: {
        notes: notes as BackupNote[],
        albums: albums as BackupAlbum[],
        deadlines: deadlines as BackupDeadline[],
        courses: courses as BackupCourse[],
        periodRecords: periodRecords as BackupPeriodRecord[],
        periodSettings: data.periodSettings as PeriodSettings | undefined,
        appSettings: data.appSettings as BackupPayload["data"]["appSettings"] | undefined,
      },
    },
  };
}

/**
 * Merge imported backup into existing Supabase data.
 * Returns counts of inserted/skipped per category.
 */
export function computeMergeResults(
  existing: { notes: LoveNote[]; albums: AlbumItem[]; deadlines: Deadline[]; courses: Course[] },
  incoming: BackupPayload
): {
  notes: { toInsert: number; skipped: number };
  albums: { toInsert: number; skipped: number };
  deadlines: { toInsert: number; skipped: number };
  courses: { toInsert: number; skipped: number };
} {
  const existingNoteIds = new Set(existing.notes.map((n) => n.id));
  const existingAlbumIds = new Set(existing.albums.map((a) => a.id));
  const existingDeadlineIds = new Set(existing.deadlines.map((d) => d.id));
  const existingCourseIds = new Set(existing.courses.map((c) => c.id));

  const notesSkipped = incoming.data.notes.filter((n) => existingNoteIds.has(n.id)).length;
  const notesToInsert = incoming.data.notes.length - notesSkipped;

  const albumsSkipped = (incoming.data.albums || []).filter((a) => existingAlbumIds.has(a.id)).length;
  const albumsToInsert = (incoming.data.albums || []).length - albumsSkipped;

  const deadlinesSkipped = incoming.data.deadlines.filter((d) => existingDeadlineIds.has(d.id)).length;
  const deadlinesToInsert = incoming.data.deadlines.length - deadlinesSkipped;

  const coursesSkipped = incoming.data.courses.filter((c) => existingCourseIds.has(c.id)).length;
  const coursesToInsert = incoming.data.courses.length - coursesSkipped;

  return {
    notes: { toInsert: notesToInsert, skipped: notesSkipped },
    albums: { toInsert: albumsToInsert, skipped: albumsSkipped },
    deadlines: { toInsert: deadlinesToInsert, skipped: deadlinesSkipped },
    courses: { toInsert: coursesToInsert, skipped: coursesSkipped },
  };
}

/**
 * Build a full backup payload from AppData (localStorage source).
 * Ensures no secrets leak into the backup.
 */
export function buildBackupFromLocalData(data: AppData, spaceCode: string): BackupPayload {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: "1.0.0",
    storageMode: "localStorage",
    spaceCode,
    data: {
      notes: data.loveNotes.map((n) => ({
        id: n.id,
        content: n.content,
        active: n.active,
        pinned: n.pinned,
        author: n.author,
        noteType: n.noteType,
        displayStyle: n.displayStyle,
        mood: n.mood,
        createdAt: n.createdAt,
        createdBy: n.createdBy,
        imageUrl: n.imageUrl,
        imagePath: n.imagePath,
        imageAlt: n.imageAlt,
        audioUrl: n.audioUrl,
        audioPath: n.audioPath,
        videoUrl: n.videoUrl,
        videoPath: n.videoPath,
        mediaSize: n.mediaSize,
        deletedAt: n.deletedAt,
      })),
      deadlines: data.deadlines.map((d) => ({
        id: d.id,
        title: d.title,
        courseName: d.courseName,
        dueDate: d.dueDate,
        dueTime: d.dueTime,
        priority: d.priority,
        status: d.status,
        note: d.note,
        createdAt: d.createdAt,
        deletedAt: d.deletedAt,
      })),
      courses: data.courses.map((c) => ({
        id: c.id,
        name: c.name,
        day: c.day,
        startTime: c.startTime,
        endTime: c.endTime,
        location: c.location,
        teacher: c.teacher,
        note: c.note,
        color: c.color,
        createdAt: c.createdAt,
        deletedAt: c.deletedAt,
      })),
      periodRecords: data.periodRecords?.map((p) => ({
        id: p.id,
        startDate: p.startDate,
        endDate: p.endDate,
        flow: p.flow,
        symptoms: p.symptoms,
        mood: p.mood,
        note: p.note,
        createdAt: p.createdAt,
        deletedAt: p.deletedAt,
      })),
      periodSettings: data.periodSettings,
      appSettings: {
        nickname: data.nickname,
        nextMeetDate: data.nextMeetDate,
        semesterEndDate: data.semesterEndDate,
      },
    },
  };
}
