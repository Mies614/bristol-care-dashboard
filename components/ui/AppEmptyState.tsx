"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/design/tokens";
import { Inbox } from "lucide-react";

interface AppEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function AppEmptyState({ icon, title, description, action, className }: AppEmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-6 text-center", className)}>
      <div className="mb-4 text-[var(--app-muted)] opacity-50">
        {icon || <Inbox className="h-12 w-12" />}
      </div>
      <p className="text-base font-medium text-[var(--app-text)]">{title}</p>
      {description && <p className="mt-1 text-sm text-[var(--app-muted)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}