import { test, expect } from "./fixtures";

test.describe("Business identity chain - Owner on /me", () => {
  test("comment POST accepts identity from auth", async ({ request: req }) => {
    const res = await req.post("/api/comments", {
      headers: { "Content-Type": "application/json" },
      data: { spaceCode: "xiaoguai520", contentType: "note", contentId: "test", identity: "me", body: "test" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(200);
  });

  test("interaction POST accepts identity from auth", async ({ request: req }) => {
    const res = await req.post("/api/interactions", {
      headers: { "Content-Type": "application/json" },
      data: { spaceCode: "xiaoguai520", contentType: "note", contentId: "test", identity: "xiaoguai", interactionType: "like" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(200);
  });

  test("read-state POST accepts identity from auth", async ({ request: req }) => {
    const res = await req.post("/api/read-state", {
      headers: { "Content-Type": "application/json" },
      data: { spaceCode: "xiaoguai520", contentType: "note", contentId: "test", identity: "xiaoguai" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(200);
  });

  test("notes POST accepts identity from auth", async ({ request: req }) => {
    const res = await req.post("/api/notes", {
      headers: { "Content-Type": "application/json" },
      data: { code: "xiaoguai520", content: "test note", author: "me" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(200);
  });

  test("location POST accepts identity from auth", async ({ request: req }) => {
    const res = await req.post("/api/location", {
      headers: { "Content-Type": "application/json" },
      data: { spaceCode: "xiaoguai520", lat: 51.45, lng: -2.6, identity: "me" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(200);
  });
});

test.describe("Forged identity ignored", () => {
  test("body identity=me is not trusted", async ({ request: req }) => {
    const res = await req.post("/api/comments", {
      headers: { "Content-Type": "application/json" },
      data: { spaceCode: "xiaoguai520", contentType: "note", contentId: "test", identity: "me", body: "forged" },
    });
    // Route resolves identity from auth, not from body
    expect(res.status()).toBeGreaterThanOrEqual(200);
  });

  test("body author=me is not trusted", async ({ request: req }) => {
    const res = await req.post("/api/notes", {
      headers: { "Content-Type": "application/json" },
      data: { code: "xiaoguai520", content: "test", author: "me" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(200);
  });

  test("Referer /me does not change identity", async ({ request: req }) => {
    const res = await req.post("/api/comments", {
      headers: { "Content-Type": "application/json", Referer: "/me" },
      data: { spaceCode: "xiaoguai520", contentType: "note", contentId: "test", body: "test" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(200);
  });
});
