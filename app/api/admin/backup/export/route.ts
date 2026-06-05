export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validateAdminPassword } from "@/lib/adminAuth";
import { getDefaultSpaceCodeServer } from "@/lib/spaceCode";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getSpaceByCode } from "@/lib/supabase/spaces";
import {
  courseFromRow,
  deadlineFromRow,
  loveNoteFromRow,
  albumItemFromRow,
  settingsRowsToCloudSettings,
} from "@/lib/mappers";
import { BACKUP_SCHEMA_VERSION, type BackupPayload } from "@/lib/backupTypes";

export async function GET(request: NextRequest) {
  try {
    const password = request.headers.get("x-admin-password");
    if (!validateAdminPassword(password)) {
      return NextResponse.json({ error: "未授权。" }, { status: 401 });
    }

    const spaceCode =
      request.nextUrl.searchParams.get("code") || getDefaultSpaceCodeServer();

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        {
          storageMode: "localStorage",
          hint: "Supabase 未配置，请从设置页导出本地数据。服务器端只能导出 Supabase 数据。",
        },
        { status: 503 }
      );
    }

    const supabase = createSupabaseServerClient();
    const space = await getSpaceByCode(supabase, spaceCode);

    if (!space) {
      return NextResponse.json(
        { error: `空间 ${spaceCode} 不存在。` },
        { status: 404 }
      );
    }

    const [
      coursesRes,
      deadlinesRes,
      loveNotesRes,
      albumsRes,
      settingsRes,
      interactionsRes,
      commentsRes,
      contentReadsRes,
    ] = await Promise.all([
      supabase.from("courses").select("*").eq("space_id", space.id).order("day").order("start_time"),
      supabase.from("deadlines").select("*").eq("space_id", space.id).order("due_date"),
      supabase.from("love_notes").select("*").eq("space_id", space.id).order("created_at", { ascending: false }),
      supabase.from("album_items").select("*").eq("space_id", space.id).order("created_at", { ascending: false }),
      supabase.from("settings").select("key,value").eq("space_id", space.id),
      supabase.from("content_interactions").select("*").eq("space_code", space.code).order("created_at", { ascending: false }),
      supabase.from("content_comments").select("*").eq("space_code", space.code).order("created_at", { ascending: false }),
      supabase.from("content_reads").select("content_type, content_id, identity, read_at").eq("space_code", space.code).order("read_at", { ascending: false }),
    ]);

    for (const result of [coursesRes, deadlinesRes, loveNotesRes, albumsRes, settingsRes, interactionsRes, commentsRes, contentReadsRes]) {
      if (result.error) {
        return NextResponse.json(
          { error: "数据读取失败。", detail: result.error.message },
          { status: 500 }
        );
      }
    }

    const cloudSettings = settingsRowsToCloudSettings(
      settingsRes.data || [],
      space.girlfriend_name || "小乖"
    );

    const backup: BackupPayload = {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: "1.0.0",
      storageMode: "supabase",
      spaceCode,
      data: {
        notes: (loveNotesRes.data || []).map((row) => {
          const note = loveNoteFromRow(row as never);
          return { id: note.id, content: note.content, active: note.active, pinned: note.pinned, author: note.author, noteType: note.noteType, displayStyle: note.displayStyle, mood: note.mood, createdAt: note.createdAt, createdBy: note.createdBy, imageUrl: note.imageUrl, imagePath: note.imagePath, imageAlt: note.imageAlt, audioUrl: note.audioUrl, audioPath: note.audioPath, videoUrl: note.videoUrl, videoPath: note.videoPath, mediaSize: note.mediaSize, deletedAt: note.deletedAt };
        }),
        albums: (albumsRes.data || []).map((row) => {
          const album = albumItemFromRow(row as never);
          return { id: album.id, title: album.title, note: album.note, takenAt: album.takenAt, location: album.location, type: album.type, imageUrl: album.imageUrl, imagePath: album.imagePath, videoUrl: album.videoUrl, videoPath: album.videoPath, width: album.width, height: album.height, fileSize: album.fileSize, isFavorite: album.isFavorite, createdBy: album.createdBy, createdAt: album.createdAt, deletedAt: album.deletedAt };
        }),
        deadlines: (deadlinesRes.data || []).map((row) => {
          const d = deadlineFromRow(row as never);
          return { id: d.id, title: d.title, courseName: d.courseName, dueDate: d.dueDate, dueTime: d.dueTime, priority: d.priority, status: d.status, note: d.note, createdAt: d.createdAt, deletedAt: d.deletedAt };
        }),
        courses: (coursesRes.data || []).map((row) => {
          const c = courseFromRow(row as never);
          return { id: c.id, name: c.name, day: c.day, startTime: c.startTime, endTime: c.endTime, location: c.location, teacher: c.teacher, note: c.note, color: c.color, createdAt: c.createdAt, deletedAt: c.deletedAt };
        }),
        periodRecords: cloudSettings.periodRecords?.map((r) => ({ id: r.id, startDate: r.startDate, endDate: r.endDate, flow: r.flow, symptoms: r.symptoms, mood: r.mood, note: r.note, createdAt: r.createdAt, deletedAt: r.deletedAt })),
        periodSettings: cloudSettings.periodSettings,
        interactions: (interactionsRes.data || []).map((r) => ({ id: r.id as string, spaceCode: r.space_code as string | undefined, contentType: r.content_type as string, contentId: r.content_id as string, identity: r.identity as string, interactionType: r.interaction_type as string, reaction: r.reaction as string | undefined, createdAt: r.created_at as string | undefined, updatedAt: r.updated_at as string | undefined })),
        comments: (commentsRes.data || []).map((r) => ({ id: r.id as string, spaceCode: r.space_code as string | undefined, contentType: r.content_type as string, contentId: r.content_id as string, identity: r.identity as string, body: r.body as string, deletedAt: r.deleted_at as string | undefined, createdAt: r.created_at as string | undefined, updatedAt: r.updated_at as string | undefined })),
        contentReads: (contentReadsRes.data || []).map((r: Record<string, unknown>) => ({ contentType: r.content_type as string, contentId: r.content_id as string, identity: r.identity as string, readAt: r.read_at as string })),
        appSettings: { nickname: cloudSettings.girlfriendName || "小乖", nextMeetDate: cloudSettings.nextMeetingDate || "", semesterEndDate: cloudSettings.semesterEndDate || undefined },
      },
    };

    const fileName = `bristol-care-backup-${spaceCode}-${new Date().toISOString().split("T")[0]}.json`;
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${fileName}"` },
    });
  } catch (err) {
    return NextResponse.json({ error: "备份导出失败。", detail: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}