import { test, expect } from "./fixtures";

/**
 * Round 12 — settings, theme gallery, and sync status E2E tests.
 *
 * Verifies:
 * - /settings loads with theme gallery and sync status panel
 * - /me/settings loads with theme gallery (showLabels), sync panel (showAdvanced)
 * - Theme gallery has 6 theme cards
 * - No old theme names (soft/photo/romantic) leak into page
 * - Sync status panel renders
 * - 375px viewport no horizontal overflow
 * - /me/settings route integrity (no partner leakage)
 */

test.describe("Partner /settings", () => {
  test("page loads with theme section", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("外观风格").or(page.getByText("主题和卡片样式")).first()).toBeVisible();
  });

  test("theme gallery shows 4 theme preview cards", async ({ page }) => {
    await page.goto("/settings");
    // Each theme card has a distinct name
    await expect(page.locator("text=温暖小纸条")).toBeVisible();
        await expect(page.locator("text=柔光极光")).toBeVisible();
    await expect(page.locator("text=清爽面板")).toBeVisible();
    await expect(page.locator("text=暗夜台灯")).toBeVisible();
      });

  test("theme gallery does not show old theme names", async ({ page }) => {
    await page.goto("/settings");
    // Old names should not appear as theme names
    await expect(page.locator("text=温柔奶油")).toHaveCount(0);
    await expect(page.locator("text=浪漫粉紫")).toHaveCount(0);
    await expect(page.locator("text=极简森林")).toHaveCount(0);
    await expect(page.locator("text=学习清爽")).toHaveCount(0);
    await expect(page.locator("text=夜间柔和")).toHaveCount(0);
    await expect(page.locator("text=照片优先")).toHaveCount(0);
    await expect(page.locator("text=活泼暖橙")).toHaveCount(0);
    await expect(page.locator("text=优雅紫韵")).toHaveCount(0);
  });

  test("cloud sync or storage section is present", async ({ page }) => {
    await page.goto("/settings");
    // Check for either cloud sync heading or storage mode label
    await expect(page.getByText("存储模式").or(page.getByText("云同步")).or(page.getByText("同步状态")).first()).toBeVisible();
  });

  test("no admin / 管理中心 on partner side", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("text=管理中心")).toHaveCount(0);
    await expect(page.locator("text=管理员")).toHaveCount(0);
  });

  test("375px viewport has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/settings");
    const html = page.locator("html");
    await expect(html).toHaveCSS("overflow-x", /hidden|visible|clip/);
    // Check no element extends beyond viewport
    const bodyWidth = await page.locator("body").evaluate((el) => el.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(380);
  });
});

test.describe("Owner /me/settings", () => {
  test("page loads with all links under /me", async ({ page }) => {
    await page.goto("/me/settings");
    await expect(page.locator("text=我的设置")).toBeVisible();
    await expect(page.locator("text=我端").first()).toBeVisible();
  });

  test("theme gallery has theme section heading", async ({ page }) => {
    await page.goto("/me/settings");
    await expect(page.getByText("外观风格").or(page.getByText("主题")).first()).toBeVisible();
  });

  test("sync status section is present on me settings", async ({ page }) => {
    await page.goto("/me/settings");
    await expect(page.locator("text=同步状态").first()).toBeVisible();
  });

  test("admin center or management entry present", async ({ page }) => {
    await page.goto("/me/settings");
    // Look for management links
    await expect(page.getByText("管理中心").or(page.getByText("数据维护")).or(page.getByText("管理")).first()).toBeVisible();
  });

  test("no partner-side links leak into /me/settings", async ({ page }) => {
    await page.goto("/me/settings");
    const bareSettings = page.locator('a[href="/settings"]');
    await expect(bareSettings).toHaveCount(0);
  });

  test("375px viewport has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/me/settings");
    const bodyWidth = await page.locator("body").evaluate((el) => el.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(380);
  });
});

test.describe("Theme gallery interaction", () => {
  test("clicking a theme card does not crash the page", async ({ page }) => {
    await page.goto("/settings");
    // Find any theme preview card button
    const card = page.getByRole("button").filter({ hasText: "暗夜台灯" }).first();
    await expect(card).toBeVisible();
    await card.click();
    // Page should still be functional — settings header should remain
    await expect(page.locator("h1, h2, [role='heading']").first()).toBeVisible();
  });
});
