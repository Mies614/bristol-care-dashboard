import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRoleHome, isPathAllowedForRole, type MemberRole } from "@/lib/auth/routing";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Exchange code for session — also returns user data
  const supabase = await createAuthClient();
  const { data: authData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !authData?.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Query space_members for role using service role client
  const serviceClient = createSupabaseServerClient();
  const { data: member } = await serviceClient
    .from("space_members")
    .select("role")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!member) {
    return NextResponse.redirect(`${origin}/login?error=membership_missing`);
  }

  const role = member.role as MemberRole;
  const roleHome = getRoleHome(role);

  // If client passed a `next` param, validate it belongs to this role
  if (nextParam && isPathAllowedForRole(nextParam, role)) {
    // Ensure the path starts with /
    const safe = nextParam.startsWith("/") ? nextParam : `/${nextParam}`;
    return NextResponse.redirect(`${origin}${safe}`);
  }

  // Default: redirect to role home
  return NextResponse.redirect(`${origin}${roleHome}`);
}
