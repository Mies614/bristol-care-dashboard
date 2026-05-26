"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { NoteComposer } from "@/components/NoteComposer";
import { NoteWall } from "@/components/NoteWall";
import { SharedAccessGate } from "@/components/SharedAccessGate";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import type { LoveNote } from "@/lib/types";

const filters = [
  ["all", "全部"],
  ["pinned", "置顶"],
  ["text", "文字"],
  ["audio", "语音"],
  ["image", "照片"],
  ["video", "视频"],
  ["mixed", "混合"],
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
  const [query, setQuery] = useState("");
  const [style, setStyle] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [message, setMessage] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);

  async function loadNotes() {
    const params = new URLSearchParams({ code: getDefaultSpaceCode(), filter, sort });
    if (query.trim()) params.set("q", query.trim());
    if (style) params.set("style", style);
    if (includeInactive) params.set("includeInactive", "true");
    const response = await fetch(`/api/notes?${params.toString()}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(formatApiError(payload, "小纸条墙加载失败。"));
      return;
    }
    setNotes(payload.notes || []);
  }

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("compose=1")) setComposerOpen(true);
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort]);

  async function patchNote(body: Record<string, unknown>) {
    setMessage("");
    const response = await fetch("/api/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: getDefaultSpaceCode(), ...body })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(formatApiError(payload, "小纸条更新失败。"));
      return;
    }
    setMessage(payload.deleted ? "已删除。" : "已更新。");
    await loadNotes();
  }

  return (
    <SharedAccessGate>
    <AppShell>
      <section className="mb-4 rounded-[2rem] border border-white/75 bg-gradient-to-br from-white/88 via-blush/55 to-lilac/60 p-5 shadow-float backdrop-blur-xl">
        <p className="section-kicker mb-1">Note Wall</p>
        <h1 className="text-2xl font-semibold text-cocoa">小纸条墙</h1>
        <p className="mt-2 text-sm leading-6 text-cocoa/65">把想说的话、当下的声音和照片都放在这里。</p>
        <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
          {["写文字", "录语音", "发照片", "发视频"].map((item) => <span className="rounded-full bg-white/60 px-2 py-2 text-center text-cocoa/65" key={item}>{item}</span>)}
        </div>
      </section>
      <div className="space-y-4">
        <section className="soft-card">
          <button className="flex w-full items-center justify-between text-left" onClick={() => setComposerOpen((value) => !value)} type="button">
            <span>
              <span className="section-kicker mb-1 block">Compose</span>
              <span className="font-semibold text-cocoa">写一张小纸条</span>
            </span>
            <span className="btn-secondary btn-small">{composerOpen ? "收起" : "展开"}</span>
          </button>
          <div className={`grid transition-all duration-300 ${composerOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              <NoteComposer onCreated={async () => { await loadNotes(); setComposerOpen(false); }} />
            </div>
          </div>
        </section>
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
          <div className="grid grid-cols-2 gap-2">
            <input className="field" placeholder="搜索内容、心情或作者" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") loadNotes(); }} />
            <select className="field" value={style} onChange={(event) => setStyle(event.target.value)}>
              <option value="">所有样式</option>
              <option value="sticky">便签</option>
              <option value="postcard">明信片</option>
              <option value="bubble">气泡</option>
              <option value="photo_card">照片卡</option>
              <option value="timeline">时间线</option>
              <option value="minimal">极简</option>
              <option value="romantic">浪漫</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="check-card flex-1">
              <input checked={includeInactive} type="checkbox" onChange={(event) => setIncludeInactive(event.target.checked)} />
              显示隐藏的小纸条
            </label>
            <button className="btn-secondary btn-small" onClick={loadNotes}>搜索/刷新</button>
          </div>
          {message ? <p className="notice">{message}</p> : null}
        </section>
        <NoteWall notes={notes} onPatch={patchNote} />
      </div>
    </AppShell>
    </SharedAccessGate>
  );
}
