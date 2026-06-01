"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useAccessibleMotion, microSpring, microTween } from "@/lib/design/motion";
import {
  getNavItemContainerClass,
  getNavLabelClass,
  getDecorationClass,
  getActiveIndicatorClass,
  getItemOffsetClass,
  getStatusDotClass,
} from "./navVariants";
import type { ThemeNavStyle, AppThemeStyle, ThemeDecoration } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const reduceMotion = useAccessibleMotion();

  const containerClass = cn(
    "relative flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 px-1 py-1.5 transition-colors duration-200",
    getNavItemContainerClass(navStyle, isActive),
    getActiveIndicatorClass(themeStyle, navStyle),
    getItemOffsetClass(navStyle, isActive),
    getDecorationClass(decoration, isActive),
  );

  const labelClass = getNavLabelClass(isActive, navStyle);

  return (
    <motion.li
      className="relative flex-1 min-w-0"
      layout
      transition={reduceMotion ? { duration: 0 } : microSpring}
    >
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={containerClass}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <span className="relative flex items-center justify-center">
          {/* Pill indicator background sliding between tabs */}
          {isActive && navStyle !== "minimal" && (
            <motion.span
              className={cn(
                "absolute inset-0 -inset-x-2 -inset-y-1 z-0",
                navStyle === "pill" || navStyle === "floating"
                  ? "rounded-full bg-[var(--app-accent-soft)] shadow-sm"
                  : navStyle === "paper"
                    ? "rounded-xl bg-[var(--app-accent-soft)]/60"
                    : "rounded-2xl bg-[var(--app-accent-soft)] shadow-sm",
              )}
              layoutId="bottomNavPill"
              transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 26, mass: 0.9 }}
            />
          )}

          {/* Icon with subtle scale on active */}
          <motion.span
            className={cn(
              "relative z-10 flex items-center justify-center",
              isActive ? "text-[var(--app-accent)]" : "text-[var(--app-muted)]",
            )}
            animate={{
              scale: isActive ? 1.12 : 1,
            }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 350, damping: 24, mass: 0.7 }}
          >
            {icon}
          </motion.span>

          {/* Status dot with subtle pulse */}
          {hasStatusDot && !isActive && (
            <motion.span
              aria-hidden
              className={cn(
                "absolute -right-1 -top-0.5 z-20",
                getStatusDotClass(themeStyle),
              )}
              animate={
                reduceMotion
                  ? { opacity: 1 }
                  : {
                      scale: [1, 1.25, 1],
                      opacity: [0.9, 0.5, 0.9],
                    }
              }
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
              }
            />
          )}

          {/* Status dot without pulse for active tab */}
          {hasStatusDot && isActive && (
            <span
              aria-hidden
              className={cn(
                "absolute -right-1 -top-0.5 z-20",
                getStatusDotClass(themeStyle),
              )}
            />
          )}
        </span>

        {/* Label with smooth color/opacity transition */}
        <motion.span
          className={cn(labelClass, "relative z-10 truncate max-w-full")}
          animate={{
            opacity: isActive ? 1 : 0.65,
          }}
          transition={reduceMotion ? { duration: 0 } : microTween}
        >
          {label}
        </motion.span>
      </Link>
    </motion.li>
  );
}