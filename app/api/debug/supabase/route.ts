import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Check = {
  name: string;
  ok: boolean;
};

function keyLooksLikeSecretKey(value?: string) {
  if (!value) return false;
  return value.startsWith("sb_secret_") || value.length > 80;
}

async function runDebugChecks() {
  const checks: Check[] = [
    { name: "NEXT_PUBLIC_SUPABASE_URL exists", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { name: "SUPABASE_SERVICE_ROLE_KEY exists", ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { name: "service key looks like secret key", ok: keyLooksLikeSecretKey(process.env.SUPABASE_SERVICE_ROLE_KEY) }
  ];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    checks.push({ name: "can query couple_spaces", ok: false });
    checks.push({ name: "can insert and delete test love_note with server client", ok: false });
    return checks;
  }

  const supabase = createSupabaseServerClient();
  const { data: space, error: spaceError } = await supabase
    .from("couple_spaces")
    .select("id, code")
    .eq("code", process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE || "BRISTOL2026")
    .maybeSingle();

  checks.push({ name: "can query couple_spaces", ok: !spaceError && Boolean(space?.id) });

  if (!space?.id) {
    checks.push({ name: "can insert and delete test love_note with server client", ok: false });
    return checks;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("love_notes")
    .insert({
      space_id: space.id,
      content: "debug service role insert test",
      active: false,
      pinned: false,
      visible_from: new Date().toISOString(),
      created_by: "debug"
    })
    .select("id")
    .single();

  let deleteOk = false;
  if (inserted?.id) {
    const { error: deleteError } = await supabase.from("love_notes").delete().eq("id", inserted.id);
    deleteOk = !deleteError;
  }

  checks.push({ name: "can insert and delete test love_note with server client", ok: !insertError && deleteOk });
  return checks;
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Debug endpoint is disabled in production." }, { status: 404 });
  }

  try {
    const checks = await runDebugChecks();
    return NextResponse.json({ ok: checks.every((check) => check.ok), checks });
  } catch {
    return NextResponse.json({
      ok: false,
      checks: [
        { name: "NEXT_PUBLIC_SUPABASE_URL exists", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
        { name: "SUPABASE_SERVICE_ROLE_KEY exists", ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
        { name: "service key looks like secret key", ok: keyLooksLikeSecretKey(process.env.SUPABASE_SERVICE_ROLE_KEY) },
        { name: "can query couple_spaces", ok: false },
        { name: "can insert and delete test love_note with server client", ok: false }
      ]
    });
  }
}
