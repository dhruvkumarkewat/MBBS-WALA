import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Table, { type Column } from '../components/ui/Table';
import SearchInput from '../components/ui/SearchInput';
import { SkeletonTable } from '../components/ui/Skeleton';
import { staggerContainer, staggerItem } from '../lib/motion';
import { MEDICAL_COURSES, INDIAN_STATES, COUNSELLING_ROUNDS } from '../lib/courses';

interface Cutoff {
  id: number;
  college_name: string;
  state: string;
  category: string;
  round_name?: string;
  aiq_rank: number;
  aiq_score: number;
  state_rank_range: string;
  state_score_range: string;
  year: number;
}

export default function Cutoffs() {
  const [rows, setRows] = useState<Cutoff[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [course, setCourse] = useState('MBBS');
  const [state, setState] = useState('All');
  const [round, setRound] = useState('All');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== 'All') params.set('category', category);
    if (course && course !== 'All') params.set('course', course);
    if (state && state !== 'All') params.set('state', state);
    if (round && round !== 'All') params.set('round', round);
    if (q) params.set('q', q);
    setLoading(true);
    const t = window.setTimeout(() => {
      fetch(`/api/cutoffs?${params}`)
        .then((r) => r.json())
        .then((d) => setRows(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []))
        .catch(() => setError('Failed to load cutoffs'))
        .finally(() => setLoading(false));
    }, q ? 220 : 0);
    return () => window.clearTimeout(t);
  }, [category, course, state, round, q]);

  const columns = useMemo<Column<Cutoff>[]>(
    () => [
      {
        id: 'college',
        header: 'College',
        cell: (r) => <span className="font-semibold">{r.college_name}</span>,
      },
      {
        id: 'cat',
        header: 'Category',
        cell: (r) => (
          <span className="px-2 py-0.5 rounded-md bg-[var(--ds-bg-muted)] border border-[var(--ds-border)] font-bold text-xs">
            {r.category}
          </span>
        ),
      },
      {
        id: 'round',
        header: 'Round',
        cell: (r) => (
          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs">
            {r.round_name || 'Round 1'}
          </span>
        ),
      },
      {
        id: 'rank',
        header: 'AIQ Rank',
        align: 'right',
        cell: (r) => <span className="font-black">{r.aiq_rank?.toLocaleString()}</span>,
      },
      {
        id: 'score',
        header: 'AIQ Score',
        align: 'right',
        cell: (r) => r.aiq_score,
      },
      {
        id: 'sr',
        header: 'State Rank',
        hideOnMobile: true,
        cell: (r) => r.state_rank_range,
      },
      {
        id: 'ss',
        header: 'State Score',
        hideOnMobile: true,
        cell: (r) => r.state_score_range,
      },
      {
        id: 'year',
        header: 'Year',
        align: 'right',
        cell: (r) => r.year,
      },
    ],
    []
  );

  return (
    <div className="px-4 sm:px-8 py-12 md:py-16 max-w-6xl mx-auto">
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-2">College data</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-3">College cut-offs</h1>
        <p className="text-text-grey font-medium max-w-2xl">
          Closing ranks and score bands by course (MBBS–BNYS) and category — AIQ / AACCC / state paths.
        </p>
      </motion.div>

      <motion.div
        className="flex flex-col gap-3 mb-6"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div className="flex flex-wrap gap-2" variants={staggerItem}>
          {MEDICAL_COURSES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCourse(c)}
              className={`px-3 py-1.5 rounded-full border font-semibold text-xs transition-all ${
                course === c
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-white border-black/10 hover:border-primary/40'
              }`}
            >
              {c}
            </button>
          ))}
        </motion.div>
        <div className="flex flex-col sm:flex-row gap-3">
          <motion.div className="flex-1" variants={staggerItem}>
            <SearchInput value={q} onChange={setQ} loading={loading} placeholder="Search college…" />
          </motion.div>
          <motion.div className="flex flex-wrap gap-2 items-center" variants={staggerItem}>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="px-3.5 py-2 rounded-full border border-black/10 bg-white font-semibold text-sm text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            >
              <option value="All">All States / AIQ</option>
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            <select
              value={round}
              onChange={(e) => setRound(e.target.value)}
              className="px-3.5 py-2 rounded-full border border-black/10 bg-white font-semibold text-sm text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            >
              <option value="All">All Rounds</option>
              {COUNSELLING_ROUNDS.filter((r) => r !== 'All Rounds').map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {['All', 'General', 'OBC', 'SC', 'ST'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-4 py-2 rounded-full border font-semibold text-sm transition-all ${
                  category === c
                    ? 'bg-primary-dark text-white border-primary-dark shadow-lg'
                    : 'bg-white border-black/10 hover:border-primary/40'
                }`}
              >
                {c}
              </button>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {error ? (
        <p className="text-red-600 font-semibold">{error}</p>
      ) : loading && !rows.length ? (
        <SkeletonTable rows={8} cols={5} />
      ) : (
        <Table columns={columns} data={rows} loading={loading} stickyHeader emptyTitle="No cutoffs match" />
      )}
    </div>
  );
}
