"use client";

import { useEffect, useState } from "react";
import { AppButton } from "@/components/ui/AppButton";

/**
 * Lightweight PWA install prompt.
 * Only shows after user has spent some time on the page,
 * and respects user dismissal (stored in localStorage for 30 days).
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "bristol_pwa_install_dismissed";

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const expiry = new Date(dismissed).getTime();
        if (expiry > Date.now()) return;
      }
    } catch {
      // localStorage unavailable, proceed
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Delay showing the prompt so user isn't interrupted immediately
      setTimeout(() => setShow(true), 5000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
    } catch {
      // Prompt cancelled
    } finally {
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setShow(false);
    try {
      // Dismiss for 30 days
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      localStorage.setItem(DISMISS_KEY, thirtyDays.toISOString());
    } catch {
      // Ignore storage errors
    }
  }

  if (!show || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-72">
      <div className="rounded-2xl border border-white/80 bg-white/92 p-4 shadow-lg backdrop-blur-md">
        <p className="text-sm font-medium text-cocoa mb-1">添加到手机桌面</p>
        <p className="text-xs text-cocoa/55 mb-3">
          可以像 App 一样打开，更方便每天看看。
        </p>
        <div className="flex gap-2">
          <AppButton variant="primary" size="sm" onClick={handleInstall}>
            📲 添加到桌面
          </AppButton>
          <button
            className="text-xs text-cocoa/35 hover:text-cocoa/55 px-2"
            onClick={handleDismiss}
          >
            以后再说
          </button>
        </div>
      </div>
    </div>
  );
}
