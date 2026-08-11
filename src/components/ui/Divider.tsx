import { cn } from '../../lib/cn';

export default function Divider({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  if (!label) return <hr className={cn('ds-divider', className)} />;
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="flex-1 h-px bg-[var(--ds-border)]" />
      <span className="text-xs font-bold uppercase tracking-wide text-[var(--ds-text-muted)]">{label}</span>
      <span className="flex-1 h-px bg-[var(--ds-border)]" />
    </div>
  );
}
