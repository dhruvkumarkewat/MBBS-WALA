import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
}

export default function Dropdown({
  items,
  value,
  onChange,
  placeholder = 'Select…',
  label,
  className,
  align = 'left',
}: {
  items: DropdownItem[];
  value?: string;
  onChange: (id: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = items.find((i) => i.id === value);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      {label && <span className="ds-label mb-1.5 block">{label}</span>}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ds-btn ds-btn-outline w-full justify-between"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cn(!selected && 'text-[var(--ds-text-muted)]')}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul
          role="listbox"
          className={cn(
            'absolute z-50 mt-1.5 min-w-full w-max max-h-64 overflow-y-auto ds-scroll',
            'rounded-xl border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] shadow-[var(--ds-shadow-lg)] p-1',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={item.id === value}
                disabled={item.disabled}
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-left transition-colors',
                  'hover:bg-[var(--ds-bg-muted)] disabled:opacity-40',
                  item.danger && 'text-[var(--ds-danger)]',
                  item.id === value && 'bg-[var(--ds-brand-soft)] text-[var(--ds-text-brand)]'
                )}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.id === value && <Check className="w-4 h-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
