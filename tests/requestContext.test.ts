import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { resolveRequestContext } from "@/lib/security/requestContext";

const originalEnv = { ...process.env };

describe("requestContext", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "test";
    process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE = "xiaoguai520";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("defaults missing space code to the configured server space", () => {
    const req = new Request("http://localhost:3000/api/comments", {
      headers: {
        origin: "http://localhost:3000",
        referer: "http://localhost:3000/notes",
      },
    });
    const result = resolveRequestContext(req, {}, { requireOrigin: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.spaceCode).toBe("xiaoguai520");
      expect(result.context.identity).toBe("xiaoguai");
      expect(result.context.side).toBe("partner");
    }
  });

  it("rejects unknown client-selected space code", async () => {
    const req = new Request("http://localhost:3000/api/comments", {
      headers: {
        origin: "http://localhost:3000",
        referer: "http://localhost:3000/notes",
      },
    });
    const result = resolveRequestContext(req, { spaceCode: "other-space" }, { requireOrigin: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      await expect(result.response.json()).resolves.toMatchObject({ code: "SPACE_CODE_FORBIDDEN" });
    }
  });

  it("derives owner identity from /me referer", () => {
    const req = new Request("http://localhost:3000/api/comments", {
      headers: {
        origin: "http://localhost:3000",
        referer: "http://localhost:3000/me/notes",
      },
    });
    const result = resolveRequestContext(req, { identity: "me" }, { requireOrigin: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.identity).toBe("me");
      expect(result.context.side).toBe("owner");
    }
  });

  it("rejects client-forged owner identity from partner referer", async () => {
    const req = new Request("http://localhost:3000/api/comments", {
      headers: {
        origin: "http://localhost:3000",
        referer: "http://localhost:3000/notes",
      },
    });
    const result = resolveRequestContext(req, { identity: "me" }, { requireOrigin: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      await expect(result.response.json()).resolves.toMatchObject({ code: "IDENTITY_CONTEXT_FORBIDDEN" });
    }
  });

  it("rejects missing origin on write contexts", () => {
    const req = new Request("http://localhost:3000/api/comments", {
      headers: { referer: "http://localhost:3000/notes" },
    });
    const result = resolveRequestContext(req, {}, { requireOrigin: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });
});
