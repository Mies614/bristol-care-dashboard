export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validateAdminPassword } from "@/lib/adminAuth";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getVapidConfig } from "@/lib/push";
import { fetchBristolWeather } from "@/lib/weather";
import { scheduleReminders, type ServerReminderPreference, type SpaceData } from "@/lib/serverReminderScheduler";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const password = request.headers.get("x-admin-password");
    if (!validateAdminPassword(password)) {
      return NextResponse.json({ error: "未授权。" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json({
        ok: false,
        status: "unavailable",
        message: "Supabase 未配置，无法运行 Dry-run。",
      });
    }

    const vapidConfig = getVapidConfig();
    if (!vapidConfig.configured) {
      return NextResponse.json({
        ok: false,
        status: "vapid_missing",
        message: "VAPID 密钥未配置，提醒可以生成但无法发送。",
      });
    }

    const supabase = createSupabaseServerClient();
    const now = new Date();

    // 1. Fetch reminder preferences
    const { data: prefsData } = await supabase
      .from("reminder_preferences")
      .select("*")
      .eq("enabled", true);

    const preferences: ServerReminderPreference[] = (prefsData || []).map(
      (row: Record<string, unknown>) => ({
        spaceCode: String(row.space_code || ""),
        identity: String(row.identity || "default"),
        enabled: Boolean(row.enabled),
        weatherEnabled: Boolean(row.weather_enabled ?? true),
        deadlineEnabled: Boolean(row.deadline_enabled ?? true),
        missYouEnabled: Boolean(row.miss_you_enabled ?? true),
        periodEnabled: Boolean(row.period_enabled ?? true),
        reminderTime: String(row.reminder_time || "09:00"),
        timezone: String(row.timezone || "Europe/London"),
      })
    );

    if (preferences.length === 0) {
      // Still log the run
      await supabase.from("reminder_run_logs").insert({
        checked_at: now.toISOString(),
        trigger_type: "manual_dry_run",
        ok: true,
        spaces_checked: 0,
        notifications_generated: 0,
        notifications_sent: 0,
        skipped: JSON.stringify([{ reason: "no_preferences", count: 1 }]),
        duration_ms: Date.now() - startTime,
      }).select("id").maybeSingle();

      return NextResponse.json({
        ok: true,
        triggeredAt: now.toISOString(),
        dryRun: true,
        spacesChecked: 0,
        notificationsWouldSend: 0,
        summary: [],
        note: "没有活跃的提醒偏好。",
      });
    }

    // 2. Fetch space data
    const uniqueSpaceCodes = [...new Set(preferences.map((p) => p.spaceCode))];
    const { data: allSpaces } = await supabase
      .from("couple_spaces")
      .select("id, code, girlfriend_name")
      .in("code", uniqueSpaceCodes);

    const spaceMap = new Map(
      (allSpaces || []).map((s: Record<string, unknown>) => [
        String(s.code), { id: String(s.id), gfName: String(s.girlfriend_name || "小乖") }
      ])
    );

    const spacesData: SpaceData[] = [];
    const errors: Array<{ scope: string; message: string }> = [];

    for (const spaceCode of uniqueSpaceCodes) {
      try {
        const space = spaceMap.get(spaceCode);
        if (!space) continue;

        const { data: deadlines } = await supabase
          .from("deadlines")
          .select("*")
          .eq("space_id", space.id)
          .is("deleted_at", null)
          .order("due_date");

        const { data: appSetting } = await supabase
          .from("settings")
          .select("value")
          .eq("space_id", space.id)
          .eq("key", "app_settings")
          .maybeSingle();

        const appSettings = (appSetting?.value as Record<string, unknown>) || {};
        const nextMeetDate = (appSettings.nextMeetingDate) as string || null;

        let weather;
        try { weather = await fetchBristolWeather(); } catch { /* optional */ }

        spacesData.push({
          spaceCode,
          weather,
          deadlines: (deadlines || []).map((d: Record<string, unknown>) => ({
            id: String(d.id), title: String(d.title || ""),
            dueDate: String(d.due_date || ""), dueTime: (d.due_time || undefined) as string | undefined,
            status: String(d.status || "todo"), priority: String(d.priority || "medium"),
          })) as SpaceData["deadlines"],
          nextMeetDate,
          nickname: space.gfName,
          periodDaysUntilNext: null,
          periodCycleDay: null,
        });
      } catch (err) {
        errors.push({ scope: `space_${spaceCode}`, message: err instanceof Error ? err.message : String(err) });
      }
    }

    // 3. Force within time window for dry-run (ignore time check)
    // Use the scheduler but pass "now" matching a time that fits the window
    const fakeNow = new Date(now);
    const [hour, minute] = "09:00".split(":").map(Number);
    fakeNow.setUTCHours(hour, minute, 0, 0);

    const scheduleResult = scheduleReminders({
      preferences,
      spacesData,
      deliveryLog: [], // Dry-run: no delivery log check
      now: fakeNow,
    });

    // 4. Generate summary
    const summary = scheduleResult.notifications.map((n) => ({
      type: n.payload.type,
      spaceCode: n.spaceCode,
      title: n.payload.title,
      body: n.payload.body.length > 100 ? n.payload.body.slice(0, 100) + "..." : n.payload.body,
    }));

    // 5. Write run log (dry-run, no Push sent)
    const duration = Date.now() - startTime;
    try {
      await supabase.from("reminder_run_logs").insert({
        checked_at: now.toISOString(),
        trigger_type: "manual_dry_run",
        ok: true,
        spaces_checked: uniqueSpaceCodes.length,
        notifications_generated: scheduleResult.notifications.length,
        notifications_sent: 0,
        skipped: JSON.stringify(scheduleResult.skipped),
        errors: JSON.stringify(errors),
        duration_ms: duration,
      });
    } catch {
      // Log write failure is non-fatal
    }

    return NextResponse.json({
      ok: true,
      triggeredAt: now.toISOString(),
      dryRun: true,
      note: "这是模拟运行，没有真实发送通知。",
      spacesChecked: uniqueSpaceCodes.length,
      notificationsWouldSend: scheduleResult.notifications.length,
      summary,
      skipped: scheduleResult.skipped,
      errors: errors.length > 0 ? errors : undefined,
      durationMs: duration,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: "Dry-run 执行失败。",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
