/* eslint-disable @next/next/no-img-element */
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
import { DEFAULT_PERIOD_SETTINGS, getCurrentCycleDay, getDaysUntilNextPeriod } from "@/lib/period";
import { buildRandomMemoryItems, pickRandomMemory } from "@/lib/randomMemory";
import { MissYouCombinedCard } from "@/components/MissYouCombinedCard";
import { buildTodaySummary, TodaySummaryCard } from "@/components/TodaySummaryCard";
import type { TodaySummaryResult } from "@/components/TodaySummaryCard";
import { TodayCareStrip, type CareStripItem } from "@/components/TodayCareStrip";
import { CoupleCareStrip } from "@/components/CoupleCareStrip";
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
    return (favorites.length ? favorites : albumItems).slice(0, 4);
  }, [albumItems]);
  const randomMemory = useMemo(() => pickRandomMemory(buildRandomMemoryItems(data.loveNotes, albumItems)), [data.loveNotes, albumItems]);
  const todayLabel = useMemo(safeTodayLabel, []);

  const todaySummary = useMemo((): TodaySummaryResult => buildTodaySummary({
    courses: data.courses,
    deadlines: data.deadlines,
    periodRecords,
    periodSettings,
    unreadMissYouCount: 0,
    featuredNote: featuredLoveNote,
    randomMemory,
    now
  }), [data, periodRecords, periodSettings, featuredLoveNote, randomMemory, now]);

  const careStripItems = useMemo((): CareStripItem[] => {
    const items: CareStripItem[] = [];
    const todayDay = getCurrentDayName(now);
    const todayCourses = data.courses.filter((c) => c.day === todayDay).sort((a, b) => a.startTime.localeCompare(b.startTime));
    items.push({ id: "course", icon: "📚", label: "课程", value: todayCourses.length > 0 ? `${todayCourses.length} 节` : "无", href: "/schedule" });
    const cycleDay = getCurrentCycleDay(periodRecords);
    const daysUntil = getDaysUntilNextPeriod(periodRecords, periodSettings, now);
    const periodValue = periodRecords.length > 0 ? (cycleDay ? `第${cycleDay}天` : daysUntil !== null ? `距下次${daysUntil >= 0 ? `${daysUntil}天` : `过${Math.abs(daysUntil)}天`}` : "—") : "暂无";
    items.push({ id: "period", icon: "🌸", label: "经期", value: periodValue, href: "/period" });
    return items;
  }, [data.courses, periodRecords, periodSettings, now]);

  async function refreshLoveNote() {
    const connection = getCloudConnection();
    if (!connection) {
      if (!isCloudConfigured()) { setSyncMessage("云同步未配置，本地模式可继续使用。"); return; }
      const result = await syncLoveNotesIntoLocalData(spaceCode);
      if (result.ok && result.data) { setData(result.data); setSyncMessage("小纸条已刷新。"); }
      else setSyncMessage("刷新失败，已显示本地缓存。");
      return;
    }
    const result = await pullAndPersistCloudData(connection.code);
    if (result.ok && result.data) { setData(result.data); setSyncMessage("小纸条已刷新。"); }
    else setSyncMessage(result.error || "刷新失败，已保留本地小纸条。");
  }

  const reduceMotion = useAccessibleMotion();

  return (
    <AppShell>
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
        <p className="mt-2.5 text-sm leading-5 text-cocoa/65">打开就能看今天该关心什么，不急不赶。</p>
      </motion.header>

      <motion.div className="space-y-3.5" variants={safeVariants(staggerContainer, reduceMotion)} initial="hidden" animate="visible">
        {initError ? <p className="notice notice-error">页面初始化遇到一点问题，已使用默认数据。{initError}</p> : null}
        {syncMessage ? <p className="notice">{syncMessage}</p> : null}
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <WeatherCareCard state={weatherState} compact />
        </motion.div>
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <TodaySummaryCard summary={todaySummary} />
        </motion.div>
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <MissYouCombinedCard />
        </motion.div>
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <TodayCareStrip items={careStripItems} />
        </motion.div>
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <LoveNoteCard note={featuredLoveNote} fallback={data.note} onRefresh={refreshLoveNote} />
        </motion.div>
        <motion.div variants={safeVariants(staggerItem, reduceMotion)}>
          <CoupleCareStrip notes={data.loveNotes} albums={albumItems} />
        </motion.div>
        {recentMemories.length > 0 && (
          <motion.section className="soft-card mb-2" variants={safeVariants(staggerItem, reduceMotion)}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="section-kicker mb-1">最近回忆</p>
                <h2 className="font-semibold text-cocoa">最近回忆</h2>
              </div>
              <Link className="text-sm text-sage" href="/me/albums">相册</Link>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {recentMemories.map((item) => (
                <Link className="relative overflow-hidden rounded-2xl bg-white/60 shadow-sm" href="/me/albums" key={item.id}>
                  {item.imageUrl ? <img className="aspect-square w-full object-cover" src={item.imageUrl} alt={item.title || "相册照片"} loading="lazy" /> : <div className="flex aspect-square items-center justify-center bg-cocoa/75 text-white">▶</div>}
                  {item.isFavorite ? <span className="absolute right-1 top-1 rounded-full bg-white/75 px-1.5 text-xs">♡</span> : null}
                </Link>
              ))}
            </div>
          </motion.section>
        )}
      </motion.div>
    </AppShell>
  );
}