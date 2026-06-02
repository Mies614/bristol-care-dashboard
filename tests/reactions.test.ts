import { describe, expect, it, beforeEach, vi } from "vitest";

function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe("reactions", () => {
  beforeEach(() => {
    vi.resetModules();
    const storage = makeStorage();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("localStorage", storage);
  });

  it("adds a reaction and returns count", async () => {
    const { addReaction, hasReaction } = await import("@/lib/reactions");
    const count = addReaction("note-1", "heart");
    expect(count).toBe(1);
    expect(hasReaction("note-1", "heart")).toBe(true);
  });

  it("removes a reaction and returns count", async () => {
    const { addReaction, removeReaction, hasReaction } = await import("@/lib/reactions");
    addReaction("note-1", "heart");
    const count = removeReaction("note-1", "heart");
    expect(count).toBe(0);
    expect(hasReaction("note-1", "heart")).toBe(false);
  });

  it("does not double-count same user", async () => {
    const { addReaction } = await import("@/lib/reactions");
    expect(addReaction("note-1", "heart")).toBe(1);
    expect(addReaction("note-1", "heart")).toBe(1); // Same user, no change
  });

  it("returns reaction counts for a note", async () => {
    const { addReaction, getReactionsForNote } = await import("@/lib/reactions");
    addReaction("note-1", "heart");
    addReaction("note-1", "hug");

    const reactions = getReactionsForNote("note-1");
    const heart = reactions.find((r) => r.id === "heart")!;
    const hug = reactions.find((r) => r.id === "hug")!;
    const night = reactions.find((r) => r.id === "night")!;

    expect(heart.count).toBe(1);
    expect(heart.active).toBe(true);
    expect(hug.count).toBe(1);
    expect(hug.active).toBe(true);
    expect(night.count).toBe(0);
    expect(night.active).toBe(false);
  });

  it("getTotalReactionCount sums all reactions", async () => {
    const { addReaction, getTotalReactionCount } = await import("@/lib/reactions");
    expect(getTotalReactionCount("note-1")).toBe(0);
    addReaction("note-1", "heart");
    addReaction("note-1", "hug");
    expect(getTotalReactionCount("note-1")).toBe(2);
  });

  it("reactions persist across reloads", async () => {
    const { addReaction } = await import("@/lib/reactions");
    addReaction("note-1", "heart");

    vi.resetModules();
    const { hasReaction } = await import("@/lib/reactions");
    expect(hasReaction("note-1", "heart")).toBe(true);
  });

  it("does not crash when localStorage unavailable", async () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("localStorage", undefined);
    vi.resetModules();

    const { addReaction, removeReaction, getReactionsForNote } = await import("@/lib/reactions");
    expect(() => addReaction("n1", "heart")).not.toThrow();
    expect(() => removeReaction("n1", "heart")).not.toThrow();
    const reactions = getReactionsForNote("n1");
    expect(reactions).toHaveLength(3);
    expect(reactions.every((r) => r.count === 0)).toBe(true);
  });
});
