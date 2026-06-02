export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getVapidConfig } from "@/lib/push";
import { fetchBristolWeather } from "@/lib/weather";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { scheduleReminders, type ServerReminderPreference, type SpaceData, type ReminderDeliveryRecord } from "@/lib/serverReminderScheduler";
import { DEFAULT_PERIOD_SETTINGS, getDaysUntilNextPeriod, getCurrentCycleDay } from "@/lib/period";
import type { PeriodRecord } from "@/lib/types";

function getCronSecret(): string {
  return process.env.CRON_SECRET || "";
}

function isAuthorized(request: NextRequest): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  const authHeader = request.headers.get("authorization") || "";
  return authHeader === `Bearer ${secret}`;
}

async function writeRunLog(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  data: {
    checkedAt: string;
    triggerType: string;
    ok: boolean;
    spacesChecked: number;
    generated: number;
    sent: number;
    skipped: Array<{ reason: string; count: number }>;
    errors: Array<{ scope: string; message: string }>;
    durationMs: number;
  }
) {
  try {
    await supabase.from("reminder_run_logs").insert({
      checked_at: data.checkedAt,
      trigger_type: data.triggerType,
      ok: data.ok,
      spaces_checked: data.spacesChecked,
      notifications_generated: data.generated,
      notifications_sent: data.sent,
      skipped: JSON.stringify(data.skipped.slice(0, 20)),
      errors: JSON.stringify(data.errors.slice(0, 10)),
      duration_ms: data.durationMs,
    });
  } catch {
    // Run log write failure is non-fatal
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const triggerType = "cron";
  let spacesChecked = 0;
  let generated = 0;
  let sent = 0;
  const skipped: Array<{ reason: string; count: number }> = [];
  const errors: Array<{ scope: string; message: string }> = [];

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
      errors.push({ scope: "preferences", message: prefsError.message });
      await writeRunLog(supabase, { checkedAt: now.toISOString(), triggerType, ok: false, spacesChecked: 0, generated: 0, sent: 0, skipped, errors, durationMs: Date.now() - startTime });
      return NextResponse.json({
        ok: false, checkedAt: now.toISOString(),
        spacesChecked: 0, notificationsGenerated: 0, notificationsSent: 0,
        skipped: [], errors,
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
      skipped.push({ reason: "no_preferences", count: 1 });
      await writeRunLog(supabase, { checkedAt: now.toISOString(), triggerType, ok: true, spacesChecked: 0, generated: 0, sent: 0, skipped, errors, durationMs: Date.now() - startTime });
      return NextResponse.json({
        ok: true, checkedAt: now.toISOString(),
        spacesChecked: 0, notificationsGenerated: 0, notificationsSent: 0,
        skipped, errors: [],
      });
    }

    // 2. Fetch delivery log
    const { data: logData, error: logError } = await supabase
      .from("reminder_delivery_log")
      .select("space_code, identity, reminder_type, delivery_date")
      .eq("delivery_date", today);

    if (logError) {
      errors.push({ scope: "delivery_log", message: logError.message });
      await writeRunLog(supabase, { checkedAt: now.toISOString(), triggerType, ok: false, spacesChecked: 0, generated: 0, sent: 0, skipped, errors, durationMs: Date.now() - startTime });
      return NextResponse.json({
        ok: false, checkedAt: now.toISOString(),
        spacesChecked: 0, notificationsGenerated: 0, notificationsSent: 0,
        skipped: [], errors,
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

    // 3. Fetch space data
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

    for (const spaceCode of uniqueSpaceCodes) {
      try {
        const space = spaceMap.get(spaceCode);
        if (!space) {
          errors.push({ scope: `space_${spaceCode}`, message: "Space not found" });
          continue;
        }

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

        const { data: periodSetting } = await supabase
          .from("settings")
          .select("value")
          .eq("space_id", space.id)
          .eq("key", "period_records")
          .maybeSingle();

        const periodRecords = Array.isArray((periodSetting?.value as Record<string, unknown>)?.records)
          ? ((periodSetting?.value as Record<string, unknown>).records as Array<Record<string, unknown>>)
          : [];

        let weather;
        try { weather = await fetchBristolWeather(); } catch { /* optional */ }

        const periodSettings = DEFAULT_PERIOD_SETTINGS;
        const daysUntilNext = getDaysUntilNextPeriod(periodRecords as PeriodRecord[], periodSettings, now);
        const cycleDay = getCurrentCycleDay(periodRecords as PeriodRecord[], now);

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
    generated = scheduleResult.notifications.length;
    spacesChecked = uniqueSpaceCodes.length;
    for (const s of scheduleResult.skipped) skipped.push(s);

    // 5. Send notifications
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
            sent++;
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

    // 6. Write run log
    await writeRunLog(supabase, {
      checkedAt: now.toISOString(),
      triggerType,
      ok: errors.length === 0,
      spacesChecked,
      generated,
      sent,
      skipped,
      errors,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      ok: true, checkedAt: now.toISOString(),
      spacesChecked,
      notificationsGenerated: generated,
      notificationsSent: sent,
      skipped: scheduleResult.skipped,
      errors,
    });
  } catch (err) {
    errors.push({ scope: "cron", message: err instanceof Error ? err.message : String(err) });
    // Attempt to log even on catch
    try {
      const supabase = createSupabaseServerClient();
      await writeRunLog(supabase, {
        checkedAt: new Date().toISOString(),
        triggerType,
        ok: false,
        spacesChecked: 0,
        generated,
        sent,
        skipped,
        errors,
        durationMs: Date.now() - startTime,
      });
    } catch { /* log failure is non-fatal */ }

    return NextResponse.json({
      ok: false, checkedAt: new Date().toISOString(),
      spacesChecked: 0, notificationsGenerated: 0, notificationsSent: 0,
      skipped: [], errors,
    }, { status: 500 });
  }
}