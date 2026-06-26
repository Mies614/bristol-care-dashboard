import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";

/**
 * Email allowlist — only these emails can request login links.
 * Two emails must be set in env as comma-separated list.
 */
function getAllowedEmails(): string[] {
  const raw = process.env.ALLOWED_AUTH_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowed(email: string): boolean {
  return getAllowedEmails().includes(email.toLowerCase().trim());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawEmail = String(body.email ?? "").trim();

    if (!rawEmail) {
      return NextResponse.json(
        { ok: false, error: "Email is required." },
        { status: 400 },
      );
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      // Don't reveal whether email is valid — unified response
      return NextResponse.json({ ok: true });
    }

    if (!isAllowed(rawEmail)) {
      // Don't reveal whether email is on allowlist — unified response
      return NextResponse.json({ ok: true });
    }

    const supabase = await createAuthClient();
    // Prefer explicit APP_ORIGIN for production, fall back to current origin
    const origin = process.env.APP_ORIGIN || request.headers.get("origin") || request.nextUrl.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email: rawEmail,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      // Don't expose internal auth error details
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
