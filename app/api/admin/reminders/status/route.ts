export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validateAdminPassword } from "@/lib/adminAuth";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getVapidConfig } from "@/lib/push";

export async function GET(request: NextRequest) {
  try {
    const password = request.headers.get("x-admin-password");
    if (!validateAdminPassword(password)) {
      return NextResponse.json({ error: "未授权。" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json({
        status: "unavailable",
        message: "Supabase 未配置，提醒监控不可用。",
      });
    }

    const supabase = createSupabaseServerClient();
    const vapidConfig = getVapidConfig();

    // Recent 10 run logs
    const { data: recentLogs, error: logError } = await supabase
      .from("reminder_run_logs")
      .select("*")
      .order("checked_at", { ascending: false })
      .limit(10);

    if (logError) {
      return NextResponse.json({
        error: "无法读取运行日志。",
        detail: logError.message,
      }, { status: 500 });
    }

    // 7-day stats
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: weekLogs, error: weekError } = await supabase
      .from("reminder_run_logs")
      .select("ok, notifications_generated, notifications_sent, skipped, errors")
      .gte("checked_at", sevenDaysAgo);

    if (weekError) {
      return NextResponse.json({
        error: "无法读取周统计。",
        detail: weekError.message,
      }, { status: 500 });
    }

    const totalRuns = (weekLogs || []).length;
    const successfulRuns = (weekLogs || []).filter((l: Record<string, unknown>) => l.ok).length;
    const failedRuns = totalRuns - successfulRuns;
    const totalGenerated = (weekLogs || []).reduce(
      (sum: number, l: Record<string, unknown>) => sum + ((l.notifications_generated as number) || 0), 0
    );
    const totalSent = (weekLogs || []).reduce(
      (sum: number, l: Record<string, unknown>) => sum + ((l.notifications_sent as number) || 0), 0
    );

    // Aggregate skipped reasons
    const skippedMap = new Map<string, number>();
    for (const log of weekLogs || []) {
      const skipped = (log.skipped as Array<{ reason: string; count: number }>) || [];
      for (const s of skipped) {
        skippedMap.set(s.reason, (skippedMap.get(s.reason) || 0) + s.count);
      }
    }
    const commonSkipped = Array.from(skippedMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Aggregate errors (only message, not scope)
    const errorMap = new Map<string, number>();
    for (const log of weekLogs || []) {
      const errs = (log.errors as Array<{ scope: string; message: string }>) || [];
      for (const e of errs) {
        const key = `${e.scope}: ${e.message}`;
        errorMap.set(key, (errorMap.get(key) || 0) + 1);
      }
    }
    const commonErrors = Array.from(errorMap.entries())
      .map(([message, count]) => ({ message: message.length > 100 ? message.slice(0, 100) + "..." : message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Config status
    const { count: subCount } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("enabled", true)
      .is("deleted_at", null);

    const { count: prefCount } = await supabase
      .from("reminder_preferences")
      .select("id", { count: "exact", head: true })
      .eq("enabled", true);

    return NextResponse.json({
      ok: true,
      config: {
        cronSecret: process.env.CRON_SECRET ? "configured" : "missing",
        vapid: vapidConfig.configured ? "configured" : "missing",
        supabase: "available",
        activePushSubscriptions: subCount || 0,
        reminderPreferences: prefCount || 0,
      },
      recentLogs: (recentLogs || []).map((l: Record<string, unknown>) => ({
        id: l.id,
        checkedAt: l.checked_at,
        triggerType: l.trigger_type,
        ok: l.ok,
        spacesChecked: l.spaces_checked,
        notificationsGenerated: l.notifications_generated,
        notificationsSent: l.notifications_sent,
        skipped: Array.isArray(l.skipped) ? (l.skipped as Array<Record<string, unknown>>).slice(0, 5) : [],
        errors: Array.isArray(l.errors) ? (l.errors as Array<Record<string, unknown>>).slice(0, 3) : [],
        durationMs: l.duration_ms,
      })),
      stats: {
        totalRuns,
        successfulRuns,
        failedRuns,
        notificationsGenerated: totalGenerated,
        notificationsSent: totalSent,
        commonSkippedReasons: commonSkipped,
        commonErrors,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "提醒状态查询失败。",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
