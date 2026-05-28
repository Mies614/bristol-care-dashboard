"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/design/tokens";
import { Loader2 } from "lucide-react";

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "soft";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

export function AppButton({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: AppButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 transition-all duration-200 font-medium disabled:opacity-40 disabled:cursor-not-allowed select-none";

  const variants: Record<string, string> = {
    primary:   "text-white bg-[var(--app-btn-bg)] hover:brightness-110 active:scale-[0.97]",
    secondary: "text-[var(--app-text)] bg-[var(--app-accent-soft)] hover:brightness-95 active:scale-[0.97] border border-[var(--app-card-border)]",
    ghost:     "text-[var(--app-muted)] hover:bg-[var(--app-accent-soft)] hover:text-[var(--app-text)] active:scale-[0.97]",
    danger:    "text-white bg-[var(--app-danger)] hover:brightness-110 active:scale-[0.97]",
    soft:      "text-[var(--app-accent)] bg-transparent hover:bg-[var(--app-accent-soft)] active:scale-[0.97]",
  };

  const sizes: Record<string, string> = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-5 py-2.5",
  };

  return (
    <button
      className={cn(
        base,
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        "rounded-[var(--app-radius)]",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon || null}
      {children}
    </button>
  );
}