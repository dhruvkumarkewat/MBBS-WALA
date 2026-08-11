import { MapPin, Building2, Bookmark } from 'lucide-react';
import { cn } from '../../lib/cn';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';

export interface CollegeCardData {
  id: string | number;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  collegeType?: string;
  course?: string;
  fees?: string;
  seats?: number | string;
  imageUrl?: string;
  saved?: boolean;
}

export default function CollegeCard({
  college,
  onSave,
  onOpen,
  className,
}: {
  college: CollegeCardData;
  onSave?: (id: string | number) => void;
  onOpen?: (id: string | number) => void;
  className?: string;
}) {
  const loc = [college.city, college.state].filter(Boolean).join(', ');
  return (
    <Card className={cn('overflow-hidden flex flex-col', className)}>
      {college.imageUrl ? (
        <div className="h-36 overflow-hidden">
          <img src={college.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-28 bg-gradient-to-br from-[var(--ds-brand-soft)] to-[var(--ds-bg-muted)] grid place-items-center">
          <Building2 className="w-10 h-10 text-[var(--ds-brand)] opacity-60" />
        </div>
      )}
      <div className="p-5 flex flex-col flex-1 gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-extrabold text-[var(--ds-text)] leading-snug line-clamp-2">{college.name}</h3>
          {college.collegeType && (
            <Badge tone={college.collegeType === 'Government' ? 'success' : 'warning'}>
              {college.collegeType}
            </Badge>
          )}
        </div>
        {loc && (
          <p className="text-sm font-medium text-[var(--ds-text-muted)] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" /> {loc}
            {college.country ? ` · ${college.country}` : ''}
          </p>
        )}
        <div className="flex flex-wrap gap-2 text-xs font-bold text-[var(--ds-text-secondary)]">
          {college.course && <span className="px-2 py-1 rounded-md bg-[var(--ds-bg-muted)]">{college.course}</span>}
          {college.seats != null && <span className="px-2 py-1 rounded-md bg-[var(--ds-bg-muted)]">{college.seats} seats</span>}
          {college.fees && <span className="px-2 py-1 rounded-md bg-[var(--ds-bg-muted)]">{college.fees}</span>}
        </div>
        <div className="mt-auto pt-2 flex gap-2">
          <Button variant="brand" size="sm" className="flex-1" onClick={() => onOpen?.(college.id)}>
            Details
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={college.saved ? 'Unsave' : 'Save'}
            onClick={() => onSave?.(college.id)}
          >
            <Bookmark className={cn('w-4 h-4', college.saved && 'fill-[var(--ds-brand)] text-[var(--ds-brand)]')} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
