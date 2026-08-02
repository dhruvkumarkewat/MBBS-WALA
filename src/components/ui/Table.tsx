import type { ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/cn';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';
import { easeOut } from '../../lib/motion';

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  hideOnMobile?: boolean;
}

export default function Table<T extends { id?: string | number }>({
  columns,
  data,
  loading,
  emptyTitle = 'No rows found',
  emptyDescription,
  onRowClick,
  className,
  stickyHeader,
}: {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  stickyHeader?: boolean;
}) {
  const reduce = useReducedMotion();
  const align = (a?: string) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

  return (
    <div
      className={cn(
        'overflow-x-auto ds-scroll rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] shadow-sm',
        className
      )}
    >
      <table className="w-full text-sm min-w-[640px]">
        <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
          <tr className="bg-[var(--ds-bg-muted)] border-b border-[var(--ds-border)]">
            {columns.map((col) => (
              <th
                key={col.id}
                className={cn(
                  'px-4 py-3 font-bold text-[var(--ds-text-muted)] text-xs uppercase tracking-wide',
                  align(col.align),
                  col.hideOnMobile && 'hidden md:table-cell',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`sk-${i}`} className="border-b border-[var(--ds-border)]">
                {columns.map((col) => (
                  <td key={col.id} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="p-8">
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </td>
            </tr>
          )}
          <AnimatePresence initial={false}>
            {!loading &&
              data.map((row, i) => (
                <motion.tr
                  key={row.id ?? i}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ ...easeOut, delay: Math.min(i, 12) * 0.02 }}
                  onClick={() => onRowClick?.(row)}
                  whileHover={
                    onRowClick && !reduce
                      ? { backgroundColor: 'color-mix(in srgb, var(--ds-bg-muted) 80%, transparent)' }
                      : undefined
                  }
                  className={cn(
                    'border-b border-[var(--ds-border)] last:border-0',
                    onRowClick && 'cursor-pointer',
                    i % 2 === 1 && 'bg-[var(--ds-bg-muted)]/30'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        'px-4 py-3 text-[var(--ds-text)] font-medium',
                        align(col.align),
                        col.hideOnMobile && 'hidden md:table-cell',
                        col.className
                      )}
                    >
                      {col.cell(row, i)}
                    </td>
                  ))}
                </motion.tr>
              ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
