"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/records", label: "Records" },
  { href: "/notes", label: "Notes" },
  { href: "/memories", label: "Memories" },
  { href: "/settings", label: "Settings" }
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md border-t border-white/30 bg-[var(--app-nav-bg)] px-2 py-2 backdrop-blur-2xl md:max-w-[520px]">
      <ul className="flex items-center justify-around gap-1">
        {navItems.map(({ href, label }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <li key={href} className="flex-1">
              <Link
                className={`flex flex-col items-center gap-0.5 rounded-[1.15rem] px-2 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${
                  isActive
                    ? "bg-[var(--app-accent-soft)] text-[var(--app-accent)]"
                    : "text-[var(--app-muted)] hover:bg-white/40"
                }`}
                href={href}
              >
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}