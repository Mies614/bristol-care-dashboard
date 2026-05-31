import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getSpaceByCode as getSpaceByCodeFromLib } from "@/lib/supabase/spaces";
import { getDefaultSpaceCodeServer } from "@/lib/spaceCode";
import {
  courseFromRow,
  deadlineFromRow,
  loveNoteFromRow,
  settingsRowsToCloudSettings
} from "@/lib/mappers";
import type { AppData } from "@/lib/types";
import { DEFAULT_BACKGROUND_SETTINGS } from "@/lib/supabase/settings";
import { DEFAULT_PERIOD_SETTINGS } from "@/lib/period";
import { DEFAULT_THEME_SETTINGS } from "@/lib/theme";

export function cloudUnavailableResponse() {
  return NextResponse.json({ error: "云同步未配置，本地模式可继续使用。" }, { status: 503 });
}

export function getDefaultSpaceCode() {
  return getDefaultSpaceCodeServer();
}

export async function getSpaceByCode(code: string) {
  if (!isSupabaseServerConfigured()) throw new Error("SUPABASE_NOT_CONFIGURED");
  const supabase = createSupabaseServerClient();
  return getSpaceByCodeFromLib(supabase, code);
}

export async function fetchCloudDataByCode(code: string) {
  const space = await getSpaceByCode(code);
  if (!space) return null;
  const supabase = createSupabaseServerClient();
  const [courses, deadlines, settings, loveNotes] = await Promise.all([
    supabase.from("courses").select("*").eq("space_id", space.id).order("day").order("start_time"),
    supabase.from("deadlines").select("*").eq("space_id", space.id).is("deleted_at", null).order("due_date"),
    supabase.from("settings").select("key,value").eq("space_id", space.id),
    supabase
      .from("love_notes")
      .select("*")
      .eq("space_id", space.id)
      .eq("active", true)
      .lte("visible_from", new Date().toISOString())
      .is("deleted_at", null)
      .order("pinned", { ascending: false })
      .order("visible_from", { ascending: false })
      .order("created_at", { ascending: false })
  ]);

  for (const result of [courses, deadlines, settings, loveNotes]) {
    if (result.error) throw result.error;
  }

  const cloudSettings = settingsRowsToCloudSettings(settings.data || [], space.girlfriend_name || "小乖");
  const appData: AppData = {
    nickname: cloudSettings.girlfriendName || space.girlfriend_name || "小乖",
    nextMeetDate: cloudSettings.nextMeetingDate || "",
    semesterEndDate: cloudSettings.semesterEndDate || "",
    note: (loveNotes.data?.[0]?.content as string | undefined) || "",
    courses: (courses.data || []).map(courseFromRow),
    deadlines: (deadlines.data || []).map(deadlineFromRow),
    links: [],
    loveNotes: (loveNotes.data || []).map(loveNoteFromRow),
    backgroundSettings: cloudSettings.backgroundSettings || DEFAULT_BACKGROUND_SETTINGS,
    themeSettings: cloudSettings.themeSettings || DEFAULT_THEME_SETTINGS,
    periodRecords: cloudSettings.periodRecords || [],
    periodSettings: cloudSettings.periodSettings || DEFAULT_PERIOD_SETTINGS
  };

  return { space, settings: cloudSettings, data: appData };
}