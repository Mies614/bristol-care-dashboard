import { NextRequest, NextResponse } from "next/server";
import { validateAdminPassword } from "@/lib/adminAuth";
import { getDefaultSpaceCodeServer, normalizeSpaceCode } from "@/lib/spaceCode";
import { requireSpaceByCode } from "@/lib/supabase/spaces";
import { upsertSetting } from "@/lib/supabase/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!validateAdminPassword(body.password)) {
      return NextResponse.json({ error: "未授权。" }, { status: 401 });
    }

    const code = normalizeSpaceCode(body.code || getDefaultSpaceCodeServer());
    const supabase = createSupabaseServerClient();
    const space = await requireSpaceByCode(supabase, code);

    const girlfriendName = body.girlfriend_name || body.girlfriendName || "小乖";

    // Update girlfriend_name on couple_spaces
    const { error: updateError } = await supabase
      .from("couple_spaces")
      .update({ girlfriend_name: girlfriendName })
      .eq("id", space.id);
    if (updateError) {
      return NextResponse.json({ error: "更新空间信息失败。", detail: updateError.message }, { status: 500 });
    }

    // Preserve existing settings, only update specific ones
    if (body.next_meeting_date !== undefined || body.nextMeetingDate !== undefined) {
      await upsertSetting(supabase, space.id, "app_settings", {
        nextMeetingDate: body.next_meeting_date || body.nextMeetingDate,
        girlfriendName
      });
    }

    if (body.semester_end_date !== undefined || body.semesterEndDate !== undefined) {
      // Get existing app_settings first
      const { data: existingApp } = await supabase
        .from("settings")
        .select("value")
        .eq("space_id", space.id)
        .eq("key", "app_settings")
        .maybeSingle();
      const existingValue = (existingApp?.value as Record<string, unknown>) || {};
      await upsertSetting(supabase, space.id, "app_settings", {
        ...existingValue,
        semesterEndDate: body.semester_end_date || body.semesterEndDate,
        girlfriendName
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({
      error: "设置保存失败。",
      detail: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}

export const PATCH = POST;