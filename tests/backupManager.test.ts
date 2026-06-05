import { describe, expect, it } from "vitest";
import {
  validateBackupPayload,
  computeMergeResults,
  buildBackupFromLocalData,
  BACKUP_SCHEMA_VERSION,
} from "@/lib/backupTypes";
import type { BackupPayload } from "@/lib/backupTypes";
import { defaultAppData } from "@/lib/sampleData";

describe("validateBackupPayload", () => {
  it("rejects null/undefined", () => {
    expect(validateBackupPayload(null).valid).toBe(false);
    expect(validateBackupPayload(undefined).valid).toBe(false);
    expect(validateBackupPayload("string").valid).toBe(false);
  });

  it("rejects missing schemaVersion", () => {
    const result = validateBackupPayload({ data: { notes: [] } });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("schemaVersion");
  });

  it("rejects unsupported schemaVersion", () => {
    const result = validateBackupPayload({ schemaVersion: "2.0.0", data: {} });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("不支持的备份版本");
  });

  it("accepts valid v1 payload", () => {
    const result = validateBackupPayload({
      schemaVersion: "1.0.0",
      exportedAt: "2026-01-01T00:00:00Z",
      appVersion: "1.0.0",
      storageMode: "supabase",
      spaceCode: "test",
      data: {
        notes: [{ id: "n1", content: "hello", active: true, pinned: false }],
        deadlines: [],
        courses: [],
      },
    });
    expect(result.valid).toBe(true);
    expect(result.summary?.notes).toBe(1);
    expect(result.summary?.deadlines).toBe(0);
  });

  it("handles empty data sections", () => {
    const result = validateBackupPayload({
      schemaVersion: "1.0.0",
      data: {},
    });
    expect(result.valid).toBe(true);
    expect(result.summary?.notes).toBe(0);
    expect(result.summary?.albums).toBe(0);
  });

  it("parses all data fields", () => {
    const result = validateBackupPayload({
      schemaVersion: "1.0.0",
      exportedAt: "2026-01-01T00:00:00Z",
      appVersion: "1.0.0",
      storageMode: "supabase",
      spaceCode: "xiaoguai520",
      data: {
        notes: [
          { id: "n1", content: "hi", active: true, pinned: false },
          { id: "n2", content: "bye", active: false, pinned: false },
        ],
        albums: [{ id: "a1", type: "photo" }],
        deadlines: [
          { id: "d1", title: "essay", dueDate: "2026-06-15", priority: "high", status: "todo" },
        ],
        courses: [
          { id: "c1", name: "Math", day: "Monday", startTime: "09:00", endTime: "10:00" },
        ],
        periodRecords: [
          { id: "p1", startDate: "2026-06-01" },
        ],
        periodSettings: { averageCycleLength: 28, averagePeriodLength: 5, reminderDaysBefore: 2 },
        appSettings: { nickname: "小乖", nextMeetDate: "2026-07-01" },
      },
    });
    expect(result.valid).toBe(true);
    expect(result.summary).toEqual({
      notes: 2,
      albums: 1,
      deadlines: 1,
      courses: 1,
      periodRecords: 1,
      interactions: 0,
      comments: 0,
      contentReads: 0,
    });
    expect(result.payload!.spaceCode).toBe("xiaoguai520");
    expect(result.payload!.storageMode).toBe("supabase");
  });
});

