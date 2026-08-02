import type { Transition, Variants } from 'motion/react';

/**
 * Shared motion language for SAT Zone.
 *
 * One easing curve and a small set of durations keep every animation feeling
 * like it belongs to the same premium product. Durations sit in the
 * 150–400ms band the brand guide asks for.
 */
export const EASE_BRAND = [0.22, 1, 0.36, 1] as const;
export const EASE_EMPHASIS = [0.16, 1, 0.3, 1] as const;

export const DURATION = {
  fast: 0.16,
  base: 0.28,
  slow: 0.4,
} as const;

export const transitions = {
  base: { duration: DURATION.base, ease: EASE_BRAND } satisfies Transition,
  fast: { duration: DURATION.fast, ease: EASE_BRAND } satisfies Transition,
  spring: { type: 'spring', stiffness: 380, damping: 30 } satisfies Transition,
  gentleSpring: { type: 'spring', stiffness: 220, damping: 26 } satisfies Transition,
};

/** Fade + rise — the default reveal for cards, headings, hero blocks. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: transitions.base },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.base },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: transitions.base },
};

/** Container that reveals children one after another. */
export function staggerContainer(stagger = 0.08, delayChildren = 0.05): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}

/** Page-level transition — subtle so navigation feels quick, not showy. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_BRAND } },
  exit: { opacity: 0, y: -6, transition: { duration: DURATION.fast, ease: EASE_BRAND } },
};
