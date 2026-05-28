"use client";

import { BottomNav } from "@/components/navigation/BottomNav";
import { useAppSafeArea } from "@/hooks/useAppSafeArea";

export function AppShell({ children }: { children: React.ReactNode }) {
  useAppSafeArea();

  return (
    <main className="mx-auto min-h-screen w-full min-w-0 max-w-md overflow-x-hidden px-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-4 md:max-w-[520px] md:px-5 md:pt-6">
      {children}
      <BottomNav />
    </main>
  );
}