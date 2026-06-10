/**
 * Unified navigation data and active-route logic.
 * Single source of truth for BottomNav and routing tests.
 *
 * Supports both partner side (/) and owner side (/me) navigation.
 *
 * Primary nav entries: 首页, 记录, 回忆, 卡夹, 设置
 * /notes and /albums are secondary pages accessible via /records, /cards, /memories, or homepage cards.
 */

import type { AppSide } from "@/lib/appIdentity";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  group: "home" | "records" | "memories" | "cards" | "settings";
}

const PARTNER_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "首页", icon: "Home", group: "home" },
  { href: "/records", label: "记录", icon: "CalendarDays", group: "records" },
  { href: "/memories", label: "回忆", icon: "Heart", group: "memories" },
  { href: "/cards", label: "卡夹", icon: "CreditCard", group: "cards" },
  { href: "/settings", label: "设置", icon: "Settings", group: "settings" },
];

const OWNER_NAV_ITEMS: NavItem[] = [
  { href: "/me", label: "首页", icon: "Home", group: "home" },
  { href: "/me/records", label: "记录", icon: "CalendarDays", group: "records" },
  { href: "/me/memories", label: "回忆", icon: "Heart", group: "memories" },
  { href: "/me/cards", label: "卡夹", icon: "CreditCard", group: "cards" },
  { href: "/me/settings", label: "设置", icon: "Settings", group: "settings" },
];

/**
 * Determine if we are on the owner (/me) side.
 */
export function isOwnerPath(pathname: string): boolean {
  return pathname === "/me" || pathname.startsWith("/me/");
}

/**
 * Get the navigation items for the current pathname.
 */
export function getNavItemsForPath(pathname: string): NavItem[] {
  return isOwnerPath(pathname) ? OWNER_NAV_ITEMS : PARTNER_NAV_ITEMS;
}

/**
 * @deprecated Use getNavItemsForPath instead.
 * Kept for backward compatibility with existing tests.
 */
export const appNavItems: NavItem[] = PARTNER_NAV_ITEMS;

/**
 * Get the base path prefix for a given app side.
 * - owner → "/me"
 * - partner → ""
 */
export function getSideBasePath(appSide: AppSide): string {
  return appSide === "owner" ? "/me" : "";
}

/**
 * Build a href that respects the app side prefix.
 *
 * Examples:
 * - getSideHref("owner", "/notes") → "/me/notes"
 * - getSideHref("partner", "/notes") → "/notes"
 * - getSideHref("owner", "notes") → "/me/notes"
 * - getSideHref("owner", "/") → "/me"
 *
 * Does NOT produce "/me/me/..." — the path is always normalized first.
 */
export function getSideHref(appSide: AppSide, path: string): string {
  const basePath = getSideBasePath(appSide);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath === "/") return basePath || "/";
  return `${basePath}${normalizedPath}`;
}

/**
 * Get the active nav href given the current pathname.
 *
 * Rules:
 * - /me → /me
 * - /me/records → /me/records
 * - /me/memories → /me/memories
 * - /me/cards → /me/cards
 * - /me/settings → /me/settings
 * - /me/admin → hidden (shouldShowBottomNav returns false)
 * - /me/notes → /me/records (sub-page)
 * - /me/albums → /me/memories (sub-page)
 *
 * - / → /
 * - /records → /records
 * - /memories → /memories
 * - /cards → /cards
 * - /settings → /settings
 * - //schedule, /deadlines, /period → /records
 * - /notes → /records (sub-page)
 * - /albums → /memories (sub-page)
 */
export function getActiveNavHref(pathname: string): string {
  const isOwner = isOwnerPath(pathname);
  const stripMe = isOwner ? pathname.replace(/^\/me/, "") : pathname;

  if (stripMe === "/" || stripMe === "") return isOwner ? "/me" : "/";
  if (stripMe.startsWith("/records")) return isOwner ? "/me/records" : "/records";
  if (stripMe.startsWith("/memories")) return isOwner ? "/me/memories" : "/memories";
  if (stripMe.startsWith("/cards")) return isOwner ? "/me/cards" : "/cards";
  // Sub-pages: notes → records, albums → memories
  if (stripMe.startsWith("/notes")) return isOwner ? "/me/records" : "/records";
  if (stripMe.startsWith("/albums")) return isOwner ? "/me/memories" : "/memories";
  if (stripMe.startsWith("/schedule") || stripMe.startsWith("/deadlines") || stripMe.startsWith("/period")) {
    return isOwner ? "/me/records" : "/records";
  }
  if (stripMe.startsWith("/settings") || stripMe.startsWith("/debug")) {
    return isOwner ? "/me/settings" : "/settings";
  }
  return isOwner ? "/me" : "";
}

export function getActiveNavItem(pathname: string): NavItem | undefined {
  const items = getNavItemsForPath(pathname);
  const activeHref = getActiveNavHref(pathname);
  return items.find((item) => item.href === activeHref);
}

export function shouldShowBottomNav(pathname: string): boolean {
  if (pathname.startsWith("/admin") || pathname.startsWith("/me/admin")) return false;
  if (pathname === "/cards/scan" || pathname === "/me/cards/scan") return false;
  return true;
}
