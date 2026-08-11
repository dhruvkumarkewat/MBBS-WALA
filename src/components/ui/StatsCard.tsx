import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn, type Tone } from '../../lib/cn';
import Card from './Card';
import Badge from './Badge';
import { Sparkline } from './Charts';

export default function StatsCard({
  label,
  value,
  delta,
  deltaTone = 'success',
  icon,
  sparkData,
  className,
  loading,
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: Tone;
  icon?: ReactNode;
  sparkData?: number[];
  className?: string;
  loading?: boolean;
}) {
  const up = delta?.trim().startsWith('+');
  const down = delta?.trim().startsWith('-');

  return (
    <Card glow className={cn('p-5', className)}>
      <div className="flex items-start justify-between mb-3">
        {icon ? (
          <span className="ds-state-icon !w-10 !h-10">{icon}</span>
        ) : (
          <span />
        )}
        {delta && (
          <Badge tone={deltaTone} dot>
            <span className="inline-flex items-center gap-0.5">
              {up && <TrendingUp className="w-3 h-3" />}
              {down && <TrendingDown className="w-3 h-3" />}
              {delta}
            </span>
          </Badge>
        )}
      </div>
      <p className="ds-muted text-sm mb-1">{label}</p>
      {loading ? (
        <div className="ds-skeleton h-9 w-24" />
      ) : (
        <p className="ds-title text-3xl tracking-tight">{value}</p>
      )}
      {sparkData && sparkData.length > 0 && <Sparkline data={sparkData} className="mt-4" />}
    </Card>
  );
}
