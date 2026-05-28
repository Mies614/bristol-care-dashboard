export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

/**
 * Root debug endpoint - prevents 404 at /api/debug
 * Directs to the more detailed /api/debug/supabase endpoint.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Use /api/debug/supabase for detailed Supabase diagnostics.",
    supabaseDebugUrl: "/api/debug/supabase"
  });
}