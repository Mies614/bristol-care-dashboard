export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultSpaceCode } from "@/lib/cloudSync";

interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

export async function GET() {
  const checks: Check[] = [];
  const code = getDefaultSpaceCode();

  // 1) NEXT_PUBLIC_SUPABASE_URL exists
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  checks.push({
    name: "NEXT_PUBLIC_SUPABASE_URL exists",
    ok: !!supabaseUrl,
    detail: supabaseUrl ? `found (${supabaseUrl.slice(0, 20)}...)` : "missing"
  });

  // 2) SUPABASE_SERVICE_ROLE_KEY exists
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  checks.push({
    name: "SUPABASE_SERVICE_ROLE_KEY exists",
    ok: !!serviceKey,
    detail: serviceKey ? "found (hidden)" : "missing"
  });

  // 3) NEXT_PUBLIC_DEFAULT_SPACE_CODE
  checks.push({
    name: "NEXT_PUBLIC_DEFAULT_SPACE_CODE",
    ok: !!code,
    detail: code || "missing (defaults to 'xiaoguai520')"
  });

  // 4) VAPID public key exists
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  checks.push({
    name: "VAPID public key exists",
    ok: !!vapidPublic,
    detail: vapidPublic ? "found (hidden)" : "missing (run: npm run generate:vapid)"
  });

  // 5) VAPID private key exists
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  checks.push({
    name: "VAPID private key exists",
    ok: !!vapidPrivate,
    detail: vapidPrivate ? "found (hidden)" : "missing (run: npm run generate:vapid)"
  });

  // If we have connection details, try actual DB checks
  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createSupabaseServerClient();
      const spaceCode = code || "xiaoguai520";

      // 6) xiaoguai520 space exists
      const { data: space } = await supabase
        .from("spaces")
        .select("id, code")
        .eq("code", spaceCode)
        .single();
      checks.push({
        name: "xiaoguai520 space exists",
        ok: !!space,
        detail: space ? `id=${space.id}` : "no space found with this code"
      });

      if (space) {
        // 7) settings upsert test
        try {
          const { error: settingsErr } = await supabase
            .from("settings")
            .upsert({
              space_id: space.id,
              girlfriend_name: "V",
              updated_at: new Date().toISOString()
            }, { onConflict: "space_id" });
          checks.push({
            name: "settings upsert test",
            ok: !settingsErr,
            detail: settingsErr ? settingsErr.message : "ok"
          });
        } catch (err) {
          checks.push({ name: "settings upsert test", ok: false, detail: String(err) });
        }

        // 8) background_settings upsert test
        try {
          const { error: bgErr } = await supabase
            .from("background_settings")
            .upsert({
              space_id: space.id,
              updated_at: new Date().toISOString()
            }, { onConflict: "space_id" });
          checks.push({
            name: "background_settings upsert test",
            ok: !bgErr,
            detail: bgErr ? bgErr.message : "ok"
          });
        } catch (err) {
          checks.push({ name: "background_settings upsert test", ok: false, detail: String(err) });
        }

        // 9) theme_settings upsert test
        try {
          const { error: themeErr } = await supabase
            .from("theme_settings")
            .upsert({
              space_id: space.id,
              updated_at: new Date().toISOString()
            }, { onConflict: "space_id" });
          checks.push({
            name: "theme_settings upsert test",
            ok: !themeErr,
            detail: themeErr ? themeErr.message : "ok"
          });
        } catch (err) {
          checks.push({ name: "theme_settings upsert test", ok: false, detail: String(err) });
        }

        // 10) miss_you_events readable
        try {
          const { data: missYouData, error: missYouErr } = await supabase
            .from("miss_you_events")
            .select("id")
            .eq("space_id", space.id)
            .limit(1);
          checks.push({
            name: "miss_you_events readable",
            ok: !missYouErr,
            detail: missYouErr ? missYouErr.message : `table exists, ${missYouData?.length || 0} rows`
          });
        } catch (err) {
          checks.push({ name: "miss_you_events readable", ok: false, detail: String(err) });
        }

        // 11) push_subscriptions readable
        try {
          const { data: pushData, error: pushErr } = await supabase
            .from("push_subscriptions")
            .select("id")
            .eq("space_id", space.id)
            .limit(1);
          checks.push({
            name: "push_subscriptions readable",
            ok: !pushErr,
            detail: pushErr ? pushErr.message : `table exists, ${pushData?.length || 0} rows`
          });
        } catch (err) {
          checks.push({ name: "push_subscriptions readable", ok: false, detail: String(err) });
        }
      }
    } catch (err) {
      checks.push({ name: "DB connection test", ok: false, detail: String(err) });
    }
  } else {
    checks.push({ name: "xiaoguai520 space exists", ok: false, detail: "skipped (no supabase connection)" });
    checks.push({ name: "settings upsert test", ok: false, detail: "skipped (no supabase connection)" });
    checks.push({ name: "background_settings upsert test", ok: false, detail: "skipped (no supabase connection)" });
    checks.push({ name: "theme_settings upsert test", ok: false, detail: "skipped (no supabase connection)" });
    checks.push({ name: "miss_you_events readable", ok: false, detail: "skipped (no supabase connection)" });
    checks.push({ name: "push_subscriptions readable", ok: false, detail: "skipped (no supabase connection)" });
  }

  return NextResponse.json({
    ok: true,
    checks,
    env: {
      NODE_ENV: process.env.NODE_ENV || "unknown",
      nextPublicSupabaseUrl: supabaseUrl ? "found" : "missing",
      supabaseServiceRoleKey: serviceKey ? "found" : "missing",
      nextPublicVapidPublicKey: vapidPublic ? "found" : "missing",
      vapidPrivateKey: vapidPrivate ? "found" : "missing",
      vapidSubject: process.env.VAPID_SUBJECT ? "found" : "missing",
      adminPassword: process.env.ADMIN_PASSWORD ? "found" : "not set"
    }
  });
}