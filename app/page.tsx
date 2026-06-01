"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { LoveNoteCard } from "@/components/LoveNoteCard";
import { OnboardingCard } from "@/components/OnboardingCard";
import { useWeather } from "@/components/WeatherCard";
import { formatCountdown } from "@/lib/date";
import { loadAppData } from "@/lib/storage";
import type { AlbumItem, AppData, PeriodRecord, PeriodSettings } from "@/lib/types";
import { getCloudConnection, getDefaultSpaceCode, isCloudConfigured, pullAndPersistCloudData, syncLoveNotesIntoLocalData } from "@/lib/cloudSync";
import { pickFeaturedLoveNote } from "@/lib/loveNotes";
import { defaultAppData } from "@/lib/sampleData";
import { DEFAULT_PERIOD_SETTINGS } from "@/lib/period";
import { getTodayPriorityReminders } from "@/lib/priorityReminders";
import { buildRandomMemoryItems, pickRandomMemory } from "@/lib/randomMemory";
import { MissYouButton } from "@/components/MissYouButton";
import { TodaySummaryCard, buildTodaySummary } from "@/components/TodaySummaryCard";
import { buildTodayCareSegments, buildNextImportant } from "@/components/TodayCareSummary";
import type { TodayCareSegment, NextImportantResult } from "@/components/TodayCareSummary";
import { useAccessibleMotion, safeTransition, safeVariants, fadeInScale, staggerContainer, staggerItem } from "@/lib/design/motion";
import { AppCard } from "@/components/ui/AppCard";

function safeBristolDate() {
  try {
    return new Date().toLocaleDateString("zh-CN", { timeZone: "Europe/London", month: "long", day: "numeric", weekday: "long" });
  } catch {
    return new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });
  }
}

function safeBristolStatus() {
  try {
    const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hour12: false }).format(new Date()));
    if (hour < 6) return "Bristol 还在安静的夜里";
    if (hour < 12) return "Bristol 的早晨开始啦";
    if (hour < 18) return "Bristol 午后适合慢慢推进";
  } catch {
    return "Bristol 的一天正在慢慢展开";
  }
  return "Bristol 晚上记得早点休息";
}

