"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/navigation/BottomNav";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { useAppSafeArea } from "@/hooks/useAppSafeArea";
import { loadAppData } from "@/lib/storage";
import { fadeIn } from "@/lib/design/motionVariants";
import type { AppData } from "@/lib/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  useAppSafeArea();
  const [data, setData] = useState<AppData | null>(null);

  useEffect(() => {
    try {
      setData(loadAppData());
    } catch {
      setData(null);
    }
  }, []);

  const navStatus = {
    records: data?.deadlines?.some((d) => d.status !== "done") ?? false,
    memories: false,
    settings: false,
  };

  return (
    <motion.main
      className="mx-auto min-h-screen w-full min-w-0 max-w-md overflow-x-hidden px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] pt-4 md:max-w-[520px] md:px-5 md:pt-6"
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
      {children}
      <BottomNav status={navStatus} />
      <PwaInstallPrompt />
    </motion.main>
  );
}
