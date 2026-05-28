"use client";

import Link from "next/link";
import {
  getNavItemContainerClass,
  getNavLabelClass,
  getDecorationClass,
  getActiveIndicatorClass,
  getItemOffsetClass,
  getStatusDotClass,
} from "./navVariants";
import type { ThemeNavStyle, AppThemeStyle, ThemeDecoration } from "@/lib/types";
import { cn } from "@/lib/design/tokens";

interface BottomNavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  navStyle: ThemeNavStyle;
  themeStyle: AppThemeStyle;
  decoration: ThemeDecoration;
  hasStatusDot?: boolean;
}

export function BottomNavItem({
  href,
  label,
  icon,
  isActive,
  navStyle,
  themeStyle,
  decoration,
  hasStatusDot,
}: BottomNavItemProps) {
  const containerClass = cn(
    "relative",
    getNavItemContainerClass(navStyle, isActive),
    getActiveIndicatorClass(themeStyle, navStyle),
    getItemOffsetClass(navStyle, isActive),
    getDecorationClass(decoration, isActive),
  );

  const labelClass = getNavLabelClass(isActive, navStyle);

  return (
    <li className="flex-1">
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={containerClass}
      >
        <span className="relative">
          {/* Icon */}
          <span
            className={cn(
              "flex items-center justify-center",
              isActive ? "text-[var(--app-accent)]" : "text-[var(--app-muted)]",
            )}
          >
            {icon}
          </span>

          {/* Status dot */}
          {hasStatusDot && !isActive && (
            <span
              aria-hidden
              className={cn(
                "absolute -right-1 -top-0.5",
                getStatusDotClass(themeStyle),
              )}
            />
          )}
        </span>

        <span className={labelClass}>{label}</span>
      </Link>
    </li>
  );
}