export default function HomePage() {
  const [data, setData] = useState<AppData>(defaultAppData);
  const [syncMessage, setSyncMessage] = useState("");
  const [initError, setInitError] = useState("");
  const [albumItems, setAlbumItems] = useState<AlbumItem[]>([]);
  const [periodRecords, setPeriodRecords] = useState<PeriodRecord[]>([]);
  const [periodSettings, setPeriodSettings] = useState<PeriodSettings>(DEFAULT_PERIOD_SETTINGS);
  useWeather();

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
      } catch (loadError) {
        setData(defaultAppData);
        if (process.env.NODE_ENV === "development") {
          setInitError(loadError instanceof Error ? loadError.message : "首页初始化失败，已使用默认数据。");
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
  const priorityReminders = useMemo(() => getTodayPriorityReminders({
    courses: data.courses,
    deadlines: data.deadlines,
    periodRecords,
    periodSettings
  }), [data.courses, data.deadlines, periodRecords, periodSettings]);
  const topPriorityReminder = useMemo(() => priorityReminders[0] || null, [priorityReminders]);
  const recentMemories = useMemo(() => {
    const favorites = albumItems.filter((item) => item.isFavorite);
    return (favorites.length ? favorites : albumItems).slice(0, 4);
  }, [albumItems]);
  const randomMemory = useMemo(() => pickRandomMemory(buildRandomMemoryItems(data.loveNotes, albumItems)), [data.loveNotes, albumItems]);
  const todayLabel = useMemo(safeBristolDate, []);
  const bristolStatus = useMemo(safeBristolStatus, []);
  const [unreadMissYouCount, setUnreadMissYouCount] = useState(0);

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

  const todaySummary = useMemo(() => buildTodaySummary({
    courses: data.courses,
    deadlines: data.deadlines,
    periodRecords,
    periodSettings,
    unreadMissYouCount,
    featuredNote: featuredLoveNote,
    randomMemory
  }), [data.courses, data.deadlines, periodRecords, periodSettings, unreadMissYouCount, featuredLoveNote, randomMemory]);

  const nextImportant = useMemo((): NextImportantResult => buildNextImportant({
    courses: data.courses,
    deadlines: data.deadlines,
    periodRecords,
    periodSettings
  }), [data.courses, data.deadlines, periodRecords, periodSettings]);

  const careSegments = useMemo((): TodayCareSegment[] => buildTodayCareSegments({
    courses: data.courses,
    deadlines: data.deadlines,
    periodRecords,
    periodSettings,
    unreadMissYouCount,
    featuredNote: featuredLoveNote,
    randomMemory,
    topPriorityReminder
  }), [data.courses, data.deadlines, periodRecords, periodSettings, unreadMissYouCount, featuredLoveNote, randomMemory, topPriorityReminder]);

  useEffect(() => {
    const localDate = new Date().toISOString().slice(0, 10);
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
  }, []);

  const reduceMotion = useAccessibleMotion();

  return (
    <AppShell>
      {/* ── Hero ── */}
      <motion.header
        className="mb-4 overflow-hidden rounded-[2.15rem] border border-white/75 bg-gradient-to-br from-white/88 via-blush/58 to-skySoft/75 px-4 py-4 shadow-float ring-1 ring-white/60 backdrop-blur-2xl"
        variants={safeVariants(fadeInScale, reduceMotion)}
        initial="hidden"
        animate="visible"
        transition={safeTransition({ duration: 0.26, ease: "easeOut" }, reduceMotion)}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="section-kicker">Bristol Care</p>
            <h1 className="mt-1.5 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-cocoa">
              小乖，今天也好
            </h1>
          </div>
          <div className="shrink-0 rounded-[1.25rem] border border-white/70 bg-white/62 px-2.5 py-1.5 text-right text-[11px] leading-5 text-cocoa/62 shadow-sm">
            <div>{todayLabel}</div>
            <div className="font-semibold text-cocoa">今日照顾</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-white/70 bg-white/58 px-2.5 py-1 text-[11px] font-medium text-cocoa/70 shadow-sm">{bristolStatus}</span>
          <span className="rounded-full border border-white/70 bg-white/58 px-2.5 py-1 text-[11px] font-medium text-cocoa/70 shadow-sm">今天也慢慢来</span>
        </div>
        <p className="mt-3 text-[13px] leading-5 text-cocoa/65">慢慢吃饭，慢慢走路，今天也不用急着证明什么。</p>
      </motion.header>

      <motion.div
        className="space-y-3.5"
        variants={safeVariants(staggerContainer, reduceMotion)}
        initial="hidden"
        animate="visible"
      >
        {initError ? <p className="notice notice-error">页面初始化遇到一点问题，已使用默认数据。{initError}</p> : null}
        {syncMessage ? <p className="notice">{syncMessage}</p> : null}

        {/* 1. TodaySummaryCard - 智能今日摘要 */}
        <TodaySummaryCard summary={todaySummary} />

        {/* 2. 下一件重要事项 */}
        <AppCard className="bg-gradient-to-br from-white/88 via-butter/38 to-blush/38">
          <p className="section-kicker mb-1">Next</p>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-cocoa">{nextImportant.label}</h2>
              <p className="mt-1 text-sm font-medium text-cocoa truncate">{nextImportant.title}</p>
              {nextImportant.detail ? (
                <p className="mt-1 text-xs leading-5 text-cocoa/60">{nextImportant.detail}</p>
              ) : null}
            </div>
            {nextImportant.href ? (
              <Link
                className="shrink-0 rounded-full border border-white/70 bg-white/62 px-3 py-1 text-xs font-medium text-sage shadow-sm hover:bg-white/80 transition"
                href={nextImportant.href}
              >
                去看看
              </Link>
            ) : null}
          </div>
        </AppCard>

        {/* 3. Miss You - 想你按钮 */}
        <MissYouButton />

        {/* 4. 今日照顾片段（课程/DDL/经期/纸条/回忆 - 统一摘要） */}
        <section className="soft-card">
          <div className="mb-3">
            <p className="section-kicker mb-1">Today Care</p>
            <h2 className="font-semibold text-cocoa">今日照顾</h2>
          </div>
          <div className="divide-y divide-white/60">
            {careSegments.length === 0 ? (
              <p className="py-4 text-sm text-cocoa/55">今天一切平和，慢慢来就好。</p>
            ) : (
              careSegments.map((seg) => (
                <div key={seg.id} className="flex items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-cocoa">{seg.label}</p>
                    <p className="text-xs leading-5 text-cocoa/70 truncate">{seg.summary}</p>
                    {seg.detail ? (
                      <p className="mt-0.5 text-[11px] text-cocoa/45">{seg.detail}</p>
                    ) : null}
                  </div>
                  {seg.href && seg.actionLabel ? (
                    <Link
                      className="shrink-0 rounded-full border border-white/70 bg-white/62 px-2.5 py-0.5 text-[11px] font-medium text-sage shadow-sm hover:bg-white/80 transition"
                      href={seg.href}
                    >
                      {seg.actionLabel}
                    </Link>
                  ) : null}
                </div>
              ))
            )}
          </div>
          <Link className="mt-3 inline-block text-xs text-sage hover:underline" href="/records">更多详情 →</Link>
        </section>

        {/* 5. Countdown - 下次见面 */}
        <div className="soft-card bg-gradient-to-br from-white/82 to-blush/42">
          <p className="section-kicker mb-1">Countdown</p>
          <h2 className="font-semibold text-cocoa">下次见面</h2>
          <p className="mt-3 text-2xl font-semibold text-cocoa">{formatCountdown(data.nextMeetDate)}</p>
        </div>

        {/* 6. Love Note - 置顶小纸条 */}
        <LoveNoteCard note={featuredLoveNote} fallback={data.note} onRefresh={refreshLoveNote} />
        <div className="grid grid-cols-2 gap-2">
          <Link className="btn-primary text-center" href="/notes">小纸条墙</Link>
          <Link className="btn-secondary text-center" href="/notes">写一张</Link>
        </div>

        {/* 7. Memories - 最近回忆 */}
        <section className="soft-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="section-kicker mb-1">Memories</p>
              <h2 className="font-semibold text-cocoa">最近回忆</h2>
            </div>
            <Link className="text-sm text-sage" href="/albums">相册</Link>
          </div>
          {recentMemories.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
          ) : <p className="empty-state text-left">还没有放进相册的照片，之后慢慢补上。</p>}
        </section>

        {/* 8. Onboarding - 引导卡 */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <OnboardingCard />
        </motion.div>
      </motion.div>
    </AppShell>
  );
}