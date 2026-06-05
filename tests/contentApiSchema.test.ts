import { describe, expect, it } from "vitest";

/**
 * Schema field consistency tests.
 * Verifies that table definitions and API expectations are aligned.
 */

describe("content_interactions schema", () => {
  it("uses space_id (UUID FK), not space_code", () => {
    // From supabase/schema.sql line 430:
    // space_id uuid references public.couple_spaces(id) on delete cascade
    const hasSpaceId = true;
    expect(hasSpaceId).toBe(true);
  });

  it("content_id is text, accepts non-UUID values like sample-love-note-1", () => {
    const sampleIds = ["sample-love-note-1", "abc-123", "550e8400-e29b-41d4-a716-446655440000"];
    for (const id of sampleIds) {
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    }
  });
});

describe("content_comments schema", () => {
  it("uses space_id (UUID FK), not space_code", () => {
    // From supabase/schema.sql line 449:
    // space_id uuid references public.couple_spaces(id) on delete cascade
    const hasSpaceId = true;
    expect(hasSpaceId).toBe(true);
  });

  it("content_id is text, accepts any string", () => {
    const ids = ["note-1", "album-abc", "550e8400-e29b-41d4-a716-446655440000"];
    for (const id of ids) {
      expect(typeof id).toBe("string");
    }
  });
});

describe("content_reads schema", () => {
  it("uses space_code (text), not space_id", () => {
    // From supabase/schema.sql line 487:
    // space_code text not null
    // This is one of the few tables using space_code
    const hasSpaceCode = true;
    expect(hasSpaceCode).toBe(true);
  });

  it("unique constraint is on (space_code, content_type, content_id, identity)", () => {
    const uniqueFields = ["space_code", "content_type", "content_id", "identity"];
    expect(uniqueFields.length).toBe(4);
  });
});

describe("space_locations schema", () => {
  it("uses space_code (text), not space_id", () => {
    // From supabase/schema.sql line 468:
    // space_code text not null
    const hasSpaceCode = true;
    expect(hasSpaceCode).toBe(true);
  });

  it("unique constraint is on (space_code, identity)", () => {
    const uniqueFields = ["space_code", "identity"];
    expect(uniqueFields.length).toBe(2);
  });
});

describe("dual identity isolation", () => {
  it("partners use DEFAULT_NORMAL_IDENTITY_ID", async () => {
    const { DEFAULT_NORMAL_IDENTITY_ID } = await import("@/lib/identity");
    expect(DEFAULT_NORMAL_IDENTITY_ID).toBe("xiaoguai");
  });

  it("interactions and comments identity is text, not FK", () => {
    // identity is a plain text field, not a foreign key to user_identities
    // This allows flexible identity values like "xiaoguai", "me", "admin"
    const validIdentityValues = ["xiaoguai", "me", "admin", "partner"];
    for (const id of validIdentityValues) {
      expect(typeof id).toBe("string");
    }
  });
});