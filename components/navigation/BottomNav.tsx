"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Heart, CreditCard, Settings } from "lucide-react";
import { appNavItems, getActiveNavHref, shouldShowBottomNav } from "@/lib/navigation";
import {
  getNavContainerClass,
  normalizeNavStyle,
  normalizeThemeStyle,
} from "./navVariants";
import { BottomNavItem } from "./BottomNavItem";
import { getThemeSettings } from "@/lib/theme";
import { cn } from "@/lib/design/tokens";
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

  useEffect(() => {
    const handler = () => setSettings(getThemeSettings());
    window.addEventListener("theme-settings-changed", handler);
    return () => window.removeEventListener("theme-settings-changed", handler);
  }, []);

  if (!shouldShowBottomNav(pathname)) return null;

  const activeHref = getActiveNavHref(pathname);
  const navStyle: ThemeNavStyle = normalizeNavStyle(settings.navStyle);
  const themeStyle: AppThemeStyle = normalizeThemeStyle(settings.style);
  const decoration: ThemeDecoration = settings.decoration;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 pointer-events-none",
        "px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]",
      )}
    >
      <nav
        aria-label="main navigation"
        className={cn(getNavContainerClass(navStyle, themeStyle), "overflow-visible")}
      >
        <ul className="flex items-center justify-around gap-0 overflow-visible">
          {appNavItems.map((item) => {
            const isActive = activeHref === item.href;
            const icon = ICON_MAP[item.icon];

            let hasStatusDot = false;
            if (item.group === "records" && status?.records) hasStatusDot = true;
            if (item.group === "memories" && status?.memories) hasStatusDot = true;
            if (item.group === "settings" && status?.settings) hasStatusDot = true;

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
              />
            );
          })}
        </ul>
      </nav>
    </div>
  );
}