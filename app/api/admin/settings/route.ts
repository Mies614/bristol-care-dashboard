import { NextRequest, NextResponse } from "next/server";
import { validateAdminPassword } from "@/lib/adminAuth";
import { getDefaultSpaceCode, getSpaceByCode } from "@/lib/api/cloud";
import { cloudSettingsToRows, settingsRowsToCloudSettings } from "@/lib/mappers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!validateAdminPassword(body.password)) return NextResponse.json({ error: "未授权。" }, { status: 401 });
    const code = String(body.code || getDefaultSpaceCode());
    const space = await getSpaceByCode(code);
    if (!space) return NextResponse.json({ error: "访问码不存在。" }, { status: 404 });
    const supabase = createSupabaseServerClient();

    // 先获取当前云端已有的 settings，避免覆盖 background/theme/period 设置
    const { data: existingRows } = await supabase
      .from("settings")
      .select("key,value")
      .eq("space_id", space.id);
    const existingSettings = settingsRowsToCloudSettings(existingRows || [], space.girlfriend_name || "小乖");

    const girlfriendName = body.girlfriend_name || body.girlfriendName || "小乖";
    const rows = cloudSettingsToRows(
      {
        girlfriendName,
        nextMeetingDate: body.next_meeting_date || body.nextMeetingDate || existingSettings.nextMeetingDate,
        semesterEndDate: body.semester_end_date || body.semesterEndDate || existingSettings.semesterEndDate,
        backgroundSettings: existingSettings.backgroundSettings,
        themeSettings: existingSettings.themeSettings,
        periodSettings: existingSettings.periodSettings
      },
      space.id
    );

    const { error } = await supabase.from("settings").upsert(rows, { onConflict: "space_id,key" });
    if (error) throw error;
    const update = await supabase.from("couple_spaces").update({ girlfriend_name: girlfriendName }).eq("id", space.id);
    if (update.error) throw update.error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "设置保存失败。" }, { status: 500 });
  }
}

export const PATCH = POST;