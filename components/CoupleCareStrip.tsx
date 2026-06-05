"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppCard } from "@/components/ui/AppCard";
import { getUnreadCount } from "@/lib/readState";
import { getPartnerUpdates, getUpdateMessage, clearSeenUpdates } from "@/lib/updateChecker";
import { getDefaultSpaceCode } from "@/lib/cloudSync";
import { DEFAULT_NORMAL_IDENTITY_ID } from "@/lib/identity";
import type { LoveNote, AlbumItem } from "@/lib/types";

interface CoupleCareStripProps {
  notes: LoveNote[];
  albums: AlbumItem[];
  identityId?: string;
  appSide?: "partner" | "owner";
}

/**
 * A gentle strip on the homepage showing couple-relevant updates:
 * - Unread notes count
 * - Partner update hint (new notes/albums from the other side)
 */
export function CoupleCareStrip({ notes, albums, identityId: propIdentityId, appSide }: CoupleCareStripProps) {
  const spaceCode = getDefaultSpaceCode();
  const identityId = propIdentityId || DEFAULT_NORMAL_IDENTITY_ID;
  const isOwner = appSide === "owner";
  const notesHref = isOwner ? "/me/notes" : "/notes";
  const [updates, setUpdates] = useState<ReturnType<typeof getPartnerUpdates>>(() =>
    getPartnerUpdates(notes, albums, spaceCode)
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setUpdates(getPartnerUpdates(notes, albums, spaceCode));
  }, [notes, albums, spaceCode]);

  const unreadCount = useMemo(() => getUnreadCount(notes, spaceCode, identityId), [notes, spaceCode, identityId]);
  const updateMsg = useMemo(() => getUpdateMessage(updates), [updates]);

  function handleDismissUpdates() {
    clearSeenUpdates(spaceCode);
    setDismissed(true);
    setUpdates({ newNotesCount: 0, newAlbumsCount: 0, latestAt: null, hasUpdates: false });
  }

  // Don't show anything if there's nothing to say
  if (unreadCount === 0 && !updateMsg) return null;

  return (
    <AppCard className="bg-gradient-to-br from-white/85 via-blush/30 to-white/80 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="section-kicker mb-1">💞 关心</p>
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm">
        {/* Unread notes */}
        {unreadCount > 0 && (
          <Link
            href={notesHref}
            className="flex items-center justify-between rounded-xl bg-white/60 px-3 py-2 hover:bg-white/85 transition"
          >
            <span className="text-cocoa/70">
              有 {unreadCount} 条未读小纸条
            </span>
            <span className="text-xs text-sage font-medium">去看看 →</span>
          </Link>
        )}

        {/* Partner updates */}
        {updateMsg && !dismissed && (
          <div className="flex items-center justify-between rounded-xl bg-sage/20 px-3 py-2">
            <span className="text-cocoa/70 text-xs">{updateMsg}</span>
            <button
              className="text-[10px] text-sage ml-2 shrink-0 hover:underline"
              onClick={handleDismissUpdates}
              aria-label="关闭更新提示"
            >
              知道啦
            </button>
          </div>
        )}
      </div>
    </AppCard>
  );
}