/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import { AppCard } from "@/components/ui/AppCard";
import { ActionTile } from "@/components/ui/ActionTile";
import { LoveNoteCard } from "@/components/LoveNoteCard";
import { useWeatherCare, WeatherCareCard } from "@/components/WeatherCareCard";
import { loadAppData } from "@/lib/storage";
import type { AlbumItem, AppData, PeriodRecord, PeriodSettings } from "@/lib/types";
import { getCloudConnection, getDefaultSpaceCode, isCloudConfigured, pullAndPersistCloudData } from "@/lib/cloudSync";
import { pickFeaturedLoveNote } from "@/lib/loveNotes";
import { defaultAppData } from "@/lib/sampleData";
import { DEFAULT_PERIOD_SETTINGS, getCurrentCycleDay, getDaysUntilNextPeriod } from "@/lib/period";
import { buildRandomMemoryItems, pickRandomMemory } from "@/lib/randomMemory";
import { getUnreadHomeSummary } from "@/lib/readState";
import { fetchCloudReadStates, buildReadKeySet } from "@/lib/readStateClient";
import { MissYouCombinedCard } from "@/components/MissYouCombinedCard";
import { XiaoguaiStatusCard } from "@/components/XiaoguaiStatusCard";
import { buildTodaySummary, TodaySummaryCard } from "@/components/TodaySummaryCard";
import type { TodaySummaryResult } from "@/components/TodaySummaryCard";
import { TodayCareStrip, type CareStripItem } from "@/components/TodayCareStrip";
import { getCurrentDayName } from "@/lib/schedule";
import { useAccessibleMotion, safeVariants, staggerContainer, staggerItem, fadeInScale, safeTransition } from "@/lib/design/motion";
import { useFixedAppIdentity } from "@/hooks/useFixedAppIdentity";
import { getAppSideLabel } from "@/lib/appIdentity";

function safeTodayLabel() {
  try {
    return new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });
  } catch {
    return new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });
  }
}

