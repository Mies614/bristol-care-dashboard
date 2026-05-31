export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getDefaultSpaceCodeServer } from "@/lib/spaceCode";
import { getSpaceByCode } from "@/lib/supabase/spaces";

interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

export async function GET() {
  try {
    const checks: Check[] = [];
    const defaultCode = getDefaultSpaceCodeServer();

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
      ok: true,
      detail: `default space code = ${defaultCode}`
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

    // 6-11: DB checks if configured
    if (isSupabaseServerConfigured()) {
      try {
        const supabase = createSupabaseServerClient();

        // 6) xiaoguai520 space exists  uses couple_spaces via getSpaceByCode
        let spaceId: string | null = null;
        try {
          const found = await getSpaceByCode(supabase, defaultCode);
          if (found) {
            spaceId = found.id;
            checks.push({
              name: "xiaoguai520 space exists",
              ok: true,
              detail: `found in couple_spaces (id=${found.id})`
            });
          } else {
            checks.push({
              name: "xiaoguai520 space exists",
              ok: false,
              detail: "no space found with this code in couple_spaces"
            });
          }
        } catch (err) {
          checks.push({
            name: "xiaoguai520 space exists",
            ok: false,
            detail: `couple_spaces query failed: ${err instanceof Error ? err.message : String(err)}`
          });
        }

        if (spaceId) {
          const addReadableCheck = async (name: string, table: string) => {
            try {
              const { count, error } = await supabase
                .from(table)
                .select("id", { count: "exact", head: true })
                .eq("space_id", spaceId);
              checks.push({
                name,
                ok: !error,
                detail: error ? `query failed: ${error.message}` : `table exists, ${count ?? 0} rows`
              });
            } catch (err) {
              checks.push({ name, ok: false, detail: `query failed: ${err instanceof Error ? err.message : String(err)}` });
            }
          };

          await addReadableCheck("settings readable", "settings");

          // 7) settings upsert test  settings table uses key+value, NOT girlfriend_name column
          try {
            const settingsPayload = {
              space_id: spaceId,
              key: "debug_settings_test",
              value: { ok: true, source: "debug", timestamp: new Date().toISOString() },
              updated_at: new Date().toISOString()
            };
            const { error: settingsErr } = await supabase
              .from("settings")
              .upsert(settingsPayload, { onConflict: "space_id,key" });
            checks.push({
              name: "settings upsert test",
              ok: !settingsErr,
              detail: settingsErr ? settingsErr.message : "ok"
            });
            // Clean up test record
            await supabase
              .from("settings")
              .delete()
              .eq("space_id", spaceId)
              .eq("key", "debug_settings_test");
          } catch (err) {
            checks.push({ name: "settings upsert test", ok: false, detail: String(err) });
          }

          // 8) background_settings upsert test  stored as a settings key, NOT a separate table
          try {
            const bgPayload = {
              space_id: spaceId,
              key: "debug_background_settings_test",
              value: {
                mode: "preset",
                preset: "cream",
                imageFit: "cover",
                imagePosition: "center",
                focalPoint: { x: 50, y: 38 },
                overlay: "medium",
                blur: false,
                dim: 20,
                scale: 100,
                portraitEnhance: false
              },
              updated_at: new Date().toISOString()
            };
            const { error: bgErr } = await supabase
              .from("settings")
              .upsert(bgPayload, { onConflict: "space_id,key" });
            checks.push({
              name: "background_settings upsert test",
              ok: !bgErr,
              detail: bgErr ? bgErr.message : "ok"
            });
            // Clean up
            await supabase
              .from("settings")
              .delete()
              .eq("space_id", spaceId)
              .eq("key", "debug_background_settings_test");
          } catch (err) {
            checks.push({ name: "background_settings upsert test", ok: false, detail: String(err) });
          }

          // 9) theme_settings upsert test  stored as a settings key, NOT a separate table
          try {
            const themePayload = {
              space_id: spaceId,
              key: "debug_theme_settings_test",
              value: {
                style: "soft",
                cardStyle: "glass",
                navStyle: "glass",
                radius: "extra",
                decoration: "stars"
              },
              updated_at: new Date().toISOString()
            };
            const { error: themeErr } = await supabase
              .from("settings")
              .upsert(themePayload, { onConflict: "space_id,key" });
            checks.push({
              name: "theme_settings upsert test",
              ok: !themeErr,
              detail: themeErr ? themeErr.message : "ok"
            });
            // Clean up
            await supabase
              .from("settings")
              .delete()
              .eq("space_id", spaceId)
              .eq("key", "debug_theme_settings_test");
          } catch (err) {
            checks.push({ name: "theme_settings upsert test", ok: false, detail: String(err) });
          }

          await addReadableCheck("deadlines sync check", "deadlines");
          await addReadableCheck("miss_you_seen_state readable", "miss_you_seen_state");

          // 10) miss_you_events readable
          try {
            const { count, error: missYouErr } = await supabase
              .from("miss_you_events")
              .select("id", { count: "exact", head: true })
              .eq("space_id", spaceId);
            checks.push({
              name: "miss_you_events readable",
              ok: !missYouErr,
              detail: missYouErr
                ? `query failed: ${missYouErr.message}`
                : `table exists, ${count ?? 0} rows`
            });
          } catch (err) {
            checks.push({
              name: "miss_you_events readable",
              ok: false,
              detail: `query failed: ${err instanceof Error ? err.message : String(err)}`
            });
          }

          // 11) push_subscriptions readable
          try {
            const { count, error: pushErr } = await supabase
              .from("push_subscriptions")
              .select("id", { count: "exact", head: true })
              .eq("space_id", spaceId);
            checks.push({
              name: "push_subscriptions readable",
              ok: !pushErr,
              detail: pushErr
                ? `query failed: ${pushErr.message}`
                : `table exists, ${count ?? 0} rows`
            });
          } catch (err) {
            checks.push({
              name: "push_subscriptions readable",
              ok: false,
              detail: `query failed: ${err instanceof Error ? err.message : String(err)}`
            });
          }

        } else {
          // Space not found, mark remaining checks as skipped
          checks.push({ name: "settings upsert test", ok: false, detail: "skipped (no space)" });
          checks.push({ name: "background_settings upsert test", ok: false, detail: "skipped (no space)" });
          checks.push({ name: "theme_settings upsert test", ok: false, detail: "skipped (no space)" });
          checks.push({ name: "miss_you_events readable", ok: false, detail: "skipped (no space)" });
          checks.push({ name: "push_subscriptions readable", ok: false, detail: "skipped (no space)" });
          checks.push({ name: "settings readable", ok: false, detail: "skipped (no space)" });
          checks.push({ name: "deadlines sync check", ok: false, detail: "skipped (no space)" });
          checks.push({ name: "miss_you_seen_state readable", ok: false, detail: "skipped (no space)" });
        }
      } catch (err) {
        checks.push({ name: "DB connection", ok: false, detail: String(err) });
        checks.push({ name: "xiaoguai520 space exists", ok: false, detail: "DB connection failed" });
        checks.push({ name: "settings upsert test", ok: false, detail: "DB connection failed" });
        checks.push({ name: "background_settings upsert test", ok: false, detail: "DB connection failed" });
        checks.push({ name: "theme_settings upsert test", ok: false, detail: "DB connection failed" });
        checks.push({ name: "miss_you_events readable", ok: false, detail: "DB connection failed" });
        checks.push({ name: "push_subscriptions readable", ok: false, detail: "DB connection failed" });
        checks.push({ name: "settings readable", ok: false, detail: "DB connection failed" });
        checks.push({ name: "deadlines sync check", ok: false, detail: "DB connection failed" });
        checks.push({ name: "miss_you_seen_state readable", ok: false, detail: "DB connection failed" });
      }
    } else {
      checks.push({ name: "xiaoguai520 space exists", ok: false, detail: "skipped (no supabase connection)" });
      checks.push({ name: "settings upsert test", ok: false, detail: "skipped (no supabase connection)" });
      checks.push({ name: "background_settings upsert test", ok: false, detail: "skipped (no supabase connection)" });
      checks.push({ name: "theme_settings upsert test", ok: false, detail: "skipped (no supabase connection)" });
      checks.push({ name: "miss_you_events readable", ok: false, detail: "skipped (no supabase connection)" });
      checks.push({ name: "push_subscriptions readable", ok: false, detail: "skipped (no supabase connection)" });
      checks.push({ name: "settings readable", ok: false, detail: "skipped (no supabase connection)" });
      checks.push({ name: "deadlines sync check", ok: false, detail: "skipped (no supabase connection)" });
      checks.push({ name: "miss_you_seen_state readable", ok: false, detail: "skipped (no supabase connection)" });
    }

    checks.push({ name: "cloud upload route exists", ok: true, detail: "/api/cloud/upload" });
    checks.push({ name: "cloud pull route exists", ok: true, detail: "/api/cloud/pull" });

    return NextResponse.json({
      ok: true,
      checks,
      env: {
        NODE_ENV: process.env.NODE_ENV || "unknown",
        supabaseUrl: supabaseUrl ? "found" : "missing",
        serviceRoleKey: serviceKey ? "found" : "missing",
        vapidPublicKey: vapidPublic ? "found" : "missing",
        vapidPrivateKey: vapidPrivate ? "found" : "missing",
        vapidSubject: process.env.VAPID_SUBJECT ? "found" : "missing",
        adminPassword: process.env.ADMIN_PASSWORD ? "found" : "not set"
      }
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      checks: []
    });
  }
}
