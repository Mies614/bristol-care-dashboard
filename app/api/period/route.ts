import { NextRequest, NextResponse } from "next/server";
import { getDefaultSpaceCode, getSpaceByCode } from "@/lib/api/cloud";
import {
  DEFAULT_PERIOD_SETTINGS,
  normalizePeriodRecord,
  normalizePeriodSettings,
  periodRecordToRow,
  validatePeriodRecord
} from "@/lib/period";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { upsertSetting } from "@/lib/supabase/settings";

function developmentDetail(error: unknown) {
  if (process.env.NODE_ENV !== "development") return undefined;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return error instanceof Error ? error.message : undefined;
}

function fail(error: string, code: string, step: string, status = 500, errorObject?: unknown) {
  return NextResponse.json({ ok: false, error, code, step, detail: developmentDetail(errorObject) }, { status });
}

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseServerConfigured()) return fail("经期记录云端未配置。", "SUPABASE_NOT_CONFIGURED", "configure_supabase", 503);
    const code = request.nextUrl.searchParams.get("code") || getDefaultSpaceCode();
    const space = await getSpaceByCode(code);
    if (!space) return fail("记录空间不存在，请检查默认访问码配置。", "SPACE_NOT_FOUND", "get_space", 404);
    const supabase = createSupabaseServerClient();
    const [records, settings] = await Promise.all([
      supabase
        .from("period_records")
        .select("*")
        .eq("space_id", space.id)
        .is("deleted_at", null)
        .order("start_date", { ascending: false }),
      supabase
        .from("settings")
        .select("value")
        .eq("space_id", space.id)
        .eq("key", "period_settings")
        .maybeSingle()
    ]);
    if (records.error) return fail("经期记录读取失败。", "PERIOD_LIST_FAILED", "list_period_records", 500, records.error);
    if (settings.error) return fail("经期设置读取失败。", "PERIOD_SETTINGS_FAILED", "get_period_settings", 500, settings.error);
    return NextResponse.json({
      ok: true,
      records: (records.data || []).map((row) => normalizePeriodRecord(row as Record<string, unknown>)),
      settings: normalizePeriodSettings(settings.data?.value || DEFAULT_PERIOD_SETTINGS)
    });
  } catch (error) {
    return fail("经期记录请求失败。", "PERIOD_GET_FAILED", "get_period", 500, error);
  }
}

export async function POST(request: NextRequest) {
  let step = "parse_body";
  try {
    if (!isSupabaseServerConfigured()) return fail("经期记录云端未配置。", "SUPABASE_NOT_CONFIGURED", "configure_supabase", 503);
    const body = await request.json();
    const code = String(body.code || getDefaultSpaceCode());
    const validated = validatePeriodRecord(body);
    if (!validated.ok) return fail(validated.error, "PERIOD_RECORD_INVALID", "validate_record", 400);
    step = "get_space";
    const space = await getSpaceByCode(code);
    if (!space) return fail("记录空间不存在，请检查默认访问码配置。", "SPACE_NOT_FOUND", "get_space", 404);
    step = "insert_period_record";
    const { data, error } = await createSupabaseServerClient()
      .from("period_records")
      .insert(periodRecordToRow(validated.record, space.id) as never)
      .select("*")
      .single();
    if (error) return fail("经期记录保存失败。", "PERIOD_INSERT_FAILED", "insert_period_record", 500, error);
    return NextResponse.json({ ok: true, record: normalizePeriodRecord(data as Record<string, unknown>) });
  } catch (error) {
    return fail("经期记录提交失败。", "PERIOD_POST_FAILED", step, 500, error);
  }
}

export async function PATCH(request: NextRequest) {
  let step = "parse_body";
  try {
    if (!isSupabaseServerConfigured()) return fail("经期记录云端未配置。", "SUPABASE_NOT_CONFIGURED", "configure_supabase", 503);
    const body = await request.json();
    const code = String(body.code || getDefaultSpaceCode());
    step = "get_space";
    const space = await getSpaceByCode(code);
    if (!space) return fail("记录空间不存在，请检查默认访问码配置。", "SPACE_NOT_FOUND", "get_space", 404);
    const supabase = createSupabaseServerClient();

    if (body.action === "settings") {
      step = "upsert_period_settings";
      const settings = normalizePeriodSettings(body.settings);
      await upsertSetting(supabase, space.id, "period_settings", settings);
      return NextResponse.json({ ok: true, settings });
    }

    if (!body.id) return fail("缺少记录 ID。", "PERIOD_ID_MISSING", "validate_period_id", 400);
    if (body.action === "delete" || body.action === "soft_delete") {
      step = "delete_period_record";
      const { data, error } = await supabase
        .from("period_records")
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("space_id", space.id)
        .eq("id", String(body.id))
        .select("*")
        .single();
      if (error) return fail("经期记录删除失败。", "PERIOD_DELETE_FAILED", step, 500, error);
      return NextResponse.json({ ok: true, deleted: true, record: normalizePeriodRecord(data as Record<string, unknown>) });
    }

    const validated = validatePeriodRecord(body);
    if (!validated.ok) return fail(validated.error, "PERIOD_RECORD_INVALID", "validate_record", 400);
    step = "update_period_record";
    const { data, error } = await supabase
      .from("period_records")
      .update(periodRecordToRow(validated.record, space.id))
      .eq("space_id", space.id)
      .eq("id", String(body.id))
      .select("*")
      .single();
    if (error) return fail("经期记录更新失败。", "PERIOD_UPDATE_FAILED", step, 500, error);
    return NextResponse.json({ ok: true, record: normalizePeriodRecord(data as Record<string, unknown>) });
  } catch (error) {
    return fail("经期记录更新请求失败。", "PERIOD_PATCH_FAILED", step, 500, error);
  }
}
