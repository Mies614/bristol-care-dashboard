/**
 * Unified navigation data and active-route logic.
 * Single source of truth for BottomNav and routing tests.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: string;
  group: "home" | "records" | "memories" | "cards" | "settings";
}

export const appNavItems: NavItem[] = [
  { href: "/", label: "首页", icon: "Home", group: "home" },
  { href: "/records", label: "记录", icon: "CalendarDays", group: "records" },
  { href: "/memories", label: "回忆", icon: "Heart", group: "memories" },
  { href: "/cards", label: "卡夹", icon: "CreditCard", group: "cards" },
  { href: "/settings", label: "设置", icon: "Settings", group: "settings" },
];

export function getActiveNavHref(pathname: string): string {
  if (pathname === "/") return "/";
  if (pathname.startsWith("/schedule") || pathname.startsWith("/deadlines") || pathname.startsWith("/period") || pathname.startsWith("/records")) {
    return "/records";
  }
  if (pathname.startsWith("/notes") || pathname.startsWith("/albums") || pathname.startsWith("/memories")) {
    return "/memories";
  }
  if (pathname.startsWith("/cards")) return "/cards";
  if (pathname.startsWith("/settings") || pathname.startsWith("/debug")) return "/settings";
  return "";
}

export function getActiveNavItem(pathname: string): NavItem | undefined {
  const activeHref = getActiveNavHref(pathname);
  return appNavItems.find((item) => item.href === activeHref);
}

export function shouldShowBottomNav(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return false;
  if (pathname === "/cards/scan") return false;
  return true;
}