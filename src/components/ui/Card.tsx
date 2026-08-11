import type { HTMLAttributes, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { springSoft } from '../../lib/motion';

interface Props extends HTMLAttributes<HTMLDivElement> {
  premium?: boolean;
  glow?: boolean;
  staticHover?: boolean;
  children: ReactNode;
  /** Disable motion hover lift */
  noMotion?: boolean;
}

export default function Card({
  premium,
  glow,
  staticHover,
  noMotion,
  className = '',
  children,
  onMouseMove,
  ...rest
}: Props) {
  const reduce = useReducedMotion();
  const cls = `ds-card ${premium ? 'ds-card-premium' : ''} ${glow ? 'ds-card-glow' : ''} ${staticHover ? 'ds-card-static' : ''} ${className}`;

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (glow) {
      const r = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
      e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
    }
    onMouseMove?.(e);
  };

  if (noMotion || staticHover || reduce) {
    return (
      <div className={cls} onMouseMove={handleMove} {...rest}>
        <div className="relative z-[1]">{children}</div>
      </div>
    );
  }

  // Strip conflicting HTML drag handlers for motion.div
  const { onDrag, onDragStart, onDragEnd, ...safe } = rest as HTMLAttributes<HTMLDivElement> & {
    onDrag?: unknown;
    onDragStart?: unknown;
    onDragEnd?: unknown;
  };
  void onDrag;
  void onDragStart;
  void onDragEnd;

  return (
    <motion.div
      className={cls}
      onMouseMove={handleMove}
      whileHover={{ y: -4, transition: springSoft }}
      whileTap={{ scale: 0.995 }}
      {...(safe as object)}
    >
      <div className="relative z-[1]">{children}</div>
    </motion.div>
  );
}
