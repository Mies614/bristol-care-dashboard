"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AppShell } from "@/components/AppShell";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminOverviewCard } from "@/components/admin/AdminOverviewCard";
import { getDefaultSpaceCode, isCloudConfigured } from "@/lib/cloudSync";
import { validateImageFile } from "@/lib/imageValidation";
import { getUserFacingAuthorLabel } from "@/lib/identity";
import { defaultAppData } from "@/lib/sampleData";
import { DEFAULT_PERIOD_SETTINGS } from "@/lib/period";
import type { AlbumItem, AppData, LoveNote, PeriodRecord, PeriodSettings } from "@/lib/types";
import { MissYouAdminCard } from "@/components/MissYouAdminCard";

const ADMIN_PASSWORD_KEY = "bristol-care-admin-password-v1";

type AdminTab = "overview" | "notes" | "albums" | "missyou" | "settings" | "diagnostics";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [code, setCode] = useState(getDefaultSpaceCode());
  const [message, setMessage] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [updatingNoteId, setUpdatingNoteId] = useState<string | null>(null);
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [careData, setCareData] = useState<AppData>(defaultAppData);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [careAlbums, setCareAlbums] = useState<AlbumItem[]>([]);
  const [carePeriods, setCarePeriods] = useState<PeriodRecord[]>([]);
  const [carePeriodSettings, setCarePeriodSettings] = useState<PeriodSettings>(DEFAULT_PERIOD_SETTINGS);
  const [noteFilter, setNoteFilter] = useState("all");
  const [content, setContent] = useState("");
  const [active, setActive] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [visibleFrom, setVisibleFrom] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageAlt, setImageAlt] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [missYouCounts, setMissYouCounts] = useState({ xiaoguai: 0, admin: 0 });
  const [settings, setSettings] = useState({
    girlfriendName: "小乖",
    nextMeetingDate: "",
    semesterEndDate: ""
  });

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(ADMIN_PASSWORD_KEY);
      if (saved) {
        setPassword(saved);
        setAdminPassword(saved);
        setLoggedIn(true);
      }
    } catch { /* optional */ }
  }, []);

  const previewUrl = useMemo(() => (image ? URL.createObjectURL(image) : ""), [image]);
  const filteredNotes = useMemo(() => {
    if (noteFilter === "all") return notes;
    if (noteFilter === "me") return notes.filter((n) => n.author === "admin" || n.author === "me");
    if (noteFilter === "xiaoguai") return notes.filter((n) => n.author === "xiaoguai" || n.author === "user");
    return notes.filter((n) => n.noteType === noteFilter);
  }, [notes, noteFilter]);

  const latestNote = notes[0];

  const loadCareSummary = useCallback(async () => {
    const [cloudPayload, albumPayload, periodPayload] = await Promise.all([
      fetch(`/api/cloud/pull`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) }).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/albums?code=${encodeURIComponent(code)}&filter=all`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/period?code=${encodeURIComponent(code)}`).then((r) => r.json()).catch(() => ({}))
    ]);
    if (cloudPayload.data) setCareData(cloudPayload.data);
    if (Array.isArray(albumPayload.items)) setCareAlbums(albumPayload.items);
    if (Array.isArray(periodPayload.records)) setCarePeriods(periodPayload.records);
    if (periodPayload.settings) setCarePeriodSettings(periodPayload.settings);
    // Load miss-you counts
    try {
      const myMiss = await fetch(`/api/miss-you?code=${encodeURIComponent(code)}&viewer=admin&includeUnread=true`).then((r) => r.json());
      const herMiss = await fetch(`/api/miss-you?code=${encodeURIComponent(code)}&viewer=xiaoguai&includeUnread=true`).then((r) => r.json());
      setMissYouCounts({
        admin: myMiss.todayByAuthor?.admin || 0,
        xiaoguai: herMiss.todayByAuthor?.xiaoguai || 0
      });
    } catch { /* optional */ }
  }, [code]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setMessage(payload.code ? `${payload.error} (${payload.code})` : payload.error || "后台密码不正确。");
      return;
    }
    setAdminPassword(password);
    try { window.sessionStorage.setItem(ADMIN_PASSWORD_KEY, password); } catch { /* optional */ }
    setLoggedIn(true);
    await loadNotes(password);
    await loadCareSummary();
  }

  async function loadNotes(pass = adminPassword || password) {
    const response = await fetch(`/api/admin/love-notes?code=${encodeURIComponent(code)}`, {
      headers: { "x-admin-password": pass }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.code ? `${payload.error} (${payload.code})` : payload.error || "小纸条加载失败。");
      return;
    }
    setNotes(payload.notes || []);
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setPublishing(true);
    if (!adminPassword) {
      setMessage("请重新登录后台");
      setPublishing(false);
      return;
    }
    if (image) {
      const validation = validateImageFile(image);
      if (!validation.ok) {
        setMessage(validation.error || "图片不符合要求。");
        setPublishing(false);
        return;
      }
    }
    const form = new FormData();
    form.append("password", adminPassword);
    form.append("code", code);
    form.append("content", content);
    form.append("active", String(active));
    form.append("pinned", String(pinned));
    form.append("visible_from", visibleFrom ? new Date(visibleFrom).toISOString() : new Date().toISOString());
    form.append("image_alt", imageAlt);
    if (image) form.append("image", image);

    const response = await fetch("/api/admin/love-notes", { method: "POST", body: form });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage([payload.error || "发布失败。", payload.code ? `code: ${payload.code}` : "", payload.step ? `step: ${payload.step}` : "", payload.detail ? `detail: ${payload.detail}` : ""].filter(Boolean).join(" · "));
      setPublishing(false);
      return;
    }
    setContent("");
    setPinned(false);
    setActive(true);
    setVisibleFrom("");
    setImage(null);
    setImageAlt("");
    setMessage("✅ 小纸条发布成功");
    await loadNotes();
    setPublishing(false);
  }

  function formatApiError(payload: Record<string, unknown>, fallback: string) {
    return [typeof payload.error === "string" ? payload.error : fallback, typeof payload.code === "string" ? `code: ${payload.code}` : "", typeof payload.step === "string" ? `step: ${payload.step}` : "", typeof payload.detail === "string" ? `detail: ${payload.detail}` : ""].filter(Boolean).join(" · ");
  }

  async function patchNote(body: Record<string, unknown>) {
    setUpdatingNoteId(String(body.id || ""));
    const response = await fetch("/api/admin/love-notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPassword, code, ...body })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(formatApiError(payload, "更新失败。"));
      setUpdatingNoteId(null);
      return;
    }
    setMessage("已更新。");
    await loadNotes();
    setUpdatingNoteId(null);
  }

  async function deleteNote(id: string) {
    if (!confirm("确定删除这条小纸条吗？删除后首页不会再显示。")) return;
    setUpdatingNoteId(id);
    const response = await fetch("/api/admin/love-notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPassword, code, id, action: "delete" })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(formatApiError(payload, "删除失败。"));
      setUpdatingNoteId(null);
      return;
    }
    setMessage("已删除");
    await loadNotes();
    setUpdatingNoteId(null);
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    setSavingSettings(true);
    const response = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPassword, code, girlfriendName: settings.girlfriendName || "小乖", nextMeetingDate: settings.nextMeetingDate || null, semesterEndDate: settings.semesterEndDate || null })
    });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? "设置已保存。" : payload.code ? `${payload.error} (${payload.code})` : payload.error || "设置保存失败。");
    setSavingSettings(false);
  }

  function TabButton({ tab, label }: { tab: AdminTab; label: string }) {
    return (
      <button
        className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
          activeTab === tab
            ? "bg-[var(--app-accent)] text-white shadow-sm"
            : "bg-white/70 text-[var(--app-muted)] hover:bg-white/90"
        }`}
        onClick={() => setActiveTab(tab)}
        type="button"
      >
        {label}
      </button>
    );
  }

  function StatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "danger" }) {
    const toneClass = { neutral: "bg-white/70 text-[var(--app-muted)]", ok: "bg-sage/18 text-[var(--app-text)]", warn: "bg-butter/75 text-[var(--app-text)]", danger: "bg-[#ffe1dd] text-[#9f4d45]" };
    return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClass[tone]}`}>{children}</span>;
  }

  if (!isCloudConfigured()) {
    return (
      <AppShell>
        <div className="soft-card text-sm leading-7 text-[var(--app-muted)]">
          云同步未配置，无法远程管理。请先填写 Supabase 环境变量。
        </div>
      </AppShell>
    );
  }

  const bristolTime = new Date().toLocaleString("zh-CN", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
  const beijingTime = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit" });

  return (
    <AppShell>
      {/* Admin Hero */}
      <header className="mb-4 overflow-hidden rounded-[2.15rem] border border-white/75 bg-gradient-to-br from-white/88 via-blush/58 to-skySoft/75 p-5 shadow-float ring-1 ring-white/60 backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-kicker">Admin Console</p>
            <h1 className="mt-2 text-[1.8rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--app-text)]">
              远程照顾控制台
            </h1>
            <p className="mt-2 text-sm leading-5 text-[var(--app-muted)]">今天也可以轻轻照顾她一点。</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/70 bg-white/62 px-3 py-2 text-right text-xs leading-5 text-[var(--app-muted)] shadow-sm">
            <div>Bristol {bristolTime}</div>
            <div className="font-semibold text-[var(--app-text)]">北京 {beijingTime}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/70 bg-white/58 px-3 py-1.5 text-xs font-medium text-[var(--app-text)] shadow-sm">
            {isCloudConfigured() ? "☁️ 云同步已连接" : "📱 本地模式"}
          </span>
          <span className="rounded-full border border-white/70 bg-white/58 px-3 py-1.5 text-xs font-medium text-[var(--app-text)] shadow-sm">
            code: {code}
          </span>
        </div>
      </header>

      <AdminNotice value={message} />

      {!loggedIn ? (
        <form className="soft-card mx-auto max-w-md space-y-4 bg-gradient-to-br from-white/90 to-lilac/50" onSubmit={login}>
          <div>
            <p className="section-kicker mb-1">Admin Login</p>
            <h2 className="font-semibold text-[var(--app-text)]">后台登录</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">登录后操作会由服务端校验密码。</p>
          </div>
          <label className="block text-sm text-[var(--app-muted)]">
            后台密码
            <input className="field mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className="btn-primary w-full" type="submit">登录</button>
        </form>
      ) : (
        <>
          {/* Tab bar */}
          <div className="mb-4 flex flex-wrap gap-2">
            <TabButton tab="overview" label="总览" />
            <TabButton tab="notes" label="小纸条" />
            <TabButton tab="missyou" label="想你" />
            <TabButton tab="settings" label="设置同步" />
            <TabButton tab="diagnostics" label="诊断" />
          </div>

          {/* Space info bar */}
          <section className="soft-card mb-4 flex items-center justify-between gap-3 bg-gradient-to-br from-white/85 to-skySoft/55">
            <div>
              <p className="section-kicker mb-1">Space</p>
              <h2 className="font-semibold text-[var(--app-text)]">当前管理空间</h2>
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
              code
              <input className="field w-32" value={code} onChange={(e) => setCode(e.target.value)} onBlur={() => loadNotes()} />
            </label>
          </section>

          {/* ── Overview Tab ── */}
          {activeTab === "overview" && (
            <>
              <AdminOverviewCard
                careData={careData}
                carePeriods={carePeriods}
                carePeriodSettings={carePeriodSettings}
                latestNote={latestNote?.content?.slice(0, 20)}
                missYouCounts={missYouCounts}
                onRefresh={loadCareSummary}
              />
            </>
          )}

          {/* ── Notes Tab ── */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              {/* Publish form */}
              <form className="soft-card space-y-4 bg-gradient-to-br from-white/85 to-butter/45" id="publish-note" onSubmit={publish}>
                <div>
                  <p className="section-kicker mb-1">Publish</p>
                  <h2 className="font-semibold text-[var(--app-text)]">发布新小纸条</h2>
                </div>
                <textarea className="field min-h-36 resize-y leading-7" placeholder="写给小乖的话" value={content} onChange={(e) => setContent(e.target.value)} />
                <div className="grid grid-cols-2 gap-2 text-sm text-[var(--app-muted)]">
                  <label className="check-card">
                    <input checked={active} type="checkbox" onChange={(e) => setActive(e.target.checked)} />
                    <span><span className="block font-medium text-[var(--app-text)]">立即启用</span><span className="text-xs">active</span></span>
                  </label>
                  <label className="check-card">
                    <input checked={pinned} type="checkbox" onChange={(e) => setPinned(e.target.checked)} />
                    <span><span className="block font-medium text-[var(--app-text)]">设为置顶</span><span className="text-xs">pinned</span></span>
                  </label>
                </div>
                <label className="block text-sm font-medium text-[var(--app-muted)]">
                  可见时间
                  <input className="field mt-1" type="datetime-local" value={visibleFrom} onChange={(e) => setVisibleFrom(e.target.value)} />
                </label>
                <label className="file-panel">
                  <span className="font-medium text-[var(--app-text)]">上传图片</span>
                  <span className="mt-1 block text-xs text-[var(--app-muted)]">JPG / PNG / WebP，最大 5MB</span>
                  <input className="mt-3 block w-full text-sm" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0] || null; if (f) { const v = validateImageFile(f); if (!v.ok) { setMessage(v.error || "图片不符合要求。"); e.currentTarget.value = ""; return; } } setImage(f); }} />
                </label>
                {previewUrl ? (
                  <div className="rounded-[1.6rem] border border-white/75 bg-white/55 p-2 shadow-sm">
                    <Image className="max-h-72 w-full rounded-[1.35rem] object-cover shadow-sm" src={previewUrl} alt="预览" width={640} height={360} unoptimized />
                    <div className="mt-2 flex items-center justify-between gap-2 px-1">
                      <span className="truncate text-xs text-[var(--app-muted)]">{image?.name}</span>
                      <button className="btn-secondary btn-small" type="button" onClick={() => setImage(null)}>移除</button>
                    </div>
                  </div>
                ) : null}
                <button className="btn-primary w-full" disabled={publishing} type="submit">
                  {publishing ? "发布中..." : "发布小纸条"}
                </button>
              </form>

              {/* Notes list */}
              <section className="soft-card">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="section-kicker mb-1">History</p>
                    <h2 className="font-semibold text-[var(--app-text)]">最近 20 条小纸条</h2>
                  </div>
                  <button className="btn-secondary btn-small" onClick={() => loadNotes()}>刷新</button>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {["all", "xiaoguai", "me", "image", "audio", "video"].map((v) => (
                    <button className={noteFilter === v ? "btn-primary btn-small" : "btn-secondary btn-small"} key={v} onClick={() => setNoteFilter(v)}>{v === "all" ? "全部" : v === "xiaoguai" ? "小乖" : v === "me" ? "我" : v}</button>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredNotes.length ? filteredNotes.map((note) => (
                    <article className="rounded-[1.5rem] border border-white/75 bg-cream/70 p-3 shadow-sm" key={note.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm leading-6 text-[var(--app-text)]">{note.content}</p>
                          <p className="mt-2 text-xs text-[var(--app-muted)]">{note.createdAt ? new Date(note.createdAt).toLocaleString("zh-CN") : "无时间"}</p>
                        </div>
                        {note.imageUrl ? <Image className="h-16 w-16 shrink-0 rounded-2xl border border-white/80 object-cover shadow-sm" src={note.imageUrl} alt={note.imageAlt || ""} width={64} height={64} unoptimized /> : null}
                      </div>
                      {note.audioUrl ? <audio className="mt-3 w-full" src={note.audioUrl} controls /> : null}
                      {note.videoUrl ? <video className="mt-3 max-h-40 w-full rounded-2xl bg-black" src={note.videoUrl} controls playsInline /> : null}
                      <p className="mt-3 flex flex-wrap gap-2">
                        <StatusBadge tone={note.active ? "ok" : "neutral"}>{note.active ? "active" : "inactive"}</StatusBadge>
                        <StatusBadge tone={note.pinned ? "warn" : "neutral"}>{note.pinned ? "pinned" : "not pinned"}</StatusBadge>
                        {note.deletedAt ? <StatusBadge tone="danger">deleted</StatusBadge> : null}
                        <StatusBadge>{getUserFacingAuthorLabel(note.author)}</StatusBadge>
                        <StatusBadge>{note.noteType || "text"}</StatusBadge>
                      </p>
                      <div className="mt-3 border-t border-white/65 pt-3">
                        <details className="text-xs">
                          <summary className="cursor-pointer font-medium text-[var(--app-muted)]">操作</summary>
                          <div className="btn-group mt-2">
                            <button className="btn-secondary btn-small" disabled={updatingNoteId === note.id} onClick={() => patchNote({ id: note.id, action: "set_pinned", pinned: !note.pinned })}>
                              {note.pinned ? "取消置顶" : "设为置顶"}
                            </button>
                            <button className="btn-secondary btn-small" disabled={updatingNoteId === note.id} onClick={() => patchNote(note.active ? { id: note.id, action: "deactivate" } : { id: note.id, action: "set_active", active: true })}>
                              {note.active ? "停用" : "重新启用"}
                            </button>
                            <button className="btn-danger btn-small" disabled={updatingNoteId === note.id} onClick={() => deleteNote(note.id)}>删除</button>
                          </div>
                        </details>
                      </div>
                    </article>
                  )) : <div className="empty-state md:col-span-2">还没有小纸条记录。</div>}
                </div>
              </section>
            </div>
          )}

          {/* ── MissYou Tab ── */}
          {activeTab === "missyou" && (
            <MissYouAdminCard />
          )}

          {/* ── Settings Tab ── */}
          {activeTab === "settings" && (
            <div className="space-y-4">
              <form className="soft-card space-y-3 bg-gradient-to-br from-white/85 to-butter/45" onSubmit={saveSettings}>
                <div>
                  <p className="section-kicker mb-1">Settings</p>
                  <h2 className="font-semibold text-[var(--app-text)]">云端设置</h2>
                </div>
                <input className="field" placeholder="女朋友昵称" value={settings.girlfriendName} onChange={(e) => setSettings({ ...settings, girlfriendName: e.target.value || "小乖" })} />
                <input className="field" type="date" value={settings.nextMeetingDate} onChange={(e) => setSettings({ ...settings, nextMeetingDate: e.target.value })} />
                <input className="field" type="date" value={settings.semesterEndDate} onChange={(e) => setSettings({ ...settings, semesterEndDate: e.target.value })} />
                <button className="btn-secondary w-full" disabled={savingSettings} type="submit">{savingSettings ? "保存中..." : "保存设置"}</button>
              </form>
            </div>
          )}

          {/* ── Diagnostics Tab ── */}
          {activeTab === "diagnostics" && (
            <div className="space-y-3">
              <a className="btn-primary block text-center" href="/debug" target="_blank">打开诊断页面 🔍</a>
              <a className="btn-secondary block text-center" href="/api/debug/supabase" target="_blank">API Debug 端点</a>
              <a className="btn-secondary block text-center" href="/debug" target="_blank">Debug UI</a>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
