"use client";

/**
 * Client-safe space code utility.
 * Can read from localStorage with try/catch.
 * Must NOT be imported by any API route or server component.
 */

const SPACE_CODE_STORAGE_KEY = "bristol_dashboard_space_code";

/**
 * Get the space code from localStorage.
 * Falls back to an empty string if unavailable.
 */
export function getSpaceCodeFromStorage(): string | null {
  try {
    return localStorage.getItem(SPACE_CODE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Save a space code to localStorage.
 */
export function saveSpaceCodeToStorage(code: string): void {
  try {
    localStorage.setItem(SPACE_CODE_STORAGE_KEY, code);
  } catch {
    // Storage unavailable; silently ignore.
  }
}

/**
 * Remove space code from localStorage.
 */
export function clearSpaceCodeFromStorage(): void {
  try {
    localStorage.removeItem(SPACE_CODE_STORAGE_KEY);
  } catch {
    // Storage unavailable; silently ignore.
  }
}