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

type ApiSuccess = {
  ok: true;
  data: unknown;
  synced: {
    courses: number | "skipped";
    deadlines: number | "skipped";
  };
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
    throw Object.assign(new Error(`${step} failed: ${detail(result.error) || "unknown error"}`), { step, cause: result.error });
  }
}

function rawPayloadHasField(rawData: unknown, field: string): boolean {
  return (
    rawData != null &&
    typeof rawData === "object" &&
    !Array.isArray(rawData) &&
    field in rawData
  );
}

/**
 * Detect which metadata columns are missing from a Supabase table.
 * Results are cached per-table per-request to avoid repeated queries.
 */
const missingColumnsCache = new Map<string, string[] | "all_present" | "unknown">();

async function getMissingColumns(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  table: string
): Promise<string[]> {
  const cacheKey = table;
  if (missingColumnsCache.has(cacheKey)) {
    const cached = missingColumnsCache.get(cacheKey);
    if (cached === "all_present") return [];
    if (cached === "unknown") return [];
    if (Array.isArray(cached)) return cached;
    return [];
  }

  try {
    // Check deleted_at first (most critical for deletion sync)
    const { error: delErr } = await supabase
      .from(table)
      .select("deleted_at")
      .limit(1);

    if (delErr && isColumnMissingError(delErr)) {
      // deleted_at missing — check others too
      const missing: string[] = ["deleted_at"];

      const { error: createdErr } = await supabase
        .from(table)
        .select("created_at")
        .limit(1);
      if (createdErr && isColumnMissingError(createdErr)) missing.push("created_at");

      const { error: updatedErr } = await supabase
        .from(table)
        .select("updated_at")
        .limit(1);
      if (updatedErr && isColumnMissingError(updatedErr)) missing.push("updated_at");

      missingColumnsCache.set(cacheKey, missing);
      return missing;
    }

    // All columns present
    missingColumnsCache.set(cacheKey, "all_present");
    return [];
  } catch {
    // Can't determine — assume all present to avoid breaking sync
    missingColumnsCache.set(cacheKey, "unknown");
    return [];
  }
}

function isColumnMissingError(error: { message?: string; code?: string }): boolean {
  const msg = error.message || "";
  return (
    msg.includes('column') &&
    (msg.includes('does not exist') || msg.includes('doesn\'t exist') || msg.includes('not found') || msg.includes('does not exist'))
  ) || error.code === "42703"; // PostgreSQL code for undefined_column
}

/**
 * Strip only metadata columns that are confirmed missing from the table.
 * This ensures deleted_at is preserved for syncing when the column exists,
 * while maintaining backward compatibility with older schemas.
 */
async function stripUnsupportedColumns<T extends Record<string, unknown>>(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  table: string,
  rows: T[]
): Promise<T[]> {
  if (rows.length === 0) return rows;

  const missing = await getMissingColumns(supabase, table);
  if (missing.length === 0) return rows; // All columns present — keep everything

  return rows.map((row) => {
    const cleaned = { ...row };
    for (const key of missing) {
      delete cleaned[key];
      // Also delete camelCase variants (e.g., "deletedAt" if "deleted_at" is missing)
      if (key === "deleted_at") delete cleaned["deletedAt"];
      if (key === "created_at") delete cleaned["createdAt"];
      if (key === "updated_at") delete cleaned["updatedAt"];
    }
    return cleaned;
  });
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

    // ----- Courses sync (with anti-accidental-clear protection) -----
    const rawData = body.data;
    const rawHasCourses =
      rawPayloadHasField(rawData, "courses") ||
      rawPayloadHasField(rawData, "schedule") ||
      rawPayloadHasField(rawData, "timetable");

    let syncedCourses: number | "skipped" = "skipped";

    if (rawHasCourses) {
      step = "delete_courses";
      await assertNoError(await supabase.from("courses").delete().eq("space_id", space.id), step);
      if (normalized.courses.length) {
        step = "insert_courses";
        const courseRows = await stripUnsupportedColumns(
          supabase,
          "courses",
          normalized.courses.map((course) => courseToRow(course, space.id))
        );
        await assertNoError(await supabase.from("courses").insert(courseRows), step);
        syncedCourses = courseRows.length;
      } else {
        syncedCourses = 0;
      }
    } else {
      console.log("[upload] raw payload has no courses/schedule/timetable — skipping courses sync");
    }

    // ----- Deadlines sync (with anti-accidental-clear protection) -----
    // Check all legacy field names that normalizeDeadlines accepts
    const rawHasDeadlines =
      rawPayloadHasField(rawData, "deadlines") ||
      rawPayloadHasField(rawData, "ddl") ||
      rawPayloadHasField(rawData, "reminders") ||
      rawPayloadHasField(rawData, "assignments") ||
      rawPayloadHasField(rawData, "tasks");

    let syncedDeadlines: number | "skipped" = "skipped";

    if (rawHasDeadlines) {
      step = "delete_deadlines";
      await assertNoError(await supabase.from("deadlines").delete().eq("space_id", space.id), step);
      if (normalized.deadlines.length) {
        step = "prepare_deadline_rows";
        const deadlineRows = (
          await Promise.all(
            normalized.deadlines.map(async (deadline) => {
              try {
                return deadlineToRow(deadline, space.id);
              } catch (e) {
                console.warn("[upload] skipping invalid deadline row", deadline.id, e);
                return null;
              }
            })
          )
        ).filter((row): row is NonNullable<typeof row> => row !== null);

        step = "insert_deadlines";
        if (deadlineRows.length) {
          const cleanedRows = await stripUnsupportedColumns(supabase, "deadlines", deadlineRows);
          await assertNoError(await supabase.from("deadlines").insert(cleanedRows), step);
          syncedDeadlines = cleanedRows.length;
        } else {
          syncedDeadlines = 0;
        }
      } else {
        syncedDeadlines = 0;
      }
    } else {
      console.log("[upload] raw payload has no deadlines/ddl/reminders/assignments/tasks — skipping deadlines sync");
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

    return NextResponse.json<ApiSuccess>({
      ok: true,
      data: normalized,
      synced: {
        courses: syncedCourses,
        deadlines: syncedDeadlines
      }
    });
  } catch (error) {
    const errorStep = typeof error === "object" && error && "step" in error ? String((error as { step: unknown }).step) : step;
    const code = errorStep.toUpperCase();
    return fail("上传云端失败，本地数据已保留。", code, errorStep, 500, (error as { cause?: unknown })?.cause || error);
  }
}

// Reset cache between requests to keep debug fresh
export const runtime = "nodejs";
export const dynamic = "force-dynamic";