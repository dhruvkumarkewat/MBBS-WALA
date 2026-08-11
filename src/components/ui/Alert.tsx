import { AlertCircle, AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const icons: Record<Tone, LucideIcon> = {
  neutral: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
  info: Info,
};

export default function Alert({
  tone = 'neutral',
  title,
  children,
  className = '',
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const Icon = icons[tone];
  const toneClass = tone === 'neutral' ? '' : `ds-alert-${tone}`;
  return (
    <div className={`ds-alert ${toneClass} ${className}`} role="status">
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        {title && <span className="ds-alert-title">{title}</span>}
        <div>{children}</div>
      </div>
    </div>
  );
}
