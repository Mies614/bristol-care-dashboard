import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Redirect to the intended page or home
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed — redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
