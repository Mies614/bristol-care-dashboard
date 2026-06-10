import { describe, expect, it } from "vitest";

describe("buildTodaySummary appSide routing", () => {
  const baseInput = {
    courses: [],
    deadlines: [],
    periodRecords: [],
    periodSettings: { cycleLength: 28, periodLength: 5 },
    unreadMissYouCount: 0,
    now: new Date("2025-06-15T12:00:00Z"),
  };

  it("owner: featuredNote href uses /me/notes", async () => {
    const { buildTodaySummary } = await import("@/components/TodaySummaryCard");
    const result = buildTodaySummary({
      ...baseInput,
      appSide: "owner",
      featuredNote: { id: "note-1", content: "Test note content here", author: "me", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    });
    expect(result.href).toBe("/me/notes");
  });

  it("partner: featuredNote href uses /notes", async () => {
    const { buildTodaySummary } = await import("@/components/TodaySummaryCard");
    const result = buildTodaySummary({
      ...baseInput,
      appSide: "partner",
      featuredNote: { id: "note-1", content: "Test note content here", author: "me", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    });
    expect(result.href).toBe("/notes");
  });

  it("owner: randomMemory href uses /me/albums", async () => {
    const { buildTodaySummary } = await import("@/components/TodaySummaryCard");
    const result = buildTodaySummary({
      ...baseInput,
      appSide: "owner",
      randomMemory: { title: "Test memory", id: "mem-1", date: "2025-06-01" },
    });
    expect(result.href).toBe("/me/albums");
  });

  it("partner: randomMemory href uses /albums", async () => {
    const { buildTodaySummary } = await import("@/components/TodaySummaryCard");
    const result = buildTodaySummary({
      ...baseInput,
      appSide: "partner",
      randomMemory: { title: "Test memory", id: "mem-1", date: "2025-06-01" },
    });
    expect(result.href).toBe("/albums");
  });
});

describe("buildNextImportant appSide routing", () => {
  const baseInput = {
    courses: [],
    deadlines: [],
    periodRecords: [],
    periodSettings: { cycleLength: 28, periodLength: 5 },
    unreadMissYouCount: 0,
    skipType: "ddl" as const,
    excludedDdlIds: new Set<string>(),
    now: new Date("2025-06-15T12:00:00Z"),
  };

  it("owner: featuredNote href uses /me/notes", async () => {
    const { buildNextImportant } = await import("@/components/NextImportantCard");
    const result = buildNextImportant({
      ...baseInput,
      appSide: "owner",
      featuredNote: { id: "note-1", content: "Test note content here", author: "me", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    });
    expect(result.href).toBe("/me/notes");
  });

  it("partner: featuredNote href uses /notes", async () => {
    const { buildNextImportant } = await import("@/components/NextImportantCard");
    const result = buildNextImportant({
      ...baseInput,
      appSide: "partner",
      featuredNote: { id: "note-1", content: "Test note content here", author: "me", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    });
    expect(result.href).toBe("/notes");
  });
});
