"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { READ_STATE_CHANGED_EVENT } from "@/lib/readState";
import { Home, CalendarDays, Heart, CreditCard, Settings } from "lucide-react";
import { getNavItemsForPath, getActiveNavHref, shouldShowBottomNav, isOwnerPath } from "@/lib/navigation";
import {
  getNavContainerClass,
  normalizeNavStyle,
  normalizeThemeStyle,
} from "./navVariants";
import { BottomNavItem } from "./BottomNavItem";
import { getThemeSettings } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { AppThemeStyle, ThemeNavStyle, ThemeDecoration } from "@/lib/types";

const ICON_MAP: Record<string, React.ReactNode> = {
  Home: <Home size={20} strokeWidth={1.8} />,
  CalendarDays: <CalendarDays size={20} strokeWidth={1.8} />,
  Heart: <Heart size={20} strokeWidth={1.8} />,
  CreditCard: <CreditCard size={20} strokeWidth={1.8} />,
  Settings: <Settings size={20} strokeWidth={1.8} />,
};

interface NavStatus {
  records?: boolean;
  memories?: boolean;
  settings?: boolean;
}

export function BottomNav({ status }: { status?: NavStatus }) {
  const pathname = usePathname();
  const [settings, setSettings] = useState(() => getThemeSettings());
  const isOwner = isOwnerPath(pathname);

  // All hooks must be called before any conditional returns
  const shouldShow = shouldShowBottomNav(pathname);
  const navItems = getNavItemsForPath(pathname);
  const activeHref = getActiveNavHref(pathname);
  const navStyle: ThemeNavStyle = normalizeNavStyle(settings.navStyle);
  const themeStyle: AppThemeStyle = normalizeThemeStyle(settings.style);
  const decoration: ThemeDecoration = settings.decoration;

  // Memories dot state
  const [memoriesDot, setMemoriesDot] = useState<boolean>(Boolean(status?.memories));

  useEffect(() => {
    setMemoriesDot(Boolean(status?.memories));
  }, [status?.memories]);

  const handleReadStateChanged = useCallback(() => {
    setMemoriesDot(false);
  }, []);

  useEffect(() => {
    window.addEventListener(READ_STATE_CHANGED_EVENT, handleReadStateChanged);
    return () => window.removeEventListener(READ_STATE_CHANGED_EVENT, handleReadStateChanged);
  }, [handleReadStateChanged]);

  useEffect(() => {
    const handler = () => setSettings(getThemeSettings());
    window.addEventListener("theme-settings-changed", handler);
    return () => window.removeEventListener("theme-settings-changed", handler);
  }, []);

  if (!shouldShow) return null;

  // Side-aware active accent: partner=rose, owner=indigo
  const sideAccentClass = isOwner
    ? "owner-nav"
    : "partner-nav";

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 pointer-events-none",
        "px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]",
      )}
    >
      <nav
        aria-label="main navigation"
        data-side={isOwner ? "owner" : "partner"}
        className={cn(getNavContainerClass(navStyle, themeStyle), "overflow-visible", sideAccentClass)}
      >
        <ul className="flex items-center justify-around gap-0 overflow-visible">
          {navItems.map((item) => {
            const isActive = activeHref === item.href;
            const icon = ICON_MAP[item.icon];

            const hasStatusDot = item.group === "settings" ? Boolean(status?.settings) : item.group === "memories" ? memoriesDot : false;

            return (
              <BottomNavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={icon}
                isActive={isActive}
                navStyle={navStyle}
                themeStyle={themeStyle}
                decoration={decoration}
                hasStatusDot={hasStatusDot}
                isOwner={isOwner}
              />
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
