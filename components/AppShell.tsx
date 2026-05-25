"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "首页", icon: "⌂" },
  { href: "/albums", label: "相册", icon: "▧" },
  { href: "/schedule", label: "课程", icon: "◴" },
  { href: "/deadlines", label: "DDL", icon: "✓" },
  { href: "/settings", label: "设置", icon: "⚙" },
  { href: "/about", label: "关于", icon: "i" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
      <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-28 pt-4 md:max-w-[520px] md:px-5 md:pt-6">
        {children}
        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 md:max-w-[520px]">
          <div className="rounded-[1.65rem] border border-white/70 bg-white/72 p-1.5 shadow-float ring-1 ring-white/50 backdrop-blur-2xl">
          <div className="grid grid-cols-6 gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-[1.15rem] px-2 py-1.5 text-xs transition ${
                    active ? "bg-gradient-to-br from-blush via-white/75 to-lilac text-cocoa shadow-sm" : "text-cocoa/55 hover:bg-white/55"
                  }`}
                >
                  <span className="text-base leading-5">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
          </div>
        </nav>
      </main>
  );
}
