import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ThemeCardStyle, ThemeNavStyle, ThemeRadius, ThemeDecoration } from "@/lib/types";

/** Merge Tailwind classes safely */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return twMerge(clsx(inputs));
}

/** Theme decoration class for background sparkles */
export function getDecorationClass(decoration: ThemeDecoration): string {
  switch (decoration) {
    case "stars":  return "decoration-stars";
    case "hearts": return "decoration-hearts";
    case "tape":   return "decoration-tape";
    case "moon":   return "decoration-moon";
    case "dots":   return "decoration-dots";
    default:       return "";
  }
}

/** Card shadow class from theme */
export function getCardShadowClass(cardStyle: ThemeCardStyle): string {
  switch (cardStyle) {
    case "glass":   return "shadow-[0_16px_45px_rgba(120,90,80,0.14)]";
    case "solid":   return "shadow-[0_10px_30px_rgba(60,45,40,0.1)]";
    case "paper":   return "shadow-[0_4px_12px_rgba(60,45,40,0.06)]";
    case "flat":    return "shadow-[0_6px_18px_rgba(60,45,40,0.06)]";
    case "outline": return "shadow-[0_2px_8px_rgba(60,45,40,0.04)]";
    default:        return "shadow-[0_16px_45px_rgba(120,90,80,0.14)]";
  }
}

/** Theme radius class */
export function getRadiusClass(radius: ThemeRadius): string {
  switch (radius) {
    case "medium": return "rounded-[1.1rem]";
    case "large":  return "rounded-[1.45rem]";
    case "extra":  return "rounded-[1.75rem]";
    default:       return "rounded-[1.75rem]";
  }
}

/** Get nav style border-radius classes */
export function getNavItemRadius(navStyle: ThemeNavStyle): string {
  switch (navStyle) {
    case "pill":     return "rounded-full";
    case "floating": return "rounded-[1.25rem]";
    case "glass":    return "rounded-[1.15rem]";
    case "paper":    return "rounded-[1rem]";
    case "minimal":  return "rounded-[0.6rem]";
    default:         return "rounded-[1.15rem]";
  }
}

/** Nav container class */
export function getNavContainerClass(navStyle: ThemeNavStyle): string {
  switch (navStyle) {
    case "glass":    return "bg-[var(--app-nav-bg)] backdrop-blur-xl border border-[var(--app-nav-border)] shadow-[0_8px_32px_rgba(0,0,0,0.06)]";
    case "pill":     return "bg-[var(--app-nav-bg)] backdrop-blur-lg border border-[var(--app-nav-border)] gap-1.5 py-1.5 px-2 shadow-[0_4px_24px_rgba(0,0,0,0.04)]";
    case "paper":    return "bg-[var(--app-nav-bg)] border-b border-[var(--app-nav-border)] shadow-sm";
    case "minimal":  return "";
    case "floating": return "bg-[var(--app-nav-bg)] backdrop-blur-2xl border border-[var(--app-nav-border)] mx-4 mb-2 shadow-[0_8px_40px_rgba(0,0,0,0.08)]";
    default:         return "bg-[var(--app-nav-bg)] backdrop-blur-xl border border-[var(--app-nav-border)]";
  }
}

/** Card variant classes */
export function getCardClass(variant: "default" | "highlight" | "soft" | "paper" | "danger" | "photo", cardStyle: ThemeCardStyle): string {
  const base = "border";
  switch (cardStyle) {
    case "glass":
      return cn(base, "bg-[var(--app-card-bg)] border-[var(--app-card-border)] backdrop-blur-md", 
        variant === "highlight" && "border-[var(--app-accent)] bg-[var(--app-accent-soft)]",
        variant === "danger" && "border-[var(--app-danger)]/30 bg-[var(--app-danger)]/8",
        variant === "photo" && "bg-white/88 backdrop-blur-sm"
      );
    case "solid":
      return cn(base, "bg-[var(--app-card-bg)] border-[var(--app-card-border)]",
        variant === "highlight" && "border-[var(--app-accent)] bg-[var(--app-accent-soft)]",
        variant === "danger" && "border-[var(--app-danger)]/30 bg-[var(--app-danger)]/8"
      );
    case "paper":
      return cn(base, "bg-[var(--app-card-bg)] border-[var(--app-card-border)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        variant === "paper" && "bg-[var(--app-bg-soft)]"
      );
    case "flat":
      return cn("border-0 bg-[var(--app-card-bg)]",
        variant === "highlight" && "bg-[var(--app-accent-soft)]"
      );
    case "outline":
      return cn("border-2 bg-transparent",
        variant === "default" && "border-[var(--app-card-border)]",
        variant === "highlight" && "border-[var(--app-accent)]"
      );
    default:
      return base;
  }
}