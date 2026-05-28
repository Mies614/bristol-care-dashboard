/**
 * Server-safe settings utility for the unified `settings` table.
 * No "use client", no window/localStorage.
 * All settings are stored as key/value pairs in the `settings` table.
 * Keys: background_settings, theme_settings, period_settings, auto_sync_settings, app_settings
 */
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SettingRow {
  space_id: string;
  key: string;
  value: unknown;
  updated_at: string;
}

export interface BackgroundSettings {
  mode: "preset" | "color" | "image" | "url" | "cloudImage";
  preset?: "cream" | "pink" | "lavender" | "blue" | "green" | "dark";
  color?: string;
  imageDataUrl?: string;
  imageUrl?: string;
  cloudImageUrl?: string;
  cloudImagePath?: string;
  imageFit?: "cover" | "contain" | "portrait" | "softPortrait";
  imagePosition?: "center" | "top" | "bottom" | "left" | "right";
  focalPoint?: { x: number; y: number };
  overlay?: "none" | "light" | "medium" | "strong";
  blur?: boolean;
  dim?: number;
  scale?: number;
  portraitEnhance?: boolean;
}

export interface ThemeSettings {
  style: "soft" | "photo" | "night" | "romantic" | "minimal" | "study";
  cardStyle: "glass" | "soft" | "minimal" | "rounded";
  navStyle: "glass" | "soft" | "minimal" | "bordered";
  radius: "small" | "medium" | "large" | "extra" | "full";
  decoration: "none" | "stars" | "hearts" | "flowers" | "sparkle";
}

export interface PeriodSettings {
  averageCycleLength: number;
  averagePeriodLength: number;
  reminderDaysBefore: number;
}

export interface AutoSyncSettings {
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------
export const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = {
  mode: "preset",
  preset: "cream",
  imageFit: "cover",
  imagePosition: "center",
  focalPoint: { x: 50, y: 38 },
  overlay: "medium",
  blur: false,
  dim: 20,
  scale: 100,
  portraitEnhance: false
};

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  style: "soft",
  cardStyle: "glass",
  navStyle: "glass",
  radius: "extra",
  decoration: "stars"
};

export const DEFAULT_PERIOD_SETTINGS: PeriodSettings = {
  averageCycleLength: 28,
  averagePeriodLength: 5,
  reminderDaysBefore: 2
};

export const DEFAULT_AUTO_SYNC_SETTINGS: AutoSyncSettings = {
  enabled: true
};

// ---------------------------------------------------------------------------
// Key normalization
// ---------------------------------------------------------------------------
const KEY_ALIASES: Record<string, string> = {
  backgroundsettings: "background_settings",
  backgroundSettings: "background_settings",
  themesettings: "theme_settings",
  themeSettings: "theme_settings",
  periodsettings: "period_settings",
  periodSettings: "period_settings",
  autosyncsettings: "auto_sync_settings",
  autoSyncSettings: "auto_sync_settings",
  appsettings: "app_settings",
  appSettings: "app_settings"
};

const VALID_KEYS = new Set([
  "background_settings",
  "theme_settings",
  "period_settings",
  "auto_sync_settings",
  "app_settings"
]);

export function normalizeSettingKey(key: string): string {
  const normalized = key.trim().toLowerCase().replace(/[^a-z_]/g, "");
  if (VALID_KEYS.has(normalized)) return normalized;
  return KEY_ALIASES[key.trim()] || key.trim();
}

export function isValidSettingKey(key: string): boolean {
  return VALID_KEYS.has(key);
}

// ---------------------------------------------------------------------------
// Value normalization
// ---------------------------------------------------------------------------
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeObject(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (v !== undefined && v !== null) {
      cleaned[k] = typeof v === "object" ? sanitizeObject(v) : v;
    }
  }
  return cleaned;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim());
}

function isHttpsUrl(value: unknown): value is string {
  return typeof value === "string" && /^https:\/\/\S+$/i.test(value.trim());
}

