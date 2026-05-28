"use client";

import type { ReactNode } from "react";
import { cn, getRadiusClass } from "@/lib/design/tokens";

interface AppCardProps {
  children: ReactNode;
  variant?: "default" | "highlight" | "soft" | "paper" | "danger" | "photo";
  interactive?: boolean;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function AppCard({
  children,
  variant = "default",
  interactive = false,
  compact = false,
  className,
  style,
  onClick
}: AppCardProps) {
  const radiusClass = getRadiusClass('extra'); // will be overridden by CSS var anyway
  
  // We base card style on CSS vars from the theme; the actual visual style uses --app-card-bg, --app-card-border etc.
  // The variant changes border color and bg slightly
  const variantClasses: Record<string, string> = {
    default:   "bg-[var(--app-card-bg)] border-[var(--app-card-border)]",
    highlight: "border-[var(--app-accent)] bg-[var(--app-accent-soft)]",
    soft:      "bg-[var(--app-bg-soft)] border-[var(--app-card-border)]",
    paper:     "bg-[var(--app-bg-soft)] border-[var(--app-card-border)] shadow-sm",
    danger:    "border-[var(--app-danger)]/30 bg-[var(--app-danger)]/8",
    photo:     "bg-white/88 backdrop-blur-sm border-[var(--app-card-border)]"
  };

  return (
    <div
      className={cn(
        "w-full min-w-0 border shadow-[var(--app-card-shadow)] transition-all duration-200",
        radiusClass,
        variantClasses[variant] || variantClasses.default,
        compact ? "p-3" : "p-4",
        interactive ? "cursor-pointer hover:scale-[1.01] hover:shadow-lg" : "",
        className
      )}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
}