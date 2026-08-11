import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import Button from './Button';

export default function HeroCard({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  media,
  className,
  variant = 'gradient',
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  primaryAction?: { label: string; onClick?: () => void; href?: string };
  secondaryAction?: { label: string; onClick?: () => void };
  media?: ReactNode;
  className?: string;
  variant?: 'gradient' | 'glass' | 'dark';
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-[var(--ds-border)] p-6 md:p-10',
        variant === 'gradient' && 'bg-[var(--ds-bg-elevated)]',
        variant === 'glass' && 'ds-glass',
        variant === 'dark' && 'bg-[var(--ds-bg-inverse)] text-[var(--ds-text-inverse)] border-transparent',
        className
      )}
    >
      {variant === 'gradient' && (
        <div className="absolute inset-0 opacity-50 pointer-events-none" style={{ backgroundImage: 'var(--ds-gradient-mesh)' }} />
      )}
      <div className={cn('relative z-[1] grid gap-8', media ? 'lg:grid-cols-2 items-center' : undefined)}>
        <div>
          {eyebrow && (
            <p className={cn('ds-eyebrow mb-3', variant === 'dark' && 'text-orange-300')}>
              {eyebrow}
            </p>
          )}
          <h2 className={cn('ds-display text-3xl md:text-4xl lg:text-5xl mb-3', variant === 'dark' && 'text-white')}>
            {title}
          </h2>
          {description && (
            <p className={cn('ds-body text-base md:text-lg mb-6 max-w-xl', variant === 'dark' && 'text-white/70')}>
              {description}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {primaryAction && (
              <Button variant="brand" shine onClick={primaryAction.onClick}>
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button variant={variant === 'dark' ? 'outline' : 'ghost'} onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        </div>
        {media && <div className="relative">{media}</div>}
      </div>
    </div>
  );
}
