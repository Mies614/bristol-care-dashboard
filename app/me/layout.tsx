"use client";

import { useFixedAppIdentity } from "@/hooks/useFixedAppIdentity";

/**
 * /me route group layout.
 * 
 * Provides the "me" identity context for all /me/* child pages.
 * The actual identity injection into page components will be done in Phase 3.
 * 
 * For now (Phase 2), this layout simply wraps children with no modification,
 * since existing page components still use useCurrentIdentity from localStorage.
 * In Phase 3, we will add an IdentityContext provider here.
 */
export default function MeLayout({ children }: { children: React.ReactNode }) {
  // Warm up the fixed identity hook (will be used for context in Phase 3)
  useFixedAppIdentity();

  return <>{children}</>;
}