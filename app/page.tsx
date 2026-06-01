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
import { DEFAULT_PERIOD_SETTINGS } from "@/lib/period";
import { buildRandomMemoryItems, pickRandomMemory } from "@/lib/randomMemory";
import { MissYouButton } from "@/components/MissYouButton";
import { TodayCareStrip, type CareStripItem } from "@/components/TodayCareStrip";
import { buildTodaySummary, TodaySummaryCard } from "@/components/TodaySummaryCard";
import type { TodaySummaryResult } from "@/components/TodaySummaryCard";
import { buildNextImportant, NextImportantCard } from "@/components/NextImportantCard";
import type { NextImportantResult } from "@/components/NextImportantCard";
import { getCurrentDayName } from "@/lib/schedule";
import { getDaysUntilNextPeriod } from "@/lib/period";
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

  // ──── 今日照顾数字行（紧凑 4 格：课程 / DDL / 经期 / 想念） ────
  const careStrip = useMemo((): CareStripItem[] => {
    const items: CareStripItem[] = [];
    const todayDay = getCurrentDayName(now);

    const todaysCourses = data.courses
      .filter((c) => c.day === todayDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    items.push({
      id: "today-courses",
      icon: todaysCourses.length > 0 ? "📖" : "☁️",
      label: "今日课",
      value: `${todaysCourses.length}`,
      href: "/schedule"
    });

    const allExcludedIds = new Set(excludedDdlIds);
    if (nextImportant.selectedDdlId) allExcludedIds.add(nextImportant.selectedDdlId);

    const activeDdls = data.deadlines
      .filter((d) => d.status !== "done" && !allExcludedIds.has(d.id))
      .map((d) => ({ d, days: getDaysUntil(d, now) }))
      .sort((a, b) => a.days - b.days);
    if (activeDdls.length > 0) {
      const next = activeDdls[0];
      const urgency = next.days <= 0 ? "⚠️" : next.days <= 3 ? "⏳" : "📋";
      items.push({
        id: "next-ddl",
        icon: urgency,
        label: "最近DDL",
        value: next.days <= 0 ? "今" : `${next.days}d`,
        href: "/deadlines"
      });
    } else {
      items.push({
        id: "no-ddl",
        icon: "✅",
        label: "DDL",
        value: "0",
        href: "/deadlines"
      });
    }

    const daysUntil = getDaysUntilNextPeriod(periodRecords, periodSettings, now);
    if (daysUntil !== null) {
      if (daysUntil === 0) {
        items.push({ id: "period-today", icon: "🌸", label: "经期", value: "今天", href: "/period" });
      } else if (daysUntil > 0 && daysUntil <= 3) {
        items.push({ id: "period-soon", icon: "🌸", label: "经期", value: `${daysUntil}d`, href: "/period" });
      } else if (daysUntil < 0) {
        items.push({ id: "period-late", icon: "🌸", label: "经期", value: `+${Math.abs(daysUntil)}`, href: "/period" });
      } else {
        items.push({ id: "period-far", icon: "🌿", label: "经期", value: `${daysUntil}d`, href: "/period" });
      }
    } else {
      items.push({ id: "period-no-data", icon: "🌿", label: "经期", value: "—", href: "/period" });
    }

    items.push({
      id: "miss-you-status",
      icon: "💕",
      label: "未读想念",
      value: `${unreadMissYouCount}`,
      href: undefined
    });

    return items;
  }, [data.courses, data.deadlines, periodRecords, periodSettings, now, excludedDdlIds, nextImportant.selectedDdlId, unreadMissYouCount]);

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

        {/* 4. 天气 & 时间 */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <WeatherCareCard state={weatherState} />
        </motion.div>

        {/* 5. 今日照顾数字行（课程 / DDL / 经期 / 想念） */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <TodayCareStrip items={careStrip} />
        </motion.div>

        {/* 6. 置顶小纸条 */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <LoveNoteCard note={featuredLoveNote} fallback={data.note} onRefresh={refreshLoveNote} />
        </motion.div>

        {/* 7. 最近回忆 */}
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