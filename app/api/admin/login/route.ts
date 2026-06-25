import { NextRequest, NextResponse } from "next/server";
import { validateAdminPassword } from "@/lib/adminAuth";
import { adminLoginSchema, safeParseBody } from "@/lib/apiSchemas";
import { checkRateLimit, getClientIp, resetRateLimit } from "@/lib/adminRateLimit";

/**
 * POST /api/admin/login
 * Validates admin password with Zod schema + rate limiting.
 * Returns 429 after 5 failed attempts per 15-minute window.
 */
export async function POST(request: NextRequest) {
  // Rate limiting by IP
  const ip = getClientIp(request);
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { ok: false, error: "登录尝试过于频繁，请稍后再试。", retryAfter: rateCheck.retryAfter },
      {
        status: 429,
        headers: { "Retry-After": String(rateCheck.retryAfter) },
      }
    );
  }

  // Validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "请求格式无效。" },
      { status: 400 }
    );
  }

  const parsed = safeParseBody(adminLoginSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: parsed.error },
      { status: 400 }
    );
  }

  const { password } = parsed.data;

  if (!validateAdminPassword(password)) {
    // Increment failure count is already done by checkRateLimit above
    return NextResponse.json({ ok: false, error: "后台密码不正确。" }, { status: 401 });
  }

  // Reset rate limit on successful login
  resetRateLimit(ip);

  return NextResponse.json({ ok: true });
}
