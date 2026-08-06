import { motion } from 'framer-motion';
import {
  Building2,
  GraduationCap,
  Target,
  TrendingUp,
  Landmark,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { StateCompetition } from '../../lib/competitionMap';
import { difficultyTone, formatNum, formatPct } from '../../lib/competitionMap';

interface Props {
  state: StateCompetition;
  x: number;
  y: number;
  dark?: boolean;
}

export default function MapTooltip({ state, x, y, dark }: Props) {
  // keep on screen
  const left = Math.min(typeof window !== 'undefined' ? window.innerWidth - 320 : x, Math.max(12, x + 16));
  const top = Math.min(typeof window !== 'undefined' ? window.innerHeight - 360 : y, Math.max(12, y + 16));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.16 }}
      className="fixed z-[80] w-[340px] pointer-events-none"
      style={{ left, top }}
      role="tooltip"
    >
      <div
        className={`rounded-2xl border backdrop-blur-2xl shadow-2xl overflow-hidden ${
          dark
            ? 'bg-[#0b1620]/95 border-white/10 text-white'
            : 'bg-white/95 border-primary-dark/10 text-primary-dark'
        }`}
      >
        <div className={`px-4 py-3 border-b ${dark ? 'border-white/8 bg-white/5' : 'border-primary-dark/5 bg-grey-bg-light/80'}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display font-bold text-base leading-tight">{state.state_name}</p>
              <p className={`text-[11px] font-semibold mt-0.5 ${dark ? 'text-white/50' : 'text-gray-500'}`}>
                Competition intelligence
              </p>
            </div>
            <span className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-full border ${difficultyTone(state.difficulty)}`}>
              {state.difficulty}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wide ${dark ? 'text-white/40' : 'text-gray-500'}`}>
                Competition score
              </p>
              <p className="text-3xl font-black tabular-nums tracking-tight">{state.competition_score}</p>
            </div>
            <div className="text-right">
              <p className={`text-[10px] font-bold uppercase ${dark ? 'text-white/40' : 'text-gray-500'}`}>Admit prob.</p>
              <p className="text-lg font-black text-primary tabular-nums">{formatPct(state.admission_probability)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Metric icon={Building2} label="Colleges" value={formatNum(state.total_colleges)} dark={dark} />
            <Metric icon={Landmark} label="Govt / Pvt" value={`${state.govt_colleges}/${state.private_colleges}`} dark={dark} />
            <Metric icon={GraduationCap} label="Total seats" value={formatNum(state.total_seats)} dark={dark} />
            <Metric icon={Target} label="AIQ seats" value={formatNum(state.aiq_seats)} dark={dark} />
            <Metric icon={Layers} label="SQ seats" value={formatNum(state.state_quota_seats)} dark={dark} />
            <Metric icon={TrendingUp} label="Avg close rank" value={formatNum(state.avg_closing_rank)} dark={dark} />
            {state.lowest_closing_rank != null && (
              <Metric icon={TrendingUp} label="Lowest CR" value={formatNum(state.lowest_closing_rank)} dark={dark} />
            )}
            {state.highest_closing_rank != null && (
              <Metric icon={TrendingUp} label="Highest CR" value={formatNum(state.highest_closing_rank)} dark={dark} />
            )}
            {state.matching_colleges != null && state.matching_colleges > 0 && (
              <Metric icon={Target} label="Matching Clgs" value={String(state.matching_colleges)} dark={dark} />
            )}
          </div>

          {(state.most_competitive_college || state.safest_college) && (
            <div className={`rounded-xl px-3 py-2 text-[10px] space-y-1 ${dark ? 'bg-white/5 border border-white/10' : 'bg-grey-bg-light/70 border border-primary-dark/5'}`}>
              {state.best_college && (
                <div className="flex justify-between gap-2">
                  <span className="font-bold opacity-60">Top Eligible</span>
                  <span className="font-bold truncate max-w-[160px] text-right">{state.best_college}</span>
                </div>
              )}
              {state.most_competitive_college && (
                <div className="flex justify-between gap-2">
                  <span className="font-bold opacity-60">Most Competitive</span>
                  <span className="font-bold truncate max-w-[160px] text-right">{state.most_competitive_college}</span>
                </div>
              )}
              {state.safest_college && (
                <div className="flex justify-between gap-2">
                  <span className="font-bold opacity-60">Safest College</span>
                  <span className="font-bold truncate max-w-[160px] text-right">{state.safest_college}</span>
                </div>
              )}
            </div>
          )}

          <div className={`rounded-xl px-3 py-2 text-[11px] font-medium leading-relaxed flex gap-2 ${dark ? 'bg-teal-500/10 text-teal-100' : 'bg-teal-50 text-teal-900'}`}>
            <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="line-clamp-3">{state.insight}</span>
          </div>

          <p className={`text-[10px] font-semibold ${dark ? 'text-white/35' : 'text-gray-500'}`}>
            Click state for full analytics →
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  dark,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div className={`rounded-xl px-2.5 py-2 border ${dark ? 'border-white/8 bg-white/5' : 'border-primary-dark/5 bg-grey-bg-light/70'}`}>
      <div className="flex items-center gap-1 mb-0.5 opacity-60">
        <Icon className="w-3 h-3" />
        <span className="text-[9px] font-bold uppercase">{label}</span>
      </div>
      <p className="font-black tabular-nums">{value}</p>
    </div>
  );
}
