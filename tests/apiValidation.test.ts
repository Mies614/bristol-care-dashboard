/**
 * API input validation tests.
 * Verifies Zod schemas reject invalid input and accept valid input.
 */
import { describe, it, expect } from "vitest";
import {
  postCommentSchema,
  postInteractionSchema,
  adminLoginSchema,
  safeParseBody,
  contentIdSchema,
  MAX_COMMENT_LENGTH,
} from "@/lib/apiSchemas";

describe("comment schema", () => {
  it("accepts a valid comment", () => {
    const result = postCommentSchema.safeParse({
      contentType: "note",
      contentId: "abc-123-def",
      body: "Great note!",
    });
    expect(result.success).toBe(true);
  });

  it("accepts non-UUID contentId", () => {
    const result = postCommentSchema.safeParse({
      contentType: "note",
      contentId: "custom-non-uuid-id-123",
      body: "Valid",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing contentType", () => {
    const result = postCommentSchema.safeParse({
      contentId: "abc",
      body: "Valid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid contentType", () => {
    const result = postCommentSchema.safeParse({
      contentType: "invalid_type",
      contentId: "abc",
      body: "Valid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty body", () => {
    const result = postCommentSchema.safeParse({
      contentType: "note",
      contentId: "abc",
      body: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects body exceeding MAX_COMMENT_LENGTH", () => {
    const result = postCommentSchema.safeParse({
      contentType: "note",
      contentId: "abc",
      body: "a".repeat(MAX_COMMENT_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("rejects body with only whitespace", () => {
    const result = postCommentSchema.safeParse({
      contentType: "note",
      contentId: "abc",
      body: "   ",
    });
    expect(result.success).toBe(false);
  });
});

describe("interaction schema", () => {
  it("accepts a valid like interaction", () => {
    const result = postInteractionSchema.safeParse({
      contentType: "note",
      contentId: "abc",
      interactionType: "like",
    });
    expect(result.success).toBe(true);
  });

  it("accepts non-UUID contentId", () => {
    const result = postInteractionSchema.safeParse({
      contentType: "album",
      contentId: "my-custom-album-1",
      interactionType: "like",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid interactionType", () => {
    const result = postInteractionSchema.safeParse({
      contentType: "note",
      contentId: "abc",
      interactionType: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects reaction without reaction value", () => {
    const result = postInteractionSchema.safeParse({
      contentType: "note",
      contentId: "abc",
      interactionType: "reaction",
      // missing reaction field
    });
    expect(result.success).toBe(false);
  });

  it("accepts reaction with valid reaction value", () => {
    const result = postInteractionSchema.safeParse({
      contentType: "note",
      contentId: "abc",
      interactionType: "reaction",
      reaction: "heart",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid reaction value", () => {
    const result = postInteractionSchema.safeParse({
      contentType: "note",
      contentId: "abc",
      interactionType: "reaction",
      reaction: "invalid_reaction",
    });
    expect(result.success).toBe(false);
  });
});

describe("admin login schema", () => {
  it("accepts valid password", () => {
    const result = adminLoginSchema.safeParse({ password: "my-secret" });
    expect(result.success).toBe(true);
  });

  it("rejects empty password", () => {
    const result = adminLoginSchema.safeParse({ password: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing password field", () => {
    const result = adminLoginSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects overly long password", () => {
    const result = adminLoginSchema.safeParse({ password: "a".repeat(201) });
    expect(result.success).toBe(false);
  });
});

describe("contentId schema", () => {
  it("accepts UUID format", () => {
    const result = contentIdSchema.safeParse("550e8400-e29b-41d4-a716-446655440000");
    expect(result.success).toBe(true);
  });

  it("accepts non-UUID text", () => {
    const result = contentIdSchema.safeParse("note-custom-id-123");
    expect(result.success).toBe(true);
  });

  it("accepts simple numeric string", () => {
    const result = contentIdSchema.safeParse("12345");
    expect(result.success).toBe(true);
  });

  it("rejects empty contentId", () => {
    const result = contentIdSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects overly long contentId", () => {
    const result = contentIdSchema.safeParse("x".repeat(201));
    expect(result.success).toBe(false);
  });
});

describe("safeParseBody", () => {
  it("returns parsed data for valid input", () => {
    const result = safeParseBody(postCommentSchema, {
      contentType: "note",
      contentId: "abc",
      body: "Hello",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.body).toBe("Hello");
    }
  });

  it("returns error for invalid input", () => {
    const result = safeParseBody(postCommentSchema, {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeTruthy();
    }
  });

  it("returns error for non-object body", () => {
    const result = safeParseBody(postCommentSchema, "not an object");
    expect(result.ok).toBe(false);
  });
});
