import { cn } from '../../lib/cn';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

function initials(name?: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export default function Avatar({ src, alt, name, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        className={cn(
          'rounded-full object-cover border border-[var(--ds-border)] shrink-0',
          sizes[size],
          className
        )}
      />
    );
  }
  return (
    <span
      className={cn(
        'rounded-full grid place-items-center font-bold shrink-0',
        'bg-[var(--ds-brand-soft)] text-[var(--ds-text-brand)] border border-[var(--ds-border)]',
        sizes[size],
        className
      )}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}
