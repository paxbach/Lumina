import type { Transition, Variants } from 'framer-motion'

/* ═══════════════════════════════════════════════════════════════════
   Motion tokens
   ───────────────────────────────────────────────────────────────────
   Mirror of the CSS contract in src/index.css `@theme`:
     --spring-bouncy: 280 18 0.6  (stiffness damping mass)
     --spring-soft:   260 22 0.6
     --spring-firm:   380 28 0.8
   Keep this file and the CSS in sync.
   ═══════════════════════════════════════════════════════════════════ */

/** Playful overshoot — for popups, reveals, kid-friendly delight. */
export const springBouncy: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 18,
  mass: 0.6,
}

/** Default UI spring — gentle, no overshoot. */
export const springSoft: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 22,
  mass: 0.6,
}

/** Deliberate snap — drag-end locks, modal commits. */
export const springFirm: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 28,
  mass: 0.8,
}

/** Cozy ease curve with a tiny overshoot (matches --ease-cozy). */
export const easeCozy: [number, number, number, number] = [0.34, 1.56, 0.64, 1]

/* ─── Common interaction recipes ──────────────────────────────────── */

/** Quick tap feedback — for buttons & tiles. */
export const tapPop = {
  whileTap: { scale: 0.94 },
  whileHover: { scale: 1.03 },
  transition: springSoft,
}

/** Popup reveal — modal/card pops in with playful bounce. */
export const popReveal = {
  initial: { scale: 0.85, opacity: 0, y: 8 },
  animate: { scale: 1, opacity: 1, y: 0 },
  exit:    { scale: 0.92, opacity: 0 },
  transition: springBouncy,
}

/** Page transition — fade + gentle rise. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  enter:   { opacity: 1, y: 0, transition: { ...springSoft, mass: 0.4 } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.18 } },
}

/** Stagger children for lists / grids. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: springSoft },
}
