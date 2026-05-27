import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import {
  cloudSettingsToRows,
  courseFromRow,
  courseToRow,
  deadlineFromRow,
  deadlineToRow,
  loveNoteFromRow,
  loveNoteToRow,
  quickLinkFromRow,
  quickLinkToRow,
  settingsRowsToCloudSettings
} from "@/lib/mappers";
import type { AppData, CloudSettings, CommonLink, Course, Deadline } from "@/lib/types";
import { defaultBackgroundSettings } from "@/lib/background";
import { DEFAULT_PERIOD_SETTINGS } from "@/lib/period";
import { DEFAULT_THEME_SETTINGS } from "@/lib/theme";

export function cloudUnavailableResponse() {
  return NextResponse.json({ error: "云同步未配置，本地模式可继续使用。" }, { status: 503 });
}

export function getDefaultSpaceCode() {
  return process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE || "xiaoguai520";
}

export async function getSpaceByCode(code: string) {
  if (!isSupabaseServerConfigured()) throw new Error("SUPABASE_NOT_CONFIGURED");
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("couple_spaces")
    .select("id, code, name, girlfriend_name")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; code: string; name: string; girlfriend_name: string } | null;
}

export async function fetchCloudDataByCode(code: string) {
  const space = await getSpaceByCode(code);
  if (!space) return null;
  const supabase = createSupabaseServerClient();
  const [courses, deadlines, settings, loveNotes, quickLinks] = await Promise.all([
    supabase.from("courses").select("*").eq("space_id", space.id).order("day").order("start_time"),
    supabase.from("deadlines").select("*").eq("space_id", space.id).order("due_date"),
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
      .order("created_at", { ascending: false }),
    supabase.from("quick_links").select("*").eq("space_id", space.id).order("sort_order")
  ]);

  for (const result of [courses, deadlines, settings, loveNotes, quickLinks]) {
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
    links: (quickLinks.data || []).map(quickLinkFromRow),
    loveNotes: (loveNotes.data || []).map(loveNoteFromRow),
    backgroundSettings: cloudSettings.backgroundSettings || defaultBackgroundSettings,
    themeSettings: cloudSettings.themeSettings || DEFAULT_THEME_SETTINGS,
    periodRecords: [],
    periodSettings: cloudSettings.periodSettings || DEFAULT_PERIOD_SETTINGS
  };

  return { space, settings: cloudSettings, data: appData };
}

export async function replaceCloudData(code: string, data: AppData) {
  const space = await getSpaceByCode(code);
  if (!space) return null;
  const supabase = createSupabaseServerClient();
  const settings: CloudSettings = {
    girlfriendName: data.nickname || "小乖",
    nextMeetingDate: data.nextMeetDate || null,
    semesterEndDate: data.semesterEndDate || null,
    backgroundSettings: data.backgroundSettings,
    themeSettings: data.themeSettings,
    periodSettings: data.periodSettings
  };

  const deletes = await Promise.all([
    supabase.from("courses").delete().eq("space_id", space.id),
    supabase.from("deadlines").delete().eq("space_id", space.id),
    supabase.from("quick_links").delete().eq("space_id", space.id),
    supabase.from("settings").delete().eq("space_id", space.id),
    supabase.from("love_notes").delete().eq("space_id", space.id).is("image_path", null)
  ]);
  for (const result of deletes) if (result.error) throw result.error;

  const inserts = [];
  if (data.courses.length) inserts.push(supabase.from("courses").insert(data.courses.map((course: Course) => courseToRow(course, space.id))));
  if (data.deadlines.length) inserts.push(supabase.from("deadlines").insert(data.deadlines.map((deadline: Deadline) => deadlineToRow(deadline, space.id))));
  if (data.links.length) inserts.push(supabase.from("quick_links").insert(data.links.map((link: CommonLink) => quickLinkToRow(link, space.id))));
  const textLoveNotes = data.loveNotes.filter((note) => !note.imagePath && !note.imageUrl);
  if (textLoveNotes.length) {
    inserts.push(supabase.from("love_notes").insert(textLoveNotes.map((note) => ({ ...loveNoteToRow(note, space.id), image_url: null, image_path: null }))));
  } else if (data.note.trim()) {
    inserts.push(supabase.from("love_notes").insert({
      space_id: space.id,
      content: data.note.trim(),
      active: true,
      pinned: true,
      visible_from: new Date().toISOString(),
      created_by: "local"
    }));
  }
  inserts.push(supabase.from("settings").insert(cloudSettingsToRows(settings, space.id)));
  inserts.push(supabase.from("couple_spaces").update({ girlfriend_name: settings.girlfriendName || "小乖" }).eq("id", space.id));

  const results = await Promise.all(inserts);
  for (const result of results) if (result.error) throw result.error;
  return fetchCloudDataByCode(code);
}
