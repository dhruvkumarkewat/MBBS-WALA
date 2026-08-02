import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import Card from './Card';
import Avatar from './Avatar';
import Badge from './Badge';
import Button from './Button';

export default function ProfileCard({
  name,
  role,
  avatarUrl,
  bio,
  badges = [],
  stats,
  actions,
  className,
}: {
  name: string;
  role?: string;
  avatarUrl?: string;
  bio?: string;
  badges?: string[];
  stats?: { label: string; value: string }[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-start gap-4">
        <Avatar src={avatarUrl} name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="ds-title text-lg truncate">{name}</h3>
          {role && <p className="text-sm font-medium text-[var(--ds-text-muted)]">{role}</p>}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {badges.map((b) => (
                <Badge key={b} tone="neutral">{b}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      {bio && <p className="ds-body text-sm mt-4">{bio}</p>}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-[var(--ds-border)]">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-black text-[var(--ds-text)]">{s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ds-text-muted)]">{s.label}</p>
            </div>
          ))}
        </div>
      )}
      {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
      {!actions && (
        <div className="mt-5">
          <Button variant="soft" size="sm" className="w-full">View profile</Button>
        </div>
      )}
    </Card>
  );
}
