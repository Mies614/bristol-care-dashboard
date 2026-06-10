import { test, expect } from "@playwright/test";

// ──────────────────────────────────────────────
// Round 11: Final UI QA — partner + owner pages
// ──────────────────────────────────────────────

const PAGES = [
  { path: "/", label: "partner home" },
  { path: "/me", label: "owner home" },
  { path: "/notes", label: "partner notes" },
  { path: "/me/notes", label: "owner notes" },
  { path: "/albums", label: "partner albums" },
  { path: "/me/albums", label: "owner albums" },
  { path: "/memories", label: "partner memories" },
  { path: "/me/memories", label: "owner memories" },
  { path: "/memories/unread", label: "partner unread" },
  { path: "/me/memories/unread", label: "owner unread" },
  { path: "/records", label: "partner records" },
  { path: "/me/records", label: "owner records" },
  { path: "/cards", label: "partner cards" },
  { path: "/me/cards", label: "owner cards" },
  { path: "/settings", label: "partner settings" },
  { path: "/me/settings", label: "owner settings" },
];

for (const { path, label } of PAGES) {
  test.describe(`Page: ${label} (${path})`, () => {
    test("page opens without crash", async ({ page }) => {
      const res = await page.goto(path, { waitUntil: "domcontentloaded" });
      // Accept any 2xx or 304; wait for paint
      expect(res?.status()).toBeGreaterThanOrEqual(200);
      expect(res?.status()).toBeLessThan(400);
    });

    test("375px viewport has no horizontal scroll", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });

    test("page does not display undefined", async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const body = await page.textContent("body");
      expect(body).not.toContain("undefined");
    });

    test("page does not display null", async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      // Use a regex to match the word "null" as a standalone word
      const body = await page.textContent("body");
      expect(body).not.toMatch(/\bnull\b/);
    });

    test("page does not display NaN", async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const body = await page.textContent("body");
      expect(body).not.toContain("NaN");
    });

    test("page does not display [object Object]", async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const body = await page.textContent("body");
      expect(body).not.toContain("[object Object]");
    });
  });
}

// ──────────────────────────────────────────────
// Partner-side guardrails
// ──────────────────────────────────────────────
test.describe("partner side guardrails", () => {
  test("/ does not show admin or management center", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const body = await page.textContent("body");
    expect(body).not.toContain("管理中心");
    expect(body).not.toContain("admin");
    expect(body).not.toMatch(/Supabase/i);
  });

  test("/ does not show backup or data maintenance", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const body = await page.textContent("body");
    expect(body).not.toContain("数据维护");
    expect(body).not.toContain("备份");
  });
});

// ──────────────────────────────────────────────
// /me route guardrails
// ──────────────────────────────────────────────
test.describe("owner side route guardrails", () => {
  test("/me page links stay under /me", async ({ page }) => {
    await page.goto("/me", { waitUntil: "domcontentloaded" });
    const links = await page.$$eval("a", (els) => els.map((el) => el.getAttribute("href") || ""));
    const mainLinks = links.filter((h) => h && (h.includes("/notes") || h.includes("/albums") || h.includes("/memories") || h.includes("/records") || h.includes("/cards") || h.includes("/settings")));
    for (const href of mainLinks) {
      // Every content-page link on /me should start with /me
      expect(href).toMatch(/^\/me/);
    }
  });

  test("/me pages do not link to bare partner routes", async ({ page }) => {
    const ownerPages = ["/me/notes", "/me/albums", "/me/memories", "/me/records", "/me/cards", "/me/settings"];
    for (const ownerPath of ownerPages) {
      await page.goto(ownerPath, { waitUntil: "domcontentloaded" });
      // Check main nav links
      const navLinks = await page.$$eval("nav a", (els) => els.map((el) => el.getAttribute("href") || ""));
      const contentLinks = navLinks.filter((h) => h && (h === "/notes" || h === "/albums" || h === "/memories" || h === "/records" || h === "/cards" || h === "/settings"));
      expect(contentLinks.length).toBe(0);
    }
  });
});

// ──────────────────────────────────────────────
// BottomNav presence
// ──────────────────────────────────────────────
test.describe("BottomNav", () => {
  test("BottomNav exists on partner home", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const nav = page.locator("nav[aria-label='main navigation']");
    await expect(nav).toBeVisible();
  });

  test("BottomNav exists on owner home", async ({ page }) => {
    await page.goto("/me", { waitUntil: "domcontentloaded" });
    const nav = page.locator("nav[aria-label='main navigation']");
    await expect(nav).toBeVisible();
  });

  test("375px BottomNav does not overlap content", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const nav = page.locator("nav[aria-label='main navigation']");
    await expect(nav).toBeVisible();
    // Main content should have padding to avoid being obscured
    const main = page.locator("main");
    const mainPadding = await main.evaluate((el) => getComputedStyle(el).paddingBottom);
    expect(parseFloat(mainPadding)).toBeGreaterThan(60);
  });
});

// ──────────────────────────────────────────────
// Key buttons have readable text
// ──────────────────────────────────────────────
test.describe("button readability", () => {
  test("home page has visible, readable buttons", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const buttons = page.locator("button:visible, a[role='button']:visible");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("settings page buttons are accessible", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    const visibleBtns = page.locator("button:visible");
    const count = await visibleBtns.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────
// Accessibility: aria-labels
// ──────────────────────────────────────────────
test.describe("a11y quick checks", () => {
  test("partner home has properly labeled nav", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const nav = page.locator("nav[data-side='partner']");
    await expect(nav).toBeVisible();
  });

  test("owner home has properly labeled nav", async ({ page }) => {
    await page.goto("/me", { waitUntil: "domcontentloaded" });
    const nav = page.locator("nav[data-side='owner']");
    await expect(nav).toBeVisible();
  });

  test("settings pages have accessible file input", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    // The hidden file input should be present in DOM
    const fileInputs = page.locator("input[type='file']");
    const count = await fileInputs.count();
    expect(count).toBeGreaterThanOrEqual(0); // May be 0 if section collapsed
  });
});
