"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { LoveNoteCard } from "@/components/LoveNoteCard";
import { useWeatherCare, WeatherCareCard } from "@/components/WeatherCareCard";
import { loadAppData } from "@/lib/storage";
import type { AlbumItem, AppData, PeriodRecord, PeriodSettings } from "@/lib/types";
import { getCloudConnection, getDefaultSpaceCode, isCloudConfigured, pullAndPersistCloudData, syncLoveNotesIntoLocalData } from "@/lib/cloudSync";
import { pickFeaturedLoveNote } from "@/lib/loveNotes";
import { defaultAppData } from "@/lib/sampleData";
import { DEFAULT_PERIOD_SETTINGS, calculateNextPeriodStart, getCurrentCycleDay, getDaysUntilNextPeriod } from "@/lib/period";
import { buildRandomMemoryItems, pickRandomMemory } from "@/lib/randomMemory";
import { MissYouButton } from "@/components/MissYouButton";
import { buildTodaySummary, TodaySummaryCard } from "@/components/TodaySummaryCard";
import type { TodaySummaryResult } from "@/components/TodaySummaryCard";
import { buildNextImportant, NextImportantCard } from "@/components/NextImportantCard";
import type { NextImportantResult } from "@/components/NextImportantCard";
import { getCurrentDayName } from "@/lib/schedule";
import { getDaysUntil } from "@/lib/ddlPriority";
import { useAccessibleMotion, safeVariants, staggerContainer, staggerItem, fadeInScale, safeTransition } from "@/lib/design/motion";

function safeTodayLabel() {
  try {
    return new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });
  } catch {
    return new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });
  }
}