export function normalizeBackgroundValue(value: unknown): BackgroundSettings {
  if (!isRecord(value)) return { ...DEFAULT_BACKGROUND_SETTINGS };
  const mode = ["preset", "color", "image", "url", "cloudImage"].includes(String(value.mode))
    ? (value.mode as BackgroundSettings["mode"])
    : DEFAULT_BACKGROUND_SETTINGS.mode;
  const preset = ["cream", "pink", "lavender", "blue", "green", "dark"].includes(String(value.preset))
    ? (value.preset as BackgroundSettings["preset"])
    : DEFAULT_BACKGROUND_SETTINGS.preset;
  const imageFit = ["cover", "contain", "portrait", "softPortrait"].includes(String(value.imageFit))
    ? (value.imageFit as BackgroundSettings["imageFit"])
    : DEFAULT_BACKGROUND_SETTINGS.imageFit;
  const imagePosition = ["center", "top", "bottom", "left", "right"].includes(String(value.imagePosition))
    ? (value.imagePosition as BackgroundSettings["imagePosition"])
    : DEFAULT_BACKGROUND_SETTINGS.imagePosition;
  const overlay = ["none", "light", "medium", "strong"].includes(String(value.overlay))
    ? (value.overlay as BackgroundSettings["overlay"])
    : DEFAULT_BACKGROUND_SETTINGS.overlay;

  return {
    mode,
    preset,
    color: isHexColor(value.color) ? value.color.trim() : undefined,
    imageUrl: isHttpsUrl(value.imageUrl) ? value.imageUrl.trim() : undefined,
    cloudImageUrl: isHttpsUrl(value.cloudImageUrl) ? value.cloudImageUrl.trim() : undefined,
    cloudImagePath: typeof value.cloudImagePath === "string" ? value.cloudImagePath.trim() : undefined,
    imageFit,
    imagePosition,
    focalPoint: isRecord(value.focalPoint)
      ? {
          x: clampNumber(value.focalPoint.x, 0, 100, DEFAULT_BACKGROUND_SETTINGS.focalPoint!.x),
          y: clampNumber(value.focalPoint.y, 0, 100, DEFAULT_BACKGROUND_SETTINGS.focalPoint!.y)
        }
      : { ...DEFAULT_BACKGROUND_SETTINGS.focalPoint! },
    overlay,
    blur: typeof value.blur === "boolean" ? value.blur : DEFAULT_BACKGROUND_SETTINGS.blur,
    portraitEnhance: typeof value.portraitEnhance === "boolean" ? value.portraitEnhance : DEFAULT_BACKGROUND_SETTINGS.portraitEnhance,
    dim: clampNumber(value.dim, 0, 80, DEFAULT_BACKGROUND_SETTINGS.dim || 20),
    scale: clampNumber(value.scale, 90, 130, DEFAULT_BACKGROUND_SETTINGS.scale || 100)
  };
}

export function normalizeThemeValue(value: unknown): ThemeSettings {
  if (!isRecord(value)) return { ...DEFAULT_THEME_SETTINGS };
  return {
    style: ["soft", "photo", "night", "romantic", "minimal", "study"].includes(String(value.style))
      ? (value.style as ThemeSettings["style"])
      : DEFAULT_THEME_SETTINGS.style,
    cardStyle: ["glass", "soft", "minimal", "rounded"].includes(String(value.cardStyle))
      ? (value.cardStyle as ThemeSettings["cardStyle"])
      : DEFAULT_THEME_SETTINGS.cardStyle,
    navStyle: ["glass", "soft", "minimal", "bordered"].includes(String(value.navStyle))
      ? (value.navStyle as ThemeSettings["navStyle"])
      : DEFAULT_THEME_SETTINGS.navStyle,
    radius: ["small", "medium", "large", "extra", "full"].includes(String(value.radius))
      ? (value.radius as ThemeSettings["radius"])
      : DEFAULT_THEME_SETTINGS.radius,
    decoration: ["none", "stars", "hearts", "flowers", "sparkle"].includes(String(value.decoration))
      ? (value.decoration as ThemeSettings["decoration"])
      : DEFAULT_THEME_SETTINGS.decoration
  };
}

