import type { ReactNode } from 'react';
import { cn, type Tone } from '../../lib/cn';
import Badge from './Badge';

export interface TimelineItemData {
  id: string;
  title: string;
  description?: string;
  time?: string;
  tone?: Tone;
  meta?: ReactNode;
}

const dotTone: Record<Tone, string> = {
  neutral: 'bg-[var(--ds-text-muted)]',
  brand: 'bg-[var(--ds-brand)]',
  success: 'bg-[var(--ds-success)]',
  warning: 'bg-[var(--ds-warning)]',
  danger: 'bg-[var(--ds-danger)]',
  info: 'bg-[var(--ds-info)]',
};

export function TimelineItem({
  item,
  isLast,
}: {
  item: TimelineItemData;
  isLast?: boolean;
}) {
  const tone = item.tone || 'brand';
  return (
    <li className="relative flex gap-4 pb-8 last:pb-0">
      {!isLast && (
        <span className="absolute left-[9px] top-5 bottom-0 w-px bg-[var(--ds-border)]" aria-hidden />
      )}
      <span className={cn('relative z-[1] mt-1 w-[18px] h-[18px] rounded-full ring-4 ring-[var(--ds-bg-elevated)] shrink-0', dotTone[tone])} />
      <div className="min-w-0 flex-1 -mt-0.5">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h4 className="font-bold text-[var(--ds-text)] text-sm">{item.title}</h4>
          {item.time && <Badge tone="neutral">{item.time}</Badge>}
        </div>
        {item.description && (
          <p className="text-sm text-[var(--ds-text-muted)] leading-relaxed">{item.description}</p>
        )}
        {item.meta && <div className="mt-2">{item.meta}</div>}
      </div>
    </li>
  );
}

export default function Timeline({
  items,
  className,
}: {
  items: TimelineItemData[];
  className?: string;
}) {
  return (
    <ol className={cn('relative', className)}>
      {items.map((item, i) => (
        <TimelineItem key={item.id} item={item} isLast={i === items.length - 1} />
      ))}
    </ol>
  );
}
