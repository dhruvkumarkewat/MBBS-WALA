export type Difficulty = 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme' | string;

export interface TopCollege {
  name: string;
  type?: string;
  city?: string;
  seats?: number;
  closing_rank?: number;
}

export interface StateCompetition {
  id: number;
  state_key: string;
  state_name: string;
  map_name?: string;
  competition_score: number;
  difficulty: Difficulty;
  total_colleges: number;
  govt_colleges: number;
  private_colleges: number;
  total_seats: number;
  display_seats?: number;
  aiq_seats: number;
  state_quota_seats: number;
  avg_closing_rank: number;
  avg_cutoff: number;
  admission_probability: number;
  insight: string;
  demand_index: number;
  supply_index: number;
  top_colleges: TopCollege[];
  cutoff_trend: number[];
  seat_split: Record<string, number>;
  year: number;
  colleges_sample?: Array<{
    id: number;
    name: string;
    city: string;
    college_type: string;
  }>;
  seat_rows?: Array<Record<string, unknown>>;
  cutoff_rows?: Array<Record<string, unknown>>;
  safest_college?: string;
  most_competitive_college?: string;
  best_college?: string;
  matching_colleges?: number;
  lowest_closing_rank?: number;
  highest_closing_rank?: number;
}

export interface CompetitionSummary {
  states: number;
  total_colleges: number;
  total_seats: number;
  avg_competition: number;
  hottest?: Array<{ state_name: string; competition_score: number; difficulty?: string }>;
  easiest?: Array<{ state_name: string; competition_score: number; difficulty?: string }>;
  highest_chance?: Array<{ state_name: string; competition_score: number | string }>;
  moderate_chance?: Array<{ state_name: string; competition_score: number | string }>;
  very_difficult?: Array<{ state_name: string; competition_score: number | string }>;
}

export interface MapPathState {
  name: string;
  key: string;
  d: string;
  cx: number;
  cy: number;
}

export interface IndiaPathsFile {
  viewBox: string;
  width: number;
  height: number;
  states: MapPathState[];
}

/** Normalize map ST_NM ↔ DB state names */
export function normalizeStateKey(name: string): string {
  return String(name || '')
    .toUpperCase()
    .replace(/&/g, 'AND')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

const ALIASES: Record<string, string> = {
  DELHI: 'DELHI',
  NCT_OF_DELHI: 'DELHI',
  JAMMU_AND_KASHMIR: 'JAMMU_KASHMIR',
  JAMMU_KASHMIR: 'JAMMU_KASHMIR',
  ANDAMAN_AND_NICOBAR: 'ANDAMAN_NICOBAR',
  ANDAMAN_NICOBAR: 'ANDAMAN_NICOBAR',
  ANDAMAN_NICOBAR_ISLANDS: 'ANDAMAN_NICOBAR',
  DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU: 'DADRA_DAMAN_DIU',
  DADRA_DAMAN_DIU: 'DADRA_DAMAN_DIU',
  PONDICHERRY: 'PUDUCHERRY',
  ORISSA: 'ODISHA',
  UTTARANCHAL: 'UTTARAKHAND',
};

export function canonicalStateKey(name: string): string {
  const k = normalizeStateKey(name);
  return ALIASES[k] || k;
}

export function scoreColor(prob: number | null, dark = false): string {
  if (prob == null || Number.isNaN(prob)) return dark ? '#374151' : '#9ca3af'; // Grey for No Data
  
  // Convert from 0-1 fractional format if needed, though we will provide 0-100 to this function
  const p = prob <= 1 ? prob * 100 : prob;

  if (p >= 95) return dark ? '#064e3b' : '#065f46'; // Dark Green
  if (p >= 80) return dark ? '#14532d' : '#16a34a'; // Green
  if (p >= 60) return dark ? '#166534' : '#4ade80'; // Light Green
  if (p >= 40) return dark ? '#854d0e' : '#facc15'; // Yellow
  if (p >= 20) return dark ? '#9a3412' : '#f97316'; // Orange
  if (p >= 1) return dark ? '#7f1d1d' : '#ef4444'; // Red
  return dark ? '#450a0a' : '#991b1b'; // Dark Red
}

export function scoreStroke(prob: number | null): string {
  if (prob == null || Number.isNaN(prob)) return 'rgba(156, 163, 175, 0.4)';
  
  const p = prob <= 1 ? prob * 100 : prob;

  if (p >= 95) return '#064e3b';
  if (p >= 80) return '#14532d';
  if (p >= 60) return '#166534';
  if (p >= 40) return '#a16207';
  if (p >= 20) return '#c2410c';
  if (p >= 1) return '#991b1b';
  return '#450a0a';
}

export function difficultyTone(d: string): string {
  const x = d.toLowerCase();
  if (x.includes('extreme')) return 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/25';
  if (x.includes('very')) return 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/25';
  if (x.includes('high')) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25';
  if (x.includes('moderate')) return 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/25';
  return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25';
}

export function formatPct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

export function formatNum(n?: number | null): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('en-IN');
}

export interface CompetitionFilters {
  state: string;
  course: string;
  category: string;
  quota: string;
  round: string;
  year: string;
  college_type: string;
  fees: string;
  q: string;
  rank: string;
}

export const defaultCompetitionFilters: CompetitionFilters = {
  state: 'All',
  course: 'All',
  category: 'All',
  quota: 'All',
  round: 'Round 1',
  year: '2026',
  college_type: 'All',
  fees: 'All',
  q: '',
  rank: '',
};

export function buildCompetitionQuery(f: CompetitionFilters): string {
  const p = new URLSearchParams();
  if (f.state && f.state !== 'All') p.set('state', f.state);
  if (f.course) p.set('course', f.course);
  if (f.category) p.set('category', f.category);
  if (f.quota) p.set('quota', f.quota);
  if (f.year) p.set('year', f.year);
  if (f.college_type && f.college_type !== 'All') p.set('college_type', f.college_type);
  if (f.q) p.set('q', f.q);
  if (f.rank) p.set('rank', f.rank);
  // fees/round reserved for UI + future API
  if (f.fees && f.fees !== 'All') p.set('fees', f.fees);
  if (f.round) p.set('round', f.round);
  return p.toString();
}
