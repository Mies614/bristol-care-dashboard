"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuthRole } from "@/components/AuthRoleProvider";

/**
 * Owner view switcher — visible only when authenticated role is "owner".
 * Button text depends on current pathname, but visibility depends on role.
 */
export function OwnerViewSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useAuthRole();

  // Partner or unknown: never show
  if (role !== "owner") return null;

  const isOwnerSide = pathname === "/me" || pathname.startsWith("/me/");

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

  return (
    <button
      onClick={() => router.push("/me")}
      className="rounded-full bg-[var(--app-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--app-accent)] transition-colors hover:brightness-95"
    >
      ← 返回我的端
    </button>
  );
}
