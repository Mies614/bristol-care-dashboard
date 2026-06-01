"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { fadeInScale, staggerContainer, useAccessibleMotion, safeTransition, safeVariants } from "@/lib/design/motion";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminOverviewCard } from "@/components/admin/AdminOverviewCard";
import { getDefaultSpaceCode, isCloudConfigured } from "@/lib/cloudSync";
import { validateImageFile } from "@/lib/imageValidation";
import { getUserFacingAuthorLabel } from "@/lib/identity";
import { defaultAppData } from "@/lib/sampleData";
import { DEFAULT_PERIOD_SETTINGS } from "@/lib/period";
import type { AlbumItem, AppData, LoveNote, PeriodRecord, PeriodSettings } from "@/lib/types";
import { MissYouAdminCard } from "@/components/MissYouAdminCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppBadge } from "@/components/ui/AppBadge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ADMIN_PASSWORD_KEY = "bristol-care-admin-password-v1";

type AdminTab = "care" | "notes" | "settings" | "diagnostics";

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
  const [activeTab, setActiveTab] = useState<AdminTab>("care");
  const [missYouCounts, setMissYouCounts] = useState({ xiaoguai: 0, admin: 0 });
  const [settings, setSettings] = useState({
    girlfriendName: "小乖",
    nextMeetingDate: "",
    semesterEndDate: ""
  });

  // Recent album items for the care tab
  const [recentAlbums, setRecentAlbums] = useState<AlbumItem[]>([]);

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
    if (Array.isArray(albumPayload.items)) {
      setCareAlbums(albumPayload.items);
      // 仅展示最近 4 张喜欢的收藏
      const favs = albumPayload.items.filter((item: AlbumItem) => item.isFavorite).slice(0, 4);
      setRecentAlbums(favs.length ? favs : albumPayload.items.slice(0, 4));
    }
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

  const reduceMotion = useAccessibleMotion();

  if (!isCloudConfigured()) {
    return (
      <AppShell>
        <AppCard className="text-sm leading-7 text-[var(--app-muted)]">
          云同步未配置，无法远程管理。请先填写 Supabase 环境变量。
        </AppCard>
      </AppShell>
    );
  }

  const bristolTime = new Date().toLocaleString("zh-CN", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
  const beijingTime = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit" });

  return (
    <AppShell>
      {/* Admin Hero */}
      <motion.header
        className="mb-4 overflow-hidden rounded-[2.15rem] border border-white/75 bg-gradient-to-br from-white/88 via-blush/58 to-skySoft/75 p-5 shadow-float ring-1 ring-white/60 backdrop-blur-2xl"
        variants={fadeInScale}
        initial="hidden"
        animate="visible"
        transition={safeTransition({ duration: 0.26, ease: "easeOut" }, reduceMotion)}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)]">Admin Console</p>
            <h1 className="mt-2 text-[1.8rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--app-text)]">
              远程照顾控制台
            </h1>
            <p className="mt-2 text-sm leading-5 text-[var(--app-muted)]">远程看一眼小乖，轻轻照顾她一点。</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/70 bg-white/62 px-3 py-2 text-right text-xs leading-5 text-[var(--app-muted)] shadow-sm">
            <div>Bristol {bristolTime}</div>
            <div className="font-semibold text-[var(--app-text)]">北京 {beijingTime}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/70 bg-white/58 px-3 py-1.5 text-xs font-medium text-[var(--app-text)] shadow-sm">
            ☁️ 云同步已连接
          </span>
          <span className="rounded-full border border-white/70 bg-white/58 px-3 py-1.5 text-xs font-medium text-[var(--app-text)] shadow-sm">
            code: {code}
          </span>
        </div>
      </motion.header>

      <AdminNotice value={message} />

      {!loggedIn ? (
        <form className="space-y-4" onSubmit={login}>
          <AppCard className="mx-auto max-w-md space-y-4 bg-gradient-to-br from-white/90 to-lilac/50">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">Admin Login</p>
              <h2 className="font-semibold text-[var(--app-text)]">后台登录</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">登录后操作会由服务端校验密码。</p>
            </div>
            <label className="block text-sm text-[var(--app-muted)]">
              后台密码
              <Input className="mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <AppButton variant="primary" className="w-full" type="submit">登录</AppButton>
          </AppCard>
        </form>
      ) : (
        <>
          {/* ── 首屏优先：操作按钮在前 ── */}
          <div className="mb-4 space-y-3">
            {/* 想她一下 —— 最重要的操作 */}
            <MissYouAdminCard />

            {/* 管理空间 —— 行内不占空间 */}
            <label className="flex flex-wrap items-center gap-2 text-sm text-[var(--app-muted)]">
              管理空间
              <Input className="w-28" value={code} onChange={(e) => setCode(e.target.value)} onBlur={() => { loadNotes(); loadCareSummary(); }} />
              <AppButton variant="secondary" size="sm" onClick={loadCareSummary}>刷新</AppButton>
            </label>
          </div>

          {/* ── Tab bar: 管理优先级 — 照顾在前，诊断在后 ── */}
          <div className="mb-4 flex flex-wrap gap-2">
            <TabButton tab="care" label="💕 照顾面板" />
            <TabButton tab="notes" label="💌 小纸条" />
            <TabButton tab="settings" label="⚙️ 设置" />
            <TabButton tab="diagnostics" label="🔍 诊断" />
          </div>

          {/* ── Care Tab: 今日总览 + 课程/DDL/经期 + 相册摘要 ── */}
          {activeTab === "care" && (
            <motion.div
              className="space-y-4"
              variants={safeVariants(staggerContainer, reduceMotion)}
              initial="hidden"
              animate="visible"
            >
              {/* 今日状态总览 */}
              <AdminOverviewCard
                careData={careData}
                carePeriods={carePeriods}
                carePeriodSettings={carePeriodSettings}
                latestNote={latestNote?.content?.slice(0, 30)}
                missYouCounts={missYouCounts}
                onRefresh={loadCareSummary}
              />

              {/* 最近小纸条摘要 */}
              <AppCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="section-kicker mb-1">Latest Note</p>
                    <h2 className="font-semibold text-cocoa">最近小纸条</h2>
                  </div>
                  <AppButton variant="secondary" size="sm" onClick={() => { setActiveTab("notes"); }}>管理纸条</AppButton>
                </div>
                {latestNote ? (
                  <div className="mt-3 rounded-2xl bg-white/55 p-3">
                    <p className="text-sm leading-6 text-cocoa">{latestNote.content}</p>
                    <p className="mt-2 text-xs text-cocoa/45">
                      {latestNote.createdAt ? new Date(latestNote.createdAt).toLocaleString("zh-CN") : "无时间"} · {getUserFacingAuthorLabel(latestNote.author)}
                    </p>
                  </div>
                ) : (
                  <p className="empty-state mt-3">还没有小纸条。</p>
                )}
              </AppCard>

              {/* 最近相册 */}
              <AppCard>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="section-kicker mb-1">Album</p>
                    <h2 className="font-semibold text-cocoa">最近相册</h2>
                  </div>
                </div>
                {recentAlbums.length ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {recentAlbums.map((item) => (
                      <div className="relative overflow-hidden rounded-2xl bg-white/60 shadow-sm" key={item.id}>
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="aspect-square w-full object-cover" src={item.imageUrl} alt={item.title || "相册照片"} loading="lazy" />
                        ) : (
                          <div className="flex aspect-square items-center justify-center bg-cocoa/75 text-white">▶</div>
                        )}
                        {item.isFavorite ? <span className="absolute right-1 top-1 rounded-full bg-white/75 px-1.5 text-xs">♡</span> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state mt-3">还没有相册照片。</p>
                )}
              </AppCard>

              {/* 推送状态 - 折叠到末尾 */}
              <AppCard className="opacity-75">
                <details className="group">
                  <summary className="cursor-pointer font-medium text-cocoa/60 text-xs uppercase tracking-wide select-none">📊 数据摘要</summary>
                  <div className="mt-3 space-y-2 text-xs text-cocoa/55 leading-relaxed">
                    <p>想你次数：小乖 {missYouCounts.xiaoguai} 次，我 {missYouCounts.admin} 次</p>
                    <p>未完成 DDL：{careData.deadlines.filter((d) => d.status !== "done").length} 个</p>
                    <p>今日课程：{careData.courses.filter((c) => c.day === new Date().toLocaleDateString("en-US", { weekday: "long" })).length} 节</p>
                    <p>纸条总数：{notes.length} 条</p>
                    <p className="pt-1.5 text-cocoa/40">💡 详细诊断请前往「诊断」标签页</p>
                  </div>
                </details>
              </AppCard>
            </motion.div>
          )}

          {/* ── Notes Tab ── */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              {/* Publish form */}
              <form className="space-y-4" id="publish-note" onSubmit={publish}>
                <AppCard className="bg-gradient-to-br from-white/85 to-butter/45">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">Publish</p>
                    <h2 className="font-semibold text-[var(--app-text)]">发布新小纸条</h2>
                  </div>
                  <Textarea className="min-h-36 resize-y leading-7 mt-3" placeholder="写给小乖的话" value={content} onChange={(e) => setContent(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2 mt-3 text-sm text-[var(--app-muted)]">
                    <label className="flex items-center gap-2 rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-4 py-3 shadow-sm cursor-pointer">
                      <input checked={active} type="checkbox" className="accent-[var(--app-accent)]" onChange={(e) => setActive(e.target.checked)} />
                      <span><span className="block font-medium text-[var(--app-text)]">立即启用</span><span className="text-xs">active</span></span>
                    </label>
                    <label className="flex items-center gap-2 rounded-[var(--app-radius)] border border-[var(--app-card-border)] bg-[var(--app-card-bg)] px-4 py-3 shadow-sm cursor-pointer">
                      <input checked={pinned} type="checkbox" className="accent-[var(--app-accent)]" onChange={(e) => setPinned(e.target.checked)} />
                      <span><span className="block font-medium text-[var(--app-text)]">设为置顶</span><span className="text-xs">pinned</span></span>
                    </label>
                  </div>
                  <label className="block text-sm font-medium text-[var(--app-muted)] mt-3">
                    可见时间
                    <Input className="mt-1" type="datetime-local" value={visibleFrom} onChange={(e) => setVisibleFrom(e.target.value)} />
                  </label>
                  <label className="block rounded-[var(--app-radius)] border border-dashed border-[var(--app-card-border)] bg-[var(--app-card-bg)] p-4 shadow-sm cursor-pointer hover:border-[var(--app-accent)] transition mt-3">
                    <span className="font-medium text-[var(--app-text)]">上传图片</span>
                    <span className="mt-1 block text-xs text-[var(--app-muted)]">JPG / PNG / WebP，最大 5MB</span>
                    <Input className="mt-3 block w-full cursor-pointer" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0] || null; if (f) { const v = validateImageFile(f); if (!v.ok) { setMessage(v.error || "图片不符合要求。"); e.currentTarget.value = ""; return; } } setImage(f); }} />
                  </label>
                  {previewUrl ? (
                    <div className="rounded-[1.6rem] border border-white/75 bg-white/55 p-2 shadow-sm mt-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="max-h-72 w-full rounded-[1.35rem] object-cover shadow-sm" src={previewUrl} alt="预览" />
                      <div className="mt-2 flex items-center justify-between gap-2 px-1">
                        <span className="truncate text-xs text-[var(--app-muted)]">{image?.name}</span>
                        <AppButton variant="secondary" size="sm" type="button" onClick={() => setImage(null)}>移除</AppButton>
                      </div>
                    </div>
                  ) : null}
                  <AppButton variant="primary" className="w-full mt-3" disabled={publishing} type="submit">
                    {publishing ? "发布中..." : "发布小纸条"}
                  </AppButton>
                </AppCard>
              </form>

              {/* Notes list */}
              <AppCard>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">History</p>
                    <h2 className="font-semibold text-[var(--app-text)]">最近 20 条小纸条</h2>
                  </div>
                  <AppButton variant="secondary" size="sm" onClick={() => loadNotes()}>刷新</AppButton>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {["all", "xiaoguai", "me", "image", "audio", "video"].map((v) => (
                    <AppButton
                      variant={noteFilter === v ? "primary" : "secondary"}
                      size="sm"
                      key={v}
                      onClick={() => setNoteFilter(v)}
                    >
                      {v === "all" ? "全部" : v === "xiaoguai" ? "小乖" : v === "me" ? "我" : v}
                    </AppButton>
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
                        {note.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="h-16 w-16 shrink-0 rounded-2xl border border-white/80 object-cover shadow-sm" src={note.imageUrl} alt={note.imageAlt || ""} />
                        ) : null}
                      </div>
                      {note.audioUrl ? <audio className="mt-3 w-full" src={note.audioUrl} controls /> : null}
                      {note.videoUrl ? <video className="mt-3 max-h-40 w-full rounded-2xl bg-black" src={note.videoUrl} controls playsInline /> : null}
                      <p className="mt-3 flex flex-wrap gap-2">
                        <AppBadge variant={note.active ? "success" : "default"}>{note.active ? "active" : "inactive"}</AppBadge>
                        <AppBadge variant={note.pinned ? "warning" : "default"}>{note.pinned ? "pinned" : "not pinned"}</AppBadge>
                        {note.deletedAt ? <AppBadge variant="danger">deleted</AppBadge> : null}
                        <AppBadge>{getUserFacingAuthorLabel(note.author)}</AppBadge>
                        <AppBadge>{note.noteType || "text"}</AppBadge>
                      </p>
                      <div className="mt-3 border-t border-white/65 pt-3">
                        <details className="text-xs">
                          <summary className="cursor-pointer font-medium text-[var(--app-muted)]">操作</summary>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <AppButton variant="secondary" size="sm" disabled={updatingNoteId === note.id} onClick={() => patchNote({ id: note.id, action: "set_pinned", pinned: !note.pinned })}>
                              {note.pinned ? "取消置顶" : "设为置顶"}
                            </AppButton>
                            <AppButton variant="secondary" size="sm" disabled={updatingNoteId === note.id} onClick={() => patchNote(note.active ? { id: note.id, action: "deactivate" } : { id: note.id, action: "set_active", active: true })}>
                              {note.active ? "停用" : "重新启用"}
                            </AppButton>
                            <AppButton variant="danger" size="sm" disabled={updatingNoteId === note.id} onClick={() => deleteNote(note.id)}>删除</AppButton>
                          </div>
                        </details>
                      </div>
                    </article>
                  )) : <div className="text-center py-8 text-sm text-[var(--app-muted)] md:col-span-2">还没有小纸条记录。</div>}
                </div>
              </AppCard>
            </div>
          )}

          {/* ── Settings Tab ── */}
          {activeTab === "settings" && (
            <div className="space-y-4">
              <form onSubmit={saveSettings}>
                <AppCard className="space-y-3 bg-gradient-to-br from-white/85 to-butter/45">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1">Settings</p>
                    <h2 className="font-semibold text-[var(--app-text)]">云端设置</h2>
                  </div>
                  <Input placeholder="女朋友昵称" value={settings.girlfriendName} onChange={(e) => setSettings({ ...settings, girlfriendName: e.target.value || "小乖" })} />
                  <Input type="date" value={settings.nextMeetingDate} onChange={(e) => setSettings({ ...settings, nextMeetingDate: e.target.value })} />
                  <Input type="date" value={settings.semesterEndDate} onChange={(e) => setSettings({ ...settings, semesterEndDate: e.target.value })} />
                  <AppButton variant="secondary" className="w-full" disabled={savingSettings} type="submit">{savingSettings ? "保存中..." : "保存设置"}</AppButton>
                </AppCard>
              </form>
            </div>
          )}

          {/* ── Diagnostics Tab ── */}
          {activeTab === "diagnostics" && (
            <div className="space-y-3">
              <AppButton variant="primary" className="w-full" onClick={() => window.open("/debug", "_blank")}>打开诊断页面 🔍</AppButton>
              <AppButton variant="secondary" className="w-full" onClick={() => window.open("/api/debug/supabase", "_blank")}>API Debug 端点</AppButton>
              <AppButton variant="secondary" className="w-full" onClick={() => window.open("/debug", "_blank")}>Debug UI</AppButton>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}