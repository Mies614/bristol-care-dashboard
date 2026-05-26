export const appNavItems = [
  { href: "/", label: "首页", icon: "⌂" },
  { href: "/records", label: "记录", icon: "◴" },
  { href: "/memories", label: "回忆", icon: "✎" },
  { href: "/cards", label: "卡夹", icon: "▣" },
  { href: "/settings", label: "设置", icon: "⚙" }
];

export function getActiveNavHref(pathname: string) {
  if (pathname === "/") return "/";
  if (pathname.startsWith("/schedule") || pathname.startsWith("/deadlines") || pathname.startsWith("/period") || pathname.startsWith("/records")) {
    return "/records";
  }
  if (pathname.startsWith("/notes") || pathname.startsWith("/albums") || pathname.startsWith("/memories")) {
    return "/memories";
  }
  if (pathname.startsWith("/cards")) return "/cards";
  if (pathname.startsWith("/settings")) return "/settings";
  return "";
}
