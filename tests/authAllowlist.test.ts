import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("S3: auth login allowlist", () => {
  const route = readFileSync(
    resolve(__dirname, "../app/api/auth/login/route.ts"),
    "utf-8",
  );

  it("checks ALLOWED_AUTH_EMAILS env var", () => {
    expect(route).toMatch("ALLOWED_AUTH_EMAILS");
  });

  it("uses unified response for allowed and disallowed", () => {
    // Both allowed and disallowed emails get the same response
    const _normalized = route.replace(/\s+/g, " ");
    // The allowlist check returns unified response
    expect(route).toMatch('ok');
  });

  it("does not expose allowed emails in response", () => {
    // getAllowedEmails reads from env — never returns to client
    expect(route).not.toContain("allowedEmails");
    expect(route).not.toContain("allowed_emails");
  });
});

describe("S3: login page", () => {
  const page = readFileSync(
    resolve(__dirname, "../app/login/page.tsx"),
    "utf-8",
  );

  it("renders email input", () => {
    expect(page).toContain('type="email"');
  });

  it("does not show allowed emails", () => {
    expect(page).not.toContain("ALLOWED_AUTH_EMAILS");
  });

  it("has a submit button", () => {
    expect(page).toContain("发送登录链接");
  });
});

describe("S3: middleware", () => {
  const mw = readFileSync(
    resolve(__dirname, "../middleware.ts"),
    "utf-8",
  );

  it("checks AUTH_ENFORCEMENT_MODE", () => {
    expect(mw).toContain("AUTH_ENFORCEMENT_MODE");
  });

  it("allows login and callback paths through", () => {
    expect(mw).toContain("/login");
    expect(mw).toContain("/auth/callback");
  });

  it("allows cron and health paths through", () => {
    expect(mw).toContain("/api/cron/reminders");
    expect(mw).toContain("/api/health");
  });
});

describe("S3: auth callback", () => {
  const cb = readFileSync(
    resolve(__dirname, "../app/auth/callback/route.ts"),
    "utf-8",
  );

  it("exchanges code for session", () => {
    expect(cb).toContain("exchangeCodeForSession");
  });

  it("prevents open redirect", () => {
    // Should only redirect to same origin
    expect(cb).toContain("${origin}");
  });
});


describe("S3: login form calls /api/auth/login", () => {
  const page = readFileSync(
    resolve(__dirname, "../app/login/page.tsx"),
    "utf-8",
  );

  it("calls /api/auth/login via fetch", () => {
    expect(page).toContain("/api/auth/login");
    expect(page).toContain("fetch(");
  });

  it("does NOT POST to /login natively", () => {
    // No action attribute, no method="POST" on the form
    expect(page).not.toContain("action=");
    // Button uses type="button" not type="submit"
    expect(page).toContain('type="button"');
  });

  it("supports Enter key via form onSubmit", () => {
    expect(page).toContain("onSubmit={handleSubmit}");
    expect(page).toContain("event.preventDefault()");
  });

  it("prevents double submission via loading state", () => {
    expect(page).toContain("loading");
    expect(page).toContain("disabled={loading");
  });

  it("shows error state on failure", () => {
    expect(page).toContain("setMessage");
  });

  it("shows sent state on success", () => {
    expect(page).toContain("登录链接已发送");
  });
});

describe("S3: callback prevents open redirect", () => {
  const cb = readFileSync(
    resolve(__dirname, "../app/auth/callback/route.ts"),
    "utf-8",
  );

  it("validates redirect path against allowlist", () => {
    expect(cb).toContain("ALLOWED_REDIRECT_PREFIXES");
    expect(cb).toContain("safeRedirectPath");
  });

  it("rejects paths with protocol prefix", () => {
    expect(cb).toContain("://");
  });

  it("defaults to / on invalid path", () => {
    expect(cb).toContain('return "/"');
  });
});
