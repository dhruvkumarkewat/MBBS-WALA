import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export default function Tooltip({
  content,
  children,
  side = 'top',
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}) {
  const pos =
    side === 'top'
      ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
      : side === 'bottom'
      ? 'top-full left-1/2 -translate-x-1/2 mt-2'
      : side === 'left'
      ? 'right-full top-1/2 -translate-y-1/2 mr-2'
      : 'left-full top-1/2 -translate-y-1/2 ml-2';

  return (
    <span className={cn('relative inline-flex group', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          'transition-opacity px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap',
          'bg-[var(--ds-bg-inverse)] text-[var(--ds-text-inverse)] shadow-[var(--ds-shadow-md)]',
          pos
        )}
      >
        {content}
      </span>
    </span>
  );
}
