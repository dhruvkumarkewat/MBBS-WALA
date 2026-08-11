import type { ReactNode } from 'react';
import { Inbox, AlertCircle, CheckCircle2, type LucideIcon } from 'lucide-react';

type Kind = 'empty' | 'error' | 'success';

const defaults: Record<Kind, { icon: LucideIcon; title: string }> = {
  empty: { icon: Inbox, title: 'Nothing here yet' },
  error: { icon: AlertCircle, title: 'Something went wrong' },
  success: { icon: CheckCircle2, title: 'All set' },
};

export default function EmptyState({
  kind = 'empty',
  title,
  description,
  action,
  icon,
}: {
  kind?: Kind;
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  const conf = defaults[kind];
  const Icon = conf.icon;
  return (
    <div className="ds-state">
      <div className="ds-state-icon">{icon ?? <Icon className="w-5 h-5" />}</div>
      <p className="ds-state-title">{title ?? conf.title}</p>
      {description && <p className="ds-state-desc">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
