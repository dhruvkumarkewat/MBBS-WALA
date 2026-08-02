import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { pageVariants, easeOut } from '../../lib/motion';

export default function PageTransition({
  children,
  className = '',
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div id={id} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      id={id}
      key={id}
      className={className}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={easeOut}
    >
      {children}
    </motion.div>
  );
}
