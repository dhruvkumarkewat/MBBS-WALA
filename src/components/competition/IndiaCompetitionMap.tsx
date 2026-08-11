import { useMemo, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { IndiaPathsFile, StateCompetition } from '../../lib/competitionMap';
import {
  canonicalStateKey,
  scoreColor,
  scoreStroke,
} from '../../lib/competitionMap';
import MapTooltip from './MapTooltip';

interface Props {
  paths: IndiaPathsFile;
  states: StateCompetition[];
  selectedKey?: string | null;
  onSelect: (state: StateCompetition | null) => void;
  dark?: boolean;
  isPremium?: boolean;
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}

export default function IndiaCompetitionMap({ paths, states, selectedKey, onSelect, dark, isPremium }: Props) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const byKey = useMemo(() => {
    const m = new Map<string, StateCompetition>();
    states.forEach((s) => {
      m.set(canonicalStateKey(s.state_name), s);
      m.set(canonicalStateKey(s.state_key), s);
    });
    return m;
  }, [states]);

  const resolve = useCallback(
    (mapName: string) => byKey.get(canonicalStateKey(mapName)) || null,
    [byKey]
  );

  const hoverState = hoverKey ? resolve(hoverKey) : null;

  return (
    <div className="relative w-full h-full min-h-[420px] flex items-center justify-center">
      {/* ambient glow */}
      <div
        className="absolute inset-8 rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{
          background: dark
            ? 'radial-gradient(circle, rgba(20,184,166,0.25), transparent 65%)'
            : 'radial-gradient(circle, rgba(15,118,110,0.15), transparent 65%)',
        }}
      />

      <svg
        viewBox={paths.viewBox}
        className="relative w-full h-auto max-h-[min(72vh,720px)] drop-shadow-xl"
        role="img"
        aria-label="Interactive India competition map"
      >
        <defs>
          <filter id="cm-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {paths.states.map((st) => {
          const data = resolve(st.name);
          const prob = data?.admission_probability ?? null;
          const key = canonicalStateKey(st.name);
          const active = selectedKey === key || hoverKey === key;
          const muted = selectedKey && selectedKey !== key;

          return (
            <motion.path
              key={st.key}
              d={st.d}
              fill={scoreColor(prob, dark)}
              stroke={active ? scoreStroke(prob) : dark ? 'rgba(255,255,255,0.12)' : 'rgba(11,61,74,0.18)'}
              strokeWidth={active ? 2.2 : 0.7}
              filter={active ? 'url(#cm-glow)' : undefined}
              className="cursor-pointer transition-[fill,stroke-width] duration-150"
              style={{
                opacity: muted ? 0.35 : 1,
                outline: 'none',
              }}
              tabIndex={0}
              role="button"
              aria-label={`${st.name}${data ? `, admit probability ${Math.round(data.admission_probability * 100)}%` : ''}`}
              onMouseEnter={(e) => {
                setHoverKey(st.name);
                setMouse({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => setMouse({ x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHoverKey(null)}
              onFocus={() => setHoverKey(st.name)}
              onBlur={() => setHoverKey(null)}
              onClick={() => onSelect(data)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(data);
                }
              }}
              whileHover={{ scale: 1.008 }}
            />
          );
        })}
      </svg>

      {/* legend */}
      <div
        className={`absolute bottom-2 left-2 right-2 sm:right-auto sm:min-w-[200px] rounded-xl border px-3 py-2 backdrop-blur-md text-[10px] font-bold ${
          dark ? 'bg-black/40 border-white/10 text-white/70' : 'bg-white/80 border-primary-dark/10 text-gray-500'
        }`}
      >
        <p className="mb-1.5 uppercase tracking-wide opacity-70">Admission Probability</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1">
          <LegendItem color={dark ? '#064e3b' : '#065f46'} label="Excellent Chance" />
          <LegendItem color={dark ? '#14532d' : '#16a34a'} label="Very Good" />
          <LegendItem color={dark ? '#166534' : '#4ade80'} label="Good" />
          <LegendItem color={dark ? '#854d0e' : '#facc15'} label="Borderline" />
          <LegendItem color={dark ? '#9a3412' : '#f97316'} label="Low Chance" />
          <LegendItem color={dark ? '#7f1d1d' : '#ef4444'} label="Very Low" />
          <LegendItem color={dark ? '#450a0a' : '#991b1b'} label="Impossible" />
          <LegendItem color={dark ? '#374151' : '#9ca3af'} label="No Data" />
        </div>
      </div>

      <AnimatePresence>
        {hoverState && (
          <MapTooltip state={hoverState} x={mouse.x} y={mouse.y} dark={dark} isPremium={isPremium} />
        )}
      </AnimatePresence>
    </div>
  );
}
