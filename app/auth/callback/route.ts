import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRoleHome, isPathAllowedForRole, type MemberRole } from "@/lib/auth/routing";

/** Get the canonical app origin for cookie/session consistency. */
function getAppOrigin(requestOrigin: string): string {
  return process.env.APP_ORIGIN || requestOrigin;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const origin = getAppOrigin(request.headers.get("origin") || new URL(request.url).origin);

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Exchange code for session — also returns user data
  const supabase = await createAuthClient();
  const { data: authData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !authData?.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const userId = authData.user.id;

  // Query space_members for role using service role client (not cookie-dependent)
  const serviceClient = createSupabaseServerClient();
  const { data: member } = await serviceClient
    .from("space_members")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!member) {
    return NextResponse.redirect(`${origin}/login?error=membership_missing`);
  }

  const role = member.role as MemberRole;
  const roleHome = getRoleHome(role);

  // Persist role to user_metadata so middleware can read it quickly
  try {
    await serviceClient.auth.admin.updateUserById(userId, {
      user_metadata: { role },
    });
  } catch {
    // Non-critical — middleware will query space_members directly
  }

  // If client passed a `next` param, validate it belongs to this role
  if (nextParam && isPathAllowedForRole(nextParam, role)) {
    const safe = nextParam.startsWith("/") ? nextParam : `/${nextParam}`;
    return NextResponse.redirect(`${origin}${safe}`);
  }

  // Default: redirect to role home
  return NextResponse.redirect(`${origin}${roleHome}`);
}
