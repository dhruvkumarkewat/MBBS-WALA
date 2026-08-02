import type { ReactNode } from 'react';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export default function Badge({
  tone = 'neutral',
  dot,
  children,
  className = '',
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`ds-badge ds-badge-${tone} ${className}`}>
      {dot && <span className="ds-dot" />}
      {children}
    </span>
  );
}
