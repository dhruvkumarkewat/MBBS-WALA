import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  X,
  Building2,
  GraduationCap,
  Target,
  Sparkles,
  TrendingUp,
  Layers,
  Lightbulb,
  MapPin,
} from 'lucide-react';
import type { StateCompetition } from '../../lib/competitionMap';
import {
  difficultyTone,
  formatNum,
  formatPct,
} from '../../lib/competitionMap';
import { BarChart, DonutChart, Sparkline } from '../ui/Charts';
import { usePremium, UpgradePrompt } from '../../lib/premium';

interface Props {
  state: StateCompetition;
  onClose: () => void;
  dark?: boolean;
}

export default function StateDetailPanel({ state, onClose, dark }: Props) {
  const { isPremium } = usePremium();
  const split = state.seat_split || {};
  const splitLabels = Object.keys(split);
  const splitValues = splitLabels.map((k) => Number(split[k]) || 0);
  const trend = (state.cutoff_trend || []).map(Number);

  const demandSupply = [
    Number(state.demand_index) || state.competition_score,
    Number(state.supply_index) || Math.max(5, 100 - state.competition_score),
  ];

  return (
    <motion.aside
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 28, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className={`h-full flex flex-col border-l backdrop-blur-2xl ${
        dark
          ? 'bg-[#0a1219]/95 border-white/10 text-white'
          : 'bg-white/95 border-gray-200 text-gray-900'
      }`}
      aria-label={`${state.state_name} analytics panel`}
    >
      <div className={`sticky top-0 z-10 px-5 py-4 border-b flex items-start gap-3 ${dark ? 'border-white/8 bg-[#0a1219]/90' : 'border-primary-dark/8 bg-white/90'}`}>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${dark ? 'text-teal-300/80' : 'text-primary'}`}>
            State intelligence
          </p>
          <h3 className="font-display text-xl font-bold truncate">{state.state_name}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${difficultyTone(state.difficulty)}`}>
              {state.difficulty}
            </span>
            <span className={`text-xs font-bold tabular-nums ${dark ? 'text-white/60' : 'text-gray-500'}`}>
              Score {state.competition_score} · {formatPct(state.admission_probability)} admit odds
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`p-2 rounded-xl border ${dark ? 'border-white/10 hover:bg-white/10' : 'border-primary-dark/10 hover:bg-grey-bg-light'}`}
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto zn-scroll p-5 space-y-5">
        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <Kpi dark={dark} icon={Building2} label="Colleges" value={formatNum(state.total_colleges)} sub={`${state.govt_colleges}G · ${state.private_colleges}P`} />
          <Kpi dark={dark} icon={GraduationCap} label="Total seats" value={formatNum(state.total_seats)} />
          <Kpi dark={dark} icon={Target} label="AIQ seats" value={formatNum(state.aiq_seats)} />
          <Kpi dark={dark} icon={Layers} label="SQ seats" value={formatNum(state.state_quota_seats)} />
          <Kpi dark={dark} icon={TrendingUp} label="Avg close rank" value={formatNum(state.avg_closing_rank)} />
          {state.lowest_closing_rank != null && (
            <Kpi dark={dark} icon={Target} label="Lowest CR" value={formatNum(state.lowest_closing_rank)} />
          )}
          {state.highest_closing_rank != null && (
            <Kpi dark={dark} icon={Sparkles} label="Highest CR" value={formatNum(state.highest_closing_rank)} />
          )}
        </div>

        {/* AI insight */}
        <section className={`rounded-2xl p-4 border ${dark ? 'border-teal-500/20 bg-teal-500/10' : 'border-teal-200 bg-teal-50'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className={`w-4 h-4 ${dark ? 'text-teal-300' : 'text-teal-700'}`} />
            <h4 className="text-xs font-black uppercase tracking-wide">AI recommendation</h4>
          </div>
          <p className={`text-sm font-medium leading-relaxed ${dark ? 'text-teal-50' : 'text-teal-950'}`}>
            {state.insight}
          </p>
          <ul className={`mt-3 space-y-1.5 text-xs font-semibold ${dark ? 'text-teal-100/80' : 'text-teal-900/80'}`}>
            <li>• Prioritise {state.difficulty === 'Extreme' || state.difficulty === 'Very High' ? 'safety + realistic' : 'target + stretch'} bands in choice lists.</li>
            <li>• Track {state.aiq_seats > 0 ? 'AIQ + state dual paths' : 'state notifications'} each counselling round.</li>
            <li>• Re-validate bonds/fees before locking private options.</li>
          </ul>
        </section>

        <button
          type="button"
          className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm py-3 px-4 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          onClick={() => {
            // Optional: navigate to the predictor page or open modal
            alert('Opening College Predictor...');
          }}
        >
          <Target className="w-4 h-4" />
          Run College Predictor
        </button>
        {/* Premium Data and Charts */}
        {!isPremium ? (
          <div className="relative mt-2">
            <div className={`rounded-2xl border p-4 select-none filter blur-sm pointer-events-none opacity-40 ${dark ? 'border-white/8 bg-white/5' : 'border-primary-dark/8 bg-grey-bg-light/50'}`}>
              <h4 className="text-xs font-black uppercase tracking-wide mb-3 opacity-70">Cutoff Trends & Detailed Analysis</h4>
              <BarChart
                data={[90, 85, 75, 80, 70, 60]}
                labels={['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6']}
                height={140}
                colors={['#14b8a6', '#0f766e', '#f59e0b', '#f97316', '#f43f5e', '#e11d48']}
              />
            </div>
            <div className="absolute inset-0 z-20 flex items-start mt-6 justify-center p-2">
              <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-orange-500/20">
                <UpgradePrompt 
                  featureName="State Competition Insights" 
                  title="Content Locked"
                  description="Please purchase a NEET UG package to view detailed Seat Matrix splits, Cutoff Trends, and Top College lists for this state." 
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Charts */}
            <section className={`rounded-2xl border p-4 ${dark ? 'border-white/8 bg-white/5' : 'border-primary-dark/8 bg-grey-bg-light/50'}`}>
              <h4 className="text-xs font-black uppercase tracking-wide mb-3 opacity-70">Cutoff trend (score)</h4>
              {trend.length > 0 ? (
                <>
                  <BarChart
                    data={trend}
                    labels={trend.map((_, i) => `Y${i + 1}`)}
                    height={140}
                    colors={['#14b8a6', '#0f766e', '#f59e0b', '#f97316', '#f43f5e', '#e11d48']}
                  />
                  <div className="mt-3">
                    <Sparkline data={trend} color="#14b8a6" className="h-10" />
                  </div>
                </>
              ) : (
                <p className="text-sm opacity-60">No trend series for this filter set.</p>
              )}
            </section>

            <div className="grid sm:grid-cols-2 gap-3">
              <section className={`rounded-2xl border p-4 ${dark ? 'border-white/8 bg-white/5' : 'border-primary-dark/8 bg-white'}`}>
                <h4 className="text-xs font-black uppercase tracking-wide mb-3 opacity-70">Seat matrix mix</h4>
                {splitValues.some((v) => v > 0) ? (
                  <div className="flex flex-col items-center gap-3">
                    <DonutChart
                      segments={splitLabels.map((label, i) => ({
                        label,
                        value: splitValues[i],
                        color: ['#14b8a6', '#f97316', '#8b5cf6', '#f43f5e'][i % 4],
                      }))}
                      size={150}
                      centerLabel={formatNum(splitValues.reduce((a, b) => a + b, 0))}
                    />
                    <div className="flex flex-wrap justify-center gap-2">
                      {splitLabels.map((label, i) => (
                        <span key={label} className="text-[10px] font-bold opacity-70">
                          <span
                            className="inline-block w-2 h-2 rounded-full mr-1"
                            style={{ background: ['#14b8a6', '#f97316', '#8b5cf6', '#f43f5e'][i % 4] }}
                          />
                          {label}: {formatNum(splitValues[i])}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm opacity-60">Seat split unavailable.</p>
                )}
              </section>

              <section className={`rounded-2xl border p-4 ${dark ? 'border-white/8 bg-white/5' : 'border-primary-dark/8 bg-white'}`}>
                <h4 className="text-xs font-black uppercase tracking-wide mb-3 opacity-70">Demand vs supply</h4>
                <BarChart
                  data={demandSupply}
                  labels={['Demand', 'Supply']}
                  height={150}
                  colors={['#f43f5e', '#14b8a6']}
                />
                <p className={`text-[11px] font-medium mt-2 ${dark ? 'text-white/45' : 'text-gray-500'}`}>
                  Higher demand index = tougher closing ranks relative to seat supply.
                </p>
              </section>
            </div>

            {/* Top colleges */}
            <section>
              <h4 className="text-xs font-black uppercase tracking-wide mb-3 opacity-70">Top colleges</h4>
              <div className="space-y-2">
                {(state.top_colleges || []).slice(0, 6).map((c, i) => (
                  <div
                    key={`${c.name}-${i}`}
                    className={`rounded-xl border px-3 py-2.5 flex items-start gap-3 ${dark ? 'border-white/8 bg-white/5' : 'border-primary-dark/8 bg-white'}`}
                  >
                    <span className={`mt-0.5 w-7 h-7 rounded-lg grid place-items-center text-[11px] font-black ${dark ? 'bg-white/10' : 'bg-grey-bg-light'}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-snug truncate">{c.name}</p>
                      <p className={`text-[11px] font-semibold mt-0.5 ${dark ? 'text-white/45' : 'text-gray-500'}`}>
                        {c.type || 'College'}
                        {c.city ? ` · ${c.city}` : ''}
                        {c.seats != null ? ` · ${c.seats} seats` : ''}
                        {c.closing_rank != null ? ` · CR ${formatNum(c.closing_rank)}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
                {!(state.top_colleges || []).length && (
                  <p className="text-sm opacity-60">No college rows for current filters.</p>
                )}
              </div>
            </section>

            {/* Live catalogue sample */}
            {(state.colleges_sample || []).length > 0 && (
              <section>
                <h4 className="text-xs font-black uppercase tracking-wide mb-3 opacity-70">Catalogue sample</h4>
                <div className="flex flex-wrap gap-2">
                  {state.colleges_sample!.slice(0, 8).map((c) => (
                    <span
                      key={c.id}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border ${dark ? 'border-white/10 bg-white/5' : 'border-primary-dark/10 bg-grey-bg-light'}`}
                    >
                      <MapPin className="w-3 h-3 opacity-60" />
                      {c.name.length > 28 ? c.name.slice(0, 28) + '…' : c.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Seat table snippet */}
            {(state.seat_rows || []).length > 0 && (
              <section>
                <h4 className="text-xs font-black uppercase tracking-wide mb-3 opacity-70">Seat matrix snapshot</h4>
                <div className={`overflow-x-auto rounded-xl border ${dark ? 'border-white/8' : 'border-primary-dark/8'}`}>
                  <table className="w-full text-xs min-w-[420px]">
                    <thead className={dark ? 'bg-white/5' : 'bg-grey-bg-light'}>
                      <tr className="text-left">
                        <th className="p-2.5 font-bold">College</th>
                        <th className="p-2.5 font-bold">Total</th>
                        <th className="p-2.5 font-bold">AIQ</th>
                        <th className="p-2.5 font-bold">Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.seat_rows!.slice(0, 8).map((r, i) => (
                        <tr key={i} className={dark ? 'border-t border-white/5' : 'border-t border-primary-dark/5'}>
                          <td className="p-2.5 font-semibold max-w-[180px] truncate">
                            <Link to={`/colleges/${encodeURIComponent(String(r.college_name || ''))}`} className="hover:underline decoration-orange-500 underline-offset-4">{String(r.college_name || '—')}</Link>
                          </td>
                          <td className="p-2.5 tabular-nums">{formatNum(Number(r.total_seats))}</td>
                          <td className="p-2.5 tabular-nums">{formatNum(Number(r.all_india))}</td>
                          <td className="p-2.5 tabular-nums">{formatNum(Number(r.open_seats))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Cutoff table */}
            {(state.cutoff_rows || []).length > 0 && (
              <section>
                <h4 className="text-xs font-black uppercase tracking-wide mb-3 opacity-70">Cutoff rows</h4>
                <div className={`overflow-x-auto rounded-xl border ${dark ? 'border-white/8' : 'border-primary-dark/8'}`}>
                  <table className="w-full text-xs min-w-[480px]">
                    <thead className={dark ? 'bg-white/5' : 'bg-grey-bg-light'}>
                      <tr className="text-left">
                        <th className="p-2.5 font-bold">College</th>
                        <th className="p-2.5 font-bold">Cat</th>
                        <th className="p-2.5 font-bold">AIQ rank</th>
                        <th className="p-2.5 font-bold">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.cutoff_rows!.slice(0, 10).map((r, i) => (
                        <tr key={i} className={dark ? 'border-t border-white/5' : 'border-t border-primary-dark/5'}>
                          <td className="p-2.5 font-semibold max-w-[160px] truncate">
                            <Link to={`/colleges/${encodeURIComponent(String(r.college_name || ''))}`} className="hover:underline decoration-orange-500 underline-offset-4">{String(r.college_name || '—')}</Link>
                          </td>
                          <td className="p-2.5">{String(r.category || '—')}</td>
                          <td className="p-2.5 tabular-nums">{formatNum(Number(r.aiq_rank))}</td>
                          <td className="p-2.5 tabular-nums">{formatNum(Number(r.aiq_score))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </motion.aside>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  dark,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  dark?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-3 ${dark ? 'border-white/8 bg-white/5 text-white' : 'border-gray-200 bg-white shadow-sm text-gray-900'}`}>
      <div className="flex items-center gap-1.5 opacity-60 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold uppercase">{label}</span>
      </div>
      <p className="text-lg font-black tabular-nums leading-none">{value}</p>
      {sub && <p className={`text-[10px] font-semibold mt-1 ${dark ? 'text-white/40' : 'text-gray-500'}`}>{sub}</p>}
    </div>
  );
}
