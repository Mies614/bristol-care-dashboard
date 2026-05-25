import { describe, expect, it } from "vitest";
import { getLoveNotePatchUpdate, shouldResetOtherPinnedNotes } from "@/lib/loveNoteActions";

describe("love note patch actions", () => {
  it("deactivate sets active false and pinned false", () => {
    expect(getLoveNotePatchUpdate({ action: "deactivate" })).toEqual({ active: false, pinned: false });
  });

  it("delete sets active false and pinned false", () => {
    expect(getLoveNotePatchUpdate({ action: "delete" })).toEqual({ active: false, pinned: false });
  });

  it("set_active true enables the note", () => {
    expect(getLoveNotePatchUpdate({ action: "set_active", active: true })).toEqual({ active: true });
  });

  it("set_pinned true makes current note active and pinned", () => {
    expect(getLoveNotePatchUpdate({ action: "set_pinned", pinned: true })).toEqual({ active: true, pinned: true });
  });

  it("set_pinned true resets other pinned notes", () => {
    expect(shouldResetOtherPinnedNotes("set_pinned", true, false)).toBe(true);
  });

  it("set_pinned false unpins current note only", () => {
    expect(getLoveNotePatchUpdate({ action: "set_pinned", pinned: false })).toEqual({ pinned: false });
    expect(shouldResetOtherPinnedNotes("set_pinned", false, true)).toBe(false);
  });

  it("toggle_pinned uses current pinned state", () => {
    expect(getLoveNotePatchUpdate({ action: "toggle_pinned", current: { active: true, pinned: false } })).toEqual({ active: true, pinned: true });
    expect(getLoveNotePatchUpdate({ action: "toggle_pinned", current: { active: true, pinned: true } })).toEqual({ pinned: false });
  });
});
