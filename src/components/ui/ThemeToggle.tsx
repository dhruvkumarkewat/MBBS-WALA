import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isRound = className.includes('landing-round') || className.includes('w-11');

  return (
    <button
      type="button"
      className={`ds-theme-toggle ${isRound ? 'landing-round' : ''} ${className}`}
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      <span className="ds-theme-toggle-thumb">
        {theme === 'dark' ? (
          <Moon className="w-3.5 h-3.5" strokeWidth={2.25} />
        ) : (
          <Sun className="w-3.5 h-3.5" strokeWidth={2.25} />
        )}
      </span>
    </button>
  );
}
