"use client";

import { createContext, useContext } from "react";
import type { AppSide } from "@/lib/appIdentity";

/**
 * React Context for /me owner-side identity.
 *
 * Default value represents the owner identity: "me" on the "owner" side.
 * The /me layout wraps children in a Provider that reads from useFixedAppIdentity,
 * but this default acts as a safe fallback if the context is used outside the provider.
 */
export const MeIdentityContext = createContext<{ identityId: string; appSide: AppSide }>({
  identityId: "me",
  appSide: "owner",
});

export function useMeIdentity() {
  return useContext(MeIdentityContext);
}
