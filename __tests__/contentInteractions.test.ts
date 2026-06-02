/**
 * Unit tests for lib/contentInteractions.ts — pure-function interaction service.
 */

import { describe, it, expect } from "vitest";
import {
  countReads,
  hasReadIdentity,
  countLikes,
  hasLikedIdentity,
  getReactionCounts,
  hasReactionIdentity,
  getReactionSummary,
  filterActiveComments,
  countComments,
  buildCommentEntries,
  buildInteractionSummary,
  mergeInteractions,
  mergeComments,
} from "@/lib/contentInteractions";
import type { ContentInteraction, ContentComment } from "@/lib/contentInteractions";

// ─── Test data factories ───

function makeInteraction(overrides: Partial<ContentInteraction> = {}): ContentInteraction {
  return {
    id: "i1",
    contentType: "note",
    contentId: "note-1",
    identity: "xiaoguai",
    interactionType: "read",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeComment(overrides: Partial<ContentComment> = {}): ContentComment {
  return {
    id: "c1",
    contentType: "note",
    contentId: "note-1",
    identity: "xiaoguai",
    body: "Hello!",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

const SUPPORTED_REACTIONS = [
  { id: "heart", emoji: "❤️", label: "心动" },
  { id: "laugh", emoji: "😂", label: "哈哈" },
  { id: "cry", emoji: "😢", label: "感动" },
];

// ══════════════════════════════════════════════════════════════════════
// countReads
// ══════════════════════════════════════════════════════════════════════

describe("countReads", () => {
  it("returns 0 for empty interactions", () => {
    expect(countReads([], "note", "note-1")).toBe(0);
  });

  it("counts only read interactions for matching content", () => {
    const interactions = [
      makeInteraction({ interactionType: "read" }),
      makeInteraction({ id: "i2", identity: "admin", interactionType: "read" }),
      makeInteraction({ id: "i3", interactionType: "like" }),
      makeInteraction({ id: "i4", contentType: "album", contentId: "album-1", interactionType: "read" }),
    ];
    expect(countReads(interactions, "note", "note-1")).toBe(2);
  });

  it("returns 0 when no reads match", () => {
    const interactions = [
      makeInteraction({ interactionType: "like" }),
      makeInteraction({ interactionType: "reaction", reaction: "heart" }),
    ];
    expect(countReads(interactions, "note", "note-1")).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
// hasReadIdentity
// ══════════════════════════════════════════════════════════════════════

describe("hasReadIdentity", () => {
  it("returns false when no read from identity", () => {
    expect(hasReadIdentity([], "note", "note-1", "xiaoguai")).toBe(false);
  });

  it("returns true when identity has read", () => {
    const interactions = [
      makeInteraction({ interactionType: "like" }),
      makeInteraction({ id: "i2", interactionType: "read" }),
    ];
    expect(hasReadIdentity(interactions, "note", "note-1", "xiaoguai")).toBe(true);
  });

  it("returns false for different identity", () => {
    const interactions = [makeInteraction({ interactionType: "read", identity: "admin" })];
    expect(hasReadIdentity(interactions, "note", "note-1", "xiaoguai")).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════
// countLikes
// ══════════════════════════════════════════════════════════════════════

describe("countLikes", () => {
  it("counts like interactions", () => {
    const interactions = [
      makeInteraction({ interactionType: "like" }),
      makeInteraction({ id: "i2", identity: "admin", interactionType: "like" }),
      makeInteraction({ id: "i3", interactionType: "read" }),
    ];
    expect(countLikes(interactions, "note", "note-1")).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════════════
// hasLikedIdentity
// ══════════════════════════════════════════════════════════════════════

describe("hasLikedIdentity", () => {
  it("returns true when identity has liked", () => {
    const interactions = [makeInteraction({ interactionType: "like" })];
    expect(hasLikedIdentity(interactions, "note", "note-1", "xiaoguai")).toBe(true);
  });

  it("returns false when identity has not liked", () => {
    const interactions = [makeInteraction({ interactionType: "read" })];
    expect(hasLikedIdentity(interactions, "note", "note-1", "xiaoguai")).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════
// getReactionCounts
// ══════════════════════════════════════════════════════════════════════

describe("getReactionCounts", () => {
  it("returns empty object for no reactions", () => {
    expect(getReactionCounts([], "note", "note-1")).toEqual({});
  });

  it("counts reactions grouped by type", () => {
    const interactions = [
      makeInteraction({ id: "r1", interactionType: "reaction", reaction: "heart" }),
      makeInteraction({ id: "r2", identity: "admin", interactionType: "reaction", reaction: "heart" }),
      makeInteraction({ id: "r3", interactionType: "reaction", reaction: "laugh" }),
      makeInteraction({ id: "r4", interactionType: "reaction", reaction: "heart" }), // same user, second heart — should be separate if different id
    ];
    const counts = getReactionCounts(interactions, "note", "note-1");
    expect(counts.heart).toBe(3); // r1 + r2 + r4
    expect(counts.laugh).toBe(1);
  });

  it("ignores interactions without reaction value", () => {
    const interactions = [
      makeInteraction({ id: "r1", interactionType: "reaction", reaction: undefined } as ContentInteraction),
      makeInteraction({ id: "r2", interactionType: "reaction", reaction: "heart" }),
    ];
    const counts = getReactionCounts(interactions, "note", "note-1");
    expect(counts.heart).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════
// hasReactionIdentity
// ══════════════════════════════════════════════════════════════════════

describe("hasReactionIdentity", () => {
  it("returns true when identity has the reaction", () => {
    const interactions = [makeInteraction({ interactionType: "reaction", reaction: "heart" })];
    expect(hasReactionIdentity(interactions, "note", "note-1", "xiaoguai", "heart")).toBe(true);
  });

  it("returns false when identity has a different reaction", () => {
    const interactions = [makeInteraction({ interactionType: "reaction", reaction: "heart" })];
    expect(hasReactionIdentity(interactions, "note", "note-1", "xiaoguai", "laugh")).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════
// getReactionSummary
// ══════════════════════════════════════════════════════════════════════

describe("getReactionSummary", () => {
  it("returns summary with zero counts for supported reactions", () => {
    const summary = getReactionSummary([], "note", "note-1", "xiaoguai", SUPPORTED_REACTIONS);
    expect(summary).toEqual([
      { reaction: "heart", count: 0, active: false },
      { reaction: "laugh", count: 0, active: false },
      { reaction: "cry", count: 0, active: false },
    ]);
  });

  it("marks active reactions for the given identity", () => {
    const interactions = [
      makeInteraction({ id: "r1", interactionType: "reaction", reaction: "heart" }),
      makeInteraction({ id: "r2", interactionType: "reaction", reaction: "heart" }),
      makeInteraction({ id: "r3", interactionType: "reaction", reaction: "laugh" }),
      makeInteraction({ id: "r4", identity: "admin", interactionType: "reaction", reaction: "heart" }),
    ];
    const summary = getReactionSummary(interactions, "note", "note-1", "xiaoguai", SUPPORTED_REACTIONS);
    expect(summary.find((s) => s.reaction === "heart")).toEqual({
      reaction: "heart",
      count: 3,
      active: true,
    });
    expect(summary.find((s) => s.reaction === "laugh")).toEqual({
      reaction: "laugh",
      count: 1,
      active: true,
    });
    expect(summary.find((s) => s.reaction === "cry")).toEqual({
      reaction: "cry",
      count: 0,
      active: false,
    });
  });
});

// ══════════════════════════════════════════════════════════════════════
// filterActiveComments
// ══════════════════════════════════════════════════════════════════════

describe("filterActiveComments", () => {
  it("returns only non-deleted comments for matching content", () => {
    const comments = [
      makeComment({ id: "c1" }),
      makeComment({ id: "c2", deletedAt: "2025-01-02T00:00:00Z" }),
      makeComment({ id: "c3" }),
      makeComment({ id: "c4", contentType: "album", contentId: "album-1" }),
    ];
    const active = filterActiveComments(comments, "note", "note-1");
    expect(active).toHaveLength(2);
    expect(active.map((c) => c.id).sort()).toEqual(["c1", "c3"]);
  });
});

// ══════════════════════════════════════════════════════════════════════
// countComments
// ══════════════════════════════════════════════════════════════════════

describe("countComments", () => {
  it("counts only active comments", () => {
    const comments = [
      makeComment(),
      makeComment({ id: "c2", deletedAt: "2025-01-02T00:00:00Z" }),
    ];
    expect(countComments(comments, "note", "note-1")).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════
// buildCommentEntries
// ══════════════════════════════════════════════════════════════════════

describe("buildCommentEntries", () => {
  it("returns entries sorted by createdAt ascending", () => {
    const comments = [
      makeComment({ id: "c2", createdAt: "2025-02-01T00:00:00Z" }),
      makeComment({ id: "c1", createdAt: "2025-01-01T00:00:00Z" }),
    ];
    const entries = buildCommentEntries(comments, "note", "note-1", "xiaoguai");
    expect(entries.map((e) => e.id)).toEqual(["c1", "c2"]);
  });

  it("marks isMine and isDeleted correctly", () => {
    const comments = [
      makeComment({ id: "c1", identity: "xiaoguai" }),
      makeComment({ id: "c2", identity: "admin", deletedAt: "2025-01-02T00:00:00Z" }),
    ];
    const entries = buildCommentEntries(comments, "note", "note-1", "xiaoguai");
    expect(entries[0].isMine).toBe(true);
    expect(entries[0].isDeleted).toBe(false);
    expect(entries[1].isMine).toBe(false);
    expect(entries[1].isDeleted).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════
// buildInteractionSummary
// ══════════════════════════════════════════════════════════════════════

describe("buildInteractionSummary", () => {
  it("builds complete summary", () => {
    const interactions = [
      makeInteraction({ id: "i1", interactionType: "read" }),
      makeInteraction({ id: "i2", interactionType: "like" }),
      makeInteraction({ id: "i3", identity: "admin", interactionType: "like" }),
      makeInteraction({ id: "i4", interactionType: "reaction", reaction: "heart" }),
    ];
    const comments = [makeComment(), makeComment({ id: "c2" })];
    const summary = buildInteractionSummary(
      interactions,
      comments,
      "note",
      "note-1",
      "xiaoguai",
      SUPPORTED_REACTIONS
    );

    expect(summary.readCount).toBe(1);
    expect(summary.hasRead).toBe(true);
    expect(summary.likeCount).toBe(2);
    expect(summary.hasLiked).toBe(true);
    expect(summary.commentCount).toBe(2);

    const heartReaction = summary.reactions.find((r) => r.reaction === "heart");
    expect(heartReaction?.count).toBe(1);
    expect(heartReaction?.active).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════
// mergeInteractions
// ══════════════════════════════════════════════════════════════════════

describe("mergeInteractions", () => {
  it("keeps remote and adds unique local interactions", () => {
    const remote = [makeInteraction({ id: "r1", interactionType: "read" })];
    const local = [makeInteraction({ id: "l1", interactionType: "like" })];
    const merged = mergeInteractions(remote, local);
    expect(merged).toHaveLength(2);
  });

  it("deduplicates local interactions that already exist remotely", () => {
    const remote = [makeInteraction({ id: "r1", contentType: "note", contentId: "n1", identity: "x", interactionType: "read" })];
    const local = [
      makeInteraction({ id: "l1", contentType: "note", contentId: "n1", identity: "x", interactionType: "read" }),
      makeInteraction({ id: "l2", contentType: "note", contentId: "n2", identity: "x", interactionType: "like" }),
    ];
    const merged = mergeInteractions(remote, local);
    expect(merged).toHaveLength(2);
    expect(merged.map((i) => i.id).sort()).toEqual(["l2", "r1"]);
  });

  it("deduplicates by reaction as well", () => {
    const remote = [
      makeInteraction({ id: "r1", interactionType: "reaction", reaction: "heart" }),
    ];
    const local = [
      makeInteraction({ id: "l1", interactionType: "reaction", reaction: "heart" }),
      makeInteraction({ id: "l2", interactionType: "reaction", reaction: "laugh" }),
    ];
    const merged = mergeInteractions(remote, local);
    expect(merged).toHaveLength(2);
    expect(merged.map((i) => i.id).sort()).toEqual(["l2", "r1"]);
  });
});

// ══════════════════════════════════════════════════════════════════════
// mergeComments
// ══════════════════════════════════════════════════════════════════════

describe("mergeComments", () => {
  it("keeps remote and adds unique local comments by id", () => {
    const remote = [makeComment({ id: "r1" })];
    const local = [makeComment({ id: "r1" }), makeComment({ id: "l1" })];
    const merged = mergeComments(remote, local);
    expect(merged).toHaveLength(2);
    expect(merged.map((c) => c.id).sort()).toEqual(["l1", "r1"]);
  });
});