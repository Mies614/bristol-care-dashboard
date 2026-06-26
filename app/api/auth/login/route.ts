import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";

// Simple in-memory rate limiter per email (resets on deploy, ~30s window)
const rateLimitMap = new Map<string, number>();

function getAllowedEmails(): string[] {
  return (process.env.ALLOWED_AUTH_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function isAllowed(email: string): boolean {
  return getAllowedEmails().includes(email.toLowerCase().trim());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawEmail = String(body.email ?? "").trim();

    if (!rawEmail) {
      return NextResponse.json({ ok: false, error: "Email is required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json({ ok: true });
    }
    if (!isAllowed(rawEmail)) {
      return NextResponse.json({ ok: true });
    }

    // Rate limit: max 1 OTP per email per 30s
    const last = rateLimitMap.get(rawEmail.toLowerCase()) || 0;
    if (Date.now() - last < 30_000) {
      return NextResponse.json({ ok: false, code: "rate_limited", retryAfterSeconds: 30 }, { status: 429 });
    }
    rateLimitMap.set(rawEmail.toLowerCase(), Date.now());

    const supabase = await createAuthClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: rawEmail,
      options: { shouldCreateUser: false },
    });

    if (error) {
      // Don't expose internal error details
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
