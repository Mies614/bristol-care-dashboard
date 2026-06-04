"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { getSideFromPath, getIdentityForSide, type AppSide } from "@/lib/appIdentity";

/**
 * Fixed-identity hook for the new dual-entry architecture.
 *
 * Reads the current route via usePathname() and returns the
 * predetermined identity for that side. Does NOT read localStorage,
 * does NOT listen for identity-changed events.
 *
 * Usage in a page component:
 *
 *   const { identityId, appSide } = useFixedAppIdentity();
 *
 * @returns {{ identityId: string; appSide: AppSide }}
 */
export function useFixedAppIdentity(): {
  identityId: string;
  appSide: AppSide;
} {
  const pathname = usePathname();

  return useMemo(() => {
    const side = getSideFromPath(pathname);
    return {
      identityId: getIdentityForSide(side),
      appSide: side,
    };
  }, [pathname]);
}