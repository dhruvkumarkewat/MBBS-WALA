import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import Button from './Button';

function pageList(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, '…', total];
  if (current >= total - 2) return [1, '…', total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

export default function Pagination({
  page,
  pageCount,
  onChange,
  className,
  compact,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  className?: string;
  compact?: boolean;
}) {
  if (pageCount <= 1) return null;
  const pages = pageList(page, pageCount);

  return (
    <nav className={cn('flex items-center gap-1', className)} aria-label="Pagination">
      <Button
        variant="outline"
        size={compact ? 'sm' : 'icon'}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
        {!compact && <span className="hidden sm:inline">Prev</span>}
      </Button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e-${i}`} className="px-2 text-[var(--ds-text-muted)] text-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'min-w-9 h-9 px-2 rounded-lg text-sm font-bold transition-colors',
              p === page
                ? 'bg-[var(--ds-brand)] text-white shadow-[var(--ds-shadow-sm)]'
                : 'text-[var(--ds-text-muted)] hover:bg-[var(--ds-bg-muted)] hover:text-[var(--ds-text)]'
            )}
          >
            {p}
          </button>
        )
      )}
      <Button
        variant="outline"
        size={compact ? 'sm' : 'icon'}
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        {!compact && <span className="hidden sm:inline">Next</span>}
        <ChevronRight className="w-4 h-4" />
      </Button>
    </nav>
  );
}
