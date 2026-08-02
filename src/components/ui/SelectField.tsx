import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

type Option = string | { value: string; label: string };

function normalize(options: Option[]): { value: string; label: string }[] {
  return options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
}

export default function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  className = '',
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const list = normalize(options);
  const selected = list.find((o) => o.value === value);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div ref={rootRef} className={`relative text-left min-w-0 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-[#5b6472] uppercase tracking-wide mb-1.5">
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border-2 px-3.5 py-2.5 text-left font-semibold transition-all bg-white text-[#0b1c24] ${
          open
            ? 'border-[#ff5a1f] ring-4 ring-[#ff5a1f]/15'
            : 'border-black/15 hover:border-black/30'
        }`}
      >
        <span className={`truncate ${selected ? '' : 'text-[#5b6472]'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-[#5b6472] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-[200] max-h-60 overflow-y-auto rounded-xl border border-black/10 bg-white py-1 shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
        >
          {list.length === 0 ? (
            <li className="px-3.5 py-2.5 text-sm text-[#5b6472]">No options</li>
          ) : (
            list.map((o) => {
              const active = o.value === value;
              return (
                <li key={o.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-[#fff4ef] text-[#ff5a1f]'
                        : 'text-[#0b1c24] hover:bg-[#f5f7fa]'
                    }`}
                  >
                    <span className="truncate">{o.label}</span>
                    {active && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
