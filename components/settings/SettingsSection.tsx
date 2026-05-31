"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppCard } from "@/components/ui/AppCard";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SettingsSection({ title, subtitle, defaultOpen = true, collapsible = true, children, className = "" }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <AppCard className={cn("w-full min-w-0 space-y-4 overflow-hidden", className)}>
      {collapsible ? (
        <button
          className="flex w-full items-center justify-between text-left"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          <div className="min-w-0">
            <p className="text-lg font-semibold text-[var(--app-text)] mb-1">{title}</p>
            {subtitle && <p className="text-sm leading-5 text-[var(--app-muted)]">{subtitle}</p>}
          </div>
          <motion.span
            className="btn-secondary btn-small shrink-0 ml-3"
            animate={{ rotate: open ? 0 : 180 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {open ? "收起" : "展开"}
          </motion.span>
        </button>
      ) : (
        <div className="min-w-0">
          <p className="text-lg font-semibold text-[var(--app-text)] mb-1">{title}</p>
          {subtitle && <p className="text-sm leading-5 text-[var(--app-muted)]">{subtitle}</p>}
        </div>
      )}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            className="min-w-0 overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="min-w-0 space-y-3 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppCard>
  );
}