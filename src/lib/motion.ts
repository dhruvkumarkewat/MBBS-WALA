import type { Transition, Variants } from 'framer-motion';

/** Shared spring — snappy but calm (no layout thrash) */
export const springSoft: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 34,
  mass: 0.75,
};

export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 460,
  damping: 36,
  mass: 0.65,
};

export const easeOut: Transition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
};

/** Page transitions — opacity only (blur filters = GPU lag / jank) */
export const pageVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.12, ease: 'easeIn' },
  },
};

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: easeOut },
  exit: { opacity: 0, y: 6, transition: { duration: 0.12 } },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: springSoft },
  exit: { opacity: 0, scale: 0.99, transition: { duration: 0.12 } },
};

export const slideFromLeft: Variants = {
  initial: { x: -16, opacity: 0 },
  animate: { x: 0, opacity: 1, transition: springSoft },
  exit: { x: -10, opacity: 0, transition: { duration: 0.14 } },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: easeOut },
};

export const listItem: Variants = {
  initial: { opacity: 0, x: -4 },
  animate: { opacity: 1, x: 0, transition: easeOut },
  exit: { opacity: 0, x: 4 },
};

export const toastVariants: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: springSnappy },
  exit: { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.14 } },
};

export const fabVariants: Variants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: springSnappy },
  exit: { scale: 0.9, opacity: 0, transition: { duration: 0.12 } },
  hover: { scale: 1.04 },
  tap: { scale: 0.96 },
};

export const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
