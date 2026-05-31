import { NextRequest, NextResponse } from "next/server";
import { courseToRow, deadlineToRow } from "@/lib/mappers";
import { getDefaultSpaceCode, getSpaceByCode } from "@/lib/api/cloud";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildSettingsRows, normalizeLocalData } from "@/lib/uploadNormalize";

type ApiError = {
  ok: false;
  error: string;
  code: string;
  step: string;
  detail?: string;
};

function detail(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String((error as { message: unknown }).message);
  return undefined;
}

function fail(error: string, code: string, step: string, status = 500, errorObject?: unknown) {
  return NextResponse.json<ApiError>({ ok: false, error, code, step, detail: detail(errorObject) }, { status });
}

async function assertNoError(result: { error: unknown }, step: string) {
  if (result.error) {
    throw Object.assign(new Error(step), { step, cause: result.error });
  }
}

export async function POST(request: NextRequest) {
  let step = "parse_body";
  try {
    const body = await request.json();
    const code = String(body.code || getDefaultSpaceCode());
    if (body.mode !== "uploadLocalToCloud") return fail("不支持的上传模式。", "INVALID_UPLOAD_MODE", "parse_body", 400);

    step = "normalize_local_data";
    const normalized = normalizeLocalData(body.data);

    step = "get_space";
    const space = await getSpaceByCode(code);
    if (!space) return fail(`没有找到 ${code}，请检查 couple_spaces 表。`, "SPACE_NOT_FOUND", "get_space", 404);
    const supabase = createSupabaseServerClient();

    step = "delete_old_courses";
    await assertNoError(await supabase.from("courses").delete().eq("space_id", space.id), step);
    if (normalized.courses.length) {
      step = "insert_courses";
      await assertNoError(await supabase.from("courses").insert(normalized.courses.map((course) => courseToRow(course, space.id))), step);
    }

    step = "delete_old_deadlines";
    await assertNoError(await supabase.from("deadlines").delete().eq("space_id", space.id), step);
    if (normalized.deadlines.length) {
      step = "insert_deadlines";
      await assertNoError(await supabase.from("deadlines").insert(normalized.deadlines.map((deadline) => deadlineToRow(deadline, space.id))), step);
    }

    step = "upsert_settings";
    const settingsRows = buildSettingsRows(normalized.settings, space.id);
    const sanitizedSettingsRows = settingsRows.map((row) => ({
      ...row,
      value: row.value === null || row.value === undefined ? "" : row.value
    }));
    if (process.env.NODE_ENV === "development") {
      const invalidRows = sanitizedSettingsRows.filter((row) => row.value === null || row.value === undefined);
      if (invalidRows.length > 0) {
        console.error("[settings invalid rows]", invalidRows.map((row) => row.key));
        return NextResponse.json(
          {
            ok: false,
            error: "settingsRows 中仍有空 value。",
            code: "SETTINGS_VALUE_STILL_NULL",
            step: "upsert_settings",
            detail: invalidRows.map((row) => row.key).join(", ")
          },
          { status: 500 }
        );
      }
    }
    await assertNoError(await supabase.from("settings").upsert(sanitizedSettingsRows, { onConflict: "space_id,key" }), step);
    await assertNoError(await supabase.from("couple_spaces").update({ girlfriend_name: normalized.settings.girlfriendName || "小乖" }).eq("id", space.id), step);

    return NextResponse.json({ ok: true, data: normalized });
  } catch (error) {
    const errorStep = typeof error === "object" && error && "step" in error ? String((error as { step: unknown }).step) : step;
    const code = errorStep.toUpperCase();
    if (errorStep === "upsert_settings") {
      return fail("设置同步失败，请检查 settings 表 value 字段。", "UPSERT_SETTINGS", "upsert_settings", 500, (error as { cause?: unknown })?.cause || error);
    }
    return fail("上传云端失败，本地数据已保留。", code, errorStep, 500, (error as { cause?: unknown })?.cause || error);
  }
}