export default function HomePage() {
  const [data, setData] = useState<AppData>(defaultAppData);
  const [syncMessage, setSyncMessage] = useState("");
  const [initError, setInitError] = useState("");
  const [albumItems, setAlbumItems] = useState<AlbumItem[]>([]);
  const [periodRecords, setPeriodRecords] = useState<PeriodRecord[]>([]);
  const [periodSettings, setPeriodSettings] = useState<PeriodSettings>(DEFAULT_PERIOD_SETTINGS);
  const weatherState = useWeatherCare();

  useEffect(() => {
    const emergencyReset = () => {
      try {
        if (!window.location.search.includes("reset=1")) return;
        const keys = Object.keys(window.localStorage);
        for (const key of keys) {
          if (key.startsWith("bristol_dashboard_")) window.localStorage.removeItem(key);
        }
      } catch {
        // Emergency reset must never block rendering.
      }
    };
    const refresh = () => {
      try {
        emergencyReset();
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
    fetch(`/api/albums?code=${encodeURIComponent(getDefaultSpaceCode())}&filter=all`)
      .then((response) => response.json())
      .then((payload) => {
        if (Array.isArray(payload.items)) setAlbumItems(payload.items);
      })
      .catch(() => {
        // Albums are optional for first paint.
      });
  }, []);

  useEffect(() => {
    fetch(`/api/period?code=${encodeURIComponent(getDefaultSpaceCode())}`)
      .then((response) => response.json())
      .then((payload) => {
        if (Array.isArray(payload.records)) setPeriodRecords(payload.records);
        if (payload.settings) setPeriodSettings(payload.settings);
      })
      .catch(() => {
        // Period records are optional for first paint.
      });
  }, []);

  useEffect(() => {
    if (!isCloudConfigured()) return;
    try {
      const connection = getCloudConnection();
      if (connection) {
        pullAndPersistCloudData(connection.code).then((result) => {
          if (result.ok && result.data) setData(result.data);
          if (!result.ok) setSyncMessage(result.error || "云同步失败，已使用本地缓存。");
        }).catch(() => setSyncMessage("云同步失败，已使用本地缓存。"));
        return;
      }
      syncLoveNotesIntoLocalData(getDefaultSpaceCode()).then((result) => {
        if (result.ok && result.data) setData(result.data);
      }).catch(() => {
        // Cloud notes are optional for first paint.
      });
    } catch {
      setSyncMessage("云同步暂时不可用，已使用本地缓存。");
    }
  }, []);

  const featuredLoveNote = useMemo(() => pickFeaturedLoveNote(data.loveNotes), [data]);
  const recentMemories = useMemo(() => {
    const favorites = albumItems.filter((item) => item.isFavorite);
    return (favorites.length ? favorites : albumItems).slice(0, 4);
  }, [albumItems]);
  const randomMemory = useMemo(() => pickRandomMemory(buildRandomMemoryItems(data.loveNotes, albumItems)), [data.loveNotes, albumItems]);
  const todayLabel = useMemo(safeTodayLabel, []);
  const [unreadMissYouCount, setUnreadMissYouCount] = useState(0);
  const now = useMemo(() => new Date(), []);

  async function refreshLoveNote() {
    const connection = getCloudConnection();
    if (!connection) {
      if (!isCloudConfigured()) {
        setSyncMessage("云同步未配置，本地模式可继续使用。");
        return;
      }
      const result = await syncLoveNotesIntoLocalData(getDefaultSpaceCode());
      if (result.ok && result.data) {
        setData(result.data);
        setSyncMessage("小纸条已刷新。");
      } else {
        setSyncMessage("刷新失败，已显示本地缓存。");
      }
      return;
    }
    const result = await pullAndPersistCloudData(connection.code);
    if (result.ok && result.data) {
      setData(result.data);
      setSyncMessage("小纸条已刷新。");
    } else {
      setSyncMessage(result.error || "刷新失败，已保留本地小纸条。");
    }
  }

  // ──── 今日最重要事项 ────
  const todaySummary = useMemo((): TodaySummaryResult => buildTodaySummary({
    courses: data.courses,
    deadlines: data.deadlines,
    periodRecords,
    periodSettings,
    unreadMissYouCount,
    featuredNote: featuredLoveNote,
    randomMemory,
    now
  }), [data.courses, data.deadlines, periodRecords, periodSettings, unreadMissYouCount, featuredLoveNote, randomMemory, now]);

  // 排除 TodaySummaryCard 中已展示的 DDL
  const excludedDdlIds = useMemo((): Set<string> => {
    const ids = new Set<string>();
    if (todaySummary.selectedDdl?.deadline.id) {
      ids.add(todaySummary.selectedDdl.deadline.id);
    }
    return ids;
  }, [todaySummary.selectedDdl]);

  // ──── 下一件重要事项 ────
  const nextImportant = useMemo((): NextImportantResult => buildNextImportant({
    courses: data.courses,
    deadlines: data.deadlines,
    periodRecords,
    periodSettings,
    unreadMissYouCount,
    featuredNote: featuredLoveNote,
    randomMemory,
    skipType: todaySummary.type,
    excludedDdlIds,
    now
  }), [data.courses, data.deadlines, periodRecords, periodSettings, unreadMissYouCount, featuredLoveNote, randomMemory, todaySummary.type, excludedDdlIds, now]);

  // ──── 今日课程摘要 ────
  const todayCourses = useMemo(() => {
    const todayDay = getCurrentDayName(now);
    return data.courses
      .filter((c) => c.day === todayDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [data.courses, now]);

  // ──── 最近 DDL 摘要（排除已在 TodaySummaryCard 和 NextImportantCard 中展示的）───
  const ddlSummary = useMemo(() => {
    const allExcludedIds = new Set(excludedDdlIds);
    if (nextImportant.selectedDdlId) allExcludedIds.add(nextImportant.selectedDdlId);
    return data.deadlines
      .filter((d) => d.status !== "done" && !allExcludedIds.has(d.id))
      .map((d) => ({ d, days: getDaysUntil(d, now) }))
      .sort((a, b) => a.days - b.days)
      .slice(0, 3);
  }, [data.deadlines, excludedDdlIds, nextImportant.selectedDdlId, now]);

  // ──── 经期状态摘要 ────
  const periodSummary = useMemo(() => {
    const cycleDay = getCurrentCycleDay(periodRecords);
    const daysUntil = getDaysUntilNextPeriod(periodRecords, periodSettings, now);
    const nextStart = calculateNextPeriodStart(periodRecords, periodSettings);
    return { cycleDay, daysUntil, nextStart, hasRecords: periodRecords.length > 0 };
  }, [periodRecords, periodSettings, now]);

  useEffect(() => {
    const localDate = now.toISOString().slice(0, 10);
    fetch(`/api/miss-you?code=${encodeURIComponent(getDefaultSpaceCode())}&localDate=${localDate}&limit=1&viewer=xiaoguai&includeUnread=true`)
      .then((res) => res.json())
      .then((payload) => {
        if (payload.ok && typeof payload.unreadFromOtherCount === "number") {
          setUnreadMissYouCount(payload.unreadFromOtherCount);
        }
      })
      .catch(() => {
        // Non-blocking
      });
  }, [now]);

  const reduceMotion = useAccessibleMotion();

  return (
    <AppShell>
      {/* ── Hero ── */}
      <motion.header
        className="mb-4 overflow-hidden rounded-[2rem] border border-white/75 bg-gradient-to-br from-white/88 via-blush/58 to-skySoft/75 px-4 py-4 shadow-float ring-1 ring-white/60 backdrop-blur-2xl"
        variants={safeVariants(fadeInScale, reduceMotion)}
        initial="hidden"
        animate="visible"
        transition={safeTransition({ duration: 0.26, ease: "easeOut" }, reduceMotion)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="section-kicker">今日照顾</p>
            <h1 className="mt-1.5 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-cocoa">
              小乖，今天也好
            </h1>
          </div>
          <div className="shrink-0 rounded-[1.25rem] border border-white/70 bg-white/62 px-3 py-1.5 text-right text-xs leading-5 text-cocoa/62 shadow-sm">
            <div>{todayLabel}</div>
          </div>
        </div>
        <p className="mt-2.5 text-sm leading-5 text-cocoa/65">
          打开就能看今天该关心什么，不急不赶。
        </p>
      </motion.header>

      <motion.div
        className="space-y-3.5"
        variants={safeVariants(staggerContainer, reduceMotion)}
        initial="hidden"
        animate="visible"
      >
        {initError ? <p className="notice notice-error">页面初始化遇到一点问题，已使用默认数据。{initError}</p> : null}
        {syncMessage ? <p className="notice">{syncMessage}</p> : null}

        {/* 1. 今日最重要事项 */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <TodaySummaryCard summary={todaySummary} />
        </motion.div>

        {/* 2. 下一件重要事项（不重复 TodaySummaryCard 内容） */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <NextImportantCard next={nextImportant} />
        </motion.div>

        {/* 3. 想你按钮 + 未读想念 */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <MissYouButton />
        </motion.div>

        {/* 4. 今日课程 —— 独立摘要卡片 */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <section className="soft-card bg-gradient-to-br from-white/85 via-skySoft/30 to-white/80">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="section-kicker mb-1">📚 今日课程</p>
                <h2 className="font-semibold text-cocoa">
                  {todayCourses.length > 0 ? `${todayCourses.length} 节课` : "今天没课"}
                </h2>
              </div>
              <Link className="text-xs font-medium text-sage hover:underline" href="/schedule">课表 →</Link>
            </div>
            {todayCourses.length > 0 ? (
              <div className="space-y-1.5">
                {todayCourses.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl bg-white/55 px-3 py-2 text-sm">
                    <span className="text-cocoa font-medium truncate">{c.name}</span>
                    <span className="text-xs text-cocoa/45 shrink-0 ml-2">{c.startTime}–{c.endTime}</span>
                  </div>
                ))}
                {todayCourses.length > 3 && (
                  <p className="text-xs text-cocoa/40 pt-0.5">还有 {todayCourses.length - 3} 节，去课表看全部。</p>
                )}
              </div>
            ) : (
              <p className="empty-state py-3 text-left text-sm">今天没有课，属于自己的节奏。</p>
            )}
          </section>
        </motion.div>

        {/* 5. 最近 DDL —— 独立摘要卡片（排除已展示的） */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <section className="soft-card bg-gradient-to-br from-white/85 via-amber-50/35 to-white/80">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="section-kicker mb-1">📋 最近 DDL</p>
                <h2 className="font-semibold text-cocoa">
                  {ddlSummary.length > 0 ? `${ddlSummary.length} 个待办` : "全部完成 ✅"}
                </h2>
              </div>
              <Link className="text-xs font-medium text-sage hover:underline" href="/deadlines">管理 →</Link>
            </div>
            {ddlSummary.length > 0 ? (
              <div className="space-y-1.5">
                {ddlSummary.map(({ d, days }) => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl bg-white/55 px-3 py-2 text-sm">
                    <span className="text-cocoa truncate">{d.title}</span>
                    <span className={`text-xs shrink-0 ml-2 ${days <= 1 ? "text-rose font-semibold" : "text-cocoa/40"}`}>
                      {days === 0 ? "今天" : days < 0 ? `超 ${Math.abs(days)} 天` : `${days} 天`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state py-3 text-left text-sm">最近没有未完成 DDL，真棒。</p>
            )}
          </section>
        </motion.div>

        {/* 6. 经期状态 —— 独立摘要卡片 */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <section className="soft-card bg-gradient-to-br from-white/85 via-blush/35 to-white/80">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="section-kicker mb-1">🌸 经期状态</p>
                <h2 className="font-semibold text-cocoa">
                  {periodSummary.hasRecords
                    ? periodSummary.cycleDay
                      ? `第 ${periodSummary.cycleDay} 天`
                      : "不在经期"
                    : "暂无记录"}
                </h2>
              </div>
              <Link className="text-xs font-medium text-sage hover:underline" href="/period">记录 →</Link>
            </div>
            {periodSummary.hasRecords ? (
              <div className="grid grid-cols-2 gap-2 text-sm text-cocoa/70">
                <div className="rounded-2xl bg-white/58 px-3 py-2.5">
                  <p className="text-xs text-cocoa/45">预计开始</p>
                  <p className="font-semibold text-cocoa">{periodSummary.nextStart || "—"}</p>
                </div>
                <div className="rounded-2xl bg-white/58 px-3 py-2.5">
                  <p className="text-xs text-cocoa/45">距离下次</p>
                  <p className="font-semibold text-cocoa">
                    {periodSummary.daysUntil === null ? "—"
                      : periodSummary.daysUntil >= 0 ? `${periodSummary.daysUntil} 天`
                      : `过 ${Math.abs(periodSummary.daysUntil)} 天`}
                  </p>
                </div>
              </div>
            ) : (
              <p className="empty-state py-3 text-left text-sm">还没有经期记录，可以先补一条。</p>
            )}
          </section>
        </motion.div>

        {/* 7. 天气 & 时间（compact 模式） */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <WeatherCareCard state={weatherState} compact />
        </motion.div>

        {/* 8. 置顶小纸条 */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <LoveNoteCard note={featuredLoveNote} fallback={data.note} onRefresh={refreshLoveNote} />
        </motion.div>

        {/* 9. 最近回忆 */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <section className="soft-card">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="section-kicker mb-1">Memories</p>
                <h2 className="font-semibold text-cocoa">最近回忆</h2>
              </div>
              <Link className="text-sm text-sage" href="/albums">相册</Link>
            </div>
            {recentMemories.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {recentMemories.map((item) => (
                  <Link className="relative overflow-hidden rounded-2xl bg-white/60 shadow-sm" href="/albums" key={item.id}>
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="aspect-square w-full object-cover" src={item.imageUrl} alt={item.title || "相册照片"} loading="lazy" />
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-cocoa/75 text-white">▶</div>
                    )}
                    {item.isFavorite ? <span className="absolute right-1 top-1 rounded-full bg-white/75 px-1.5 text-xs">♡</span> : null}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="empty-state text-left">还没有放进相册的照片，之后慢慢补上。</p>
            )}
          </section>
        </motion.div>
      </motion.div>
    </AppShell>
  );
}