/**
 * Bottom navigation item definitions and active-href logic.
 * Used by both BottomNav and AppShell for consistent navigation.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Which tab this route belongs to */
  group: "home" | "records" | "memories" | "cards" | "settings";
}

export const appNavItems: NavItem[] = [
  { href: "/", label: "首页", icon: "home", group: "home" },
  { href: "/records", label: "记录", icon: "records", group: "records" },
  { href: "/memories", label: "回忆", icon: "memories", group: "memories" },
  { href: "/cards", label: "卡夹", icon: "cards", group: "cards" },
  { href: "/settings", label: "设置", icon: "settings", group: "settings" },
];

/**
 * Given the current pathname, return the matching NavItem (or undefined).
 */
export function getActiveNavItem(pathname: string): NavItem | undefined {
  if (pathname === "/") return appNavItems[0];
  if (pathname.startsWith("/schedule") || pathname.startsWith("/deadlines") || pathname.startsWith("/period") || pathname.startsWith("/records")) {
    return appNavItems[1];
  }
  if (pathname.startsWith("/notes") || pathname.startsWith("/albums") || pathname.startsWith("/memories")) {
    return appNavItems[2];
  }
  if (pathname.startsWith("/cards")) return appNavItems[3];
  if (pathname.startsWith("/settings") || pathname.startsWith("/debug")) return appNavItems[4];
  return undefined;
}