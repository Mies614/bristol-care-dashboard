import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set([
  "/login", "/auth/callback", "/api/cron/reminders",
  "/api/health", "/api/ping", "/manifest.json", "/sw.js", "/favicon.ico",
]);
const STATIC_PREFIXES = ["/_next", "/icons", "/images", "/fonts"];
const API_PREFIX = "/api/";

function isPartnerForbidden(pathname: string): boolean {
  return pathname === "/me" || pathname.startsWith("/me/");
}

async function resolveRole(
  supabase: ReturnType<typeof createServerClient>, userId: string,
): Promise<"owner" | "partner" | null> {
  try {
    const { data, error } = await supabase.from("space_members")
      .select("role").eq("user_id", userId).maybeSingle();
    if (error || !data) return null;
    if (data.role === "owner" || data.role === "partner") {
      return data.role as "owner" | "partner";
    }
    return null;
  } catch { return null; }
}

async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll(cookiesToSet) {
      for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
      supabaseResponse = NextResponse.next({ request });
      for (const { name, value, options } of cookiesToSet) supabaseResponse.cookies.set(name, value, options);
    }}},
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return supabaseResponse;
  for (const p of STATIC_PREFIXES) if (pathname.startsWith(p)) return supabaseResponse;
  if (pathname.startsWith(API_PREFIX)) return supabaseResponse;

  const mode = process.env.AUTH_ENFORCEMENT_MODE || "off";
  if (mode === "off") return supabaseResponse;

  if (!user) {
    const loginUrl = request.nextUrl.clone(); loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  const role = await resolveRole(supabase, user.id);
  if (!role) {
    const loginUrl = request.nextUrl.clone(); loginUrl.pathname = "/login";
    loginUrl.searchParams.set("error", "membership_invalid");
    return NextResponse.redirect(loginUrl);
  }

  // Owner: allowed on both sides, default home is /me
  if (role === "owner") {
    // Redirect /login to /me
    if (pathname === "/login") {
      const home = request.nextUrl.clone(); home.pathname = "/me";
      return NextResponse.redirect(home);
    }
    // Owner can access anything
    return supabaseResponse;
  }

  // Partner: only partner side, cannot access /me
  if (pathname === "/login") {
    const home = request.nextUrl.clone(); home.pathname = "/";
    return NextResponse.redirect(home);
  }
  if (isPartnerForbidden(pathname)) {
    const home = request.nextUrl.clone(); home.pathname = "/";
    return NextResponse.redirect(home);
  }

  return supabaseResponse;
}

export async function middleware(request: NextRequest) { return await updateSession(request); }

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)"],
};
