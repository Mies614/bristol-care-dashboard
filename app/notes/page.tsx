"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { NoteComposer } from "@/components/NoteComposer";
import { NoteWall } from "@/components/NoteWall";
import { SharedAccessGate } from "@/components/SharedAccessGate";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { Input } from "@/components/ui/input";
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
      {/* Hero */}
      <header className="mb-4 overflow-hidden rounded-[2rem] border border-white/75 bg-gradient-to-br from-white/88 via-blush/55 to-lilac/60 p-5 shadow-float backdrop-blur-xl">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">Note Wall</p>
        <h1 className="text-2xl font-semibold text-[var(--app-text)]">小纸条墙</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">把想说的话、当下的声音和照片都放在这里。</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {["写文字", "录语音", "发照片", "发视频"].map((item) => (
            <span className="rounded-full bg-white/60 px-2 py-2 text-center text-xs text-[var(--app-muted)]" key={item}>{item}</span>
          ))}
        </div>
      </header>

      <div className="space-y-4">
        {/* Composer */}
        <AppCard>
          <button className="flex w-full items-center justify-between text-left" onClick={() => setComposerOpen((v) => !v)} type="button">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">Compose</p>
              <p className="font-semibold text-[var(--app-text)]">写一张小纸条</p>
            </div>
            <AppButton variant="secondary" size="sm" type="button">{composerOpen ? "收起" : "展开"}</AppButton>
          </button>
          <div className={`grid transition-all duration-300 ${composerOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              <NoteComposer onCreated={async () => { await loadNotes(); setComposerOpen(false); }} />
            </div>
          </div>
        </AppCard>

        {/* Filters */}
        <AppCard>
          <div className="flex flex-wrap gap-2 mb-3">
            {filters.map(([value, label]) => (
              <AppButton
                variant={filter === value ? "primary" : "secondary"}
                size="sm"
                key={value}
                onClick={() => setFilter(value)}
              >
                {label}
              </AppButton>
            ))}
          </div>
          <select
            className="mb-3 w-full rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            {sorts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Input placeholder="搜索内容、心情或作者" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") loadNotes(); }} />
            <select
              className="w-full rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-3 py-2 text-sm text-[var(--app-text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-accent)]"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            >
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
            <label className="flex items-center gap-2 rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-4 py-3 shadow-sm cursor-pointer">
              <input checked={includeInactive} type="checkbox" className="accent-[var(--app-accent)]" onChange={(e) => setIncludeInactive(e.target.checked)} />
              <span className="text-sm text-[var(--app-text)]">显示隐藏的小纸条</span>
            </label>
            <AppButton variant="secondary" size="sm" onClick={loadNotes}>搜索/刷新</AppButton>
          </div>
          {message ? (
            <div className="mt-3 rounded-[var(--app-radius)] border border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] p-3 text-sm text-[var(--app-accent)]">{message}</div>
          ) : null}
        </AppCard>

        <NoteWall notes={notes} onPatch={patchNote} />
      </div>
    </AppShell>
    </SharedAccessGate>
  );
}