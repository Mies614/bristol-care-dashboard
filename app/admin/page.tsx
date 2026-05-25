"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { getDefaultSpaceCode, isCloudConfigured } from "@/lib/cloudSync";
import { validateImageFile } from "@/lib/imageValidation";
import type { LoveNote } from "@/lib/types";

const ADMIN_PASSWORD_KEY = "bristol-care-admin-password-v1";

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
  const [noteFilter, setNoteFilter] = useState("all");
  const [content, setContent] = useState("");
  const [active, setActive] = useState(true);
  const [pinned, setPinned] = useState(false);
  const [visibleFrom, setVisibleFrom] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageAlt, setImageAlt] = useState("");
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
    } catch {
      // Session storage is optional; user can log in manually.
    }
  }, []);

  const previewUrl = useMemo(() => (image ? URL.createObjectURL(image) : ""), [image]);
  const filteredNotes = useMemo(() => {
    if (noteFilter === "all") return notes;
    if (["admin", "me", "xiaoguai", "user"].includes(noteFilter)) return notes.filter((note) => note.author === noteFilter);
    return notes.filter((note) => note.noteType === noteFilter);
  }, [notes, noteFilter]);

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
    try {
      window.sessionStorage.setItem(ADMIN_PASSWORD_KEY, password);
    } catch {
      // Session storage is optional.
    }
    setLoggedIn(true);
    await loadNotes(password);
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
      setMessage(
        [
          payload.error || "发布失败。",
          payload.code ? `code: ${payload.code}` : "",
          payload.step ? `step: ${payload.step}` : "",
          payload.detail ? `detail: ${payload.detail}` : ""
        ].filter(Boolean).join(" · ")
      );
      setPublishing(false);
      return;
    }
    setContent("");
    setPinned(false);
    setActive(true);
    setVisibleFrom("");
    setImage(null);
    setImageAlt("");
    setMessage("发布成功。");
    await loadNotes();
    setPublishing(false);
  }

  function formatApiError(payload: Record<string, unknown>, fallback: string) {
    return [
      typeof payload.error === "string" ? payload.error : fallback,
      typeof payload.code === "string" ? `code: ${payload.code}` : "",
      typeof payload.step === "string" ? `step: ${payload.step}` : "",
      typeof payload.detail === "string" ? `detail: ${payload.detail}` : ""
    ].filter(Boolean).join(" · ");
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
      body: JSON.stringify({
        password: adminPassword,
        code,
        girlfriendName: settings.girlfriendName || "小乖",
        nextMeetingDate: settings.nextMeetingDate || null,
        semesterEndDate: settings.semesterEndDate || null
      })
    });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? "设置已保存。" : payload.code ? `${payload.error} (${payload.code})` : payload.error || "设置保存失败。");
    setSavingSettings(false);
  }

  function AdminNotice({ value }: { value: string }) {
    if (!value) return null;
    const parts = value.split(" · ");
    const title = parts.find((part) => !part.startsWith("code:") && !part.startsWith("step:") && !part.startsWith("detail:")) || value;
    const code = parts.find((part) => part.startsWith("code:"))?.replace("code: ", "");
    const step = parts.find((part) => part.startsWith("step:"))?.replace("step: ", "");
    const detail = parts.find((part) => part.startsWith("detail:"))?.replace("detail: ", "");
    const isError = Boolean(code || step || title.includes("失败") || title.includes("不正确") || title.includes("缺少"));

    return (
      <section className={`rounded-[1.4rem] border p-4 text-sm shadow-soft backdrop-blur-xl ${
        isError ? "border-[#efb6b1]/75 bg-[#fff0ef]/85 text-[#7d463f]" : "border-white/75 bg-white/72 text-cocoa/75"
      }`}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/70 text-xs font-semibold">
            {isError ? "!" : "✓"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{title}</p>
            {(code || step) ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {code ? <span className="rounded-full bg-white/70 px-2.5 py-1">code: {code}</span> : null}
                {step ? <span className="rounded-full bg-white/70 px-2.5 py-1">step: {step}</span> : null}
              </div>
            ) : null}
            {detail ? (
            <details className="mt-2 rounded-2xl bg-white/60 px-3 py-2 text-xs leading-5">
                <summary className="cursor-pointer font-medium">查看 detail</summary>
                <p className="mt-2 break-words">{detail}</p>
              </details>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  function StatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "danger" }) {
    const toneClass = {
      neutral: "bg-white/70 text-cocoa/65",
      ok: "bg-sage/18 text-cocoa",
      warn: "bg-butter/75 text-cocoa",
      danger: "bg-[#ffe1dd] text-[#9f4d45]"
    };
    return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClass[tone]}`}>{children}</span>;
  }

  if (!isCloudConfigured()) {
    return (
      <AppShell>
        <PageHeader title="Admin" subtitle="远程发布小纸条需要 Supabase 云同步配置。" />
        <section className="soft-card text-sm leading-7 text-cocoa/70">
          云同步未配置，无法远程发布小纸条。请先填写 Supabase 环境变量并创建 love-notes bucket。
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Admin" subtitle="远程发布小纸条、管理置顶状态和 Bristol Care 云端设置。" />
      <div className="space-y-4">
        <AdminNotice value={message} />
        {!loggedIn ? (
          <form className="soft-card mx-auto max-w-md space-y-4 bg-gradient-to-br from-white/90 to-lilac/50" onSubmit={login}>
            <div>
              <p className="section-kicker mb-1">Admin Login</p>
              <h2 className="font-semibold text-cocoa">后台登录</h2>
              <p className="mt-2 text-sm leading-6 text-cocoa/60">登录后仍会在每次写操作时由服务端校验密码。</p>
            </div>
            <label className="block text-sm text-cocoa/70">
              后台密码
              <input className="field mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <button className="btn-primary w-full" type="submit">登录</button>
          </form>
        ) : (
          <>
            <section className="soft-card space-y-3 bg-gradient-to-br from-white/85 to-skySoft/55">
              <div className="flex items-start justify-between gap-3">
                <div>
                <p className="section-kicker mb-1">Space</p>
                <h2 className="font-semibold text-cocoa">管理空间</h2>
                </div>
                <StatusBadge tone="ok">已登录</StatusBadge>
              </div>
              <label className="block text-sm text-cocoa/70">
                Space code
                <input className="field mt-1" value={code} onChange={(e) => setCode(e.target.value)} onBlur={() => loadNotes()} />
              </label>
            </section>

            <div className="grid gap-4">
            <form className="soft-card space-y-4 bg-gradient-to-br from-white/85 to-butter/45" onSubmit={publish}>
              <div>
                <p className="section-kicker mb-1">Publish</p>
                <h2 className="font-semibold text-cocoa">发布新小纸条</h2>
                <p className="mt-2 text-sm leading-6 text-cocoa/62">文字会显示在首页，小图可以让纸条更像一张明信片。</p>
              </div>
              <textarea className="field min-h-44 resize-y leading-7" placeholder="写给小乖的话" value={content} onChange={(e) => setContent(e.target.value)} />
              <div className="grid grid-cols-2 gap-2 text-sm text-cocoa/70">
                <label className="check-card">
                  <input checked={active} type="checkbox" onChange={(e) => setActive(e.target.checked)} />
                  <span>
                    <span className="block font-medium text-cocoa">立即启用</span>
                    <span className="text-xs text-cocoa/55">active</span>
                  </span>
                </label>
                <label className="check-card">
                  <input checked={pinned} type="checkbox" onChange={(e) => setPinned(e.target.checked)} />
                  <span>
                    <span className="block font-medium text-cocoa">设为置顶</span>
                    <span className="text-xs text-cocoa/55">pinned</span>
                  </span>
                </label>
              </div>
              <label className="block text-sm font-medium text-cocoa/70">
                可见时间
                <input className="field mt-1" type="datetime-local" value={visibleFrom} onChange={(e) => setVisibleFrom(e.target.value)} />
              </label>
              <label className="block text-sm font-medium text-cocoa/70">
                图片 alt
                <input className="field mt-1" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} />
              </label>
              <label className="file-panel">
                <span className="font-medium text-cocoa">上传图片</span>
                <span className="mt-1 block text-xs text-cocoa/52">JPG / PNG / WebP，最大 5MB</span>
                <input
                  className="mt-3 block w-full text-sm"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      const validation = validateImageFile(file);
                      if (!validation.ok) {
                        setMessage(validation.error || "图片不符合要求。");
                        e.currentTarget.value = "";
                        return;
                      }
                    }
                    setImage(file);
                  }}
                />
              </label>
              {previewUrl ? (
                <div className="rounded-[1.6rem] border border-white/75 bg-white/55 p-2 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="max-h-72 w-full rounded-[1.35rem] object-cover shadow-sm" src={previewUrl} alt="图片预览" />
                  <div className="mt-2 flex items-center justify-between gap-2 px-1">
                    <span className="truncate text-xs text-cocoa/55">{image?.name}</span>
                    <button className="btn-secondary btn-small" type="button" onClick={() => setImage(null)}>移除</button>
                  </div>
                </div>
              ) : null}
              <button className="btn-primary w-full" disabled={publishing} type="submit">
                {publishing ? "发布中..." : "发布小纸条"}
              </button>
            </form>

            <form className="soft-card h-fit space-y-3" onSubmit={saveSettings}>
              <div>
                <p className="section-kicker mb-1">Settings</p>
                <h2 className="font-semibold text-cocoa">云端设置</h2>
              </div>
              <input className="field" placeholder="女朋友昵称" value={settings.girlfriendName} onChange={(e) => setSettings({ ...settings, girlfriendName: e.target.value || "小乖" })} />
              <input className="field" type="date" value={settings.nextMeetingDate} onChange={(e) => setSettings({ ...settings, nextMeetingDate: e.target.value })} />
              <input className="field" type="date" value={settings.semesterEndDate} onChange={(e) => setSettings({ ...settings, semesterEndDate: e.target.value })} />
              <button className="btn-secondary w-full" disabled={savingSettings} type="submit">{savingSettings ? "保存中..." : "保存设置"}</button>
            </form>
            </div>

            <section className="soft-card">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="section-kicker mb-1">History</p>
                  <h2 className="font-semibold text-cocoa">最近 20 条小纸条</h2>
                </div>
                <button className="btn-secondary btn-small" onClick={() => loadNotes()}>刷新</button>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                {["all", "admin", "me", "xiaoguai", "user", "image", "audio", "video"].map((value) => (
                  <button className={noteFilter === value ? "btn-primary btn-small" : "btn-secondary btn-small"} key={value} onClick={() => setNoteFilter(value)}>
                    {value === "all" ? "全部" : value}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {filteredNotes.length ? filteredNotes.map((note) => (
                  <article className="rounded-[1.5rem] border border-white/75 bg-cream/70 p-3 shadow-sm" key={note.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm leading-6 text-cocoa/82">{note.content}</p>
                        <p className="mt-2 text-xs text-cocoa/55">{note.createdAt ? new Date(note.createdAt).toLocaleString("zh-CN") : "无创建时间"}</p>
                      </div>
                      {note.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="h-16 w-16 shrink-0 rounded-2xl border border-white/80 object-cover shadow-sm" src={note.imageUrl} alt={note.imageAlt || "小纸条图片"} />
                      ) : null}
                    </div>
                    {note.audioUrl ? <audio className="mt-3 w-full" src={note.audioUrl} controls /> : null}
                    {note.videoUrl ? <video className="mt-3 max-h-40 w-full rounded-2xl bg-black" src={note.videoUrl} controls /> : null}
                    <p className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge tone={note.active ? "ok" : "neutral"}>{note.active ? "active" : "inactive"}</StatusBadge>
                      <StatusBadge tone={note.pinned ? "warn" : "neutral"}>{note.pinned ? "pinned" : "not pinned"}</StatusBadge>
                      {note.deletedAt ? <StatusBadge tone="danger">deleted</StatusBadge> : null}
                      <StatusBadge>{note.author || "admin"}</StatusBadge>
                      <StatusBadge>{note.noteType || "text"}</StatusBadge>
                      <StatusBadge>{note.displayStyle || "sticky"}</StatusBadge>
                    </p>
                    <div className="mt-3 border-t border-white/65 pt-3">
                      <p className="mb-2 text-xs font-medium text-cocoa/50">操作</p>
                      <div className="flex flex-wrap gap-2">
                      <button
                        className="btn-secondary btn-small"
                        disabled={updatingNoteId === note.id}
                        onClick={() => patchNote({ id: note.id, action: "set_pinned", pinned: !note.pinned })}
                      >
                        {updatingNoteId === note.id ? "更新中..." : note.pinned ? "取消置顶" : "设为置顶"}
                      </button>
                      <button
                        className="btn-secondary btn-small"
                        disabled={updatingNoteId === note.id}
                        onClick={() => patchNote(note.active ? { id: note.id, action: "deactivate" } : { id: note.id, action: "set_active", active: true })}
                      >
                        {updatingNoteId === note.id ? "更新中..." : note.active ? "停用" : "重新启用"}
                      </button>
                      <button
                        className="btn-danger btn-small"
                        disabled={updatingNoteId === note.id}
                        onClick={() => deleteNote(note.id)}
                      >
                        {updatingNoteId === note.id ? "更新中..." : "删除"}
                      </button>
                      </div>
                    </div>
                  </article>
                )) : (
                  <div className="empty-state md:col-span-2">
                    还没有小纸条记录。
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
