import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ─── Public paths — never redirect ───
const PUBLIC_PATHS = new Set([
  "/login",
  "/auth/callback",
  "/api/cron/reminders",
  "/api/health",
  "/api/ping",
  "/manifest.json",
  "/sw.js",
  "/favicon.ico",
]);

const STATIC_PREFIXES = ["/_next", "/icons", "/images", "/fonts"];
const API_PREFIX = "/api/";

// ─── Role home mapping ───

// ─── Owner allowed prefixes ───
function isOwnerPath(pathname: string): boolean {
  return pathname === "/me" || pathname.startsWith("/me/");
}

// ─── Partner disallowed prefixes ───
function isPartnerDisallowed(pathname: string): boolean {
  return pathname === "/me" || pathname.startsWith("/me/");
}

async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Always allow public paths, static assets, and API routes
  if (PUBLIC_PATHS.has(pathname)) return supabaseResponse;
  for (const prefix of STATIC_PREFIXES) {
    if (pathname.startsWith(prefix)) return supabaseResponse;
  }
  if (pathname.startsWith(API_PREFIX)) return supabaseResponse;

  const mode = process.env.AUTH_ENFORCEMENT_MODE || "off";

  if (mode === "off") {
    return supabaseResponse;
  }

  // ─── observe / enforce modes ───

  if (!user) {
    // No session: redirect to login
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Get user role from app_metadata or space_members
  // We use user_metadata.role if set during login, otherwise fall back
  const role = (user.user_metadata?.role as string) || "partner";

  if (role !== "owner" && role !== "partner") {
    // Unknown role — redirect to login
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // ─── Role-based page enforcement ───

  if (role === "owner") {
    // Owner can only access /me, /login, /auth, and static/api
    if (!isOwnerPath(pathname) && pathname !== "/login") {
      const home = request.nextUrl.clone();
      home.pathname = "/me";
      return NextResponse.redirect(home);
    }
  } else {
    // Partner cannot access /me
    if (isPartnerDisallowed(pathname)) {
      const home = request.nextUrl.clone();
      home.pathname = "/";
      return NextResponse.redirect(home);
    }
  }

  return supabaseResponse;
}

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
