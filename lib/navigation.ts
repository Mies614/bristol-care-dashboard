/**
 * Unified navigation data and active-route logic.
 * Single source of truth for BottomNav and routing tests.
 *
 * Supports both partner side (/) and owner side (/me) navigation.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: string;
  group: "home" | "notes" | "albums" | "memories" | "settings";
}

const PARTNER_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "首页", icon: "Home", group: "home" },
  { href: "/notes", label: "小纸条", icon: "CalendarDays", group: "notes" },
  { href: "/albums", label: "相册", icon: "Heart", group: "albums" },
  { href: "/memories", label: "回忆", icon: "CreditCard", group: "memories" },
  { href: "/settings", label: "设置", icon: "Settings", group: "settings" },
];

const OWNER_NAV_ITEMS: NavItem[] = [
  { href: "/me", label: "首页", icon: "Home", group: "home" },
  { href: "/me/notes", label: "小纸条", icon: "CalendarDays", group: "notes" },
  { href: "/me/albums", label: "相册", icon: "Heart", group: "albums" },
  { href: "/me/memories", label: "回忆", icon: "CreditCard", group: "memories" },
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
 * Get the active nav href given the current pathname.
 *
 * Rules:
 * - /me → /me
 * - /me/notes → /me/notes
 * - /me/albums → /me/albums
 * - /me/memories → /me/memories
 * - /me/settings → /me/settings
 * - /me/admin → hidden (shouldShowBottomNav returns false)
 *
 * - / → /
 * - /notes → /notes
 * - /albums → /albums
 * - /memories → /memories
 * - /settings → /settings
 * - //schedule, /deadlines, /period → /notes
 */
export function getActiveNavHref(pathname: string): string {
  const isOwner = isOwnerPath(pathname);
  const stripMe = isOwner ? pathname.replace(/^\/me/, "") : pathname;

  if (stripMe === "/" || stripMe === "") return isOwner ? "/me" : "/";
  if (stripMe.startsWith("/notes")) return isOwner ? "/me/notes" : "/notes";
  if (stripMe.startsWith("/albums")) return isOwner ? "/me/albums" : "/albums";
  if (stripMe.startsWith("/memories")) return isOwner ? "/me/memories" : "/memories";
  if (stripMe.startsWith("/schedule") || stripMe.startsWith("/deadlines") || stripMe.startsWith("/period") || stripMe.startsWith("/records")) {
    return isOwner ? "/me/notes" : "/notes";
  }
  if (stripMe.startsWith("/cards")) return isOwner ? "/me" : "/";
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