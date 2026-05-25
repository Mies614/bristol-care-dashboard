import { NextRequest, NextResponse } from "next/server";
import { getDefaultSpaceCode, getSpaceByCode } from "@/lib/api/cloud";
import { loveNoteFromRow } from "@/lib/mappers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const code = String(body.code || getDefaultSpaceCode());
    const space = await getSpaceByCode(code);
    if (!space) return NextResponse.json({ ok: false, error: "访问码不存在。", code: "SPACE_NOT_FOUND", step: "get_space" }, { status: 404 });
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("love_notes")
      .select("*")
      .eq("space_id", space.id)
      .eq("active", true)
      .lte("visible_from", new Date().toISOString())
      .is("deleted_at", null)
      .order("pinned", { ascending: false })
      .order("visible_from", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, loveNotes: (data || []).map(loveNoteFromRow) });
  } catch {
    return NextResponse.json({ ok: false, error: "小纸条同步失败。", code: "LOVE_NOTES_SYNC_FAILED", step: "sync_love_notes" }, { status: 500 });
  }
}
