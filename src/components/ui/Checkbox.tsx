import type { InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export default function Checkbox({ label, description, className, id, checked, ...rest }: Props) {
  const inputId = id || rest.name;
  return (
    <label htmlFor={inputId} className={cn('flex items-start gap-3 cursor-pointer select-none', className)}>
      <span className="relative mt-0.5 shrink-0 w-5 h-5">
        <input id={inputId} type="checkbox" className="peer sr-only" checked={checked} {...rest} />
        <span
          className={cn(
            'absolute inset-0 grid place-items-center rounded-md border border-[var(--ds-border-strong)] bg-[var(--ds-bg-elevated)] transition-colors',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ds-border-focus)]',
            'peer-checked:bg-[var(--ds-brand)] peer-checked:border-[var(--ds-brand)]'
          )}
        />
        <Check
          className={cn(
            'absolute inset-0 m-auto w-3.5 h-3.5 text-white pointer-events-none transition-opacity',
            checked ? 'opacity-100' : 'opacity-0 peer-checked:opacity-100'
          )}
          strokeWidth={3}
        />
      </span>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-semibold text-[var(--ds-text)]">{label}</span>}
          {description && (
            <span className="block text-xs text-[var(--ds-text-muted)] mt-0.5">{description}</span>
          )}
        </span>
      )}
    </label>
  );
}
