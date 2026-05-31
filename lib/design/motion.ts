"use client";

import { useReducedMotion } from "framer-motion";
import type { Variants, Transition } from "framer-motion";

/**
 * Shared transition presets — lightweight, 150–260ms.
 * All respect `prefers-reduced-motion` via the returned hook.
 */

export const microSpring: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 28,
  mass: 0.8,
};

export const microTween: Transition = {
  type: "tween",
  duration: 0.18,
  ease: [0.25, 0.1, 0.25, 1],
};

export const fadeInTween: Transition = {
  type: "tween",
  duration: 0.22,
  ease: "easeOut",
};

export const staggerTween: Transition = {
  type: "tween",
  duration: 0.2,
  ease: [0.25, 0.1, 0.25, 1],
};

// ---- Variants ----

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const scaleOnTap: Variants = {
  rest: { scale: 1 },
  tap: { scale: 0.96 },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export const skeletonPulse: Variants = {
  animate: {
    opacity: [0.4, 0.7, 0.4],
    transition: {
      duration: 1.4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/**
 * Returns reduced-motion-safe variants.
 * When reduced motion is preferred, transitions are instant (duration 0).
 */
export function useAccessibleMotion(): boolean {
  try {
    return useReducedMotion() ?? false;
  } catch {
    // SSR / non-React context fallback
    return false;
  }
}

export function safeTransition(transition: Transition, reduce: boolean): Transition {
  if (reduce) return { duration: 0 };
  return transition;
}

export function safeVariants(variants: Variants, reduce: boolean): Variants {
  if (!reduce) return variants;
  // Collapse all transitions to 0
  const collapsed: Variants = {};
  for (const [key, def] of Object.entries(variants)) {
    if (typeof def === "object" && def !== null) {
      collapsed[key] = { ...(def as Record<string, unknown>), transition: { duration: 0 } };
    } else {
      collapsed[key] = def;
    }
  }
  return collapsed;
}