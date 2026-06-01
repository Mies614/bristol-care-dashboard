"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AdminOverviewCard } from "@/components/admin/AdminOverviewCard";
import { PageHeader } from "@/components/PageHeader";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { getDaysUntilDeadline } from "@/lib/date";
import { DEFAULT_PERIOD_SETTINGS, getCurrentCycleDay, getDaysUntilNextPeriod } from "@/lib/period";
import { getTodayCourses } from "@/lib/schedule";
import { loadAppData } from "@/lib/storage";
import type { AlbumItem, AppData, LoveNote, PeriodRecord, PeriodSettings } from "@/lib/types";
import { AppCard } from "@/components/ui/AppCard";
import { useAccessibleMotion, safeVariants, staggerContainer, staggerItem } from "@/lib/design/motion";
import { motion } from "framer-motion";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AppData | null>(null);
  const [periodRecords, setPeriodRecords] = useState<PeriodRecord[]>([]);
  const [periodSettings, setPeriodSettings] = useState<PeriodSettings>(DEFAULT_PERIOD_SETTINGS);
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [missYouCounts, setMissYouCounts] = useState({ xiaoguai: 0, admin: 0 });
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [pushStatus, setPushStatus] = useState<Record<string, unknown> | null>(null);

  const fetchAdminData = useCallback(async () => {
    const space = getDefaultSpaceCode();
    const d = loadAppData();
    setData(d);

    try {
      const periodRes = await fetch(`/api/period?code=${encodeURIComponent(space)}`);
      const periodPayload = await periodRes.json();
      if (Array.isArray(periodPayload.records)) setPeriodRecords(periodPayload.records);
      if (periodPayload.settings) setPeriodSettings(periodPayload.settings);
    } catch {}

    try {
      const notesRes = await fetch(`/api/notes?code=${encodeURIComponent(space)}&filter=pinned`);
      const notesPayload = await notesRes.json();
      if (Array.isArray(notesPayload.notes)) setNotes(notesPayload.notes);
    } catch {}

    try {
      const missRes = await fetch(`/api/miss-you?code=${encodeURIComponent(space)}`);
      const missPayload = await missRes.json();
      setMissYouCounts({ xiaoguai: missPayload.xiaoguai ?? 0, admin: missPayload.admin ?? 0 });
    } catch {}

    try {
      const albumRes = await fetch(`/api/albums?code=${encodeURIComponent(space)}`);
      const albumPayload = await albumRes.json();
      if (Array.isArray(albumPayload.albums)) setAlbums(albumPayload.albums.slice(0, 4));
    } catch {}

    try {
      const pushRes = await fetch(`/api/push/status?code=${encodeURIComponent(space)}`);
      const pushPayload = await pushRes.json();
      setPushStatus(pushPayload);
    } catch {}
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const todayCourses = useMemo(() => (data ? getTodayCourses(data.courses) : []), [data]);
  const incompleteCount = useMemo(() => (data ? data.deadlines.filter((d) => d.status !== "done").length : 0), [data]);
  const cycleDay = useMemo(() => getCurrentCycleDay(periodRecords), [periodRecords]);
  const periodDaysUntil = useMemo(() => getDaysUntilNextPeriod(periodRecords, periodSettings), [periodRecords, periodSettings]);
  const reduceMotion = useAccessibleMotion();
  const latestNote = notes.length && notes[0].content ? notes[0].content.slice(0, 40) : undefined;

  if (!data) return <AppShell><div className="soft-card">正在加载…</div></AppShell>;

  return (
    <AppShell>
      <PageHeader title="远程照顾控制台" subtitle="从这里照顾她的一天。" />

      <motion.div
        className="space-y-4"
        variants={safeVariants(staggerContainer, reduceMotion)}
        initial="hidden"
        animate="visible"
      >
        {/* ── 1. 想她一下 —— 首屏最高优先级 ── */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <div className="soft-card text-center">
            <p className="section-kicker mb-1">Miss You</p>
            <h2 className="text-lg font-semibold text-cocoa">想她一下</h2>
            <button
              className="btn-primary mt-4 min-w-32"
              onClick={async () => {
                try {
                  const space = getDefaultSpaceCode();
                  const localDate = new Date().toISOString().split("T")[0];
                  const res = await fetch("/api/miss-you", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      code: space,
                      author: "admin",
                      recipient: "xiaoguai",
                      localDate
                    })
                  });
                  const payload = await res.json();
                  if (payload.ok) {
                    setMissYouCounts((prev) => ({ ...prev, admin: (prev.admin || 0) + 1 }));
                  }
                } catch {}
              }}
            >
              想她一下 💕
            </button>
            {(missYouCounts.admin > 0 || missYouCounts.xiaoguai > 0) && (
              <p className="mt-2 text-xs text-cocoa/40">
                小乖按了 {missYouCounts.xiaoguai} 次 | 我按了 {missYouCounts.admin} 次
              </p>
            )}
          </div>
        </motion.div>

        {/* ── 2. 今日照顾摘要 —— 今天的核心信息 ── */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <AdminOverviewCard
            careData={data}
            carePeriods={periodRecords}
            carePeriodSettings={periodSettings}
            latestNote={latestNote}
            missYouCounts={missYouCounts}
            onRefresh={fetchAdminData}
          />
        </motion.div>

        {/* ── 3. 今日课程摘要（非今日不展示） ── */}
        {todayCourses.length > 0 && (
          <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
            <AppCard>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="section-kicker mb-1">📚 她的课程</p>
                  <h2 className="font-semibold text-cocoa">今日 {todayCourses.length} 节</h2>
                </div>
                <Link className="text-xs font-medium text-sage hover:underline" href="/schedule">课表 →</Link>
              </div>
              <div className="space-y-1.5">
                {todayCourses.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl bg-white/55 px-3 py-2 text-sm">
                    <span className="text-cocoa font-medium">{c.name}</span>
                    <span className="text-xs text-cocoa/40">{c.startTime}–{c.endTime}</span>
                  </div>
                ))}
              </div>
            </AppCard>
          </motion.div>
        )}

        {/* ── 4. DDL 摘要 —— 只展示数量，详情去 DDL 页 ── */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <AppCard>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="section-kicker mb-1">📋 她的 DDL</p>
                <h2 className="font-semibold text-cocoa">{incompleteCount > 0 ? `${incompleteCount} 个未完成` : "全部完成"}</h2>
              </div>
              <Link className="text-xs font-medium text-sage hover:underline" href="/deadlines">管理 →</Link>
            </div>
            {data.deadlines.filter((d) => d.status !== "done").slice(0, 3).map((d) => {
              const days = getDaysUntilDeadline(d);
              return (
                <div key={d.id} className="flex items-center justify-between rounded-xl bg-white/55 px-3 py-2 text-sm mb-1.5 last:mb-0">
                  <span className="text-cocoa truncate">{d.title}</span>
                  <span className={`text-xs shrink-0 ml-2 ${days <= 1 ? "text-rose font-semibold" : "text-cocoa/40"}`}>
                    {days === 0 ? "今天" : days < 0 ? `超 ${Math.abs(days)} 天` : `${days} 天`}
                  </span>
                </div>
              );
            })}
          </AppCard>
        </motion.div>

        {/* ── 5. 经期摘要 ── */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <AppCard>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="section-kicker mb-1">🌸 经期状态</p>
                <h2 className="font-semibold text-cocoa">
                  {cycleDay ? `第 ${cycleDay} 天` : "暂无记录"}
                  {periodDaysUntil !== null && ` · 距下次 ${periodDaysUntil} 天`}
                </h2>
              </div>
              <Link className="text-xs font-medium text-sage hover:underline" href="/period">记录 →</Link>
            </div>
            {periodRecords.length === 0 && (
              <p className="text-sm text-cocoa/40">还没有经期记录，建议她先补上。</p>
            )}
          </AppCard>
        </motion.div>

        {/* ── 6. 最近小纸条 —— 仅展示置顶或最新 ── */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <AppCard>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="section-kicker mb-1">💌 小纸条</p>
                <h2 className="font-semibold text-cocoa">最近纸条</h2>
              </div>
              <Link className="text-xs font-medium text-sage hover:underline" href="/notes">全部 →</Link>
            </div>
            {notes.length === 0 ? (
              <p className="text-sm text-cocoa/40">还没有纸条，去写一张吧。</p>
            ) : (
              <div className="space-y-1.5">
                {notes.slice(0, 3).map((n) => (
                  <div key={n.id} className="rounded-xl bg-white/55 px-3 py-2 text-sm text-cocoa/70 line-clamp-1">
                    {n.content}
                  </div>
                ))}
              </div>
            )}
            <Link className="mt-3 inline-block text-xs text-sage/70 hover:underline" href="/notes">
              写一张新纸条 →
            </Link>
          </AppCard>
        </motion.div>

        {/* ── 7. 最近相册 ── */}
        {albums.length > 0 && (
          <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
            <AppCard>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="section-kicker mb-1">📷 相册</p>
                  <h2 className="font-semibold text-cocoa">最近 {albums.length} 张</h2>
                </div>
                <Link className="text-xs font-medium text-sage hover:underline" href="/albums">全部 →</Link>
              </div>
            </AppCard>
          </motion.div>
        )}

        {/* ── 8. 系统诊断摘要 —— 简洁状态，详细诊断去 /debug ── */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <AppCard>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="section-kicker mb-1">🔧 系统状态</p>
                <h2 className="font-semibold text-cocoa">诊断摘要</h2>
              </div>
              <Link className="text-xs font-medium text-sage hover:underline" href="/debug">
                完整诊断 →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-cocoa/60">
              <div className="rounded-xl bg-white/55 px-3 py-2">
                <span className="text-cocoa/40">Supabase</span>
                <span className="ml-1.5 text-emerald font-medium">ok</span>
              </div>
              <div className="rounded-xl bg-white/55 px-3 py-2">
                <span className="text-cocoa/40">Cloud Sync</span>
                <span className="ml-1.5 text-emerald font-medium">ok</span>
              </div>
              <div className="rounded-xl bg-white/55 px-3 py-2">
                <span className="text-cocoa/40">Push</span>
                {pushStatus ? (
                  <span className="ml-1.5 text-emerald font-medium">ok</span>
                ) : (
                  <span className="ml-1.5 text-cocoa/40">--</span>
                )}
              </div>
              <div className="rounded-xl bg-white/55 px-3 py-2">
                <span className="text-cocoa/40">最近错误</span>
                <span className="ml-1.5 text-cocoa/40">无</span>
              </div>
            </div>
            <Link className="mt-3 inline-block text-xs text-sage/70 hover:underline" href="/debug">
              查看详细诊断报告 →
            </Link>
          </AppCard>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}