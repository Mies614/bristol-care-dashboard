import { NextResponse } from "next/server";
import { getDefaultSpaceCode } from "@/lib/api/cloud";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Check = {
  name: string;
  ok: boolean;
  detail?: string;
};

function keyLooksLikeSecretKey(value?: string) {
  if (!value) return false;
  return value.startsWith("sb_secret_") || value.length > 80;
}

async function runDebugChecks() {
  const defaultCode = getDefaultSpaceCode();
  const checks: Check[] = [
    { name: "NEXT_PUBLIC_SUPABASE_URL exists", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { name: "SUPABASE_SERVICE_ROLE_KEY exists", ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { name: "NEXT_PUBLIC_DEFAULT_SPACE_CODE exists", ok: Boolean(process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE) },
    { name: "service key configured", ok: keyLooksLikeSecretKey(process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { name: "current default space code is xiaoguai520", ok: defaultCode === "xiaoguai520", detail: defaultCode }
  ];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    checks.push({ name: "can query couple_spaces", ok: false });
    checks.push({ name: "default space exists", ok: false });
    checks.push({ name: "love_notes readable", ok: false });
    checks.push({ name: "album_items readable", ok: false });
    checks.push({ name: "love-notes bucket accessible", ok: false });
    checks.push({ name: "couple-albums bucket accessible", ok: false });
    return checks;
  }

  const supabase = createSupabaseServerClient();
  const { data: space, error: spaceError } = await supabase
    .from("couple_spaces")
    .select("id, code")
    .eq("code", defaultCode)
    .maybeSingle();

  checks.push({ name: "can query couple_spaces", ok: !spaceError && Boolean(space?.id) });
  checks.push({ name: "default space exists", ok: Boolean(space?.id) });

  if (!space?.id) {
    checks.push({ name: "love_notes readable", ok: false });
    checks.push({ name: "album_items readable", ok: false });
    checks.push({ name: "love-notes bucket accessible", ok: false });
    checks.push({ name: "couple-albums bucket accessible", ok: false });
    return checks;
  }

  const { error: notesError } = await supabase.from("love_notes").select("id").eq("space_id", space.id).limit(1);
  const { error: albumsError } = await supabase.from("album_items").select("id").eq("space_id", space.id).limit(1);
  const { count: notesCount, error: notesCountError } = await supabase
    .from("love_notes")
    .select("id", { count: "exact", head: true })
    .eq("space_id", space.id)
    .is("deleted_at", null);
  const { count: albumsCount, error: albumsCountError } = await supabase
    .from("album_items")
    .select("id", { count: "exact", head: true })
    .eq("space_id", space.id)
    .is("deleted_at", null);
  const { data: backgroundSetting, error: backgroundError } = await supabase
    .from("settings")
    .select("key")
    .eq("space_id", space.id)
    .eq("key", "background_settings")
    .maybeSingle();
  checks.push({ name: "love_notes readable", ok: !notesError, detail: notesError?.message });
  checks.push({ name: "album_items readable", ok: !albumsError, detail: albumsError?.message });
  checks.push({ name: "xiaoguai520 love_notes count", ok: !notesCountError, detail: String(notesCount ?? 0) });
  checks.push({ name: "xiaoguai520 album_items count", ok: !albumsCountError, detail: String(albumsCount ?? 0) });
  checks.push({ name: "background_settings exists", ok: !backgroundError && Boolean(backgroundSetting?.key), detail: backgroundError?.message });

  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  checks.push({ name: "love-notes bucket accessible", ok: !bucketError && Boolean(buckets?.some((bucket) => bucket.name === "love-notes")), detail: bucketError?.message });
  checks.push({ name: "couple-albums bucket accessible", ok: !bucketError && Boolean(buckets?.some((bucket) => bucket.name === "couple-albums")), detail: bucketError?.message });
  checks.push({ name: "backgrounds bucket accessible", ok: !bucketError && Boolean(buckets?.some((bucket) => bucket.name === "backgrounds")), detail: bucketError?.message });

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
  try {
    const checks = await runDebugChecks();
    return NextResponse.json({ ok: checks.every((check) => check.ok), environment: process.env.NODE_ENV, checks });
  } catch {
    return NextResponse.json({
      ok: false,
      checks: [
        { name: "NEXT_PUBLIC_SUPABASE_URL exists", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
        { name: "SUPABASE_SERVICE_ROLE_KEY exists", ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) },
        { name: "service key configured", ok: keyLooksLikeSecretKey(process.env.SUPABASE_SERVICE_ROLE_KEY) },
        { name: "can query couple_spaces", ok: false }
      ]
    });
  }
}
