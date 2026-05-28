"use client";

import type { QuickAction } from "./quickActions";
import { DEFAULT_QUICK_ACTIONS } from "./quickActions";
import { markLocalChange, scheduleAutoSync } from "./autoSync";

const STORAGE_KEY = "bristol_dashboard_quick_actions";

/**
 * Load QuickActions from localStorage.
 * Falls back to defaults if nothing saved.
 */
export function loadQuickActionsFromLocal(): QuickAction[] {
  if (typeof window === "undefined") return [...DEFAULT_QUICK_ACTIONS];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_QUICK_ACTIONS];
    const parsed = JSON.parse(raw) as QuickAction[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return [...DEFAULT_QUICK_ACTIONS];
  } catch {
    return [...DEFAULT_QUICK_ACTIONS];
  }
}

/**
 * Save QuickActions to localStorage and trigger auto-sync.
 */
export function saveQuickActionsToLocal(
  actions: QuickAction[],
  options: { suppressAutoSync?: boolean } = {}
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
    // Dispatch a custom event so other components (QuickActionsPanel) can refresh
    window.dispatchEvent(
      new CustomEvent("bristol-dashboard-quick-actions-changed", {
        detail: actions,
      })
    );
    if (!options.suppressAutoSync) {
      markLocalChange("quick_actions");
      scheduleAutoSync("quick_actions_changed");
    }
  } catch {
    // Storage unavailable, keep rendering
  }
}

/**
 * Clear saved QuickActions (reset to defaults).
 */
export function clearQuickActionsLocal() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent("bristol-dashboard-quick-actions-changed", {
        detail: DEFAULT_QUICK_ACTIONS,
      })
    );
  } catch {
    // Storage unavailable
  }
}