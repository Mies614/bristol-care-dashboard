"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppCard } from "@/components/ui/AppCard";
import { getUnreadCount } from "@/lib/readState";
import { getDaysUntilMeet } from "@/lib/date";
import { getPartnerUpdates, getUpdateMessage, clearSeenUpdates } from "@/lib/updateChecker";
import type { LoveNote, AlbumItem } from "@/lib/types";

interface CoupleCareStripProps {
  notes: LoveNote[];
  albums: AlbumItem[];
  nextMeetDate: string;
  nickname: string;
}

/**
 * A gentle strip on the homepage showing couple-relevant updates:
 * - Unread notes count
 * - Next meet countdown
 * - Partner update hint
 *
 * Very light — collapses to nothing if there's nothing to show.
 */
export function CoupleCareStrip({ notes, albums, nextMeetDate, nickname }: CoupleCareStripProps) {
  const [updates, setUpdates] = useState<ReturnType<typeof getPartnerUpdates>>(() =>
    getPartnerUpdates(notes, albums)
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setUpdates(getPartnerUpdates(notes, albums));
  }, [notes, albums]);

  const unreadCount = useMemo(() => getUnreadCount(notes), [notes]);
  const meetDays = useMemo(() => getDaysUntilMeet(nextMeetDate), [nextMeetDate]);
  const updateMsg = useMemo(() => getUpdateMessage(updates), [updates]);

  function handleDismissUpdates() {
    clearSeenUpdates();
    setDismissed(true);
    setUpdates({ newNotesCount: 0, newAlbumsCount: 0, latestAt: null, hasUpdates: false });
  }

  // Don't show anything if there's nothing to say
  if (unreadCount === 0 && meetDays === null && !updateMsg) return null;

  return (
    <AppCard className="bg-gradient-to-br from-white/85 via-blush/30 to-white/80 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="section-kicker mb-1">💞 关心</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm">
        {/* Unread notes */}
        {unreadCount > 0 && (
          <Link
            href="/notes"
            className="flex items-center justify-between rounded-xl bg-white/60 px-3 py-2 hover:bg-white/85 transition"
          >
            <span className="text-cocoa/70">
              有 {unreadCount} 条未读小纸条
            </span>
            <span className="text-xs text-sage font-medium">去看看 →</span>
          </Link>
        )}

        {/* Next meet countdown */}
        {meetDays !== null && (
          <div className="flex items-center justify-between rounded-xl bg-white/60 px-3 py-2">
            <span className="text-cocoa/70">
              {meetDays < 0 ? (
                `和 ${nickname} 在一起的这一天 💕`
              ) : meetDays === 0 ? (
                `今天就能见到 ${nickname} 了`
              ) : (
                `还有 ${meetDays} 天就能见到 ${nickname}`
              )}
            </span>
          </div>
        )}

        {/* Partner updates */}
        {updateMsg && !dismissed && (
          <div className="flex items-center justify-between rounded-xl bg-sage/20 px-3 py-2">
            <span className="text-cocoa/70 text-xs">{updateMsg}</span>
            <button
              className="text-[10px] text-sage ml-2 shrink-0 hover:underline"
              onClick={handleDismissUpdates}
            >
              知道啦
            </button>
          </div>
        )}
      </div>
    </AppCard>
  );
}

function getDaysUntilMeet(nextMeetDate: string): number | null {
  if (!nextMeetDate) return null;
  const target = new Date(`${nextMeetDate}T00:00:00`);
  if (isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
