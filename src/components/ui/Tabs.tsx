import { cn } from '../../lib/cn';
import type { ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export default function Tabs({
  items,
  value,
  onChange,
  className,
  variant = 'pill',
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'pill' | 'underline';
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-1 overflow-x-auto ds-scroll',
        variant === 'pill' && 'p-1 rounded-xl bg-[var(--ds-bg-muted)] border border-[var(--ds-border)]',
        variant === 'underline' && 'border-b border-[var(--ds-border)]',
        className
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-all disabled:opacity-40',
              variant === 'pill' && active && 'bg-[var(--ds-bg-elevated)] text-[var(--ds-text)] shadow-[var(--ds-shadow-sm)] rounded-lg',
              variant === 'pill' && !active && 'text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]',
              variant === 'underline' && 'border-b-2 -mb-px rounded-none',
              variant === 'underline' && active && 'border-[var(--ds-brand)] text-[var(--ds-text)]',
              variant === 'underline' && !active && 'border-transparent text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]'
            )}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
