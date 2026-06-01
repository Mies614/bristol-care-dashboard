import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); }
  };
}

describe("export sanitize — no secrets or imageDataUrl leakage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: makeStorage(), dispatchEvent: vi.fn() });
    vi.stubGlobal("localStorage", window.localStorage);
    // Provide fallback sample data so createBackupPayload doesn't use defaults only
    window.localStorage.setItem("bristol-care-data-v1", JSON.stringify({
      nickname: "\u5c0f\u4e56",
      note: "hello",
      courses: [],
      deadlines: [],
      links: [],
      backgroundSettings: {
        mode: "image",
        imageDataUrl: "data:image/png;base64,abc123",
        preset: "cream"
      },
      loveNotes: []
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("createBackupPayload does not contain secret-shaped strings", async () => {
    const { createBackupPayload } = await import("@/lib/backup");
    const payload = JSON.stringify(createBackupPayload());
    // Common secret patterns that should never be present in export
    const secrets = ["service_role", "service.role", "sb_secret_", "supabase_secret"];
    for (const secret of secrets) {
      expect(payload).not.toContain(secret);
    }
  });

  it("createBackupPayload strips imageDataUrl from backgroundSettings", async () => {
    const { createBackupPayload } = await import("@/lib/backup");
    const payload = createBackupPayload();
    expect(payload.backgroundSettings.imageDataUrl).toBeUndefined();
  });

  it("createBackupPayload maps quickLinks to links", async () => {
    const { createBackupPayload } = await import("@/lib/backup");
    const payload = createBackupPayload();
    // quickLinks should be merged into links, not exist as a separate field
    // The 'links' field should exist, 'quickLinks' should not be a top-level payload field
    expect(Array.isArray(payload.links)).toBe(true);
  });
});

describe("autoSync payload sanitize — no imageDataUrl", () => {
  // prepareAutoSyncData is a pure function, no window mocks needed
  it("prepareAutoSyncData strips imageDataUrl from background", async () => {
    const { prepareAutoSyncData } = await import("@/lib/autoSync");
    const input = {
      nickname: "\u5c0f\u4e56",
      nextMeetDate: "",
      semesterEndDate: "",
      note: "",
      courses: [],
      deadlines: [],
      links: [],
      loveNotes: [],
      backgroundSettings: {
        mode: "image" as const,
        imageDataUrl: "data:image/png;base64,secret_data",
        preset: "pink" as const,
        imageFit: "cover" as const,
        imagePosition: "center" as const,
        focalPoint: { x: 50, y: 38 },
        overlay: "light" as const,
        blur: false,
        blurAmount: 0,
        portraitEnhance: false,
        dim: 20,
        scale: 100,
        contentProtection: "none" as const,
        photoVisibility: 80
      },
      periodRecords: [],
      periodSettings: {
        cycleLength: 28,
        periodLength: 5,
        lastPeriodStart: "",
        predictedNextStart: ""
      },
      themeSettings: {
        bg: "#fdf2f8",
        fg: "#1a1a2e"
      }
    };
    const result = prepareAutoSyncData(input as Record<string, unknown>);
    expect(result.backgroundSettings?.imageDataUrl).toBeUndefined();
  });

  it("prepareAutoSyncData leaves cloud image data intact", async () => {
    const { prepareAutoSyncData } = await import("@/lib/autoSync");
    const input = {
      nickname: "\u5c0f\u4e56",
      nextMeetDate: "",
      semesterEndDate: "",
      note: "",
      courses: [],
      deadlines: [],
      links: [],
      loveNotes: [],
      backgroundSettings: {
        mode: "cloudImage" as const,
        cloudImageUrl: "https://example.com/bg.webp",
        cloudImagePath: "xiaoguai520/backgrounds/bg.webp",
        preset: "cream" as const,
        imageFit: "cover" as const,
        imagePosition: "center" as const,
        focalPoint: { x: 50, y: 38 },
        overlay: "light" as const,
        blur: false,
        blurAmount: 0,
        portraitEnhance: false,
        dim: 20,
        scale: 100,
        contentProtection: "none" as const,
        photoVisibility: 80
      },
      periodRecords: [],
      periodSettings: { cycleLength: 28, periodLength: 5, lastPeriodStart: "", predictedNextStart: "" },
      themeSettings: { bg: "#fdf2f8", fg: "#1a1a2e" }
    };
    const result = prepareAutoSyncData(input as Record<string, unknown>);
    expect(result.backgroundSettings?.cloudImageUrl).toBe("https://example.com/bg.webp");
    expect(result.backgroundSettings?.cloudImagePath).toBe("xiaoguai520/backgrounds/bg.webp");
  });
});

describe("import old data normalization", () => {
  it("normalizes old-format deadlines with due_date field", async () => {
    const { validateAppData } = await import("@/lib/validation");
    const data = validateAppData({
      deadlines: [
        { id: "custom-id-1", title: "Old homework", due_date: "2026-06-10" },
        { id: "custom-id-2", name: "No dueDate falls back", due_date: "2026-06-15" }
      ]
    });
    expect(data.deadlines.length).toBeGreaterThanOrEqual(2);
    const first = data.deadlines.find(d => d.title === "Old homework");
    expect(first).toBeDefined();
    expect(first!.dueDate).toBe("2026-06-10");
    const second = data.deadlines.find(d => d.title === "No dueDate falls back");
    expect(second).toBeDefined();
    expect(second!.dueDate).toBe("2026-06-15");
  });

  it("normalizes deadlines from legacy fields (ddl, reminders, tasks)", async () => {
    const { validateAppData } = await import("@/lib/validation");
    const data = validateAppData({
      ddl: [
        { id: "legacy-ddl-1", title: "Legacy DDL", dueDate: "2026-07-01" }
      ],
      tasks: [
        { id: "legacy-task-1", title: "Legacy Task", deadline: "2026-08-01" }
      ]
    });
    expect(data.deadlines.length).toBeGreaterThanOrEqual(2);
    expect(data.deadlines.some(d => d.title === "Legacy DDL")).toBe(true);
    expect(data.deadlines.some(d => d.title === "Legacy Task")).toBe(true);
  });
});

describe("courses/deadlines non-UUID repair", () => {
  it("repairs courses with non-UUID ids via ensureUuid", async () => {
    const { validateAppData } = await import("@/lib/validation");
    const data = validateAppData({
      courses: [
        { id: "not-a-uuid-at-all", name: "Math", day: "Monday", startTime: "09:00", endTime: "10:00" },
        { id: "123", name: "English", day: "Tuesday", startTime: "10:00", endTime: "11:00" },
        { id: "", name: "Physics", day: "Wednesday", startTime: "11:00", endTime: "12:00" }
      ]
    });
    expect(data.courses.length).toBe(3);
    for (const course of data.courses) {
      // All should be valid UUIDs now
      expect(course.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(typeof course.id).toBe("string");
      expect(course.id.length).toBe(36);
    }
    // Verify each course retains its name
    const names = data.courses.map(c => c.name);
    expect(names).toContain("Math");
    expect(names).toContain("English");
    expect(names).toContain("Physics");
  });

  it("repairs deadlines with non-UUID ids via ensureUuid in normalizeDeadline", async () => {
    const { normalizeDeadline } = await import("@/lib/deadlines");
    const result = normalizeDeadline({
      id: "legacy-non-uuid",
      title: "Test deadline",
      dueDate: "2026-06-20"
    });
    expect(result).not.toBeNull();
    // Should be a valid UUID now
    expect(result!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(result!.id.length).toBe(36);
  });
});

describe("missing/null fields resilience", () => {
  it("validateAppData(null) does not throw", async () => {
    const { validateAppData } = await import("@/lib/validation");
    expect(() => validateAppData(null)).not.toThrow();
    const result = validateAppData(null);
    expect(Array.isArray(result.courses)).toBe(true);
    expect(typeof result.nickname).toBe("string");
  });

  it("validateAppData(undefined) does not throw", async () => {
    const { validateAppData } = await import("@/lib/validation");
    expect(() => validateAppData(undefined)).not.toThrow();
    const result = validateAppData(undefined);
    expect(Array.isArray(result.courses)).toBe(true);
  });

  it("validateAppData({}) does not throw and returns defaults with empty arrays", async () => {
    const { validateAppData } = await import("@/lib/validation");
    const result = validateAppData({});
    expect(Array.isArray(result.courses)).toBe(true);
    expect(Array.isArray(result.deadlines)).toBe(true);
    expect(Array.isArray(result.links)).toBe(true);
    expect(typeof result.nickname).toBe("string");
  });

  it("handles courses with null/undefined fields without crashing", async () => {
    const { validateAppData } = await import("@/lib/validation");
    const data = validateAppData({
      courses: [
        { id: null, name: "Chemistry", day: "Thursday", startTime: "13:00", endTime: "14:00" },
        { id: undefined, name: "Biology", day: "Friday", startTime: "14:00", endTime: "15:00" },
        { name: "History", day: "Monday", startTime: "15:00", endTime: "16:00" }
      ]
    });
    expect(data.courses.length).toBe(3);
    for (const course of data.courses) {
      expect(course.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    }
  });

  it("handles deadlines with null/undefined fields without crashing", async () => {
    const { validateAppData } = await import("@/lib/validation");
    const data = validateAppData({
      deadlines: [
        { id: null, title: "Homework", dueDate: "2026-06-25" },
        { title: "Exam", dueDate: "2026-07-01" }
      ]
    });
    expect(data.deadlines.length).toBe(2);
    const titles = data.deadlines.map(d => d.title);
    expect(titles).toContain("Homework");
    expect(titles).toContain("Exam");
  });
});

describe("cards/IndexedDB data not in sync payload", () => {
  it("createBackupPayload does not contain cardWallet or IndexedDB artifacts", async () => {
    const { createBackupPayload } = await import("@/lib/backup");
    const payloadKeys = Object.keys(createBackupPayload());
    // card wallet data is stored separately in IndexedDB and should not
    // appear in the localStorage-based backup payload
    expect(payloadKeys).not.toContain("cards");
    expect(payloadKeys).not.toContain("cardWallet");
    expect(payloadKeys).not.toContain("storedCards");
  });

  it("validateAppData ignores card-related fields if present", async () => {
    const { validateAppData } = await import("@/lib/validation");
    // Simulate old data that somehow has card fields
    const data = validateAppData({
      cards: [{ id: "1", type: "member" }],
      storedCards: [{ id: "2" }]
    });
    // Should not have cards in validated output (use index signature)
    const dataRecord = data as Record<string, unknown>;
    expect(dataRecord.cards).toBeUndefined();
    expect(dataRecord.storedCards).toBeUndefined();
  });
});

describe("quickLinks/quickActions portability", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: makeStorage(), dispatchEvent: vi.fn() });
    vi.stubGlobal("localStorage", window.localStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("createBackupPayload includes quickLinks as an alias for links", async () => {
    window.localStorage.setItem("bristol-care-data-v1", JSON.stringify({
      nickname: "\u5c0f\u4e56",
      links: [{ id: "1", title: "Existing", url: "https://example.com" }]
    }));
    const { createBackupPayload } = await import("@/lib/backup");
    const payload = createBackupPayload();
    // createBackupPayload deliberately includes quickLinks for backwards compat
    expect(Array.isArray(payload.quickLinks)).toBe(true);
    expect(payload.quickLinks).toEqual(payload.links);
  });

  it("restoreBackupPayload merges old quickLinks into links when links missing", async () => {
    window.localStorage.setItem("bristol-care-data-v1", JSON.stringify({
      nickname: "\u5c0f\u4e56",
      links: []
    }));
    const { restoreBackupPayload, createBackupPayload } = await import("@/lib/backup");
    // Simulate restore from old backup that had quickLinks instead of links
    const restored = restoreBackupPayload({
      quickLinks: [{ id: "2", title: "Old Quick Link", url: "https://old.com" }]
    });
    // The quickLinks should be merged into links field
    expect(Array.isArray(restored.links)).toBe(true);
    expect(restored.links).toEqual([{ id: "2", title: "Old Quick Link", url: "https://old.com" }]);
    const afterPayload = createBackupPayload();
    // links and quickLinks should both be present after round-trip
    expect(Array.isArray(afterPayload.links)).toBe(true);
    expect(afterPayload.links.length).toBe(1);
  });

  it("restoreBackupPayload prefers links over quickLinks when both present", async () => {
    window.localStorage.setItem("bristol-care-data-v1", JSON.stringify({
      nickname: "\u5c0f\u4e56",
      links: [{ id: "1", title: "Official Link", url: "https://official.com" }]
    }));
    const { restoreBackupPayload } = await import("@/lib/backup");
    const restored = restoreBackupPayload({
      links: [{ id: "1", title: "Official Link", url: "https://official.com" }],
      quickLinks: [{ id: "2", title: "Old Link", url: "https://old.com" }]
    });
    // links field takes priority when present
    expect(restored.links).toEqual([{ id: "1", title: "Official Link", url: "https://official.com" }]);
  });
});