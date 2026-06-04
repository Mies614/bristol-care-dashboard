"use client";

import { useMemo } from "react";
import { useFixedAppIdentity } from "@/hooks/useFixedAppIdentity";
import { MeIdentityContext } from "./identityContext";

/**
 * /me route group layout.
 * Provides fixed "me" identity context to all child pages.
 */
export default function MeLayout({ children }: { children: React.ReactNode }) {
  const { identityId, appSide } = useFixedAppIdentity();

  return (
    <MeIdentityContext.Provider value={useMemo(() => ({ identityId, appSide }), [identityId, appSide])}>
      {children}
    </MeIdentityContext.Provider>
  );
}