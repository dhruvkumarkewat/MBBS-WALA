import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

/** Word-by-word reveal — no clipping / overlap */
export default function TextReveal({
  text,
  className = '',
  as: Tag = 'h2',
  delay = 0,
}: {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const words = text.split(' ');

  return (
    <Tag ref={ref as never} className={className}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-block mr-[0.28em] last:mr-0"
          style={{ lineHeight: 'inherit' }}
        >
          <motion.span
            className="inline-block"
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{
              duration: 0.45,
              delay: delay + i * 0.04,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
