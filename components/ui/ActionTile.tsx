"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface ActionTileProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  href: string;
  className?: string;
}

export function ActionTile({ title, description, icon, href, className }: ActionTileProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 w-full rounded-[var(--app-radius)] bg-[var(--app-card-bg)] border border-[var(--app-card-border)] shadow-[var(--app-card-shadow)] p-4 transition-all duration-200",
        "hover:scale-[1.01] hover:shadow-md active:scale-[0.99]",
        "min-h-[56px]",
        className
      )}
    >
      {icon && <div className="text-xl shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--app-text)]">{title}</p>
        {description && <p className="mt-0.5 text-xs text-[var(--app-muted)]">{description}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-[var(--app-muted)] shrink-0" />
    </Link>
  );
}
