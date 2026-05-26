"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CourseCard } from "@/components/CourseCard";
import { DeadlineCard } from "@/components/DeadlineCard";
import { LoveNoteCard } from "@/components/LoveNoteCard";
import { OnboardingCard } from "@/components/OnboardingCard";
import { OutfitCard } from "@/components/OutfitCard";
import { WeatherCard, useWeather } from "@/components/WeatherCard";
import { formatCountdown, getDaysUntilDeadline } from "@/lib/date";
import { buildSmartReminder } from "@/lib/reminders";
import { getNextCourse, getTodayCourses, hasEveningClass } from "@/lib/schedule";
import { loadAppData } from "@/lib/storage";
import type { AlbumItem, AppData } from "@/lib/types";
import { getOutfitSuggestion } from "@/lib/outfit";
import { getCloudConnection, getDefaultSpaceCode, isCloudConfigured, pullAndPersistCloudData, syncLoveNotesIntoLocalData } from "@/lib/cloudSync";
import { pickFeaturedLoveNote } from "@/lib/loveNotes";
import { defaultAppData } from "@/lib/sampleData";
import { getCurrentIdentity } from "@/lib/identity";

function safeBristolDate() {
  try {
    return new Date().toLocaleDateString("zh-CN", { timeZone: "Europe/London", month: "long", day: "numeric", weekday: "long" });
  } catch {
    return new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });
  }
}

