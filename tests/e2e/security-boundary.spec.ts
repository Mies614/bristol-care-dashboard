import { test, expect } from "./fixtures";

test.describe("Security boundary API guards", () => {
  test("unknown space code is rejected before database access", async ({ request }) => {
    const res = await request.get(
      "/api/comments?spaceCode=not-the-configured-space&contentType=note&contentId=sample-love-note-1",
    );
    expect(res.status()).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ code: "SPACE_CODE_FORBIDDEN" });
  });

  test("write API rejects missing Origin", async ({ request }) => {
    const res = await request.post("/api/comments", {
      data: {
        contentType: "note",
        contentId: "sample-love-note-1",
        body: "hello",
      },
    });
    expect(res.status()).toBe(403);
  });

  test("partner route cannot forge owner identity", async ({ request }) => {
    const res = await request.post("/api/comments", {
      headers: {
        Origin: "http://localhost:3000",
        Referer: "http://localhost:3000/notes",
      },
      data: {
        contentType: "note",
        contentId: "sample-love-note-1",
        body: "hello",
        identity: "me",
      },
    });
    expect(res.status()).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ ok: false });
  });

  test("client cannot pass admin role as public request identity", async ({ request }) => {
    const res = await request.post("/api/comments", {
      headers: {
        Origin: "http://localhost:3000",
        Referer: "http://localhost:3000/notes",
      },
      data: {
        contentType: "note",
        contentId: "sample-love-note-1",
        body: "hello",
        identity: "admin",
      },
    });
    expect(res.status()).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ ok: false });
  });
});
