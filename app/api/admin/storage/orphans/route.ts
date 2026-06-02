export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validateAdminPassword } from "@/lib/adminAuth";
import { getDefaultSpaceCodeServer } from "@/lib/spaceCode";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getSpaceByCode } from "@/lib/supabase/spaces";

const BUCKETS = ["love-notes", "couple-albums", "backgrounds"] as const;

interface OrphanResult {
  bucket: string;
  dbOrphans: string[];   // files in Storage but not referenced in DB
  storageGaps: string[]; // DB paths pointing to missing Storage files
  dbOrphanCount: number;
  storageGapCount: number;
  error?: string;
}

/**
 * GET /api/admin/storage/orphans
 * Check Supabase Storage for orphan files:
 * - dbOrphans: files in Storage buckets not referenced by any DB record
 * - storageGaps: DB records referencing paths that don't exist in Storage
 *
 * Only lists up to 200 files per bucket for performance.
 */
export async function GET(request: NextRequest) {
  try {
    const password = request.headers.get("x-admin-password");
    if (!validateAdminPassword(password)) {
      return NextResponse.json({ error: "未授权。" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json({
        ok: true,
        status: "unavailable",
        message: "Supabase 未配置，无法检查 Storage 孤儿文件。",
        orphans: [],
      });
    }

    const code = request.nextUrl.searchParams.get("code") || getDefaultSpaceCodeServer();
    const supabase = createSupabaseServerClient();
    const space = await getSpaceByCode(supabase, code);

    if (!space) {
      return NextResponse.json({ error: "空间不存在。" }, { status: 404 });
    }

    const results: OrphanResult[] = [];

    for (const bucket of BUCKETS) {
      const bucketResult: OrphanResult = {
        bucket,
        dbOrphans: [],
        storageGaps: [],
        dbOrphanCount: 0,
        storageGapCount: 0,
      };

      try {
        // 1. List all files in the Storage bucket under the space code
        const { data: files, error: listError } = await supabase.storage
          .from(bucket)
          .list(code, { limit: 200 });

        if (listError) {
          // Bucket might not exist, that's OK
          bucketResult.error = `无法列出 ${bucket} 文件：${listError.message}`;
          results.push(bucketResult);
          continue;
        }

        // Build set of storage file paths
        const storagePaths = new Set<string>();
        const sFiles = files || [];
        collectPaths(sFiles, `${code}/`, storagePaths);

        // 2. Collect all DB-referenced paths for this bucket
        const dbPaths = new Set<string>();

        // Love notes: image_path, video_path, audio_path
        const { data: notePaths } = await supabase
          .from("love_notes")
          .select("image_path, video_path, audio_path")
          .eq("space_id", space.id);

        for (const row of notePaths || []) {
          if (row.image_path) dbPaths.add(row.image_path);
          if (row.video_path) dbPaths.add(row.video_path);
          if (row.audio_path) dbPaths.add(row.audio_path);
        }

        // Album items: image_path, video_path
        const { data: albumPaths } = await supabase
          .from("album_items")
          .select("image_path, video_path")
          .eq("space_id", space.id);

        for (const row of albumPaths || []) {
          if (row.image_path) dbPaths.add(row.image_path);
          if (row.video_path) dbPaths.add(row.video_path);
        }

        // 3. Compute orphans and gaps
        for (const sp of storagePaths) {
          if (!dbPaths.has(sp)) {
            bucketResult.dbOrphans.push(sp);
          }
        }
        bucketResult.dbOrphanCount = bucketResult.dbOrphans.length;
        // Limit display to 50
        if (bucketResult.dbOrphans.length > 50) {
          bucketResult.dbOrphans = bucketResult.dbOrphans.slice(0, 50);
        }

        for (const dp of dbPaths) {
          if (!storagePaths.has(dp)) {
            bucketResult.storageGaps.push(dp);
          }
        }
        bucketResult.storageGapCount = bucketResult.storageGaps.length;
        if (bucketResult.storageGaps.length > 50) {
          bucketResult.storageGaps = bucketResult.storageGaps.slice(0, 50);
        }

        results.push(bucketResult);
      } catch (err) {
        bucketResult.error = err instanceof Error ? err.message : String(err);
        results.push(bucketResult);
      }
    }

    const totalDbOrphans = results.reduce((s, r) => s + r.dbOrphanCount, 0);
    const totalStorageGaps = results.reduce((s, r) => s + r.storageGapCount, 0);

    return NextResponse.json({
      ok: true,
      status: "checked",
      summary: {
        totalDbOrphans,
        totalStorageGaps,
        buckets: results.map((r) => ({
          bucket: r.bucket,
          dbOrphanCount: r.dbOrphanCount,
          storageGapCount: r.storageGapCount,
          error: r.error,
        })),
      },
      orphans: results,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: true,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 200 } // Don't fail, return stable structure
    );
  }
}

function collectPaths(
  files: Array<{ name: string; id?: string | null; metadata?: Record<string, unknown> | null }>,
  prefix: string,
  result: Set<string>
) {
  for (const f of files) {
    // If it's a folder marker (id is null in supabase-js list response)
    if (f.id === null) {
      // It's a folder; we don't recurse into subfolders for performance
      continue;
    }
    result.add(prefix + f.name);
  }
}
