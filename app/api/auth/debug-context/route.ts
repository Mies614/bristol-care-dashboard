import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRoleHome } from "@/lib/auth/routing";

/**
 * Debug endpoint: returns the authenticated user's resolved context.
 * Only available when AUTH_DEBUG_ENABLED=true or with correct Bearer token.
 * Never returns secrets, tokens, or full UUIDs.
 */
function maskEmail(email: string): string {
  if (!email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  const masked = local.slice(0, 2) + "***" + local.slice(-1);
  return `${masked}@${domain}`;
}

export async function GET(request: NextRequest) {
  const debugEnabled = process.env.AUTH_DEBUG_ENABLED === "true";
  const debugSecret = process.env.AUTH_DEBUG_SECRET;

  if (!debugEnabled) {
    // Check for Bearer token auth
    const auth = request.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!debugSecret || token !== debugSecret) {
      return NextResponse.json({ ok: false, error: "Debug not available." }, { status: 404 });
    }
  }

  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        reason: "no_session",
      });
    }

    const serviceClient = createSupabaseServerClient();
    const { data: member, error: memberError } = await serviceClient
      .from("space_members")
      .select("role, identity_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const membershipFound = !memberError && !!member;
    const membershipCount = membershipFound ? 1 : 0;

    return NextResponse.json({
      authenticated: true,
      email: maskEmail(user.email || ""),
      role: member?.role || "unknown",
      identityId: member?.identity_id || "unknown",
      expectedHome: member ? getRoleHome(member.role as "owner" | "partner") : "unknown",
      membershipFound,
      membershipCount,
      membershipError: memberError ? "query_failed" : null,
      authProjectRef: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("dgokmndbszvkloroprjz") ? "dgokmndbszvkloroprjz" : "unknown",
    });
  } catch (err) {
    return NextResponse.json({
      authenticated: false,
      reason: "error",
      detail: err instanceof Error ? err.message : "unknown",
    });
  }
}
