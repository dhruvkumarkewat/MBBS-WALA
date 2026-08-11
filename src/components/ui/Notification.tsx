import { Bell, CheckCheck, Info, AlertTriangle, X } from 'lucide-react';
import { cn, type Tone } from '../../lib/cn';
import Badge from './Badge';
import Button from './Button';
import EmptyState from './EmptyState';

export interface NotificationItemData {
  id: string;
  title: string;
  body?: string;
  time?: string;
  read?: boolean;
  tone?: Tone;
}

const toneIcon = {
  neutral: Bell,
  brand: Bell,
  success: CheckCheck,
  warning: AlertTriangle,
  danger: AlertTriangle,
  info: Info,
} as const;

export function NotificationItem({
  item,
  onRead,
  onDismiss,
  className,
}: {
  item: NotificationItemData;
  onRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  className?: string;
}) {
  const Icon = toneIcon[item.tone || 'neutral'];
  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-xl border transition-colors',
        item.read
          ? 'border-transparent bg-transparent'
          : 'border-[var(--ds-border)] bg-[var(--ds-bg-muted)]/60',
        className
      )}
    >
      <span className="w-9 h-9 rounded-lg bg-[var(--ds-bg-elevated)] border border-[var(--ds-border)] grid place-items-center shrink-0">
        <Icon className="w-4 h-4 text-[var(--ds-brand)]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm font-bold text-[var(--ds-text)]', !item.read && 'text-[var(--ds-text)]')}>
            {item.title}
          </p>
          {!item.read && <span className="ds-dot mt-1.5" />}
        </div>
        {item.body && <p className="text-xs text-[var(--ds-text-muted)] mt-0.5 leading-relaxed">{item.body}</p>}
        <div className="flex items-center gap-2 mt-2">
          {item.time && <span className="text-[10px] font-semibold text-[var(--ds-text-faint)]">{item.time}</span>}
          {!item.read && onRead && (
            <button type="button" className="text-[10px] font-bold text-[var(--ds-brand)]" onClick={() => onRead(item.id)}>
              Mark read
            </button>
          )}
        </div>
      </div>
      {onDismiss && (
        <button type="button" aria-label="Dismiss" onClick={() => onDismiss(item.id)} className="text-[var(--ds-text-faint)] hover:text-[var(--ds-text)]">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function NotificationList({
  items,
  onRead,
  onDismiss,
  onMarkAll,
  className,
  title = 'Notifications',
}: {
  items: NotificationItemData[];
  onRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onMarkAll?: () => void;
  className?: string;
  title?: string;
}) {
  const unread = items.filter((i) => !i.read).length;
  return (
    <div className={cn('rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--ds-border)]">
        <div className="flex items-center gap-2">
          <h3 className="ds-title text-base">{title}</h3>
          {unread > 0 && <Badge tone="brand">{unread} new</Badge>}
        </div>
        {onMarkAll && unread > 0 && (
          <Button variant="ghost" size="sm" onClick={onMarkAll}>
            Mark all read
          </Button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto ds-scroll p-2 space-y-1">
        {items.length === 0 ? (
          <EmptyState title="You're all caught up" description="No notifications right now." />
        ) : (
          items.map((item) => (
            <NotificationItem key={item.id} item={item} onRead={onRead} onDismiss={onDismiss} />
          ))
        )}
      </div>
    </div>
  );
}
