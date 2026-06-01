import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format an API error payload into a human-readable string.
 * Extracts error, code, step, and detail fields if present.
 */
export function formatApiError(payload: Record<string, unknown>, fallback: string): string {
  return [
    typeof payload.error === "string" ? payload.error : fallback,
    typeof payload.code === "string" ? "code: " + payload.code : "",
    typeof payload.step === "string" ? "step: " + payload.step : "",
    typeof payload.detail === "string" ? "detail: " + payload.detail : ""
  ].filter(Boolean).join(" - ");
}
