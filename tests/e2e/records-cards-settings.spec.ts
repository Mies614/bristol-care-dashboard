import { test, expect } from "./fixtures";

/**
 * Round 5B — records/cards/settings side-aware page tests.
 *
 * Verifies:
 * - /me/records opens with all links under /me
 * - /me/cards shows admin link at /me/admin
 * - /settings (partner) does NOT show admin/管理中心
 * - /me/settings shows admin entry
 * - 375px viewport no horizontal overflow on key pages
 */

test.describe("Owner-side /me/records", () => {
  test("page loads and shows owner identity", async ({ page }) => {
    await page.goto("/me/records");
    await expect(page.locator("text=我的记录")).toBeVisible();
    await expect(page.locator("text=我端").first()).toBeVisible();
  });

  test("all tile links stay under /me", async ({ page }) => {
    await page.goto("/me/records");
    const links = page.locator("a[href^='/me']");
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(3);

    const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    for (const href of hrefs) {
      expect(href).toMatch(/^\/me/);
    }
  });

  test("no bare partner links leak into /me/records", async ({ page }) => {
    await page.goto("/me/records");
    const bareNotes = page.locator('a[href="/notes"]');
    await expect(bareNotes).toHaveCount(0);
    const bareCourses = page.locator('a[href="/courses"]');
    await expect(bareCourses).toHaveCount(0);
  });
});

test.describe("Owner-side /me/cards", () => {
  test("page loads and shows owner identity", async ({ page }) => {
    await page.goto("/me/cards");
    await expect(page.locator("text=我的卡夹")).toBeVisible();
    await expect(page.locator("text=我端").first()).toBeVisible();
  });

  test("admin center links to /me/admin", async ({ page }) => {
    await page.goto("/me/cards");
    const adminLink = page.locator('a[href="/me/admin"]');
    await expect(adminLink).toBeVisible();
  });

  test("no bare /admin link", async ({ page }) => {
    await page.goto("/me/cards");
    const bareAdmin = page.locator('a[href="/admin"]');
    await expect(bareAdmin).toHaveCount(0);
  });
});

test.describe("Partner-side /settings", () => {
  test("page loads with partner identity", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("text=小乖端")).toBeVisible();
  });

  test("does NOT show admin center language", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("text=管理中心")).toHaveCount(0);
    await expect(page.locator("text=数据维护")).toHaveCount(0);
  });

  test("no /me/admin link on partner settings", async ({ page }) => {
    await page.goto("/settings");
    const adminLink = page.locator('a[href="/me/admin"]');
    await expect(adminLink).toHaveCount(0);
  });
});

test.describe("Owner-side /me/settings", () => {
  test("page loads with owner identity", async ({ page }) => {
    await page.goto("/me/settings");
    await expect(page.locator("text=我的设置")).toBeVisible();
    await expect(page.locator("text=我端").first()).toBeVisible();
  });

  test("shows admin center entry", async ({ page }) => {
    await page.goto("/me/settings");
    await expect(page.getByRole("heading", { name: "管理中心" })).toBeVisible();
    const adminLink = page.locator('a[href="/me/admin"]');
    await expect(adminLink).toBeVisible();
  });
});

test.describe("Responsive — 375px viewport", () => {
  const mobileViewport = { width: 375, height: 812 };

  test("/me/records no horizontal overflow", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto("/me/records");
    await page.waitForLoadState("networkidle");
    const html = page.locator("html");
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("/me/cards no horizontal overflow", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto("/me/cards");
    await page.waitForLoadState("networkidle");
    const html = page.locator("html");
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("/me/settings no horizontal overflow", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto("/me/settings");
    await page.waitForLoadState("networkidle");
    const html = page.locator("html");
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
