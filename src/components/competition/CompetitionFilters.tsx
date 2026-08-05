import { Search, SlidersHorizontal, RotateCcw } from 'lucide-react';
import type { CompetitionFilters as Filters } from '../../lib/competitionMap';
import { defaultCompetitionFilters } from '../../lib/competitionMap';

import { MEDICAL_COURSES } from '../../lib/courses';

const COURSES = [...MEDICAL_COURSES, 'All'];
const CATEGORIES = ['All', 'General', 'OBC', 'EWS', 'SC', 'ST'];
const QUOTAS = ['All', 'AIQ', 'State', 'AACCC', 'Management', 'NRI'];
const ROUNDS = ['Round 1', 'Round 2', 'Round 3', 'Stray'];
const YEARS = ['2026', '2025', '2024', '2023', '2022'];
const TYPES = ['All', 'Government', 'Private'];
const FEES = ['All', 'Under ₹5L', '₹5L–₹15L', 'Above ₹15L'];

interface Props {
  value: Filters;
  onChange: (next: Filters) => void;
  stateOptions: string[];
  dark?: boolean;
}

export default function CompetitionFiltersBar({ value, onChange, stateOptions, dark }: Props) {
  const set = (k: keyof Filters, v: string) => onChange({ ...value, [k]: v });

  const field =
    'rounded-xl border px-3 py-2 text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30 ' +
    (dark
      ? 'bg-white/5 border-white/10 text-white [&>option]:bg-[#0f172a] [&>option]:text-white'
      : 'bg-white border-primary-dark/10 text-primary-dark [&>option]:bg-white [&>option]:text-primary-dark');

  return (
    <div
      className={`rounded-2xl border p-3 sm:p-4 backdrop-blur-xl ${
        dark ? 'bg-white/5 border-white/10' : 'bg-white/80 border-primary-dark/8 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <SlidersHorizontal className={`w-4 h-4 ${dark ? 'text-teal-300' : 'text-primary'}`} />
        <p className={`text-xs font-bold uppercase tracking-wider ${dark ? 'text-white/60' : 'text-text-grey'}`}>
          Intelligence filters
        </p>
        <button
          type="button"
          onClick={() => onChange({ ...defaultCompetitionFilters })}
          className={`ml-auto inline-flex items-center gap-1 text-xs font-bold ${dark ? 'text-white/50 hover:text-white' : 'text-text-grey hover:text-primary-dark'}`}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      <div className="relative mb-3">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${dark ? 'text-white/30' : 'text-text-grey'}`} />
        <input
          value={value.q}
          onChange={(e) => set('q', e.target.value)}
          placeholder="Search states or colleges…"
          className={`w-full pl-10 ${field}`}
          aria-label="Search states or colleges"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        <label className="flex flex-col gap-1 min-w-0">
          <span className={`text-[10px] font-bold uppercase ${dark ? 'text-white/40' : 'text-text-grey'}`}>State</span>
          <select className={field} value={value.state} onChange={(e) => set('state', e.target.value)}>
            <option value="All">All states</option>
            {stateOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 min-w-0">
          <span className={`text-[10px] font-bold uppercase ${dark ? 'text-white/40' : 'text-text-grey'}`}>Course</span>
          <select className={field} value={value.course} onChange={(e) => set('course', e.target.value)}>
            {COURSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 min-w-0">
          <span className={`text-[10px] font-bold uppercase ${dark ? 'text-white/40' : 'text-text-grey'}`}>Category</span>
          <select className={field} value={value.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 min-w-0">
          <span className={`text-[10px] font-bold uppercase ${dark ? 'text-white/40' : 'text-text-grey'}`}>Quota</span>
          <select className={field} value={value.quota} onChange={(e) => set('quota', e.target.value)}>
            {QUOTAS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 min-w-0">
          <span className={`text-[10px] font-bold uppercase ${dark ? 'text-white/40' : 'text-text-grey'}`}>Round</span>
          <select className={field} value={value.round} onChange={(e) => set('round', e.target.value)}>
            {ROUNDS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 min-w-0">
          <span className={`text-[10px] font-bold uppercase ${dark ? 'text-white/40' : 'text-text-grey'}`}>Year</span>
          <select className={field} value={value.year} onChange={(e) => set('year', e.target.value)}>
            {YEARS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 min-w-0">
          <span className={`text-[10px] font-bold uppercase ${dark ? 'text-white/40' : 'text-text-grey'}`}>College type</span>
          <select className={field} value={value.college_type} onChange={(e) => set('college_type', e.target.value)}>
            {TYPES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 min-w-0">
          <span className={`text-[10px] font-bold uppercase ${dark ? 'text-white/40' : 'text-text-grey'}`}>Fees</span>
          <select className={field} value={value.fees} onChange={(e) => set('fees', e.target.value)}>
            {FEES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
