"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { appNavItems, getActiveNavItem } from "./navItems";
import { getThemeSettings } from "@/lib/theme";
import { cn, getNavContainerClass, getNavItemRadius } from "@/lib/design/tokens";
import { Home, ClipboardList, Heart, CreditCard, Settings } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  home: React.createElement(Home, { className: "h-5 w-5" }),
  records: React.createElement(ClipboardList, { className: "h-5 w-5" }),
  memories: React.createElement(Heart, { className: "h-5 w-5" }),
  cards: React.createElement(CreditCard, { className: "h-5 w-5" }),
  settings: React.createElement(Settings, { className: "h-5 w-5" }),
};

export function BottomNav() {
  const pathname = usePathname();
  const activeItem = getActiveNavItem(pathname);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const handler = () => setVersion((v) => v + 1);
    window.addEventListener("theme-settings-changed", handler);
    return () => window.removeEventListener("theme-settings-changed", handler);
  }, []);

  const _v = version;
  void _v;
  const settings = getThemeSettings();

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-20 w-[calc(100%-1rem)] max-w-md -translate-x-1/2 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] md:max-w-[520px]"
      style={{ minWidth: 0 }}
    >
      <div
        className={cn(
          "flex items-center justify-around transition-all duration-300",
          getNavContainerClass(settings.navStyle),
          settings.navStyle === "floating" ? "rounded-[1.75rem]" : "rounded-[1.5rem]",
          settings.navStyle === "minimal" ? "mx-4 py-1" : "py-1.5 px-1"
        )}
      >
        {appNavItems.map((item) => {
          const active = activeItem?.group === item.group;
          const icon = iconMap[item.icon] || React.createElement(Home, { className: "h-5 w-5" });

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center transition-all duration-200 relative",
                getNavItemRadius(settings.navStyle),
                settings.navStyle === "minimal" ? "min-h-10 px-3" : "min-h-12 px-2",
                "py-1 text-[10px] leading-tight gap-0.5",
                active
                  ? settings.navStyle === "minimal"
                    ? "text-[var(--app-accent)] font-medium"
                    : "bg-[var(--app-nav-active)] text-[var(--app-accent)] shadow-sm font-medium"
                  : "text-[var(--app-muted)] hover:bg-white/45"
              )}
            >
              <span className={cn("transition-transform duration-200", active && "scale-110")}>
                {icon}
              </span>
              <span>{item.label}</span>
              {active && settings.navStyle === "pill" && (
                <div className="absolute inset-0 rounded-full bg-[var(--app-accent)] opacity-20 -z-10" />
              )}
              {active && settings.navStyle === "floating" && (
                <div className="absolute -inset-y-0.5 -inset-x-1 rounded-[1.25rem] bg-[var(--app-accent)] opacity-15 -z-10" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}