import { Search, X, Loader2 } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/cn';
import { springSoft } from '../../lib/motion';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  onClear?: () => void;
  containerClassName?: string;
}

export default function SearchInput({
  value,
  onChange,
  loading,
  onClear,
  placeholder = 'Search…',
  className,
  containerClassName,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <motion.div
      className={cn('ds-input-wrap relative', containerClassName)}
      animate={{
        boxShadow: focused
          ? '0 0 0 3px color-mix(in srgb, var(--ds-brand) 22%, transparent)'
          : '0 0 0 0px transparent',
      }}
      transition={springSoft}
    >
      <motion.span
        className="ds-input-icon"
        animate={{ scale: focused || value ? 1.05 : 1, color: focused ? 'var(--ds-brand)' : undefined }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
      </motion.span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className={cn('ds-input !pl-10 pr-10', className)}
        {...rest}
      />
      <AnimatePresence>
        {value && (
          <motion.button
            type="button"
            aria-label="Clear search"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            onClick={() => {
              onChange('');
              onClear?.();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
