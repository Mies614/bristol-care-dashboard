"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/design/tokens";

interface AppFormFieldProps {
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Unified form field component.
 * label above, description/error below, full width.
 */
export function AppFormField({ label, description, error, children, className }: AppFormFieldProps) {
  return (
    <label className={cn("flex w-full min-w-0 flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-[var(--app-muted)]">{label}</span>
      {children}
      {description ? <span className="text-xs leading-5 text-[var(--app-muted)]">{description}</span> : null}
      {error ? <span className="text-xs leading-5 text-[var(--app-danger)]">{error}</span> : null}
    </label>
  );
}