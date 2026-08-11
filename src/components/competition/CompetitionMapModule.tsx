import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Map as MapIcon,
  Flame,
  Leaf,
  Loader2,
  AlertCircle,
  PanelRightOpen,
  Maximize2,
  Crown,
  Lock,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { apiJson } from '../../lib/api';
import {
  buildCompetitionQuery,
  canonicalStateKey,
  defaultCompetitionFilters,
  formatNum,
  type CompetitionFilters,
  type CompetitionSummary,
  type IndiaPathsFile,
  type StateCompetition,
} from '../../lib/competitionMap';
import CompetitionFiltersBar from './CompetitionFilters';
import IndiaCompetitionMap from './IndiaCompetitionMap';
import StateDetailPanel from './StateDetailPanel';
import { useAuth } from '../../contexts/AuthContext';
import { usePremium } from '../../lib/premium';

interface Props {
  dark?: boolean;
  embedded?: boolean;
}

export default function CompetitionMapModule({ dark, embedded }: Props) {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const initialFilters = useMemo(() => {
    let budgetFee = 'All';
    if (profile?.tuition_budget) {
      const budget = Number(profile.tuition_budget);
      if (budget < 500000) budgetFee = 'Under ₹5L';
      else if (budget <= 1500000) budgetFee = '₹5L–₹15L';
      else budgetFee = 'Above ₹15L';
    }
    return {
      ...defaultCompetitionFilters,
      rank: String(profile?.rank || profile?.neet_rank || ''),
      category: profile?.category || 'All',
      state: profile?.domicile_state || 'All',
      fees: budgetFee,
      annual_income: profile?.annual_income,
      has_sambal_card: profile?.has_sambal_card,
      studied_in_govt_school: profile?.studied_in_govt_school
    };
  }, [profile]);

  const [filters, setFilters] = useState<CompetitionFilters>(initialFilters);

  // Sync when profile loads if they haven't changed defaults
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      rank: String(prev.rank || profile?.rank || profile?.neet_rank || ''),
      category: prev.category === 'All' ? (profile?.category || 'All') : prev.category,
      state: prev.state === 'All' ? (profile?.domicile_state || 'All') : prev.state,
      annual_income: prev.annual_income ?? profile?.annual_income,
      has_sambal_card: prev.has_sambal_card ?? profile?.has_sambal_card,
      studied_in_govt_school: prev.studied_in_govt_school ?? profile?.studied_in_govt_school,
    }));
  }, [profile]);

  const [paths, setPaths] = useState<IndiaPathsFile | null>(null);
  const [states, setStates] = useState<StateCompetition[]>([]);
  const [summary, setSummary] = useState<CompetitionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<StateCompetition | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [lockedStateName, setLockedStateName] = useState<string | null>(null);

  // Load simplified SVG paths once
  useEffect(() => {
    let cancelled = false;
    fetch('/geo/india-states-paths.json')
      .then((r) => {
        if (!r.ok) throw new Error('Map geometry failed to load');
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setPaths(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Map load error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = buildCompetitionQuery(filters);
      const data = await apiJson<{ states: StateCompetition[]; summary: CompetitionSummary }>(
        `/api/competition-map?${qs}`
      );
      const rawStates = Array.isArray(data.states) ? data.states : [];
      const seen = new Set<string>();
      const uniqueStates = rawStates.filter((s) => {
        const key = canonicalStateKey(s.state_name);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setStates(uniqueStates);
      setSummary(data.summary || null);
      // keep selection in sync
      setSelected((prev) => {
        if (!prev) return null;
        const next = (data.states || []).find(
          (s) => canonicalStateKey(s.state_name) === canonicalStateKey(prev.state_name)
        );
        return next || null;
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load competition data');
      setStates([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(loadData, 180);
    return () => clearTimeout(t);
  }, [loadData]);

  const stateOptions = useMemo(
    () => [...new Set(states.map((s) => s.state_name))].sort(),
    [states]
  );

  const selectedKey = selected ? canonicalStateKey(selected.state_name) : null;

  const shell = dark
    ? 'bg-[#071017] text-white'
    : 'bg-gradient-to-b from-[#f6fbfa] to-white text-primary-dark';

  const { isPremium } = usePremium();

  /** Centralized access check for state map details */
  const canAccessStateDetails = isPremium;

  /** Handle state selection from map or leaderboard */
  const handleSelectState = (s: StateCompetition | null) => {
    if (!s) {
      setSelected(null);
      return;
    }
    if (!canAccessStateDetails) {
      setLockedStateName(s.state_name);
      setShowUpgradeModal(true);
      return;
    }
    setSelected(s);
    setPanelOpen(true);
  };

  return (
    <div className={`${embedded ? '' : 'min-h-[calc(100vh-6rem)]'} ${shell}`}>
      {/* Upgrade Modal for free users who try to click a state */}
      <AnimatePresence>
        {showUpgradeModal && (
          <StateUpgradeModal
            dark={dark}
            stateName={lockedStateName || ''}
            onClose={() => setShowUpgradeModal(false)}
            onUpgrade={() => navigate('/dashboard/subscription')}
          />
        )}
      </AnimatePresence>
      <div className="px-3 sm:px-5 pt-4 pb-3 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-orange-500 mb-1.5">
              <MapIcon className="w-3.5 h-3.5" />
              Closing Rank Map
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Closing ranks & competition across India
            </h1>
            <p className={`text-sm font-medium mt-1 max-w-2xl ${dark ? 'text-white/50' : 'text-gray-500'}`}>
              Hover any state for avg closing rank, cutoff heat and seat pressure. Click for seat matrix, cutoff trends, demand vs supply, and college shortlists.
            </p>
          </div>

          {summary && (
            <div className="flex flex-wrap gap-2">
              <Pill dark={dark} label="States" value={formatNum(summary.states)} />
              <Pill dark={dark} label="Colleges" value={formatNum(summary.total_colleges)} />
              <Pill dark={dark} label="Seats" value={formatNum(summary.total_seats)} />
              <Pill dark={dark} label="Avg heat" value={String(summary.avg_competition)} />
            </div>
          )}
        </div>

        <CompetitionFiltersBar
          value={filters}
          onChange={setFilters}
          stateOptions={stateOptions}
          dark={dark}
        />
      </div>

      {summary?.ai_analysis && (
        <div className={`mx-3 sm:mx-5 mb-3 p-4 rounded-2xl border flex items-start gap-3 ${dark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200/60'}`}>
          <div className="shrink-0 p-2 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl shadow-md text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1">AI Map Analysis</h4>
            <p className={`text-[13px] font-bold leading-relaxed ${dark ? 'text-white/90' : 'text-slate-800'}`}>
              {summary.ai_analysis}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-3 sm:mx-5 mb-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm font-semibold text-rose-600 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="px-3 sm:px-5 pb-5">
        <div
          className={`grid gap-3 ${panelOpen && selected ? 'xl:grid-cols-[1fr_400px]' : 'grid-cols-1'}`}
        >
          <div
            className={`relative rounded-3xl border overflow-hidden min-h-[520px] ${
              dark ? 'border-white/10 bg-white/[0.03]' : 'border-primary-dark/8 bg-white shadow-sm'
            }`}
          >
            {/* side tools */}
            <div className="absolute top-3 right-3 z-20 flex gap-2">
              <button
                type="button"
                onClick={() => setPanelOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border backdrop-blur ${
                  dark ? 'bg-black/40 border-white/10 hover:bg-black/60' : 'bg-white/90 border-primary-dark/10 hover:bg-white'
                }`}
              >
                <PanelRightOpen className="w-3.5 h-3.5" />
                {panelOpen ? 'Hide panel' : 'Show panel'}
              </button>
            </div>

            {loading && (
              <div className="absolute inset-0 z-10 grid place-items-center bg-black/10 backdrop-blur-[2px]">
                <div className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full border ${dark ? 'bg-black/50 border-white/10' : 'bg-white border-primary-dark/10'}`}>
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Syncing map intelligence…
                </div>
              </div>
            )}

            {paths ? (
              <IndiaCompetitionMap
                paths={paths}
                states={states}
                selectedKey={selectedKey}
                dark={dark}
                isPremium={canAccessStateDetails}
                onSelect={handleSelectState}
              />
            ) : (
              !error && (
                <div className="h-[520px] grid place-items-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )
            )}

            {/* hot/cold rail */}
            {summary && (
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 max-w-[200px]">
                {filters.rank ? (
                  <>
                    {summary.highest_chance && summary.highest_chance.length > 0 && (
                      <MiniList
                        dark={dark}
                        title="Highest Chance"
                        icon={<Leaf className="w-3.5 h-3.5 text-green-500" />}
                        items={summary.highest_chance}
                        onPick={(name) => {
                          const s = states.find((x) => x.state_name === name);
                          if (s) handleSelectState(s);
                        }}
                      />
                    )}
                    {summary.moderate_chance && summary.moderate_chance.length > 0 && (
                      <MiniList
                        dark={dark}
                        title="Moderate Chance"
                        icon={<Flame className="w-3.5 h-3.5 text-yellow-500" />}
                        items={summary.moderate_chance}
                        onPick={(name) => {
                          const s = states.find((x) => x.state_name === name);
                          if (s) handleSelectState(s);
                        }}
                      />
                    )}
                    {summary.very_difficult && summary.very_difficult.length > 0 && (
                      <MiniList
                        dark={dark}
                        title="Very Difficult"
                        icon={<AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                        items={summary.very_difficult}
                        onPick={(name) => {
                          const s = states.find((x) => x.state_name === name);
                          if (s) handleSelectState(s);
                        }}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <MiniList
                      dark={dark}
                      title="Hottest"
                      icon={<Flame className="w-3.5 h-3.5 text-rose-500" />}
                      items={summary.hottest || []}
                      onPick={(name) => {
                        const s = states.find((x) => x.state_name === name);
                        if (s) handleSelectState(s);
                      }}
                    />
                    <MiniList
                      dark={dark}
                      title="Easier"
                      icon={<Leaf className="w-3.5 h-3.5 text-teal-500" />}
                      items={summary.easiest || []}
                      onPick={(name) => {
                        const s = states.find((x) => x.state_name === name);
                        if (s) handleSelectState(s);
                      }}
                    />
                  </>
                )}
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {panelOpen && selected && canAccessStateDetails && (
              <div className="h-[min(80vh,820px)] xl:h-auto xl:min-h-[520px] rounded-3xl overflow-hidden border dark:border-white/10 border-primary-dark/8">
                <StateDetailPanel
                  key={selected.state_key || selected.state_name}
                  state={selected}
                  dark={dark}
                  onClose={() => setSelected(null)}
                />
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* leaderboard table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-3 rounded-3xl border overflow-hidden ${
            dark ? 'border-white/10 bg-white/[0.03]' : 'border-primary-dark/8 bg-white'
          }`}
        >
          <div className={`px-4 py-3 border-b flex items-center gap-2 ${dark ? 'border-white/8' : 'border-primary-dark/8'}`}>
            <Maximize2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-black">State leaderboard</h2>
            <span className={`text-xs font-semibold ${dark ? 'text-white/40' : 'text-gray-500'}`}>
              {states.length} regions · hover map for data · click for full analytics
            </span>
            {!canAccessStateDetails && (
              <span className="ml-auto flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/15 text-amber-600 border border-amber-500/20">
                <Lock className="w-3 h-3" /> Free preview
              </span>
            )}
          </div>
          <div className="overflow-x-auto zn-scroll">
            <table className="w-full text-sm min-w-[860px]">
              <thead className={dark ? 'bg-white/5 text-white/50' : 'bg-grey-bg-light text-gray-500'}>
                <tr className="text-left text-[11px] uppercase tracking-wide">
                  <th className="p-3 font-bold">#</th>
                  <th className="p-3 font-bold">State</th>
                  <th className="p-3 font-bold">Score</th>
                  <th className="p-3 font-bold">Difficulty</th>
                  <th className="p-3 font-bold">Colleges</th>
                  <th className="p-3 font-bold">Seats</th>
                  <th className="p-3 font-bold">AIQ</th>
                  <th className="p-3 font-bold">Avg rank</th>
                  <th className="p-3 font-bold">Admit %</th>
                </tr>
              </thead>
              <tbody>
                {states.map((s, i) => {
                  const active = selectedKey === canonicalStateKey(s.state_name);
                  return (
                    <tr
                      key={s.state_key || s.state_name}
                      onClick={() => handleSelectState(s)}
                      className={`cursor-pointer border-t transition-colors ${
                        dark ? 'border-white/5 hover:bg-white/5' : 'border-primary-dark/5 hover:bg-teal-50/60'
                      } ${active ? (dark ? 'bg-teal-500/10' : 'bg-teal-50') : ''}`}
                    >
                      <td className="p-3 font-bold opacity-50">{i + 1}</td>
                      <td className="p-3 font-bold flex items-center gap-1.5">
                        {s.state_name}
                        {!canAccessStateDetails && <Lock className="w-3 h-3 opacity-30" />}
                      </td>
                      <td className="p-3 font-black tabular-nums">{s.competition_score}</td>
                      <td className="p-3 text-xs font-bold">{s.difficulty || '—'}</td>
                      <td className="p-3 tabular-nums">{formatNum(s.total_colleges)}</td>
                      <td className="p-3 tabular-nums">{formatNum(s.total_seats)}</td>
                      <td className="p-3 tabular-nums">{formatNum(s.aiq_seats)}</td>
                      <td className="p-3 tabular-nums">{formatNum(s.avg_closing_rank)}</td>
                      <td className="p-3 font-bold tabular-nums text-primary">
                        {Math.round(s.admission_probability * 100)}%
                      </td>
                    </tr>
                  );
                })}
                {!loading && !states.length && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center opacity-60 font-medium">
                      No states match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Pill({ dark, label, value }: { dark?: boolean; label: string; value: string }) {
  return (
    <div className={`rounded-2xl border px-3 py-2 min-w-[88px] ${dark ? 'border-white/10 bg-white/5 text-white' : 'border-gray-200 bg-white shadow-sm text-gray-900'}`}>
      <p className={`text-[10px] font-bold uppercase ${dark ? 'text-white/40' : 'text-gray-500'}`}>{label}</p>
      <p className="text-lg font-black tabular-nums leading-tight">{value}</p>
    </div>
  );
}

function MiniList({
  dark,
  title,
  icon,
  items,
  onPick,
}: {
  dark?: boolean;
  title: string;
  icon: React.ReactNode;
  items: Array<{ state_name: string; competition_score: number | string }>;
  onPick: (name: string) => void;
}) {
  return (
    <div className={`rounded-xl border backdrop-blur-md px-2.5 py-2 ${dark ? 'bg-black/45 border-white/10' : 'bg-white/90 border-primary-dark/10 shadow-sm'}`}>
      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-black uppercase tracking-wide opacity-70">
        {icon}
        {title}
      </div>
      <ul className="space-y-1">
        {items.slice(0, 3).map((it) => (
          <li key={it.state_name}>
            <button
              type="button"
              onClick={() => onPick(it.state_name)}
              className={`w-full text-left text-[11px] font-bold rounded-lg px-1.5 py-1 flex justify-between gap-2 ${dark ? 'hover:bg-white/10' : 'hover:bg-grey-bg-light'}`}
            >
              <span className="truncate">{it.state_name}</span>
              <span className="tabular-nums opacity-70">{it.competition_score}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Modal shown to free users when they click a state on the map */
function StateUpgradeModal({
  dark,
  stateName,
  onClose,
  onUpgrade,
}: {
  dark?: boolean;
  stateName: string;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 16 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        className={`relative w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
          dark
            ? 'bg-[#0a1219] border-white/10 text-white'
            : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Header glow strip */}
        <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />

        <div className="p-6">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className={`absolute top-4 right-4 p-1.5 rounded-xl border ${
              dark ? 'border-white/10 hover:bg-white/10' : 'border-gray-200 hover:bg-gray-100'
            }`}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon + title */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center mb-4 shadow-lg shadow-orange-500/25">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-black">State Data Locked</h2>
            {stateName && (
              <p className={`text-sm mt-1 font-semibold ${dark ? 'text-white/60' : 'text-gray-500'}`}>
                Detailed data for <span className="text-orange-500">{stateName}</span> requires a Premium plan.
              </p>
            )}
          </div>

          {/* Pricing badge */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex flex-col items-center px-4 py-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${dark ? 'text-white/50' : 'text-gray-500'}`}>Starting from</span>
              <div className="flex items-end gap-1 mt-0.5">
                <span className="text-3xl font-black text-amber-500">₹99</span>
                <span className={`text-xs font-bold pb-1 ${dark ? 'text-white/50' : 'text-gray-500'}`}>/month</span>
              </div>
            </div>
          </div>

          {/* Feature list */}
          <div className={`rounded-2xl border p-4 mb-5 space-y-2.5 ${
            dark ? 'border-white/8 bg-white/5' : 'border-gray-100 bg-gray-50'
          }`}>
            <p className={`text-[10px] font-black uppercase tracking-wider mb-3 ${dark ? 'text-white/40' : 'text-gray-400'}`}>Unlock with Premium</p>
            {[
              'Complete college list for this state',
              'State-wise seat matrix & AIQ / SQ split',
              'Cutoff trends (2020–2024) per round',
              'Closing rank analytics & AI insights',
              'Highest & lowest closing rank colleges',
              'Personalized admission probability',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2.5 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <button
            type="button"
            onClick={onUpgrade}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-sm shadow-lg shadow-orange-500/25 hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4" />
            Unlock from ₹99 →
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`w-full mt-2.5 py-2.5 rounded-2xl text-xs font-bold transition-colors ${
              dark ? 'text-white/50 hover:text-white/80' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Continue browsing map
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
