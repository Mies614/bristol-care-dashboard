"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "soft";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantMap: Record<string, "default" | "secondary" | "ghost" | "destructive"> = {
  primary:   "default",
  secondary: "secondary",
  ghost:     "ghost",
  danger:    "destructive",
  soft:      "ghost",
};

const sizeMap: Record<string, "sm" | "default" | "lg"> = {
  sm: "sm",
  md: "default",
  lg: "lg",
};

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
  const shadcnVariant = variantMap[variant] ?? "default";
  const shadcnSize = sizeMap[size] ?? "default";

  return (
    <Button
      variant={shadcnVariant}
      size={shadcnSize}
      disabled={disabled || loading}
      className={cn(
        // Preserve AppButton-specific active press effect
        "active:scale-[0.97]",
        // Soft variant uses custom accent color
        variant === "soft" && "text-[var(--app-accent)] hover:bg-[var(--app-accent-soft)] hover:text-[var(--app-accent)] hover:brightness-95 border-0 shadow-none",
        // Primary uses custom btn bg
        variant === "primary" && "bg-[var(--app-btn-bg)] hover:bg-[var(--app-btn-bg)]/90",
        // Secondary uses accent soft
        variant === "secondary" && "bg-[var(--app-accent-soft)] hover:brightness-95 border border-[var(--app-card-border)] text-[var(--app-text)]",
        // Ghost uses muted text
        variant === "ghost" && "text-[var(--app-muted)] hover:bg-[var(--app-accent-soft)] hover:text-[var(--app-text)]",
        // Danger uses danger color
        variant === "danger" && "bg-[var(--app-danger)] hover:bg-[var(--app-danger)]/90",
        // Radius from theme
        "rounded-[var(--app-radius)]",
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon || null}
      {children}
    </Button>
  );
}