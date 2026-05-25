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
