"use client";

import { createContext, useContext, useMemo } from "react";
import { usePathname } from "next/navigation";
import { getSideFromPath, getIdentityForSide, type AppSide } from "@/lib/appIdentity";
import { useFixedAppIdentity } from "@/hooks/useFixedAppIdentity";

const IdentityContext = createContext<{ identityId: string; appSide: AppSide }>({
  identityId: "xiaoguai",
  appSide: "partner",
});

export function useMeIdentity() {
  return useContext(IdentityContext);
}

/**
 * /me route group layout.
 * Provides fixed "me" identity context to all child pages.
 */
export default function MeLayout({ children }: { children: React.ReactNode }) {
  const { identityId, appSide } = useFixedAppIdentity();

  return (
    <IdentityContext.Provider value={useMemo(() => ({ identityId, appSide }), [identityId, appSide])}>
      {children}
    </IdentityContext.Provider>
  );
}