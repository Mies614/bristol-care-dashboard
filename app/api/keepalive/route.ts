export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.SUPABASE_KEEPALIVE_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Performs a protected, read-only database check without returning app data. */
export async function GET(request: NextRequest) {
  if (!process.env.SUPABASE_KEEPALIVE_SECRET) {
    return NextResponse.json({ ok: false, code: "KEEPALIVE_NOT_CONFIGURED" }, { status: 503 });
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ ok: false, code: "SUPABASE_NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    const { error } = await createSupabaseServerClient()
      .from("couple_spaces")
      .select("id", { count: "exact", head: true });
    if (error) {
      return NextResponse.json({ ok: false, code: "KEEPALIVE_CHECK_FAILED" }, { status: 503 });
    }
    return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, code: "KEEPALIVE_CHECK_FAILED" }, { status: 503 });
  }
}
