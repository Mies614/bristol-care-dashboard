import { describe, expect, it } from "vitest";
import { getNotePatchUpdate } from "@/lib/noteActions";

describe("note actions", () => {
  it("updates content, mood and style", () => {
    const patch = getNotePatchUpdate({
      action: "update",
      current: { active: true, pinned: false },
      body: { content: "new", mood: "重要", display_style: "romantic" },
      now: "2026-05-25T00:00:00Z"
    });
    expect(patch).toMatchObject({ content: "new", mood: "重要", display_style: "romantic", updated_at: "2026-05-25T00:00:00Z" });
  });

  it("set_active false clears pinned", () => {
    const patch = getNotePatchUpdate({ action: "set_active", current: { active: true, pinned: true }, body: { active: false } });
    expect(patch).toMatchObject({ active: false, pinned: false });
  });

  it("delete soft deletes and clears visibility flags", () => {
    const patch = getNotePatchUpdate({ action: "delete", current: { active: true, pinned: true }, body: {}, now: "now" });
    expect(patch).toMatchObject({ active: false, pinned: false, deleted_at: "now" });
  });

  it("toggle_pinned flips pinned", () => {
    expect(getNotePatchUpdate({ action: "toggle_pinned", current: { active: true, pinned: false }, body: {} }).pinned).toBe(true);
    expect(getNotePatchUpdate({ action: "toggle_pinned", current: { active: true, pinned: true }, body: {} }).pinned).toBe(false);
  });
});
