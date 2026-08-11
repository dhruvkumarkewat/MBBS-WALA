import { cn } from '../../lib/cn';

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export default function Switch({ checked, onChange, label, disabled, className }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('inline-flex items-center gap-3 disabled:opacity-50', className)}
    >
      <span
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors',
          checked ? 'bg-[var(--ds-brand)]' : 'bg-[var(--ds-bg-subtle)]'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-5'
          )}
        />
      </span>
      {label && <span className="text-sm font-semibold text-[var(--ds-text)]">{label}</span>}
    </button>
  );
}
