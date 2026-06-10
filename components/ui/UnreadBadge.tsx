"use client";

import { cn } from "@/lib/utils";

interface UnreadBadgeProps {
  mode?: "dot" | "label";
  count?: number;
  className?: string;
  label?: string;
}

export function UnreadBadge({
  mode = "dot",
  count,
  className,
  label,
}: UnreadBadgeProps) {
  if (mode === "label") {
    return (
      <span
        aria-label={label || `${count ?? 0} 条未读`}
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-medium text-rose-600",
          className
        )}
      >
        {count !== undefined && count > 0 ? `${count} 未读` : "未读"}
      </span>
    );
  }

  return (
    <span
      aria-label={label || "未读"}
      className={cn(
        "block h-2 w-2 rounded-full bg-rose-400 ring-1 ring-white/80",
        className
      )}
    />
  );
}
