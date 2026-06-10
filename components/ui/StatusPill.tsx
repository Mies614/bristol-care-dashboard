"use client";

import { cn } from "@/lib/utils";

type StatusPillVariant = "default" | "unread" | "success" | "warning" | "danger" | "owner" | "partner";

interface StatusPillProps {
  children?: React.ReactNode;
  variant?: StatusPillVariant;
  size?: "sm" | "md";
  className?: string;
}

const variantClasses: Record<StatusPillVariant, string> = {
  default: "bg-[var(--app-card-bg)] text-[var(--app-muted)] border-[var(--app-card-border)]",
  unread: "bg-rose-50 text-rose-600 border-rose-200",
  success: "bg-emerald-50 text-emerald-600 border-emerald-200",
  warning: "bg-amber-50 text-amber-600 border-amber-200",
  danger: "bg-red-50 text-red-600 border-red-200",
  owner: "bg-violet-50 text-violet-600 border-violet-200",
  partner: "bg-rose-50 text-rose-500 border-rose-200",
};

export function StatusPill({ children, variant = "default", size = "sm", className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
