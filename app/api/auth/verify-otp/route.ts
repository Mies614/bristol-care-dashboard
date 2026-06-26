import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRoleHome } from "@/lib/auth/routing";

// Rate limit: max 5 attempts per email per 60s
const verifyRateMap = new Map<string, { count: number; resetAt: number }>();

function isAllowed(email: string): boolean {
  const allowed = (process.env.ALLOWED_AUTH_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase().trim());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawEmail = String(body.email ?? "").trim();
    const rawToken = String(body.token ?? "").trim();

    if (!rawEmail || !rawToken) {
      return NextResponse.json({ ok: false, error: "Email and token are required.", code: "MISSING_PARAMS" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json({ ok: false, error: "Invalid or expired code.", code: "invalid_or_expired_code" }, { status: 400 });
    }
    if (!/^\d+$/.test(rawToken) || rawToken.length > 10) {
      return NextResponse.json({ ok: false, error: "Invalid or expired code.", code: "invalid_or_expired_code" }, { status: 400 });
    }

    // Verify email is on allowlist
    if (!isAllowed(rawEmail)) {
      return NextResponse.json({ ok: false, error: "Invalid or expired code.", code: "invalid_or_expired_code" }, { status: 400 });
    }

    // Rate limit verify attempts
    const key = rawEmail.toLowerCase();
    const now = Date.now();
    const entry = verifyRateMap.get(key);
    if (entry && now < entry.resetAt && entry.count >= 5) {
      return NextResponse.json({ ok: false, error: "Too many attempts. Please request a new code.", code: "rate_limited" }, { status: 429 });
    }
    if (!entry || now >= entry.resetAt) {
      verifyRateMap.set(key, { count: 1, resetAt: now + 60_000 });
    } else {
      verifyRateMap.set(key, { count: entry.count + 1, resetAt: entry.resetAt });
    }

    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: rawEmail,
      token: rawToken,
      type: "email",
    });

    if (error || !data?.user) {
      return NextResponse.json({ ok: false, error: "Invalid or expired code.", code: "invalid_or_expired_code" }, { status: 400 });
    }

    // Resolve membership
    const serviceClient = createSupabaseServerClient();
    const { data: member } = await serviceClient
      .from("space_members")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ ok: false, error: "No space membership found.", code: "NO_MEMBERSHIP" }, { status: 403 });
    }

    const role = member.role as "owner" | "partner";
    const home = getRoleHome(role);

    return NextResponse.json({ ok: true, home, role });
  } catch {
    return NextResponse.json({ ok: false, error: "Verification failed.", code: "SERVER_ERROR" }, { status: 500 });
  }
}
