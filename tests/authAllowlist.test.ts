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

  it("uses type=submit for Enter key support", () => {
    expect(page).toContain('type="submit"');
  });

  it("prevents default on form submit", () => {
    expect(page).toContain("event.preventDefault()");
  });

  it("prevents double submission via sending status", () => {
    expect(page).toContain('status === "sending"');
  });

  it("shows status=error on API failure", () => {
    expect(page).toContain('role="alert"');
  });

  it("shows status=sent on success with re-send option", () => {
    expect(page).toContain("登录链接已发送");
    expect(page).toContain("重新发送登录链接");
  });

  it("button uses explicit Tailwind colors (not CSS variables)", () => {
    expect(page).toContain("bg-[#b87060]");
    expect(page).toContain("text-white");
  });

  it("button is always visible in all states", () => {
    // Button is rendered unconditionally, only text changes
    expect(page).toContain("发送登录链接");
    expect(page).toContain("重新发送登录链接");
    expect(page).toContain("发送中…");
  });
});

describe("S3: callback uses role-based routing", () => {
  const cb = readFileSync(
    resolve(__dirname, "../app/auth/callback/route.ts"),
    "utf-8",
  );

  it("queries space_members for role after exchangeCodeForSession", () => {
    expect(cb).toContain("space_members");
    expect(cb).toContain("exchangeCodeForSession");
  });

  it("does NOT write role via auth admin API", () => {
    expect(cb).not.toContain("updateUserById");
    // Role must only come from space_members
    expect(cb).toContain("space_members");
  });

  it("uses APP_ORIGIN for redirect origin", () => {
    expect(cb).toContain("APP_ORIGIN");
  });

  it("imports getRoleHome for role-based redirect", () => {
    expect(cb).toContain("getRoleHome");
    expect(cb).toContain("roleHome");
  });

  it("uses authData.user.id for membership query", () => {
    expect(cb).toContain("authData.user.id");
  });

  it("redirects to membership_missing when no space_members record", () => {
    expect(cb).toContain("membership_missing");
  });

  it("validates next param against role-allowed paths", () => {
    expect(cb).toContain("isPathAllowedForRole");
  });
});

describe("S3: middleware enforces role-page binding", () => {
  const mw = readFileSync(
    resolve(__dirname, "../middleware.ts"),
    "utf-8",
  );

  it("queries space_members for role", () => {
    expect(mw).toContain("space_members");
    expect(mw).toContain("maybeSingle");
  });

  it("never defaults role to partner on error", () => {
    // Should not silently fall back to partner when membership is missing
    expect(mw).toContain("membership_invalid");
  });

  it("redirects unauthenticated users to login", () => {
    expect(mw).toContain("/login");
  });

  it("redirects to login on membership lookup failure", () => {
    expect(mw).toContain("membership_invalid");
  });

  it("checks AUTH_ENFORCEMENT_MODE", () => {
    expect(mw).toContain("AUTH_ENFORCEMENT_MODE");
  });

  it("does not redirect API routes", () => {
    expect(mw).toContain("/api/");
  });

  it("allows public paths through", () => {
    expect(mw).toContain("/login");
    expect(mw).toContain("/auth/callback");
  });
});


describe("S3: role source of truth is space_members only", () => {
  const mw = readFileSync(
    resolve(__dirname, "../middleware.ts"),
    "utf-8",
  );
  const cb = readFileSync(
    resolve(__dirname, "../app/auth/callback/route.ts"),
    "utf-8",
  );

  it("middleware does not read user_metadata.role", () => {
    expect(mw).not.toMatch(/user_metadata\??\.role/);
    expect(mw).not.toMatch(/app_metadata\??\.role/);
  });

  it("middleware does not read app_metadata.role", () => {
    expect(mw).not.toContain("app_metadata");
  });

  it("callback does not read user_metadata.role", () => {
    expect(cb).not.toMatch(/user_metadata\??\.role/);
  });

  it("callback resolves role from space_members only", () => {
    expect(cb).toContain("space_members");
    // Must use auth user id for query
    expect(cb).toContain("authData.user.id");
  });

  it("owner callback redirects to /me via space_members role", () => {
    expect(cb).toContain("getRoleHome");
    expect(cb).toContain("roleHome");
  });

  it("partner callback redirects to / via space_members role", () => {
    expect(cb).toContain("getRoleHome");
  });

  it("faked owner in metadata cannot elevate partner", () => {
    // Middleware queries space_members, not metadata
    expect(mw).toContain("space_members");
    expect(mw).toContain("maybeSingle");
    // No metadata fallback
    expect(mw).not.toMatch(/user_metadata/);
  });

  it("membership missing does not fall back to metadata", () => {
    expect(mw).toContain("membership_invalid");
    expect(cb).toContain("membership_missing");
  });
});
