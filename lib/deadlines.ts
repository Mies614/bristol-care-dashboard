import type { Deadline } from "./types";

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `deadline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizeDeadline(value: unknown, now = new Date().toISOString()): Deadline | null {
  if (!isRecord(value)) return null;
  const title = asString(value.title) || asString(value.name);
  const dueDate = asString(value.dueDate) || asString(value.due_date) || asString(value.deadline);
  if (!title || !dueDate) return null;

  const rawStatus = asString(value.status);
  const completed = value.completed === true || rawStatus === "done" || rawStatus === "completed";

  return {
    id: asString(value.id) || makeId(),
    title,
    courseName: asString(value.courseName) || asString(value.course_name),
    dueDate,
    dueTime: asString(value.dueTime) || asString(value.due_time),
    priority: ["low", "medium", "high"].includes(String(value.priority))
      ? value.priority as Deadline["priority"]
      : "medium",
    status: completed ? "done" : "todo",
    note: asString(value.note),
    createdAt: asString(value.createdAt) || asString(value.created_at) || now,
    updatedAt: asString(value.updatedAt) || asString(value.updated_at) || now,
    deletedAt: asString(value.deletedAt) || asString(value.deleted_at)
  };
}

export function normalizeDeadlines(value: unknown, now?: string): Deadline[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((deadline) => normalizeDeadline(deadline, now))
    .filter((deadline): deadline is Deadline => Boolean(deadline));
}

export function collectDeadlineCandidates(data: RecordValue): unknown[] {
  return [
    ...(Array.isArray(data.deadlines) ? data.deadlines : []),
    ...(Array.isArray(data.ddl) ? data.ddl : []),
    ...(Array.isArray(data.reminders) ? data.reminders : []),
    ...(Array.isArray(data.assignments) ? data.assignments : []),
    ...(Array.isArray(data.tasks) ? data.tasks : [])
  ];
}
