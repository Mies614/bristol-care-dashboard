import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client. Never import this file from client components,
// hooks, or any code that can be bundled into the browser.
export function createSupabaseServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server configuration is missing.");
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function isSupabaseServerConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// ─── S3: Authenticated server client (uses @supabase/ssr for cookie-based sessions) ───

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Create an authenticated server client that reads the session from HttpOnly cookies.
 * Use this for user-triggered API routes where RLS should apply.
 * Do NOT use this for cron jobs or admin operations that need service role.
 */
export async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // setAll called from Server Component — safe to ignore
          }
        },
      },
    },
  );
}