export default function MeHomePage() {
  const [data, setData] = useState<AppData>(defaultAppData);
  const [syncMessage, setSyncMessage] = useState("");
  const [initError, setInitError] = useState("");
  const [albumItems, setAlbumItems] = useState<AlbumItem[]>([]);
  const [periodRecords, setPeriodRecords] = useState<PeriodRecord[]>([]);
  const [periodSettings, setPeriodSettings] = useState<PeriodSettings>(DEFAULT_PERIOD_SETTINGS);
  const weatherState = useWeatherCare();
  const now = useMemo(() => new Date(), []);
  const spaceCode = useMemo(() => getDefaultSpaceCode(), []);
  const { identityId } = useFixedAppIdentity();
  void identityId; // identity from /me route prefix
  const appSideLabel = getAppSideLabel("owner");

  useEffect(() => {
    const refresh = () => {
      try {
        setData(loadAppData());
      } catch (loadErr) {
        setData(defaultAppData);
        if (process.env.NODE_ENV === "development") {
          setInitError(loadErr instanceof Error ? loadErr.message : "首页初始化失败，已使用默认数据。");
        }
      }
    };
    refresh();
    window.addEventListener("bristol-care-data", refresh);
    return () => {
      window.removeEventListener("bristol-care-data", refresh);
    };
  }, []);

  useEffect(() => {
    fetch(`/api/albums?code=${encodeURIComponent(spaceCode)}&filter=all`)
      .then((res) => res.json())
      .then((payload) => { if (Array.isArray(payload.items)) setAlbumItems(payload.items); })
      .catch(() => {});
  }, [spaceCode]);

  useEffect(() => {
    fetch(`/api/period?code=${encodeURIComponent(spaceCode)}`)
      .then((res) => res.json())
      .then((payload) => {
        if (Array.isArray(payload.records)) setPeriodRecords(payload.records);
        if (payload.settings) setPeriodSettings(payload.settings);
      })
      .catch(() => {});
  }, [spaceCode]);

  useEffect(() => {
    if (!isCloudConfigured()) return;
    try {
      const connection = getCloudConnection();
      if (connection) {
        pullAndPersistCloudData(connection.code).then((result) => {
          if (result.ok && result.data) setData(result.data);
          if (!result.ok) setSyncMessage(result.error || "云同步失败，已使用本地缓存。");
        }).catch(() => setSyncMessage("云同步失败，已使用本地缓存。"));
      }
    } catch {
      setSyncMessage("云同步暂时不可用，已使用本地缓存。");
    }
  }, [spaceCode]);

  const featuredLoveNote = useMemo(() => pickFeaturedLoveNote(data.loveNotes), [data]);
  const recentMemories = useMemo(() => {
    const favorites = albumItems.filter((item) => item.isFavorite);
    return (favorites.length ? favorites : albumItems).slice(0, 2);
  }, [albumItems]);
  const randomMemory = useMemo(() => pickRandomMemory(buildRandomMemoryItems(data.loveNotes, albumItems)), [data.loveNotes, albumItems]);
  const todaySummary: TodaySummaryResult = useMemo(() => buildTodaySummary({
    courses: data.courses,
    deadlines: data.deadlines,
    periodRecords,
    periodSettings,
    unreadMissYouCount: 0,
    featuredNote: featuredLoveNote,
    randomMemory,
    now,
    appSide: "owner"
  }), [data.courses, data.deadlines, periodRecords, periodSettings, featuredLoveNote, randomMemory, now]);

  const periodDaysUntil = useMemo(() => getDaysUntilNextPeriod(periodRecords, periodSettings), [periodRecords, periodSettings]);
  const cycleDay = useMemo(() => getCurrentCycleDay(periodRecords), [periodRecords]);

  const careStripItems: CareStripItem[] = useMemo(() => {
    const todayDay = getCurrentDayName();
    const todayCourseCount = data.courses.filter((c) => c.day === todayDay).length;
    const incompleteDdlCount = data.deadlines.filter((d) => d.status !== "done").length;
    const items: CareStripItem[] = [
      {
        id: "courses",
        icon: "📚",
        label: "今天课程",
        value: String(todayCourseCount),
        href: "/me/records"
      },
      {
        id: "deadlines",
        icon: "📋",
        label: "未完成 DDL",
        value: String(incompleteDdlCount),
        href: "/me/records"
      }
    ];
    if (cycleDay) {
      items.push({
        id: "period",
        icon: "🌸",
        label: "经期第",
        value: `${cycleDay} 天`,
        href: "/me/period"
      });
    } else if (periodDaysUntil !== null && periodDaysUntil <= 3) {
      items.push({
        id: "period",
        icon: "🌸",
        label: "预计经期",
        value: `${periodDaysUntil} 天后`,
        href: "/me/period"
      });
    }
    return items;
  }, [data.courses, data.deadlines, cycleDay, periodDaysUntil]);

  // ──── Cloud-synced unread summary ────
  const [unreadSummary, setUnreadSummary] = useState<{ noteCount: number; albumCount: number; memoryCount: number; total: number; hasAny: boolean }>({
    noteCount: 0, albumCount: 0, memoryCount: 0, total: 0, hasAny: false,
  });

  useEffect(() => {
    const noteIds = data.loveNotes.filter((n) => !n.deletedAt && n.author !== identityId).map((n) => n.id);
    const albumIds = albumItems.filter((a) => !a.deletedAt && a.createdBy !== identityId).map((a) => a.id);

    if (noteIds.length === 0 && albumIds.length === 0) {
      setUnreadSummary({ noteCount: 0, albumCount: 0, memoryCount: 0, total: 0, hasAny: false });
      return;
    }

    let cancelled = false;

    Promise.all([
      noteIds.length > 0 ? fetchCloudReadStates({ spaceCode, identity: identityId, contentType: "note", contentIds: noteIds }) : Promise.resolve([]),
      albumIds.length > 0 ? fetchCloudReadStates({ spaceCode, identity: identityId, contentType: "album", contentIds: albumIds }) : Promise.resolve([]),
    ]).then(([noteReads, albumReads]) => {
      if (cancelled) return;
      const noteReadSet = buildReadKeySet(noteReads);
      const albumReadSet = buildReadKeySet(albumReads);
      const noteCount = noteIds.filter((id) => !noteReadSet.has(`note:${id}`)).length;
      const albumCount = albumIds.filter((id) => !albumReadSet.has(`album:${id}`)).length;
      setUnreadSummary({ noteCount, albumCount, memoryCount: 0, total: noteCount + albumCount, hasAny: noteCount + albumCount > 0 });
    }).catch(() => {
      const summary = getUnreadHomeSummary({ notes: data.loveNotes, albums: albumItems }, spaceCode, identityId);
      setUnreadSummary(summary);
    });

    return () => { cancelled = true; };
  }, [data.loveNotes, albumItems, spaceCode, identityId]);

  const unreadNotesCount = unreadSummary.noteCount;
  const unreadAlbumsMemoryCount = unreadSummary.albumCount + unreadSummary.memoryCount;

  const refreshLoveNote = () => setData(loadAppData());

  const todayLabel = safeTodayLabel();
  const [missYouPartnerCount, setMissYouPartnerCount] = useState(0);
  useEffect(() => {
    const d = new Date();
    const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    fetch(`/api/miss-you?spaceCode=${encodeURIComponent(spaceCode)}&localDate=${localDate}&limit=1&viewer=${encodeURIComponent(identityId)}`)
      .then((res) => res.json())
      .then((payload) => {
        if (payload.ok && payload.todayByAuthor) {
          setMissYouPartnerCount(payload.todayByAuthor.xiaoguai || 0);
        }
      })
      .catch(() => {});
  }, [spaceCode, identityId]);
  const reduceMotion = useAccessibleMotion();

  return (
    <AppShell>
      {/* ── Hero header ── */}
      <motion.header
        className="relative mb-4 overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-skySoft/50 via-cream/80 to-lilac/30 px-5 py-5 shadow-soft backdrop-blur-md"
        variants={safeVariants(fadeInScale, reduceMotion)}
        initial="hidden"
        animate="visible"
        transition={safeTransition({ duration: 0.26, ease: "easeOut" }, reduceMotion)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="section-kicker">{appSideLabel}</p>
            <h1 className="mt-1.5 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-cocoa">今天也好</h1>
          </div>
          <div className="shrink-0 rounded-[1.25rem] border border-white/70 bg-white/62 px-3 py-1.5 text-right text-xs leading-5 text-cocoa/62 shadow-sm">
            <div>{todayLabel}</div>
          </div>
        </div>
        <p className="mt-2 text-sm leading-5 text-cocoa/50">看看小乖今天怎么样。</p>
        <AnimatePresence>
          {unreadNotesCount > 0 && (
            <motion.div
              key="note-pill"
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Link
                href="/me/notes"
                className="mt-3 inline-flex"
              >
                <UnreadBadge mode="label" count={unreadNotesCount} label={`${unreadNotesCount} 条小纸条还没看`} className="shadow-sm" />
              </Link>
            </motion.div>
          )}
          {unreadAlbumsMemoryCount > 0 && (
            <motion.div
              key="memory-pill"
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Link
                href="/me/memories/unread"
                className="mt-3 inline-flex"
              >
                <UnreadBadge mode="label" count={unreadAlbumsMemoryCount} label={`${unreadAlbumsMemoryCount} 个新回忆等你看`} className="shadow-sm" />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ── Cards ── */}
      <motion.div className="space-y-3" variants={safeVariants(staggerContainer, reduceMotion)} initial="hidden" animate="visible">
        {initError ? (
          <AppCard variant="soft">
            <p className="text-sm text-[var(--app-muted)]">页面初始化遇到一点问题，已使用默认数据。</p>
          </AppCard>
        ) : null}
        {syncMessage ? (
          <AppCard variant="soft">
            <p className="text-sm text-[var(--app-muted)]">{syncMessage}</p>
          </AppCard>
        ) : null}

        {/* XiaoguaiStatusCard */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <XiaoguaiStatusCard
            weather={weatherState}
            missYouCount={missYouPartnerCount}
            unreadNotesCount={unreadNotesCount}
            unreadAlbumsMemoryCount={unreadAlbumsMemoryCount}
          />
        </motion.div>


        {/* 1. TodaySummaryCard */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <TodaySummaryCard summary={todaySummary} />
        </motion.div>

        {/* 2. Quick Actions */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)} className="space-y-2">
          <p className="section-kicker px-1">做点什么</p>
          <ActionTile
            title="写小纸条"
            description="给小乖留一张新的小纸条。"
            icon="💌"
            href="/me/notes"
          />
          <ActionTile
            title="传相册"
            description="上传一张新的回忆。"
            icon="📷"
            href="/me/albums"
          />
          <ActionTile
            title="看未读回忆"
            description="看看还没读过的回忆。"
            icon="💭"
            href="/me/memories/unread"
          />
        </motion.div>

        {/* 3. Weather — 小乖那边的天气 */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <WeatherCareCard state={weatherState} compact />
        </motion.div>

        {/* 4. MissYouCombinedCard */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <MissYouCombinedCard spaceCode={spaceCode} identityId={identityId} appSide="owner" variant="compact" />
        </motion.div>

        {/* 5. LoveNoteCard */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <LoveNoteCard note={featuredLoveNote} fallback={data.note} onRefresh={refreshLoveNote} identityId={identityId} appSide="owner" compact />
        </motion.div>

        {/* 6. RecentMemories (2 photos) */}
        {recentMemories.length > 0 && (
          <motion.section className="soft-card" variants={safeVariants(staggerItem, reduceMotion)}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="section-kicker mb-1">最近回忆</p>
                <h2 className="font-semibold text-cocoa">最近回忆</h2>
              </div>
              <Link className="text-sm text-sage" href="/me/albums">相册</Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {recentMemories.map((item) => (
                <Link className="relative overflow-hidden rounded-2xl bg-white/60 shadow-sm" href="/me/albums" key={item.id}>
                  {item.imageUrl ? <img className="aspect-square w-full object-cover" src={item.imageUrl} alt={item.title || "相册照片"} loading="lazy" /> : <div className="flex aspect-square items-center justify-center bg-cocoa/75 text-white">▶</div>}
                  {item.isFavorite ? <span className="absolute right-1 top-1 rounded-full bg-white/75 px-1.5 text-xs">♡</span> : null}
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* 7. TodayCareStrip */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <TodayCareStrip items={careStripItems} />
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
