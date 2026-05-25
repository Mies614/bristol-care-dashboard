"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { NoteComposer } from "@/components/NoteComposer";
import { NoteWall } from "@/components/NoteWall";
import { PageHeader } from "@/components/PageHeader";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import type { LoveNote } from "@/lib/types";

const filters = [
  ["all", "全部"],
  ["text", "文字"],
  ["audio", "语音"],
  ["image", "照片"],
  ["video", "视频"],
  ["pinned", "置顶"],
  ["me", "我发的"],
  ["xiaoguai", "小乖发的"]
] as const;

const sorts = [
  ["pinned", "置顶优先"],
  ["latest", "最新优先"],
  ["oldest", "最早优先"]
] as const;

function formatApiError(payload: Record<string, unknown>, fallback: string) {
  return [
    typeof payload.error === "string" ? payload.error : fallback,
    typeof payload.code === "string" ? `code: ${payload.code}` : "",
    typeof payload.step === "string" ? `step: ${payload.step}` : "",
    typeof payload.detail === "string" ? `detail: ${payload.detail}` : ""
  ].filter(Boolean).join(" · ");
}

export default function NotesPage() {
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number][0]>("all");
  const [sort, setSort] = useState<(typeof sorts)[number][0]>("pinned");
  const [message, setMessage] = useState("");

  async function loadNotes() {
    const params = new URLSearchParams({ code: getDefaultSpaceCode(), filter, sort });
    const response = await fetch(`/api/notes?${params.toString()}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(formatApiError(payload, "小纸条墙加载失败。"));
      return;
    }
    setNotes(payload.notes || []);
  }

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort]);

  return (
    <AppShell>
      <PageHeader title="小纸条墙" subtitle="把想说的话、当下的声音和照片都放在这里。" />
      <div className="space-y-4">
        <NoteComposer onCreated={loadNotes} />
        <section className="soft-card space-y-3">
          <div className="flex flex-wrap gap-2">
            {filters.map(([value, label]) => (
              <button className={filter === value ? "btn-primary btn-small" : "btn-secondary btn-small"} key={value} onClick={() => setFilter(value)}>
                {label}
              </button>
            ))}
          </div>
          <select className="field" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            {sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {message ? <p className="notice">{message}</p> : null}
        </section>
        <NoteWall notes={notes} />
      </div>
    </AppShell>
  );
}
