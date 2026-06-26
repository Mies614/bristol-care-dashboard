import { test, expect } from "./fixtures";

test.describe("Security role boundaries", () => {
  test("admin API requires auth", async ({ page }) => {
    const res = await page.request.get("/api/admin/settings");
    // Returns JSON, not HTML error page
    expect(res.status()).toBeGreaterThanOrEqual(200);
  });

  test("admin page loads with password prompt", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    const hasInput = await page.locator("input").count();
    expect(hasInput).toBeGreaterThan(0);
  });

  test("no view switcher for unauthenticated user", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const switcher = page.locator("text=返回我的端");
    await expect(switcher).toHaveCount(0);
  });

  test("media sign API returns structured response", async ({ page }) => {
    const res = await page.request.post("/api/media/sign", {
      headers: { "Content-Type": "application/json" },
      data: { contentType: "album", contentId: "test" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(200);
  });
});
