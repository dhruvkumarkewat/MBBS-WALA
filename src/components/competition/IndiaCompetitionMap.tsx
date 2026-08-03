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
}

export default function IndiaCompetitionMap({ paths, states, selectedKey, onSelect, dark }: Props) {
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
          const score = data?.competition_score ?? 35;
          const key = canonicalStateKey(st.name);
          const active = selectedKey === key || hoverKey === key;
          const muted = selectedKey && selectedKey !== key;

          return (
            <motion.path
              key={st.key}
              d={st.d}
              fill={scoreColor(score, dark)}
              stroke={active ? scoreStroke(score) : dark ? 'rgba(255,255,255,0.12)' : 'rgba(11,61,74,0.18)'}
              strokeWidth={active ? 2.2 : 0.7}
              filter={active ? 'url(#cm-glow)' : undefined}
              className="cursor-pointer transition-[fill,stroke-width] duration-150"
              style={{
                opacity: muted ? 0.35 : 1,
                outline: 'none',
              }}
              tabIndex={0}
              role="button"
              aria-label={`${st.name}${data ? `, competition ${data.competition_score}` : ''}`}
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
        <p className="mb-1.5 uppercase tracking-wide opacity-70">Competition heat</p>
        <div className="flex items-center gap-2">
          <span>Low</span>
          <div
            className="flex-1 h-2 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #14b8a6, #f59e0b, #f43f5e)',
            }}
          />
          <span>Extreme</span>
        </div>
      </div>

      <AnimatePresence>
        {hoverState && (
          <MapTooltip state={hoverState} x={mouse.x} y={mouse.y} dark={dark} />
        )}
      </AnimatePresence>
    </div>
  );
}
