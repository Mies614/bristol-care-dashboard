"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { LoveNoteCard } from "@/components/LoveNoteCard";
import { OnboardingCard } from "@/components/OnboardingCard";
import { useWeatherCare, WeatherCareCard } from "@/components/WeatherCareCard";
import { formatCountdown } from "@/lib/date";
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
import { NextImportantCard } from "@/components/NextImportantCard";
import { buildNextImportant } from "@/components/TodayCareSummary";
import type { NextImportantResult } from "@/components/TodayCareSummary";
import { getCurrentDayName } from "@/lib/schedule";
import { getDaysUntilNextPeriod } from "@/lib/period";
import { getDaysUntil } from "@/lib/ddlPriority";
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
  const todayLabel = useMemo(safeBristolDate, []);
  const bristolStatus = useMemo(safeBristolStatus, []);
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
    excludedDdlIds,
    now
  }), [data.courses, data.deadlines, periodRecords, periodSettings, excludedDdlIds, now]);

  // 合并排除：TodaySummaryCard + NextImportantCard 中出现的 DDL
  const allExcludedDdlIds = useMemo((): Set<string> => {
    const ids = new Set<string>(excludedDdlIds);
    if (nextImportant.deadlineId) {
      ids.add(nextImportant.deadlineId);
    }
    return ids;
  }, [excludedDdlIds, nextImportant.deadlineId]);

  // ──── 今日照顾摘要条（紧凑 2-4 格） ────
  const careStrip = useMemo((): CareStripItem[] => {
    const items: CareStripItem[] = [];
    const todayDay = getCurrentDayName(now);

    // 今日课程
    const todaysCourses = data.courses.filter((c) => c.day === todayDay).sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (todaysCourses.length > 0) {
      const label = todaysCourses.length === 1
        ? `${todaysCourses[0].startTime} ${todaysCourses[0].name}`
        : `${todaysCourses.length} 节课`;
      items.push({
        id: "today-courses",
        icon: "📖",
        label: "今日课程",
        summary: label,
        href: "/schedule"
      });
    } else {
      items.push({
        id: "no-course-today",
        icon: "☁️",
        label: "今天没课",
        summary: "按自己的节奏来",
        href: "/schedule"
      });
    }

    // 最近 DDL（排除已展示的）
    const activeDdls = data.deadlines
      .filter((d) => d.status !== "done" && !allExcludedDdlIds.has(d.id))
      .map((d) => ({ d, days: getDaysUntil(d, now) }))
      .sort((a, b) => a.days - b.days);
    if (activeDdls.length > 0) {
      const next = activeDdls[0];
      const urgency = next.days <= 0 ? "⚠️" : next.days <= 3 ? "⏳" : "📋";
      items.push({
        id: "next-ddl",
        icon: urgency,
        label: "最近 DDL",
        summary: next.days <= 0 ? "今天截止" : `${next.days} 天`,
        href: "/deadlines"
      });
    } else {
      items.push({
        id: "no-ddl",
        icon: "✅",
        label: "无待办 DDL",
        summary: "今天不用追",
        href: "/deadlines"
      });
    }

    // 经期状态
    const daysUntil = getDaysUntilNextPeriod(periodRecords, periodSettings, now);
    if (daysUntil !== null) {
      if (daysUntil === 0) {
        items.push({
          id: "period-today",
          icon: "🌸",
          label: "经期预计今天",
          summary: "对自己温柔点",
          href: "/period"
        });
      } else if (daysUntil > 0 && daysUntil <= 3) {
        items.push({
          id: "period-soon",
          icon: "🌸",
          label: "经期临近",
          summary: `约 ${daysUntil} 天`,
          href: "/period"
        });
      } else if (daysUntil < 0) {
        items.push({
          id: "period-late",
          icon: "🌸",
          label: "经期延迟",
          summary: `已过 ${Math.abs(daysUntil)} 天`,
          href: "/period"
        });
      } else {
        items.push({
          id: "period-far",
          icon: "🌿",
          label: "经期还远",
          summary: `${daysUntil} 天后`,
          href: "/period"
        });
      }
    } else {
      items.push({
        id: "period-no-data",
        icon: "🌿",
        label: "经期记录",
        summary: "还没记过",
        href: "/period"
      });
    }

    // 最近回忆
    if (randomMemory?.title) {
      items.push({
        id: "random-memory",
        icon: "📷",
        label: "一张回忆",
        summary: randomMemory.title.slice(0, 10),
        href: "/albums"
      });
    } else if (featuredLoveNote?.content) {
      const snippet = featuredLoveNote.content.slice(0, 10);
      items.push({
        id: "note-snippet",
        icon: "💌",
        label: "小纸条",
        summary: snippet,
        href: "/notes"
      });
    }

    return items;
  }, [data.courses, data.deadlines, periodRecords, periodSettings, now, allExcludedDdlIds, randomMemory, featuredLoveNote]);

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
          <div className="shrink-0 rounded-[1.25rem] border border-white/70 bg-white/62 px-3 py-1.5 text-right text-xs leading-5 text-cocoa/62 shadow-sm">
            <div>{todayLabel}</div>
            <div className="font-semibold text-cocoa">今日照顾</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-white/70 bg-white/58 px-2.5 py-1 text-xs font-medium text-cocoa/70 shadow-sm">{bristolStatus}</span>
          <span className="rounded-full border border-white/70 bg-white/58 px-2.5 py-1 text-xs font-medium text-cocoa/70 shadow-sm">今天也慢慢来</span>
          <span className="rounded-full border border-white/70 bg-white/58 px-2.5 py-1 text-xs font-medium text-cocoa/70 shadow-sm">
            下次见面：{formatCountdown(data.nextMeetDate)}
          </span>
        </div>
        <p className="mt-3 text-sm leading-5 text-cocoa/65">慢慢吃饭，慢慢走路，今天也不用急着证明什么。</p>
      </motion.header>

      <motion.div
        className="space-y-3.5"
        variants={safeVariants(staggerContainer, reduceMotion)}
        initial="hidden"
        animate="visible"
      >
        {initError ? <p className="notice notice-error">页面初始化遇到一点问题，已使用默认数据。{initError}</p> : null}
        {syncMessage ? <p className="notice">{syncMessage}</p> : null}

        {/* 0. 本地天气 + 两地时间 */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <WeatherCareCard state={weatherState} />
        </motion.div>

        {/* 1. 今日最重要事项 - TodaySummaryCard */}
        <TodaySummaryCard summary={todaySummary} />

        {/* 2. 下一件重要事项 - NextImportantCard */}
        <NextImportantCard result={nextImportant} />

        {/* 3. 想你按钮 / 未读想念 */}
        <MissYouButton />

        {/* 4. 今日照顾摘要条（课程 / DDL / 经期 / 回忆） */}
        <TodayCareStrip items={careStrip} />

        {/* 5. 置顶小纸条 */}
        <LoveNoteCard note={featuredLoveNote} fallback={data.note} onRefresh={refreshLoveNote} />
        <div className="grid grid-cols-2 gap-2">
          <Link className="btn-primary text-center" href="/notes">小纸条墙</Link>
          <Link className="btn-secondary text-center" href="/notes">写一张</Link>
        </div>

        {/* 6. 最近回忆 */}
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

        {/* 7. 引导卡 */}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <OnboardingCard />
        </motion.div>
      </motion.div>
    </AppShell>
  );
}