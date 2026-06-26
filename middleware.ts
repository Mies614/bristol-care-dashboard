import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths that do not require authentication
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

// Paths that always serve static assets
const STATIC_PREFIXES = ["/_next", "/icons", "/images", "/fonts"];

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

  // Allow public paths and static assets through
  if (PUBLIC_PATHS.has(pathname)) {
    return supabaseResponse;
  }
  for (const prefix of STATIC_PREFIXES) {
    if (pathname.startsWith(prefix)) return supabaseResponse;
  }

  // Enforce: if AUTH_ENFORCEMENT_MODE is "enforce", deny unauthenticated access
  const mode = process.env.AUTH_ENFORCEMENT_MODE || "off";
  if (mode === "enforce" && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
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
