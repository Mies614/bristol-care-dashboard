export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validateAdminPassword } from "@/lib/adminAuth";
import { getDefaultSpaceCodeServer } from "@/lib/spaceCode";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getSpaceByCode } from "@/lib/supabase/spaces";
import { validateBackupPayload, computeMergeResults } from "@/lib/backupTypes";
import { loveNoteFromRow } from "@/lib/mappers";
import type { AlbumItem, Course, Deadline } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    // Admin auth
    const password = request.headers.get("x-admin-password");
    if (!validateAdminPassword(password)) {
      return NextResponse.json({ error: "未授权。" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { error: "Supabase 未配置，无法导入数据到云端。请先在设置页同步本地数据。" },
        { status: 503 }
      );
    }

    // Parse backup JSON from request body
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: "无法解析备份文件，请确认是有效的 JSON 文件。" },
        { status: 400 }
      );
    }

    const validation = validateBackupPayload(raw);
    if (!validation.valid || !validation.payload) {
      return NextResponse.json(
        { error: validation.error || "备份文件验证失败。" },
        { status: 400 }
      );
    }

    const backup = validation.payload;
    const summary = validation.summary!;

    // Determine target space code
    const spaceCode =
      request.nextUrl.searchParams.get("code") ||
      backup.spaceCode ||
      getDefaultSpaceCodeServer();

    const supabase = createSupabaseServerClient();
    const space = await getSpaceByCode(supabase, spaceCode);

    if (!space) {
      return NextResponse.json(
        { error: `目标空间 ${spaceCode} 不存在，请先创建空间。` },
        { status: 404 }
      );
    }

    // Fetch existing records for merge computation
    const [
      existingNotes,
      existingAlbums,
      existingDeadlines,
      existingCourses,
      existingInteractions,
      existingComments,
    ] = await Promise.all([
      supabase
        .from("love_notes")
        .select("id, deleted_at")
        .eq("space_id", space.id),
      supabase
        .from("album_items")
        .select("id, deleted_at")
        .eq("space_id", space.id),
      supabase
        .from("deadlines")
        .select("id, deleted_at")
        .eq("space_id", space.id),
      supabase
        .from("courses")
        .select("id, deleted_at")
        .eq("space_id", space.id),
      supabase
        .from("content_interactions")
        .select("id")
        .eq("space_code", space.code),
      supabase
        .from("content_comments")
        .select("id")
        .eq("space_code", space.code),
    ]);

    // Compute merge results
    const existing = {
      notes: (existingNotes.data || []).map((r) => loveNoteFromRow(r as Parameters<typeof loveNoteFromRow>[0])),
      albums: (existingAlbums.data || []).map((r: Record<string, unknown>) => ({
        id: String(r.id || ""),
        type: (r.type as AlbumItem["type"]) || "photo",
      })) as AlbumItem[],
      deadlines: (existingDeadlines.data || []).map((r: Record<string, unknown>) => ({
        id: String(r.id || ""),
        title: (r.title as string) || "",
        dueDate: (r.due_date as string) || "",
        priority: (r.priority as Deadline["priority"]) || "medium",
        status: (r.status as Deadline["status"]) || "todo",
      })) as Deadline[],
      courses: (existingCourses.data || []).map((r: Record<string, unknown>) => ({
        id: String(r.id || ""),
        name: (r.name as string) || "",
        day: (r.day as Course["day"]) || "Monday",
        startTime: (r.start_time as string) || "09:00",
        endTime: (r.end_time as string) || "10:00",
      })) as Course[],
      interactions: (existingInteractions.data || []).map((r: Record<string, unknown>) => ({
        id: String(r.id || ""),
      })),
      comments: (existingComments.data || []).map((r: Record<string, unknown>) => ({
        id: String(r.id || ""),
      })),
    };

    const mergeResults = computeMergeResults(
      {
        notes: existing.notes,
        albums: existing.albums,
        deadlines: existing.deadlines,
        courses: existing.courses,
        interactions: existing.interactions,
        comments: existing.comments,
      },
      backup
    );

    // Check if there's anything to import
    const totalToInsert =
      mergeResults.notes.toInsert +
      mergeResults.albums.toInsert +
      mergeResults.deadlines.toInsert +
      mergeResults.courses.toInsert +
      mergeResults.interactions.toInsert +
      mergeResults.comments.toInsert;

    // If dry-run mode, just return the merge summary
    const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";
    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        summary,
        mergeResults,
        totalToInsert,
        totalSkipped:
          mergeResults.notes.skipped +
          mergeResults.albums.skipped +
          mergeResults.deadlines.skipped +
          mergeResults.courses.skipped +
          mergeResults.interactions.skipped +
          mergeResults.comments.skipped,
      });
    }

    if (totalToInsert === 0) {
      return NextResponse.json({
        ok: true,
        message: "没有需要导入的新数据，所有记录在目标空间中已存在。",
        summary,
        mergeResults,
        totalToInsert: 0,
        totalSkipped:
          mergeResults.notes.skipped +
          mergeResults.albums.skipped +
          mergeResults.deadlines.skipped +
          mergeResults.courses.skipped +
          mergeResults.interactions.skipped +
          mergeResults.comments.skipped,
      });
    }

    // Perform the actual merge: insert only new IDs
    const errors: string[] = [];

    // Import notes (only non-deleted ones with new IDs)
    const newNotes = backup.data.notes
      .filter((n) => !existing.notes.some((en) => en.id === n.id))
      .filter((n) => !n.deletedAt); // Don't import soft-deleted

    if (newNotes.length > 0) {
      const rows = newNotes.map((n) => ({
        space_id: space.id,
        id: n.id,
        content: n.content || "",
        active: n.active,
        pinned: n.pinned,
        author: n.author || "admin",
        note_type: n.noteType || "text",
        display_style: n.displayStyle || "sticky",
        mood: n.mood || null,
        image_url: n.imageUrl || null,
        image_path: n.imagePath || null,
        image_alt: n.imageAlt || null,
        audio_url: n.audioUrl || null,
        audio_path: n.audioPath || null,
        video_url: n.videoUrl || null,
        video_path: n.videoPath || null,
        media_size: n.mediaSize || null,
        created_at: n.createdAt || new Date().toISOString(),
        created_by: n.createdBy || "import",
        deleted_at: null,
      }));

      const { error } = await supabase.from("love_notes").insert(rows);
      if (error) errors.push(`notes: ${error.message}`);
    }

    // Import deadlines
    const newDeadlines = backup.data.deadlines.filter(
      (d) => !existing.deadlines.some((ed) => ed.id === d.id)
    );
    if (newDeadlines.length > 0) {
      const rows = newDeadlines.map((d) => ({
        space_id: space.id,
        id: d.id,
        title: d.title,
        course_name: d.courseName || null,
        due_date: d.dueDate,
        due_time: d.dueTime || null,
        priority: d.priority || "medium",
        status: d.status || "todo",
        note: d.note || null,
        created_at: d.createdAt || new Date().toISOString(),
        deleted_at: d.deletedAt || null,
      }));

      const { error } = await supabase.from("deadlines").insert(rows);
      if (error) errors.push(`deadlines: ${error.message}`);
    }

    // Import courses
    const newCourses = backup.data.courses.filter(
      (c) => !existing.courses.some((ec) => ec.id === c.id)
    );
    if (newCourses.length > 0) {
      const rows = newCourses.map((c) => ({
        space_id: space.id,
        id: c.id || undefined,
        name: c.name,
        day: c.day,
        start_time: c.startTime,
        end_time: c.endTime,
        location: c.location || null,
        teacher: c.teacher || null,
        note: c.note || null,
        color: c.color || "rose",
        created_at: c.createdAt || new Date().toISOString(),
        deleted_at: c.deletedAt || null,
      }));

      const { error } = await supabase.from("courses").insert(rows);
      if (error) errors.push(`courses: ${error.message}`);
    }

    // Import albums
    const newAlbums = (backup.data.albums || []).filter(
      (a) => !existing.albums.some((ea) => ea.id === a.id)
    );
    if (newAlbums.length > 0) {
      const rows = newAlbums.map((a) => ({
        space_id: space.id,
        id: a.id,
        title: a.title || null,
        note: a.note || null,
        taken_at: a.takenAt || null,
        location: a.location || null,
        type: a.type,
        image_url: a.imageUrl || null,
        image_path: a.imagePath || null,
        video_url: a.videoUrl || null,
        video_path: a.videoPath || null,
        width: a.width || null,
        height: a.height || null,
        file_size: a.fileSize || null,
        is_favorite: a.isFavorite || false,
        created_by: a.createdBy || "import",
        created_at: a.createdAt || new Date().toISOString(),
        deleted_at: a.deletedAt || null,
      }));

      const { error } = await supabase.from("album_items").insert(rows);
      if (error) errors.push(`albums: ${error.message}`);
    }

    // Import period settings if present
    if (backup.data.periodSettings) {
      const { error } = await supabase.from("settings").upsert(
        {
          space_id: space.id,
          key: "period_settings",
          value: backup.data.periodSettings as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "space_id,key" }
      );
      if (error) errors.push(`period_settings: ${error.message}`);
    }

    // Build existing ID sets from previously fetched data
    const existingInteractionIds = new Set(
      existing.interactions.map((i) => i.id)
    );
    const existingCommentIds = new Set(
      existing.comments.map((c) => c.id)
    );

    // Import interactions
    const newInteractions = (backup.data.interactions || []).filter(
      (i) => !existingInteractionIds.has(i.id)
    );
    let interactionsImported = 0;
    if (newInteractions.length > 0) {
      const rows = newInteractions.map((i) => ({
        space_code: space.code,
        id: i.id,
        content_type: i.contentType,
        content_id: i.contentId,
        identity: i.identity,
        interaction_type: i.interactionType,
        reaction: i.reaction || null,
        created_at: i.createdAt || new Date().toISOString(),
        updated_at: i.updatedAt || new Date().toISOString(),
      }));
      const { error } = await supabase.from("content_interactions").insert(rows);
      if (error) errors.push(`interactions: ${error.message}`);
      else interactionsImported = newInteractions.length;
    }
    const interactionsSkipped = (backup.data.interactions || []).length - interactionsImported;

    // Import comments
    const newComments = (backup.data.comments || []).filter(
      (c) => !existingCommentIds.has(c.id)
    );
    let commentsImported = 0;
    if (newComments.length > 0) {
      const rows = newComments.map((c) => ({
        space_code: space.code,
        id: c.id,
        content_type: c.contentType,
        content_id: c.contentId,
        identity: c.identity,
        body: c.body,
        deleted_at: c.deletedAt || null,
        created_at: c.createdAt || new Date().toISOString(),
        updated_at: c.updatedAt || new Date().toISOString(),
      }));
      const { error } = await supabase.from("content_comments").insert(rows);
      if (error) errors.push(`comments: ${error.message}`);
      else commentsImported = newComments.length;
    }
    const commentsSkipped = (backup.data.comments || []).length - commentsImported;

    return NextResponse.json({
      ok: true,
      imported: {
        notes: newNotes.length,
        deadlines: newDeadlines.length,
        courses: newCourses.length,
        albums: newAlbums.length,
        interactions: interactionsImported,
        comments: commentsImported,
      },
      skipped: {
        notes: mergeResults.notes.skipped,
        deadlines: mergeResults.deadlines.skipped,
        courses: mergeResults.courses.skipped,
        albums: mergeResults.albums.skipped,
        interactions: interactionsSkipped,
        comments: commentsSkipped,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "数据导入失败，现有数据未被修改。",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}