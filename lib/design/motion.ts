/**
 * Shared motion tokens for framer-motion animations.
 * All values follow: duration 150–260ms, subtle translateY 4-8px,
 * scale 0.98-1.02, easing ease-out or cubic-bezier(0.22, 1, 0.36, 1).
 * 
 * All components use motion-safe conditional rendering.
 * Reduced-motion users get instant transitions (duration: 0).
 */

import type { Variants, Transition } from "framer-motion";

// ---------- Easing ----------
export const EASE_OUT = "ease-out" as const;
export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};
export const SPRING_GENTLE: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 25,
  mass: 0.6,
};
export const DURATION_FAST = 0.15;
export const DURATION_NORMAL = 0.22;
export const DURATION_SLOW = 0.26;

// ---------- Shared CSS transition string ----------
export const TRANS_PRESS = "transition-transform duration-150 ease-out" as const;
export const TRANS_FADE = "transition-opacity duration-200 ease-out" as const;
export const TRANS_ALL_SOFT = "transition-all duration-220 ease-out" as const;

// ---------- Reduced-motion-safe class helpers ----------
/**
 * Add this to any animated element.
 * It automatically disables transitions/animations when user prefers reduced motion.
 */
export const MOTION_SAFE_CLASS = "motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out" as const;
export const MOTION_REDUCE_CLASS = "motion-reduce:transition-none motion-reduce:animate-none" as const;
// Combined class for elements with CSS transitions
export const SAFE_TRANSITION_CLASS = "transition-all duration-200 ease-out motion-reduce:transition-none" as const;

// ---------- Framer Motion Variants ----------

/** Card entrance: fade in + slide up 8px */
export const cardEnter: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION_SLOW, ease: [0.22, 1, 0.36, 1] },
  },
};

/** List item stagger entrance */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION_NORMAL, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Button tap/press feedback */
export const buttonTap: Variants = {
  tap: { scale: 0.97, transition: { duration: DURATION_FAST } },
  hover: { scale: 1.02, transition: { duration: DURATION_FAST } },
};

/** Smooth expand/collapse for sections */
export const expandCollapse: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    overflow: "hidden",
    transition: { duration: DURATION_NORMAL, ease: [0.22, 1, 0.36, 1] },
  },
  expanded: {
    height: "auto",
    opacity: 1,
    overflow: "hidden",
    transition: { duration: DURATION_NORMAL, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Page route transition */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION_NORMAL, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: DURATION_FAST, ease: [0.42, 0, 1, 1] },
  },
};

/** Subtle floating animation for MissYou hearts */
export const floatUp: Variants = {
  initial: { opacity: 1, y: 0, scale: 1 },
  animate: {
    opacity: 0,
    y: -60,
    scale: 1.2,
    transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Image fade-in on load */
export const imageFadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION_SLOW, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Badge fade-in */
export const badgeEnter: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION_FAST, ease: [0.22, 1, 0.36, 1] },
  },
};

/** BottomNav active indicator pulse */
export const statusPulse: Variants = {
  animate: {
    scale: [1, 1.3, 1],
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: [0.42, 0, 0.58, 1],
    },
  },
};