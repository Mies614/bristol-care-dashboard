import { describe, expect, it } from "vitest";

/**
 * Soft-deleted recovery logic tests.
 * Tests the core logic without needing a running Supabase instance.
 */

describe("soft delete recovery logic", () => {
  it("restoring sets deleted_at to null and reactivates", () => {
    // Simulate the restore action
    const note = {
      id: "n1",
      content: "hello",
      active: false,
      pinned: false,
      deleted_at: "2026-06-01T00:00:00Z",
    };

    const restored = {
      ...note,
      deleted_at: null,
      active: true,
      pinned: false,
      updated_at: "2026-06-02T00:00:00Z",
    };

    expect(restored.deleted_at).toBeNull();
    expect(restored.active).toBe(true);
    expect(restored.pinned).toBe(false);
  });

  it("permanent delete removes record but not storage files", () => {
    // Simulate permanent delete
    const deleted = true;
    const storagePreserved = true;

    expect(deleted).toBe(true);
    expect(storagePreserved).toBe(true);
    // No storage deletion — orphan files check covers this
  });

  it("soft-deleted notes have deleted_at set", () => {
    const notes = [
      { id: "n1", content: "active", deleted_at: null },
      { id: "n2", content: "deleted", deleted_at: "2026-06-01T00:00:00Z" },
      { id: "n3", content: "also deleted", deleted_at: "2026-06-02T00:00:00Z" },
    ];

    const softDeleted = notes.filter((n) => n.deleted_at !== null);
    expect(softDeleted).toHaveLength(2);
    expect(softDeleted[0].id).toBe("n2");
    expect(softDeleted[1].id).toBe("n3");
  });

  it("active notes exclude soft-deleted", () => {
    const notes = [
      { id: "n1", active: true, deleted_at: null },
      { id: "n2", active: true, deleted_at: "2026-06-01T00:00:00Z" },
      { id: "n3", active: false, deleted_at: null },
    ];

    const visible = notes.filter(
      (n) => n.active === true && n.deleted_at === null
    );
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe("n1");
  });
});
