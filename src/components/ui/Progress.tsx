import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/cn';
import type { Tone } from '../../lib/cn';

const toneBg: Record<Tone, string> = {
  neutral: 'bg-[var(--ds-text-muted)]',
  brand: 'bg-[var(--ds-brand)]',
  success: 'bg-[var(--ds-success)]',
  warning: 'bg-[var(--ds-warning)]',
  danger: 'bg-[var(--ds-danger)]',
  info: 'bg-[var(--ds-info)]',
};

export default function Progress({
  value,
  max = 100,
  tone = 'brand',
  showLabel,
  className,
  size = 'md',
  animated = true,
}: {
  value: number;
  max?: number;
  tone?: Tone;
  showLabel?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}) {
  const reduce = useReducedMotion();
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const h = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3.5' : 'h-2.5';

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs font-semibold mb-1.5 text-[var(--ds-text-muted)]">
          <span>Progress</span>
          <motion.span
            key={Math.round(pct)}
            initial={animated && !reduce ? { opacity: 0, y: 4 } : false}
            animate={{ opacity: 1, y: 0 }}
          >
            {Math.round(pct)}%
          </motion.span>
        </div>
      )}
      <div
        className={cn('w-full rounded-full bg-[var(--ds-bg-subtle)] overflow-hidden', h)}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemax={max}
      >
        <motion.div
          className={cn('h-full rounded-full relative overflow-hidden', toneBg[tone])}
          initial={animated && !reduce ? { width: 0 } : false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          {animated && !reduce && (
            <motion.span
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
              }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}
