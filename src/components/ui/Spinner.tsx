import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export default function Spinner({
  className,
  label = 'Loading',
  size = 20,
}: {
  className?: string;
  label?: string;
  size?: number;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-[var(--ds-text-muted)]', className)} role="status">
      <Loader2 className="animate-spin" style={{ width: size, height: size }} />
      {label && <span className="text-sm font-medium sr-only sm:not-sr-only">{label}</span>}
    </span>
  );
}
