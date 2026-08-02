import { Target, Sparkles } from 'lucide-react';
import { cn } from '../../lib/cn';
import Card from './Card';
import Badge from './Badge';
import Progress from './Progress';
import Button from './Button';

export default function PredictionCard({
  title = 'Rank prediction',
  exam,
  score,
  rankMin,
  rankMax,
  confidence = 72,
  note,
  onRecalculate,
  className,
}: {
  title?: string;
  exam: string;
  score: number | string;
  rankMin: number;
  rankMax: number;
  confidence?: number;
  note?: string;
  onRecalculate?: () => void;
  className?: string;
}) {
  return (
    <Card premium className={cn('p-6', className)}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="ds-state-icon !w-10 !h-10">
            <Target className="w-4 h-4" />
          </span>
          <div>
            <p className="ds-label mb-0.5">{title}</p>
            <h3 className="ds-title text-lg">{exam}</h3>
          </div>
        </div>
        <Badge tone="brand" dot>
          <Sparkles className="w-3 h-3" /> AI estimate
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="rounded-xl bg-[var(--ds-bg-muted)] p-4">
          <p className="text-xs font-bold uppercase text-[var(--ds-text-muted)] mb-1">Score</p>
          <p className="text-2xl font-black text-[var(--ds-text)]">{score}</p>
        </div>
        <div className="rounded-xl bg-[var(--ds-brand-soft)] p-4">
          <p className="text-xs font-bold uppercase text-[var(--ds-text-brand)] mb-1">Rank range</p>
          <p className="text-lg font-black text-[var(--ds-text)]">
            {rankMin.toLocaleString()} – {rankMax.toLocaleString()}
          </p>
        </div>
      </div>

      <Progress value={confidence} tone="brand" showLabel size="md" className="mb-3" />
      {note && <p className="text-xs text-[var(--ds-text-muted)] font-medium mb-4">{note}</p>}
      {onRecalculate && (
        <Button variant="outline" size="sm" onClick={onRecalculate} className="w-full">
          Recalculate
        </Button>
      )}
    </Card>
  );
}
