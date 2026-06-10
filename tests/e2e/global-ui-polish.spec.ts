import { test, expect } from "@playwright/test";

const SHARED_ACCESS_KEY = "bristol_dashboard_shared_access";

/**
 * Round 10 — Global UI Polish E2E tests.
 * Verifies BottomNav side-aware visual, page rendering, 375px overflow.
 */

test.describe("BottomNav side-aware visual", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, "true");
    }, SHARED_ACCESS_KEY);
  });

  test("partner / has BottomNav with data-side=partner", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav[aria-label='main navigation']");
    await expect(nav).toBeVisible();
    const side = await nav.getAttribute("data-side");
    expect(side).toBe("partner");
  });

  test("owner /me has BottomNav with data-side=owner", async ({ page }) => {
    await page.goto("/me");
    const nav = page.locator("nav[aria-label='main navigation']");
    await expect(nav).toBeVisible();
    const side = await nav.getAttribute("data-side");
    expect(side).toBe("owner");
  });

  test("BottomNav items have aria-current", async ({ page }) => {
    await page.goto("/");
    const activeLink = page.locator("nav[aria-label='main navigation'] a[aria-current='page']");
    await expect(activeLink).toHaveCount(1);
  });

  test("partner / does not show owner/admin labels", async ({ page }) => {
    await page.goto("/");
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/管理中心/);
  });

  test("/me BottomNav links are all /me-prefixed", async ({ page }) => {
    await page.goto("/me");
    const nav = page.locator("nav[aria-label='main navigation']");
    const hrefs = await nav.locator("a").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    for (const href of hrefs) {
      if (href) expect(href.startsWith("/me")).toBe(true);
    }
  });
});

test.describe("Pages render without errors", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, "true");
    }, SHARED_ACCESS_KEY);
  });

  const pages = [
    "/", "/me",
    "/notes", "/me/notes",
    "/albums", "/me/albums",
    "/memories", "/me/memories",
    "/memories/unread", "/me/memories/unread",
    "/records", "/me/records",
    "/cards", "/me/cards",
    "/settings", "/me/settings",
  ];

  for (const path of pages) {
    test(`${path} loads and has h1 or main content`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      // Page should have visible content somewhere
      const body = page.locator("body");
      await expect(body).toBeVisible();
      const text = await body.innerText();
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toContain("undefined");
      expect(text).not.toContain("null");
    });
  }
});

test.describe("Responsive — 375px viewport", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key: string) => {
      window.localStorage.setItem(key, "true");
    }, SHARED_ACCESS_KEY);
  });

  const mobileViewport = { width: 375, height: 812 };
  const criticalPages = [
    "/", "/me",
    "/notes", "/me/notes",
    "/albums", "/me/albums",
    "/memories", "/me/memories",
  ];

  for (const path of criticalPages) {
    test(`${path} no horizontal overflow at 375px`, async ({ page }) => {
      await page.setViewportSize(mobileViewport);
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const html = page.locator("html");
      const scrollWidth = await html.evaluate((el) => el.scrollWidth);
      const clientWidth = await html.evaluate((el) => el.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  }

  test("BottomNav does not block last page element", async ({ page }) => {
    await page.setViewportSize(mobileViewport);
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    const nav = page.locator("nav[aria-label='main navigation']");
    await expect(nav).toBeVisible();
    // BottomNav should be at the bottom
    const navBox = await nav.boundingBox();
    if (navBox) {
      expect(navBox.y).toBeGreaterThan(300);
    }
  });
});
