"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface AppBadgeProps {
  children: ReactNode;
  variant?: "default" | "accent" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
  className?: string;
}

export function AppBadge({ children, variant = "default", size = "sm", className }: AppBadgeProps) {
  const variantClasses: Record<string, string> = {
    default: "bg-[var(--app-card-bg)] text-[var(--app-muted)] border-[var(--app-card-border)] hover:bg-[var(--app-card-bg)]",
    accent:  "bg-[var(--app-accent-soft)] text-[var(--app-accent)] border-[var(--app-accent)]/20 hover:bg-[var(--app-accent-soft)]",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50",
    warning: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
    danger:  "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50",
    info:    "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-50",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium border",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </Badge>
  );
}