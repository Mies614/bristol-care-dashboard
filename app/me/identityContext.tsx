"use client";

import { createContext, useContext } from "react";
import type { AppSide } from "@/lib/appIdentity";

export const MeIdentityContext = createContext<{ identityId: string; appSide: AppSide }>({
  identityId: "xiaoguai",
  appSide: "partner",
});

export function useMeIdentity() {
  return useContext(MeIdentityContext);
}