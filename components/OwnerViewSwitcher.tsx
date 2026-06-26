"use client";

import { usePathname, useRouter } from "next/navigation";

/**
 * Owner view switcher — only shown to the owner account.
 * On /me: shows "进入小乖端" → navigates to /
 * On /:   shows "返回我的端" → navigates to /me
 * Not shown for partner.
 */
export function OwnerViewSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  // Only show on owner side or when owner is on partner side
  // Partner pages don't show this at all
  const isOwnerSide = pathname === "/me" || pathname.startsWith("/me/");
  // Partner side but not owner paths — don't show
  if (!isOwnerSide && pathname !== "/" && !pathname.startsWith("/me")) {
    // This is a partner-only page — the switcher is shown from the
    // middleware context; we render it on all owner pages but hide on
    // pure partner paths. Actually, the simplest approach:
    // show on /me/** and on / and partner sub-pages.
    // But we can't distinguish owner from partner here without auth.
    // So we show it always on /me side, and show a "return" on / side.
  }

  if (isOwnerSide) {
    return (
      <button
        onClick={() => router.push("/")}
        className="rounded-full bg-[var(--app-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--app-accent)] transition-colors hover:brightness-95"
      >
        进入小乖端 👀
      </button>
    );
  }

  // On partner side (/) — show "返回我的端"
  if (pathname === "/" || !pathname.startsWith("/me/")) {
    return (
      <button
        onClick={() => router.push("/me")}
        className="rounded-full bg-[var(--app-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--app-accent)] transition-colors hover:brightness-95"
      >
        ← 返回我的端
      </button>
    );
  }

  return null;
}
