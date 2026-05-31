import { describe, expect, it } from "vitest";
import { collectDeadlineCandidates, normalizeDeadline, normalizeDeadlines } from "@/lib/deadlines";
import { normalizeLocalData } from "@/lib/uploadNormalize";
import { validateAppData } from "@/lib/validation";
import { deadlineToRow, deadlineFromRow } from "@/lib/mappers";

describe("deadline normalization", () => {
  it("normalizes missing collections to an empty array", () => {
    expect(normalizeDeadlines(undefined)).toEqual([]);
    expect(normalizeDeadlines(null)).toEqual([]);
    expect(normalizeDeadlines(42)).toEqual([]);
    expect(normalizeDeadlines("string")).toEqual([]);
    expect(normalizeDeadlines({})).toEqual([]);
  });

  it("normalizes empty array", () => {
    expect(normalizeDeadlines([])).toEqual([]);
  });

  it("collects from legacy deadline fields", () => {
    const candidates = collectDeadlineCandidates({
      ddl: [{ title: "Essay", deadline: "2026-06-02" }],
      deadlines: [{ title: "Project", dueDate: "2026-06-05" }]
    });
    expect(candidates).toHaveLength(2);
  });

  it("collects from reminders, assignments, tasks", () => {
    const candidates = collectDeadlineCandidates({
      reminders: [{ title: "Meeting", due_date: "2026-06-03" }],
      assignments: [{ title: "Homework", dueDate: "2026-06-04" }],
      tasks: [{ title: "Chore", dueDate: "2026-06-05" }]
    });
    expect(candidates).toHaveLength(3);
  });

  it("collectDeadlineCandidates handles non-object input", () => {
    expect(collectDeadlineCandidates(null)).toEqual([]);
    expect(collectDeadlineCandidates(undefined)).toEqual([]);
    expect(collectDeadlineCandidates("string")).toEqual([]);
    expect(collectDeadlineCandidates(42)).toEqual([]);
  });

  it("handles invalid items gracefully", () => {
    const deadlines = normalizeDeadlines([
      null,
      undefined,
      42,
      "string",
      { title: "Valid", dueDate: "2026-06-06" },
      { title: "", dueDate: "2026-06-07" },
      { title: "No Date" },
      { dueDate: "2026-06-08" }
    ]);
    // Only the valid deadline should pass through
    expect(deadlines).toHaveLength(1);
    expect(deadlines[0].title).toBe("Valid");
  });

  it("preserves completed, status and deletedAt fields", () => {
    const deadlines = normalizeDeadlines([
      { title: "Done Task", dueDate: "2026-06-02", completed: true, status: "done", deletedAt: "2026-06-01T00:00:00Z" },
      { title: "Todo Task", dueDate: "2026-06-03", status: "todo" }
    ]);
    expect(deadlines).toHaveLength(2);
    expect(deadlines[0].status).toBe("done");
    expect(deadlines[0].deletedAt).toBe("2026-06-01T00:00:00Z");
    expect(deadlines[1].status).toBe("todo");
  });

  it("migrates legacy ddl and reminders collections", () => {
    const normalized = normalizeLocalData({
      ddl: [{ title: "Essay", deadline: "2026-06-02", completed: true }],
      reminders: [{ title: "Slides", due_date: "2026-06-03" }]
    });

    expect(normalized.deadlines).toHaveLength(2);
    expect(normalized.deadlines[0]).toMatchObject({ title: "Essay", dueDate: "2026-06-02", status: "done" });
    expect(normalized.deadlines[1]).toMatchObject({ title: "Slides", dueDate: "2026-06-03", status: "todo" });
    expect(normalized.deadlines.every((deadline) => deadline.id && deadline.createdAt && deadline.updatedAt)).toBe(true);
  });

  it("restores legacy ddl during local JSON import", () => {
    const data = validateAppData({ ddl: [{ title: "Seminar", deadline: "2026-06-04" }] });
    expect(data.deadlines).toHaveLength(1);
    expect(data.deadlines[0].dueDate).toBe("2026-06-04");
  });

  it("handles assignments and tasks during normalization", () => {
    const normalized = normalizeLocalData({
      assignments: [{ title: "Paper", dueDate: "2026-06-10", priority: "high" }],
      tasks: [{ title: "Grocery", dueDate: "2026-06-11", priority: "low" }]
    });
    expect(normalized.deadlines).toHaveLength(2);
    expect(normalized.deadlines[0]).toMatchObject({ title: "Paper", priority: "high" });
    expect(normalized.deadlines[1]).toMatchObject({ title: "Grocery", priority: "low" });
  });

  it("preserves deletedAt through deadlineToRow and deadlineFromRow round-trip", () => {
    const deadline = normalizeDeadline({
      id: "test-id-123",
      title: "Test",
      dueDate: "2026-06-15",
      deletedAt: "2026-06-10T00:00:00Z"
    });
    expect(deadline).not.toBeNull();
    const row = deadlineToRow(deadline!);
    expect(row.deleted_at).toBe("2026-06-10T00:00:00Z");
    const back = deadlineFromRow(row as Parameters<typeof deadlineFromRow>[0]);
    expect(back.deletedAt).toBe("2026-06-10T00:00:00Z");
  });

  it("preserves status and completed through normalizeDeadline", () => {
    const d1 = normalizeDeadline({ title: "A", dueDate: "2026-06-01", completed: true });
    expect(d1?.status).toBe("done");
    const d2 = normalizeDeadline({ title: "B", dueDate: "2026-06-01", status: "completed" });
    expect(d2?.status).toBe("done");
    const d3 = normalizeDeadline({ title: "C", dueDate: "2026-06-01", status: "done" });
    expect(d3?.status).toBe("done");
    const d4 = normalizeDeadline({ title: "D", dueDate: "2026-06-01" });
    expect(d4?.status).toBe("todo");
  });

  it("auto-generates id, createdAt, updatedAt when missing", () => {
    const deadlines = normalizeDeadlines([
      { title: "New", dueDate: "2026-06-20" }
    ]);
    expect(deadlines).toHaveLength(1);
    expect(deadlines[0].id).toBeTruthy();
    expect(deadlines[0].createdAt).toBeTruthy();
    expect(deadlines[0].updatedAt).toBeTruthy();
  });

  it("normalizes priority correctly", () => {
    const deadlines = normalizeDeadlines([
      { title: "Low", dueDate: "2026-06-01", priority: "low" },
      { title: "Medium", dueDate: "2026-06-02", priority: "medium" },
      { title: "High", dueDate: "2026-06-03", priority: "high" },
      { title: "Invalid", dueDate: "2026-06-04", priority: "urgent" },
      { title: "None", dueDate: "2026-06-05" }
    ]);
    expect(deadlines[0].priority).toBe("low");
    expect(deadlines[1].priority).toBe("medium");
    expect(deadlines[2].priority).toBe("high");
    expect(deadlines[3].priority).toBe("medium"); // invalid falls back to medium
    expect(deadlines[4].priority).toBe("medium"); // missing falls back to medium
  });
});

