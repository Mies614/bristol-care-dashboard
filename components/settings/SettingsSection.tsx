"use client";
import { useState } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SettingsSection({ title, subtitle, defaultOpen = true, collapsible = true, children, className = "" }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <AppCard className={cn("w-full min-w-0 space-y-4 overflow-hidden", className)}>
      {collapsible ? (
        <button
          className="flex w-full items-center justify-between text-left"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          <div className="min-w-0">
            <p className="text-lg font-semibold text-[var(--app-text)] mb-1">{title}</p>
            {subtitle && <p className="text-sm leading-5 text-[var(--app-muted)]">{subtitle}</p>}
          </div>
          <span className="btn-secondary btn-small shrink-0 ml-3">{open ? "收起" : "展开"}</span>
        </button>
      ) : (
        <div className="min-w-0">
          <p className="text-lg font-semibold text-[var(--app-text)] mb-1">{title}</p>
          {subtitle && <p className="text-sm leading-5 text-[var(--app-muted)]">{subtitle}</p>}
        </div>
      )}
      <div
        className={cn(
          "grid min-w-0 transition-all duration-300",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-w-0 overflow-hidden space-y-3">{children}</div>
      </div>
    </AppCard>
  );
}