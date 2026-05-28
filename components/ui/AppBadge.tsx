"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/design/tokens";

interface AppBadgeProps {
  children: ReactNode;
  variant?: "default" | "accent" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
  className?: string;
}

export function AppBadge({ children, variant = "default", size = "sm", className }: AppBadgeProps) {
  const variants: Record<string, string> = {
    default: "bg-[var(--app-card-bg)] text-[var(--app-muted)] border-[var(--app-card-border)]",
    accent:  "bg-[var(--app-accent-soft)] text-[var(--app-accent)] border-[var(--app-accent)]/20",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger:  "bg-rose-50 text-rose-700 border-rose-200",
    info:    "bg-sky-50 text-sky-700 border-sky-200",
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1 border rounded-full font-medium",
      size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}