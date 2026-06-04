/**
 * Shared Framer Motion animation variants for the warm UI system.
 *
 * Principles:
 * - duration 0.18–0.45s
 * - ease soft (cubic-bezier)
 * - tap scale 0.97
 * - respects prefers-reduced-motion
 */
import type { Variants, Transition } from "framer-motion";

export const softSpring: Transition = { type: "spring", stiffness: 300, damping: 24, mass: 0.8 };
export const softTween: Transition = { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] };
export const microSpring: Transition = { type: "spring", stiffness: 350, damping: 22, mass: 0.7 };

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};