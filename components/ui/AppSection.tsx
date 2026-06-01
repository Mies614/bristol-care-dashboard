"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface AppSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerRight?: ReactNode;
  variant?: "default" | "card" | "clean";
}

export function AppSection({
  title,
  subtitle,
  children,
  defaultOpen = true,
  className,
  headerRight,
  variant = "default",
}: AppSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const isCollapsible = subtitle !== undefined;

  return (
    <div className={cn(
      "w-full min-w-0",
      variant === "card" && "bg-[var(--app-card-bg)] border border-[var(--app-card-border)] shadow-[var(--app-card-shadow)]",
      "rounded-[var(--app-radius)] overflow-hidden",
      className
    )}>
      <button
        className={cn(
          "flex w-full items-center justify-between px-4 py-3.5 text-left transition-all",
          isCollapsible ? "cursor-pointer hover:bg-[var(--app-accent-soft)]/40" : "cursor-default",
          variant === "clean" ? "px-0" : ""
        )}
        onClick={() => isCollapsible && setOpen(!open)}
        type="button"
      >
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-[var(--app-text)]">{title}</h2>
          {isCollapsible && (
            <p className="mt-0.5 text-xs text-[var(--app-muted)]">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {headerRight}
          {isCollapsible && (
            <ChevronDown className={cn(
              "h-4 w-4 text-[var(--app-muted)] transition-transform duration-200",
              open && "rotate-180"
            )} />
          )}
        </div>
      </button>
      {(!isCollapsible || open) && (
        <div className={cn(
          "px-4 pb-4",
          variant === "clean" ? "px-0" : ""
        )}>
          {children}
        </div>
      )}
    </div>
  );
}