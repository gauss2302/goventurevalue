import { useReducedMotion, type Transition, type Variants } from "framer-motion";

const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const;

export const pageTransition: Transition = {
  duration: 0.46,
  ease: EASE_OUT_QUINT,
};

export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: pageTransition },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT_QUINT },
  },
};

export const scaleInItem: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.36, ease: EASE_OUT_QUINT },
  },
};

const instantVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { duration: 0 } },
};

/**
 * Returns motion variants that collapse to an instant, motionless transition
 * when the user prefers reduced motion. Use this for any orchestrated
 * page-enter or stagger animation so accessibility is respected everywhere.
 */
export function useReducedMotionSafe(variants: Variants): Variants {
  const shouldReduce = useReducedMotion();
  return shouldReduce ? instantVariants : variants;
}

/**
 * Convenience hook returning the standard page-enter + stagger pair already
 * gated for reduced motion.
 */
export function usePageMotion() {
  const shouldReduce = useReducedMotion();
  return {
    container: shouldReduce ? instantVariants : staggerContainer,
    item: shouldReduce ? instantVariants : fadeUpItem,
    page: shouldReduce ? instantVariants : pageVariants,
    shouldReduce,
  };
}
