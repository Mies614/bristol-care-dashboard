"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, icon, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3 mb-4", className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && <div className="text-[var(--app-muted)] shrink-0">{icon}</div>}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-[var(--app-text)] truncate">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--app-muted)]">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
