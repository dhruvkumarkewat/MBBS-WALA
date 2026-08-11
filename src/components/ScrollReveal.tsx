import { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  type MotionValue,
  type Variants,
} from 'framer-motion';

type RevealVariant = 'fade-up' | 'fade-left' | 'fade-right' | 'scale' | 'tilt' | 'blur';

/**
 * Lightweight, production-safe reveals.
 * No blur filters, no opacity stuck mid-scroll, small travel distances.
 */
const variantsMap: Record<RevealVariant, Variants> = {
  'fade-up': {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0 },
  },
  'fade-left': {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 },
  },
  'fade-right': {
    hidden: { opacity: 0, x: 20 },
    show: { opacity: 1, x: 0 },
  },
  scale: {
    hidden: { opacity: 0, y: 18, scale: 0.985 },
    show: { opacity: 1, y: 0, scale: 1 },
  },
  tilt: {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0 },
  },
  blur: {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  },
};

export function ScrollReveal({
  children,
  className = '',
  variant = 'fade-up',
  delay = 0,
  once = true,
  amount = 0.18,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: RevealVariant;
  delay?: number;
  once?: boolean;
  amount?: number;
}) {
  const base = variantsMap[variant];
  const variants: Variants = {
    hidden: base.hidden,
    show: {
      ...(base.show as object),
      transition: {
        duration: 0.65,
        delay,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount, margin: '0px 0px -6% 0px' }}
      variants={variants}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
}

/** Soft parallax only — never fades content out (avoids “half invisible” glitch) */
export function ScrollChapter({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 100, damping: 28, mass: 0.35 });
  const y = useTransform(smooth, [0, 0.5, 1], [28, 0, -18]);

  return (
    <motion.div ref={ref} id={id} className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}

export function ParallaxLayer({
  children,
  speed = 28,
  className = '',
}: {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

export function useParallax(
  progress: MotionValue<number>,
  from: number,
  to: number
) {
  return useTransform(progress, [0, 1], [from, to]);
}

export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 36,
    mass: 0.2,
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[200] h-[3px] origin-left pointer-events-none"
      style={{
        scaleX,
        background: 'linear-gradient(90deg, #F97316 0%, #FB923C 45%, #FDBA74 100%)',
        boxShadow: '0 0 14px rgba(249,115,22,0.45)',
      }}
      aria-hidden
    />
  );
}

export function StaggerReveal({
  children,
  className = '',
  stagger = 0.07,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger } },
      }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};
