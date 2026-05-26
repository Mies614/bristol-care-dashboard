"use client";

export const SHARED_ACCESS_KEY = "bristol_dashboard_shared_access";

export function getExpectedSharedAccessCode() {
  return process.env.NEXT_PUBLIC_DEFAULT_SPACE_CODE || "BRISTOL2026";
}

export function validateSharedAccessCode(value: string) {
  return value.trim() === getExpectedSharedAccessCode();
}

export function hasSharedAccess() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SHARED_ACCESS_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveSharedAccess() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SHARED_ACCESS_KEY, "true");
}

export function clearSharedAccess() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SHARED_ACCESS_KEY);
}