export function normalizePeriodValue(value: unknown): PeriodSettings {
  if (!isRecord(value)) return { ...DEFAULT_PERIOD_SETTINGS };
  return {
    averageCycleLength: clampNumber(value.averageCycleLength, 1, 365, DEFAULT_PERIOD_SETTINGS.averageCycleLength),
    averagePeriodLength: clampNumber(value.averagePeriodLength, 1, 30, DEFAULT_PERIOD_SETTINGS.averagePeriodLength),
    reminderDaysBefore: clampNumber(value.reminderDaysBefore, 0, 30, DEFAULT_PERIOD_SETTINGS.reminderDaysBefore)
  };
}

export function normalizeAutoSyncValue(value: unknown): AutoSyncSettings {
  if (!isRecord(value)) return { ...DEFAULT_AUTO_SYNC_SETTINGS };
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : DEFAULT_AUTO_SYNC_SETTINGS.enabled
  };
}

/**
 * Normalize a setting value for storage.
 * - Never returns null/undefined.
 * - Handles null/undefined by returning the default for the key.
 * - Strips imageDataUrl from background_settings.
 * - Fills missing fields with defaults.
 */
export function normalizeSettingValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) {
    return getDefaultForKey(key);
  }

  const normalizedKey = normalizeSettingKey(key);

  switch (normalizedKey) {
    case "background_settings": {
      const bg = normalizeBackgroundValue(value);
      // Strip imageDataUrl for cloud storage
      const clean = { ...bg };
      delete clean.imageDataUrl;
      return clean;
    }
    case "theme_settings":
      return normalizeThemeValue(value);
    case "period_settings":
      return normalizePeriodValue(value);
    case "auto_sync_settings":
      return normalizeAutoSyncValue(value);
    default:
      // For unknown keys, sanitize the value
      if (isRecord(value)) {
        return sanitizeObject(value);
      }
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return value;
      }
      return {};
  }
}

function getDefaultForKey(key: string): unknown {
  const normalizedKey = normalizeSettingKey(key);
  switch (normalizedKey) {
    case "background_settings":
      return { ...DEFAULT_BACKGROUND_SETTINGS };
    case "theme_settings":
      return { ...DEFAULT_THEME_SETTINGS };
    case "period_settings":
      return { ...DEFAULT_PERIOD_SETTINGS };
    case "auto_sync_settings":
      return { ...DEFAULT_AUTO_SYNC_SETTINGS };
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// DB operations
// ---------------------------------------------------------------------------

/**
 * Upsert a single setting row.
 * onConflict: space_id, key
 */
export async function upsertSetting(
  client: SupabaseClient,
  spaceId: string,
  key: string,
  value: unknown
): Promise<void> {
  const normalizedKey = normalizeSettingKey(key);
  const normalizedValue = normalizeSettingValue(key, value);

  const { error } = await client
    .from("settings")
    .upsert(
      {
        space_id: spaceId,
        key: normalizedKey,
        value: normalizedValue,
        updated_at: new Date().toISOString()
      },
      { onConflict: "space_id,key" }
    );

  if (error) {
    throw new Error(`settings upsert failed: ${error.message}`);
  }
}

/**
 * Get a single setting value by key.
 * Returns the parsed value or null.
 */
export async function getSetting<T = unknown>(
  client: SupabaseClient,
  spaceId: string,
  key: string
): Promise<T | null> {
  const normalizedKey = normalizeSettingKey(key);
  const { data, error } = await client
    .from("settings")
    .select("value")
    .eq("space_id", spaceId)
    .eq("key", normalizedKey)
    .maybeSingle();

  if (error) {
    throw new Error(`settings query failed: ${error.message}`);
  }

  if (!data) return null;
  return data.value as T;
}

/**
 * Get all settings for a space as a key-value map.
 */
export async function getSettingsMap(
  client: SupabaseClient,
  spaceId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await client
    .from("settings")
    .select("key, value")
    .eq("space_id", spaceId);

  if (error) {
    throw new Error(`settings query failed: ${error.message}`);
  }

  const map: Record<string, unknown> = {};
  if (data) {
    for (const row of data) {
      map[row.key] = row.value;
    }
  }
  return map;
}