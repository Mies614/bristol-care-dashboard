export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getVapidConfig } from "@/lib/push";
import { fetchBristolWeather } from "@/lib/weather";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { scheduleReminders } from "@/lib/serverReminderScheduler";
import type { ReminderDeliveryRecord, ServerReminderPreference, SpaceData } from "@/lib/serverReminderScheduler";
import { getDaysUntilNextPeriod, getCurrentCycleDay, DEFAULT_PERIOD_SETTINGS } from "@/lib/period";

function getCronSecret(): string {
  return process.env.CRON_SECRET || "";
}

function isAuthorized(request: NextRequest): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  const authHeader = request.headers.get("authorization") || "";
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  try {
    const secret = getCronSecret();
    if (!secret) {
      return NextResponse.json(
        { ok: false, error: "CRON_SECRET 未配置，定时提醒无法运行。" },
        { status: 503 }
      );
    }

    if (!isAuthorized(request)) {
      return NextResponse.json(
        { ok: false, error: "未授权。" },
        { status: 401 }
      );
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json({
        ok: false, checkedAt: new Date().toISOString(),
        spacesChecked: 0, notificationsGenerated: 0, notificationsSent: 0,
        skipped: [], errors: [{ scope: "supabase", message: "SUPABASE_NOT_CONFIGURED" }],
      });
    }

    const vapidConfig = getVapidConfig();
    if (!vapidConfig.configured) {
      return NextResponse.json({
        ok: false, checkedAt: new Date().toISOString(),
        spacesChecked: 0, notificationsGenerated: 0, notificationsSent: 0,
        skipped: [], errors: [{ scope: "vapid", message: "VAPID_NOT_CONFIGURED" }],
      });
    }

    const supabase = createSupabaseServerClient();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // 1. Fetch reminder preferences
    const { data: prefsData, error: prefsError } = await supabase
      .from("reminder_preferences")
      .select("*")
      .eq("enabled", true);

    if (prefsError) {
      return NextResponse.json({
        ok: false, checkedAt: now.toISOString(),
        spacesChecked: 0, notificationsGenerated: 0, notificationsSent: 0,
        skipped: [], errors: [{ scope: "preferences", message: prefsError.message }],
      });
    }

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
      return NextResponse.json({
        ok: true, checkedAt: now.toISOString(),
        spacesChecked: 0, notificationsGenerated: 0, notificationsSent: 0,
        skipped: [{ reason: "no_preferences", count: 1 }], errors: [],
      });
    }

    // 2. Fetch delivery log
    const { data: logData, error: logError } = await supabase
      .from("reminder_delivery_log")
      .select("space_code, identity, reminder_type, delivery_date")
      .eq("delivery_date", today);

    if (logError) {
      return NextResponse.json({
        ok: false, checkedAt: now.toISOString(),
        spacesChecked: 0, notificationsGenerated: 0, notificationsSent: 0,
        skipped: [], errors: [{ scope: "delivery_log", message: logError.message }],
      });
    }

    const deliveryLog: ReminderDeliveryRecord[] = (logData || []).map(
      (row: Record<string, unknown>) => ({
        spaceCode: String(row.space_code || ""),
        identity: String(row.identity || "default"),
        reminderType: String(row.reminder_type || ""),
        deliveryDate: String(row.delivery_date || ""),
      })
    );

    // 3. Fetch space data + push subscriptions per space
    const uniqueSpaceCodes = [...new Set(preferences.map((p) => p.spaceCode))];
    const spacesData: SpaceData[] = [];
    const errors: Array<{ scope: string; message: string }> = [];

    // Fetch all couple_spaces at once
    const { data: allSpaces } = await supabase
      .from("couple_spaces")
      .select("id, code, girlfriend_name")
      .in("code", uniqueSpaceCodes);

    const spaceMap = new Map(
      (allSpaces || []).map((s: Record<string, unknown>) => [
        String(s.code), { id: String(s.id), gfName: String(s.girlfriend_name || "小乖") }
      ])
    );

    for (const spaceCode of uniqueSpaceCodes) {
      try {
        const space = spaceMap.get(spaceCode);
        if (!space) {
          errors.push({ scope: `space_${spaceCode}`, message: "Space not found" });
          continue;
        }

        // Fetch deadlines in parallel
        const { data: deadlines } = await supabase
          .from("deadlines")
          .select("*")
          .eq("space_id", space.id)
          .is("deleted_at", null)
          .order("due_date");

        // Fetch period records
        const { data: periodSetting } = await supabase
          .from("settings")
          .select("value")
          .eq("space_id", space.id)
          .eq("key", "period_records")
          .maybeSingle();

        const periodRecords = Array.isArray((periodSetting?.value as Record<string, unknown>)?.records)
          ? ((periodSetting?.value as Record<string, unknown>).records as Array<Record<string, unknown>>)
          : [];

        // Fetch app settings
        const { data: appSetting } = await supabase
          .from("settings")
          .select("value")
          .eq("space_id", space.id)
          .eq("key", "app_settings")
          .maybeSingle();

        const appSettings = (appSetting?.value as Record<string, unknown>) || {};
        const nextMeetDate = (appSettings.nextMeetingDate || (appSetting?.value as Record<string, unknown>)?.nextMeetingDate) as string || null;

        // Weather
        let weather;
        try { weather = await fetchBristolWeather(); } catch { /* optional */ }

        const periodSettings = DEFAULT_PERIOD_SETTINGS;
        const daysUntilNext = getDaysUntilNextPeriod(
          periodRecords as Parameters<typeof getDaysUntilNextPeriod>[0],
          periodSettings, now
        );
        const cycleDay = getCurrentCycleDay(periodRecords as Parameters<typeof getCurrentCycleDay>[0], now);

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
          periodDaysUntilNext: daysUntilNext,
          periodCycleDay: cycleDay,
        });
      } catch (err) {
        errors.push({ scope: `space_${spaceCode}`, message: err instanceof Error ? err.message : String(err) });
      }
    }

    // 4. Run scheduler
    const scheduleResult = scheduleReminders({ preferences, spacesData, deliveryLog, now });

    // 5. Send notifications
    let notificationsSent = 0;
    webpush.setVapidDetails(vapidConfig.subject!, vapidConfig.publicKey!, vapidConfig.privateKey!);

    for (const notif of scheduleResult.notifications) {
      try {
        const spaceEntry = spaceMap.get(notif.spaceCode);
        if (!spaceEntry) continue;

        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("subscription, endpoint, id")
          .eq("space_id", spaceEntry.id)
          .eq("enabled", true)
          .is("deleted_at", null);

        if (!subscriptions || subscriptions.length === 0) continue;

        const payload = JSON.stringify({
          title: notif.payload.title,
          body: notif.payload.body,
          tag: notif.payload.tag,
          url: notif.payload.url,
          data: { type: notif.payload.type },
        });

        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification(sub.subscription as webpush.PushSubscription, payload);
            notificationsSent++;
          } catch (sendError: unknown) {
            const err = sendError as { statusCode?: number };
            if (err.statusCode === 410 || err.statusCode === 404) {
              await supabase.from("push_subscriptions").update({ enabled: false, updated_at: now.toISOString() }).eq("id", sub.id);
            }
          }
        }

        // Record delivery
        await supabase.from("reminder_delivery_log").upsert({
          space_code: notif.spaceCode, identity: notif.identity,
          reminder_type: notif.payload.type, delivery_date: today, status: "sent",
        }, { onConflict: "space_code,identity,reminder_type,delivery_date" });
      } catch (err) {
        errors.push({ scope: `send_${notif.spaceCode}`, message: err instanceof Error ? err.message : String(err) });
      }
    }

    return NextResponse.json({
      ok: true, checkedAt: now.toISOString(),
      spacesChecked: uniqueSpaceCodes.length,
      notificationsGenerated: scheduleResult.notifications.length,
      notificationsSent,
      skipped: scheduleResult.skipped,
      errors,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false, checkedAt: new Date().toISOString(),
      spacesChecked: 0, notificationsGenerated: 0, notificationsSent: 0,
      skipped: [],
      errors: [{ scope: "cron", message: err instanceof Error ? err.message : String(err) }],
    }, { status: 500 });
  }
}
