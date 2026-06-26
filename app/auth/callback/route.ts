import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";

// Only allow redirects to these safe path prefixes
const ALLOWED_REDIRECT_PREFIXES = ["/", "/me", "/memories", "/albums", "/notes", "/settings", "/cards", "/records", "/period"];

function safeRedirectPath(next: string | null): string {
  if (!next) return "/";
  // Must start with / and not contain protocol or host prefix
  if (!next.startsWith("/") || next.includes("://") || next.includes("//")) return "/";
  // Only allow known application paths or paths starting with allowed prefixes
  for (const prefix of ALLOWED_REDIRECT_PREFIXES) {
    if (next === prefix || next.startsWith(prefix + "/") || next.startsWith(prefix + "?")) {
      return next;
    }
  }
  return "/";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed — redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
