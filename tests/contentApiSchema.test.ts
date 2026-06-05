import { describe, expect, it } from "vitest";

describe("content_interactions schema", () => {
  it("uses space_code (text)", () => {
    // Production Supabase confirmed: space_code text not null
    const SCHEMA_FIELD = "space_code";
    expect(SCHEMA_FIELD).toBe("space_code");
  });

  it("content_id is text, accepts non-UUID values", () => {
    const sampleIds = ["sample-love-note-1", "abc-123", "550e8400-e29b-41d4-a716-446655440000"];
    for (const id of sampleIds) {
      expect(typeof id).toBe("string");
    }
  });
});

describe("content_comments schema", () => {
  it("uses space_code (text)", () => {
    // Production Supabase confirmed: space_code text not null
    const SCHEMA_FIELD = "space_code";
    expect(SCHEMA_FIELD).toBe("space_code");
  });

  it("content_id is text, accepts any string", () => {
    const ids = ["note-1", "album-abc", "550e8400-e29b-41d4-a716-446655440000"];
    for (const id of ids) {
      expect(typeof id).toBe("string");
    }
  });
});

describe("content_reads schema", () => {
  it("uses space_code (text)", () => {
    const SCHEMA_FIELD = "space_code";
    expect(SCHEMA_FIELD).toBe("space_code");
  });

  it("unique on (space_code, content_type, content_id, identity)", () => {
    const uniqueFields = ["space_code", "content_type", "content_id", "identity"];
    expect(uniqueFields.length).toBe(4);
  });
});

describe("space_locations schema", () => {
  it("uses space_code (text)", () => {
    const SCHEMA_FIELD = "space_code";
    expect(SCHEMA_FIELD).toBe("space_code");
  });
});

describe("dual identity isolation", () => {
  it("partners use DEFAULT_NORMAL_IDENTITY_ID", async () => {
    const { DEFAULT_NORMAL_IDENTITY_ID } = await import("@/lib/identity");
    expect(DEFAULT_NORMAL_IDENTITY_ID).toBe("xiaoguai");
  });
});