describe("deadline UUID enforcement", () => {
  it("generates UUID when id is null", () => {
    const d = normalizeDeadline({ title: "A", dueDate: "2026-06-01", id: null });
    expect(d).not.toBeNull();
    expect(d!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("generates UUID when id is undefined", () => {
    const d = normalizeDeadline({ title: "B", dueDate: "2026-06-02" });
    expect(d).not.toBeNull();
    expect(d!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("generates UUID when id is empty string", () => {
    const d = normalizeDeadline({ title: "C", dueDate: "2026-06-03", id: "" });
    expect(d).not.toBeNull();
    expect(d!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("replaces non-UUID id with UUID", () => {
    const d = normalizeDeadline({ title: "D", dueDate: "2026-06-04", id: "deadline-123" });
    expect(d).not.toBeNull();
    expect(d!.id).not.toBe("deadline-123");
    expect(d!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("preserves valid UUID id", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const d = normalizeDeadline({ title: "E", dueDate: "2026-06-05", id: uuid });
    expect(d).not.toBeNull();
    expect(d!.id).toBe(uuid);
  });

  it("deadlineToRow output id is UUID", () => {
    const d = normalizeDeadline({ title: "F", dueDate: "2026-06-06", id: "deadline-old" });
    expect(d).not.toBeNull();
    const row = deadlineToRow(d!);
    expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("deadlineToRow never outputs deadline-xxx id", () => {
    const d = normalizeDeadline({ title: "G", dueDate: "2026-06-07", id: "deadline-legacy" });
    expect(d).not.toBeNull();
    const row = deadlineToRow(d!);
    expect(row.id).not.toContain("deadline-");
  });

  it("UUID replacement preserves completed/status/deletedAt", () => {
    const d = normalizeDeadline({
      title: "H",
      dueDate: "2026-06-08",
      id: "deadline-999",
      completed: true,
      status: "done",
      deletedAt: "2026-05-01T00:00:00Z"
    });
    expect(d).not.toBeNull();
    expect(d!.status).toBe("done");
    expect(d!.deletedAt).toBe("2026-05-01T00:00:00Z");
    expect(d!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});