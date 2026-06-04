/**
 * Shared Framer Motion animation variants for the warm UI system.
 *
 * Principles:
 * - duration 0.18–0.45s
 * - ease soft (cubic-bezier)
 * - tap scale 0.97
 * - respects prefers-reduced-motion
 */

export const softSpring = { type: "spring" as const, stiffness: 300, damping: 24, mass: 0.8 };
export const softTween = { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] };
export const microSpring = { type: "spring" as const, stiffness: 350, damping: 22, mass: 0.7 };

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

export const slideUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

export const softTap = {
  whileTap: { scale: 0.97 },
  transition: { type: "spring" as const, stiffness: 400, damping: 17 },
};

export const sheetMotion = {
  initial: { opacity: 0, y: "8%" },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
  exit: { opacity: 0, y: "8%", transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] } },
};

export const listItemMotion = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
  transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
};