import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'brand' | 'ghost' | 'outline' | 'soft' | 'default';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  shine?: boolean;
}

const variantClass: Record<Variant, string> = {
  default: '',
  primary: 'ds-btn-primary',
  brand: 'ds-btn-brand',
  ghost: 'ds-btn-ghost',
  outline: 'ds-btn-outline',
  soft: 'ds-btn-soft',
};

const sizeClass: Record<Size, string> = {
  sm: 'ds-btn-sm',
  md: '',
  lg: 'ds-btn-lg',
  icon: 'ds-btn-icon',
};

export default function Button({
  variant = 'default',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  shine,
  className = '',
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={`ds-btn ${variantClass[variant]} ${sizeClass[size]} ${shine ? 'ds-shine' : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
