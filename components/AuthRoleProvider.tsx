"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AuthRoleState = {
  role: "owner" | "partner" | null;
};

const AuthRoleContext = createContext<AuthRoleState>({ role: null });

export function AuthRoleProvider({
  role,
  children,
}: {
  role: "owner" | "partner" | null;
  children: ReactNode;
}) {
  return (
    <AuthRoleContext.Provider value={{ role }}>
      {children}
    </AuthRoleContext.Provider>
  );
}

export function useAuthRole(): AuthRoleState {
  return useContext(AuthRoleContext);
}
