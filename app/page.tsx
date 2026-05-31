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
import { PriorityReminderList } from "@/components/PriorityReminderList";
import { DualTimeCard } from "@/components/DualTimeCard";
import { buildRandomMemoryItems, pickRandomMemory } from "@/lib/randomMemory";
import { MissYouButton } from "@/components/MissYouButton";
import { TodaySummaryCard, buildTodaySummary } from "@/components/TodaySummaryCard";
import { useAccessibleMotion, safeTransition, safeVariants, fadeInScale, staggerContainer, staggerItem } from "@/lib/design/motion";

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
  const recentMemories = useMemo(() => {
    const favorites = albumItems.filter((item) => item.isFavorite);
    return (favorites.length ? favorites : albumItems).slice(0, 3);
  }, [albumItems]);
  const randomMemory = useMemo(() => pickRandomMemory(buildRandomMemoryItems(data.loveNotes, albumItems)), [data.loveNotes, albumItems]);
  const todayLabel = useMemo(safeBristolDate, []);
  const bristolStatus = useMemo(safeBristolStatus, []);

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
  const [unreadMissYouCount, setUnreadMissYouCount] = useState(0);
  const todaySummary = useMemo(() => buildTodaySummary({
    courses: data.courses,
    deadlines: data.deadlines,
    periodRecords,
    periodSettings,
    unreadMissYouCount,
    featuredNote: featuredLoveNote,
    randomMemory
  }), [data.courses, data.deadlines, periodRecords, periodSettings, unreadMissYouCount, featuredLoveNote, randomMemory]);

  // Fetch miss-you unread count independently (non-blocking)
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
        className="mb-4 overflow-hidden rounded-[2.15rem] border border-white/75 bg-gradient-to-br from-white/88 via-blush/58 to-skySoft/75 p-5 shadow-float ring-1 ring-white/60 backdrop-blur-2xl"
        variants={safeVariants(fadeInScale, reduceMotion)}
        initial="hidden"
        animate="visible"
        transition={safeTransition({ duration: 0.26, ease: "easeOut" }, reduceMotion)}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-kicker">Bristol Care</p>
            <h1 className="mt-2 text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-cocoa">
              小乖，今天也好
            </h1>
          </div>
          <div className="rounded-[1.25rem] border border-white/70 bg-white/62 px-3 py-2 text-right text-xs leading-5 text-cocoa/62 shadow-sm">
            <div>{todayLabel}</div>
            <div className="font-semibold text-cocoa">今日总览</div>
          </div>
        </div>
        <DualTimeCard />
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/70 bg-white/58 px-3 py-1.5 text-xs font-medium text-cocoa/70 shadow-sm">{bristolStatus}</span>
          <span className="rounded-full border border-white/70 bg-white/58 px-3 py-1.5 text-xs font-medium text-cocoa/70 shadow-sm">为 {data.nickname || "小乖"} 准备的小首页</span>
        </div>
        <p className="mt-4 text-sm leading-6 text-cocoa/70">慢慢吃饭，慢慢走路，今天也不用急着证明什么。</p>
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

        {/* 2. Priority - 今日重点提醒 */}
        <section className="soft-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="section-kicker mb-1">Today</p>
              <h2 className="font-semibold text-cocoa">今日重点提醒</h2>
            </div>
            <Link className="text-sm text-sage" href="/records">全部</Link>
          </div>
          <PriorityReminderList reminders={priorityReminders} limit={3} />
        </section>

        {/* 3. Countdown - 下次见面 */}
        <div className="soft-card bg-gradient-to-br from-white/82 to-blush/42">
          <p className="section-kicker mb-1">Countdown</p>
          <h2 className="font-semibold text-cocoa">下次见面</h2>
          <p className="mt-3 text-2xl font-semibold text-cocoa">{formatCountdown(data.nextMeetDate)}</p>
        </div>

        {/* 4. Love Note - 小纸条 */}
        <LoveNoteCard note={featuredLoveNote} fallback={data.note} onRefresh={refreshLoveNote} />
        <div className="grid grid-cols-2 gap-2">
          <Link className="btn-primary text-center" href="/notes">查看小纸条墙</Link>
          <Link className="btn-secondary text-center" href="/notes">写一张</Link>
        </div>

        {/* 5. Miss You - 想你按钮，情感连接在纸条之后更自然 */}
        <MissYouButton />

        {/* 6. Memories - 最近回忆，移动端改为2列 */}
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
                    <img className="aspect-square w-full object-cover" src={item.imageUrl} alt={item.title || "相册照片"} />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-cocoa/75 text-white">▶</div>
                  )}
                  {item.isFavorite ? <span className="absolute right-1 top-1 rounded-full bg-white/75 px-1.5 text-xs">♡</span> : null}
                </Link>
              ))}
            </div>
          ) : <p className="empty-state text-left">还没有放进相册的照片，之后慢慢补上。</p>}
        </section>

        {/* 7. Onboarding - 引导卡，末位 */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <OnboardingCard />
        </motion.div>
      </motion.div>
    </AppShell>
  );
}