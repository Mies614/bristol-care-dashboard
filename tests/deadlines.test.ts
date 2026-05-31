import { describe, expect, it } from "vitest";
import { normalizeDeadlines } from "@/lib/deadlines";
import { normalizeLocalData } from "@/lib/uploadNormalize";
import { validateAppData } from "@/lib/validation";

describe("deadline normalization", () => {
  it("normalizes missing collections to an empty array", () => {
    expect(normalizeDeadlines(undefined)).toEqual([]);
    expect(normalizeDeadlines(null)).toEqual([]);
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
});
