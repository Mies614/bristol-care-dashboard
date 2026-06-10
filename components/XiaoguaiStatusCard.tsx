"use client";

import Link from "next/link";
import { AppCard } from "@/components/ui/AppCard";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import { weatherCodeText } from "@/lib/weatherClient";
import type { WeatherCareState } from "@/components/WeatherCareCard";

export interface XiaoguaiStatusCardProps {
  /** Weather state from useWeatherCare */
  weather?: WeatherCareState;
  /** Number of times 小乖 missed you today */
  missYouCount: number;
  /** Number of unread love notes */
  unreadNotesCount: number;
  /** Number of unread album memories */
  unreadAlbumsMemoryCount: number;
}

/**
 * XiaoguaiStatusCard — owner-side at-a-glance status for /me homepage.
 *
 * Shows what matters about 小乖 today:
 * - Weather where she is
 * - How many times she thought of you
 * - Unread notes / memories counts
 *
 * Links all stay under /me prefix.
 */
export function XiaoguaiStatusCard({
  weather,
  missYouCount,
  unreadNotesCount,
  unreadAlbumsMemoryCount,
}: XiaoguaiStatusCardProps) {
  const hasWeather = weather && !weather.loading && weather.weather;
  const hasAnyData = hasWeather || missYouCount > 0 || unreadNotesCount > 0 || unreadAlbumsMemoryCount > 0;

  if (!hasAnyData) {
    return (
      <AppCard variant="soft">
        <h3 className="mb-2 text-sm font-semibold text-cocoa">小乖今天</h3>
        <p className="text-xs text-[var(--app-muted)]">
          小乖今天的状态正在慢慢同步。
        </p>
      </AppCard>
    );
  }

  return (
    <AppCard variant="soft" className="bg-gradient-to-br from-white/85 via-skySoft/30 to-white/80">
      <h3 className="mb-3 text-sm font-semibold text-cocoa">小乖今天</h3>

      <div className="space-y-2">
        {/* Weather line */}
        {hasWeather && weather.weather ? (
          <div className="flex items-center gap-2 text-sm text-cocoa/70">
            <span className="text-base">
              {(() => {
                const w = weather.weather;
                const temp = Math.round(w.temperature);
                const cond = weatherCodeText(w.weatherCode);
                return `她那边 ${temp}°C，${cond}`;
              })()}
            </span>
          </div>
        ) : null}

        {/* Miss you line */}
        {missYouCount > 0 ? (
          <p className="text-sm text-cocoa/70">
            小乖今天想你 {missYouCount} 次
          </p>
        ) : (
          <p className="text-xs text-cocoa/40">
            还没收到小乖今天的想念
          </p>
        )}

        {/* Unread pills */}
        {(unreadNotesCount > 0 || unreadAlbumsMemoryCount > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {unreadNotesCount > 0 && (
              <Link href="/me/notes" className="inline-flex">
                <UnreadBadge
                  mode="label"
                  count={unreadNotesCount}
                  label={`${unreadNotesCount} 条小纸条还没看`}
                />
              </Link>
            )}
            {unreadAlbumsMemoryCount > 0 && (
              <Link href="/me/memories/unread" className="inline-flex">
                <UnreadBadge
                  mode="label"
                  count={unreadAlbumsMemoryCount}
                  label={`${unreadAlbumsMemoryCount} 个新回忆等你看`}
                />
              </Link>
            )}
          </div>
        )}
      </div>
    </AppCard>
  );
}
