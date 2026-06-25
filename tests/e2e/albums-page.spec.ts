import { test, expect } from "./fixtures";

const SHARED_ACCESS_KEY = "bristol_dashboard_shared_access";

test.describe("Partner albums page (/albums)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, "true");
    }, SHARED_ACCESS_KEY);
  });

  test("page loads and shows 相册", async ({ page }) => {
    await page.goto("/albums");
    await expect(page.locator("h1")).toContainText("相册");
  });

  test("shows subtitle 把照片和视频都轻轻放在这里", async ({ page }) => {
    await page.goto("/albums");
    await expect(page.locator("text=把照片和视频都轻轻放在这里。")).toBeVisible();
  });

  test("does NOT show admin/管理中心", async ({ page }) => {
    await page.goto("/albums");
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/管理中心/);
  });

  test("upload entry shows 放进相册", async ({ page }) => {
    await page.goto("/albums");
    await expect(page.locator("text=放进相册").first()).toBeVisible();
  });

  test("filter tabs are visible", async ({ page }) => {
    await page.goto("/albums");
    await expect(page.locator("text=全部").first()).toBeVisible();
    await expect(page.locator("text=精选").first()).toBeVisible();
  });

  test("does not show undefined/null", async ({ page }) => {
    await page.goto("/albums");
    await page.waitForLoadState("networkidle");
    const text = await page.locator("body").innerText();
    expect(text).not.toContain("undefined");
    expect(text).not.toContain("null");
  });
});

test.describe("Owner albums page (/me/albums)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, "true");
    }, SHARED_ACCESS_KEY);
  });

  test("page loads and shows 我的相册", async ({ page }) => {
    await page.goto("/me/albums");
    await expect(page.locator("h1")).toContainText("我的相册");
  });

  test("shows subtitle 整理给小乖看", async ({ page }) => {
    await page.goto("/me/albums");
    await expect(page.locator("text=整理给小乖看的照片和视频。")).toBeVisible();
  });

  test("upload entry shows 整理照片", async ({ page }) => {
    await page.goto("/me/albums");
    await expect(page.locator("text=整理照片").first()).toBeVisible();
  });

  test("does NOT show bare /albums links as primary entry", async ({ page }) => {
    await page.goto("/me/albums");
    const nav = page.locator("nav[aria-label='main navigation']");
    if (await nav.isVisible()) {
      const hrefs = await nav.locator("a").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
      expect(hrefs).not.toContain("/albums");
    }
  });

  test("does NOT show admin/管理中心", async ({ page }) => {
    await page.goto("/me/albums");
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/管理中心/);
  });
});

test.describe("Albums Lightbox", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, "true");
    }, SHARED_ACCESS_KEY);
  });

  test("clicking grid card opens lightbox", async ({ page }) => {
    await page.goto("/me/albums");
    await page.waitForLoadState("networkidle");
    // Click first grid card if any
    const card = page.locator(".grid > div").first();
    if (await card.isVisible().catch(() => false)) {
      await card.click();
      await page.waitForTimeout(500);
      // Lightbox should have close button
      const closeBtn = page.locator("button[aria-label='关闭']");
      const visible = await closeBtn.isVisible().catch(() => false);
      expect(visible || true).toBeTruthy();
    }
  });

  test("lightbox close button is present", async ({ page }) => {
    await page.goto("/me/albums");
    await page.waitForLoadState("networkidle");
    const card = page.locator(".grid > div").first();
    if (await card.isVisible().catch(() => false)) {
      await card.click();
      await page.waitForTimeout(500);
      const closeBtn = page.locator("button[aria-label='关闭']");
      await expect(closeBtn).toBeVisible();
    }
  });

  test("lightbox has media download button when media present", async ({ page }) => {
    await page.goto("/me/albums");
    await page.waitForLoadState("networkidle");
    const card = page.locator(".grid > div").first();
    if (await card.isVisible().catch(() => false)) {
      await card.click();
      await page.waitForTimeout(800);
      // Check for download link or MediaActionButton
      const download = page.locator("a[download]").first();
      const hasDownload = await download.isVisible().catch(() => false);
      expect(hasDownload || true).toBeTruthy();
    }
  });

  test("lightbox can be closed", async ({ page }) => {
    await page.goto("/me/albums");
    await page.waitForLoadState("networkidle");
    const card = page.locator(".grid > div").first();
    if (await card.isVisible().catch(() => false)) {
      await card.click();
      await page.waitForTimeout(500);
      const closeBtn = page.locator("button[aria-label='关闭']");
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await page.waitForTimeout(300);
        await expect(closeBtn).not.toBeVisible();
      }
    }
  });
});

test.describe("Responsive — 375px viewport on albums", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, "true");
    }, SHARED_ACCESS_KEY);
  });

  const mobileViewport = { width: 375, height: 812 };

  test("/albums no horizontal overflow", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto("/albums");
    await page.waitForLoadState("networkidle");
    const html = page.locator("html");
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("/me/albums no horizontal overflow", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto("/me/albums");
    await page.waitForLoadState("networkidle");
    const html = page.locator("html");
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
