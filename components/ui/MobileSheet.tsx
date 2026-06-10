"use client";

import { type ReactNode, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface MobileSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function MobileSheet({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: MobileSheetProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={cn(
              "absolute bottom-0 left-0 right-0 max-h-[90dvh] overflow-auto rounded-t-[1.75rem] bg-cream shadow-float",
              "pb-[calc(1rem+env(safe-area-inset-bottom,0px))]",
              className
            )}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-2">
              <div className="flex-1 min-w-0">
                {title && <h2 className="text-base font-semibold text-[var(--app-text)]">{title}</h2>}
                {description && <p className="mt-0.5 text-xs text-[var(--app-muted)]">{description}</p>}
              </div>
              <button
                onClick={onClose}
                className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-white/70 text-cocoa/60 backdrop-blur-sm transition hover:bg-white hover:text-cocoa active:scale-90 -mr-1.5 -mt-1"
                aria-label="关闭"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