function safeBristolTime() {
  try {
    return new Date().toLocaleTimeString("zh-CN", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
  } catch {
    return new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
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
  const [identity, setIdentity] = useState<"me" | "xiaoguai">("xiaoguai");
  const { weather, error } = useWeather();

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
    const refreshIdentity = () => setIdentity(getCurrentIdentity());
    refresh();
    refreshIdentity();
    window.addEventListener("bristol-care-data", refresh);
    window.addEventListener("bristol-care-identity", refreshIdentity);
    return () => {
      window.removeEventListener("bristol-care-data", refresh);
      window.removeEventListener("bristol-care-identity", refreshIdentity);
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

  const todayCourses = useMemo(() => getTodayCourses(data.courses), [data]);
  const nextCourse = useMemo(() => getNextCourse(data.courses), [data]);
  const nearestDeadlines = useMemo(
    () =>
      data.deadlines
            .filter((deadline) => deadline.status === "todo")
            .sort((a, b) => getDaysUntilDeadline(a) - getDaysUntilDeadline(b))
            .slice(0, 5),
    [data]
  );
  const featuredLoveNote = useMemo(() => pickFeaturedLoveNote(data.loveNotes), [data]);
  const recentMemories = useMemo(() => {
    const favorites = albumItems.filter((item) => item.isFavorite);
    return (favorites.length ? favorites : albumItems).slice(0, 3);
  }, [albumItems]);
  const todayLabel = useMemo(safeBristolDate, []);
  const bristolTime = useMemo(safeBristolTime, []);
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
  const outfit = useMemo(
    () =>
      weather
        ? getOutfitSuggestion({
            temperature: weather.temperature,
            apparentTemperature: weather.apparentTemperature,
            rainProbability: weather.rainProbability,
            windSpeed: weather.windSpeed,
            weatherCode: weather.weatherCode,
            hasEveningClass: hasEveningClass(data.courses)
          })
        : undefined,
    [weather, data]
  );

  return (
    <AppShell>
      <header className="mb-4 overflow-hidden rounded-[2.15rem] border border-white/75 bg-gradient-to-br from-white/88 via-blush/58 to-skySoft/75 p-5 shadow-float ring-1 ring-white/60 backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-kicker">Bristol Care</p>
            <h1 className="mt-2 text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-cocoa">
              {identity === "me" ? "今天也照顾好她" : "小乖，今天也好"}
            </h1>
          </div>
          <div className="rounded-[1.25rem] border border-white/70 bg-white/62 px-3 py-2 text-right text-xs leading-5 text-cocoa/62 shadow-sm">
            <div>{todayLabel}</div>
            <div className="font-semibold text-cocoa">{bristolTime}</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/70 bg-white/58 px-3 py-1.5 text-xs font-medium text-cocoa/70 shadow-sm">{bristolStatus}</span>
          <span className="rounded-full border border-white/70 bg-white/58 px-3 py-1.5 text-xs font-medium text-cocoa/70 shadow-sm">为 {data.nickname || "小乖"} 准备的小首页</span>
        </div>
        <p className="mt-4 text-sm leading-6 text-cocoa/70">慢慢吃饭，慢慢走路，今天也不用急着证明什么。</p>
      </header>

      <div className="space-y-3.5">
        {initError ? <p className="notice notice-error">页面初始化遇到一点问题，已使用默认数据。{initError}</p> : null}
        {syncMessage ? <p className="notice">{syncMessage}</p> : null}
        <WeatherCard weather={weather} error={error} />
        {outfit ? <OutfitCard suggestion={outfit} /> : null}

        <section className="rounded-[1.75rem] border border-white/70 bg-white/68 p-4 shadow-soft ring-1 ring-white/50 backdrop-blur-xl">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blush/65 text-lg shadow-sm">♡</div>
            <div>
              <p className="section-kicker mb-1">Reminder</p>
              <p className="text-sm leading-6 text-cocoa/76">{buildSmartReminder(data.courses, data.deadlines, weather)}</p>
            </div>
          </div>
        </section>

        <section className="soft-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="section-kicker mb-1">Schedule</p>
              <h2 className="font-semibold text-cocoa">今日课程</h2>
            </div>
            <Link className="text-sm text-sage" href="/schedule">
              管理
            </Link>
          </div>
          {nextCourse ? (
            <p className="mb-3 rounded-2xl bg-blush/55 px-3 py-2 text-sm text-cocoa/75">
              下一节：{nextCourse.name}，{nextCourse.startTime} 开始。
            </p>
          ) : null}
          {todayCourses.length ? (
            <div className="space-y-2">
              {todayCourses.map((course) => (
                <CourseCard course={course} compact key={course.id} />
              ))}
            </div>
          ) : (
            <p className="empty-state text-left">
              今天没有课，可以慢慢安排自己的节奏。
            </p>
          )}
        </section>

        <section className="soft-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="section-kicker mb-1">Deadlines</p>
              <h2 className="font-semibold text-cocoa">最近 Deadline</h2>
            </div>
            <Link className="text-sm text-sage" href="/deadlines">
              管理
            </Link>
          </div>
          {nearestDeadlines.length ? (
            <div className="space-y-2">
              {nearestDeadlines.map((deadline) => (
                <DeadlineCard deadline={deadline} key={deadline.id} />
              ))}
            </div>
          ) : (
            <p className="empty-state text-left">最近没有未完成的 deadline。</p>
          )}
        </section>

        <section className="space-y-3.5">
          <div className="soft-card bg-gradient-to-br from-white/82 to-blush/42">
            <p className="section-kicker mb-1">Countdown</p>
            <h2 className="font-semibold text-cocoa">下次见面</h2>
            <p className="mt-3 text-2xl font-semibold text-cocoa">{formatCountdown(data.nextMeetDate)}</p>
          </div>
          <LoveNoteCard note={featuredLoveNote} fallback={data.note} onRefresh={refreshLoveNote} />
          <div className="grid grid-cols-2 gap-2">
            <Link className="btn-primary text-center" href="/notes">查看小纸条墙</Link>
            <Link className="btn-secondary text-center" href="/notes">写一张</Link>
          </div>
        </section>

        <section className="soft-card">
          <p className="section-kicker mb-1">Quick Links</p>
          <h2 className="mb-3 font-semibold text-cocoa">常用链接</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {data.links.map((link) => (
              <a
                className="rounded-[1.25rem] border border-white/75 bg-cream/75 px-3 py-3 text-sm font-medium text-cocoa shadow-sm transition hover:-translate-y-0.5 hover:bg-white/75"
                href={link.url}
                key={link.id}
                rel="noreferrer"
                target="_blank"
              >
                {link.title}
              </a>
            ))}
          </div>
        </section>
        <section className="soft-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="section-kicker mb-1">Memories</p>
              <h2 className="font-semibold text-cocoa">最近回忆</h2>
            </div>
            <Link className="text-sm text-sage" href="/albums">相册</Link>
          </div>
          {recentMemories.length ? (
            <div className="grid grid-cols-3 gap-2">
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
        <OnboardingCard />
      </div>
    </AppShell>
  );
}
