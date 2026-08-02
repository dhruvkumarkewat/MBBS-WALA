import type { ReactNode } from 'react';
import { Filter, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import Badge from './Badge';
import Button from './Button';
import SearchInput from './SearchInput';

export interface FilterChip {
  id: string;
  label: string;
}

export default function FilterBar({
  query,
  onQueryChange,
  chips = [],
  onRemoveChip,
  onClearAll,
  children,
  className,
  searchPlaceholder = 'Filter results…',
}: {
  query?: string;
  onQueryChange?: (q: string) => void;
  chips?: FilterChip[];
  onRemoveChip?: (id: string) => void;
  onClearAll?: () => void;
  children?: ReactNode;
  className?: string;
  searchPlaceholder?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {onQueryChange != null && query != null && (
          <SearchInput
            value={query}
            onChange={onQueryChange}
            placeholder={searchPlaceholder}
            containerClassName="flex-1"
          />
        )}
        {children && <div className="flex flex-wrap gap-2 items-center">{children}</div>}
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[var(--ds-text-muted)]">
            <Filter className="w-3.5 h-3.5" /> Active
          </span>
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onRemoveChip?.(c.id)}
              className="inline-flex"
            >
              <Badge tone="brand" className="gap-1 pr-1.5">
                {c.label}
                <X className="w-3 h-3" />
              </Badge>
            </button>
          ))}
          {onClearAll && (
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