describe("backup does not contain secrets", () => {
  it("buildBackupFromLocalData excludes sensitive fields", () => {
    const backup = buildBackupFromLocalData(defaultAppData, "xiaoguai520");

    const serialized = JSON.stringify(backup);

    // No secrets
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("sb_secret");
    expect(serialized).not.toContain("NEXT_PUBLIC_SUPABASE");
    expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(serialized).not.toContain("VAPID_PRIVATE_KEY");
    expect(serialized).not.toContain("ADMIN_PASSWORD");
    expect(serialized).not.toContain("service_role");

    // Has required fields
    expect(backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(backup.exportedAt).toBeTruthy();
    expect(backup.storageMode).toBe("localStorage");
    expect(backup.spaceCode).toBe("xiaoguai520");

    // Has data structure
    expect(Array.isArray(backup.data.notes)).toBe(true);
    expect(Array.isArray(backup.data.deadlines)).toBe(true);
    expect(Array.isArray(backup.data.courses)).toBe(true);
  });

  it("backup includes schemaVersion and exportedAt", () => {
    const backup = buildBackupFromLocalData(defaultAppData, "test");
    expect(backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(typeof backup.exportedAt).toBe("string");
    expect(new Date(backup.exportedAt).getTime()).toBeGreaterThan(0);
  });
});

describe("computeMergeResults", () => {
  const sampleBackup: BackupPayload = {
    schemaVersion: "1.0.0",
    exportedAt: "2026-01-01T00:00:00Z",
    appVersion: "1.0.0",
    storageMode: "supabase",
    spaceCode: "test",
    data: {
      notes: [
        { id: "n1", content: "hi", active: true, pinned: false },
        { id: "n2", content: "new", active: true, pinned: false },
      ],
      albums: [{ id: "a1", type: "photo" }],
      deadlines: [
        { id: "d1", title: "one", dueDate: "2026-01-01", priority: "high", status: "todo" },
      ],
      courses: [],
    },
  };

  it("skips existing IDs", () => {
    const result = computeMergeResults(
      {
        notes: [{ id: "n1", content: "existing", active: true, pinned: false, author: "admin", noteType: "text" }],
        albums: [{ id: "a1", type: "photo" }],
        deadlines: [
          { id: "d1", title: "one", dueDate: "2026-01-01", priority: "high", status: "todo" },
        ],
        courses: [],
      },
      sampleBackup
    );
    expect(result.notes.toInsert).toBe(1); // n2 is new
    expect(result.notes.skipped).toBe(1); // n1 already exists
    expect(result.albums.toInsert).toBe(0);
    expect(result.albums.skipped).toBe(1);
    expect(result.deadlines.toInsert).toBe(0);
    expect(result.deadlines.skipped).toBe(1);
  });

  it("does not create duplicates", () => {
    const result = computeMergeResults(
      {
        notes: [
          { id: "n1", content: "hi", active: true, pinned: false, author: "admin", noteType: "text" },
          { id: "n2", content: "new", active: true, pinned: false, author: "admin", noteType: "text" },
        ],
        albums: [],
        deadlines: [],
        courses: [],
      },
      sampleBackup
    );
    expect(result.notes.toInsert).toBe(0);
    expect(result.notes.skipped).toBe(2);
  });

  it("handles empty existing data", () => {
    const result = computeMergeResults(
      { notes: [], albums: [], deadlines: [], courses: [] },
      sampleBackup
    );
    expect(result.notes.toInsert).toBe(2);
    expect(result.notes.skipped).toBe(0);
    expect(result.albums.toInsert).toBe(1);
    expect(result.deadlines.toInsert).toBe(1);
  });
});

describe("import invalid JSON does not corrupt", () => {
  it("validateBackupPayload rejects non-object JSON", () => {
    expect(validateBackupPayload(42).valid).toBe(false);
    expect(validateBackupPayload([]).valid).toBe(false);
    expect(validateBackupPayload(true).valid).toBe(false);
  });

  it("validateBackupPayload rejects missing data section", () => {
    const result = validateBackupPayload({ schemaVersion: "1.0.0" });
    expect(result.valid).toBe(false);
  });

  it("validateBackupPayload is safe with unexpected extra fields", () => {
    const result = validateBackupPayload({
      schemaVersion: "1.0.0",
      data: { notes: [], deadlines: [], courses: [] },
      __malicious_field: "DROP TABLE users",
      password: "secret123",
      admin_secret: "leaked",
    });
    expect(result.valid).toBe(true);
    // Extra fields don't break validation
  });
});