"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

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
  const variantClasses: Record<string, string> = {
    default:   "bg-[var(--app-card-bg)] border-[var(--app-card-border)]",
    highlight: "border-[var(--app-accent)] bg-[var(--app-accent-soft)]",
    soft:      "bg-[var(--app-bg-soft)] border-[var(--app-card-border)]",
    paper:     "bg-[var(--app-bg-soft)] border-[var(--app-card-border)] shadow-sm",
    danger:    "border-[var(--app-danger)]/30 bg-[var(--app-danger)]/8",
    photo:     "bg-white/88 backdrop-blur-sm border-[var(--app-card-border)]"
  };

  return (
    <Card
      className={cn(
        "w-full min-w-0 transition-all duration-200",
        variantClasses[variant] || variantClasses.default,
        compact ? "p-3" : "p-4",
        interactive ? "cursor-pointer hover:scale-[1.01] hover:shadow-lg" : "",
        // Preserve AppCard-specific shadow
        "shadow-[var(--app-card-shadow)]",
        className
      )}
      onClick={onClick}
      style={style}
    >
      {children}
    </Card>
  );
}