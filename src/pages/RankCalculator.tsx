import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Loader2, Sparkles } from 'lucide-react';
import CollegeMatchResults, { type MatchRow } from '../components/CollegeMatchResults';
import { MEDICAL_COURSES, maxScoreForCourse } from '../lib/courses';

const EXAMS = ['NEET UG', 'NEET PG', 'NEET MDS', 'INICET', 'NEET SS', 'DNB PDCET'];
const CATEGORIES = ['General', 'OBC', 'EWS', 'SC', 'ST'];

const maxScores: Record<string, number> = {
  'NEET UG': 720,
  'NEET PG': 800,
  'NEET MDS': 960,
  INICET: 200,
  'NEET SS': 400,
  'DNB PDCET': 300,
};

export default function RankCalculator() {
  const [exam, setExam] = useState('NEET UG');
  const [course, setCourse] = useState('MBBS');
  const [score, setScore] = useState('');
  const [category, setCategory] = useState('General');
  const [result, setResult] = useState<{
    predicted_rank_min: number;
    predicted_rank_max: number;
    note: string;
  } | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [summary, setSummary] = useState<{
    safe_count: number;
    moderate_count: number;
    reach_count: number;
    recommended: number;
  } | null>(null);
  const [matchNote, setMatchNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const scoreCap = exam === 'NEET UG' ? maxScoreForCourse(course, exam) : maxScores[exam] || 720;
  const showCourse = exam === 'NEET UG';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setMatches([]);
    setSummary(null);
    const s = Number(score);
    if (!score || Number.isNaN(s) || s < 0 || s > scoreCap) {
      setError(`Enter a valid score between 0 and ${scoreCap}`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/rank-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam,
          score: s,
          category,
          course: showCourse ? course : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data);

      const mid = Math.round((data.predicted_rank_min + data.predicted_rank_max) / 2);
      const mRes = await fetch('/api/college-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rank: mid,
          category,
          course: showCourse ? course : 'MBBS',
          limit: 12,
        }),
      });
      const mData = await mRes.json();
      if (mRes.ok) {
        setMatches(mData.matches || []);
        setSummary(mData.summary || null);
        setMatchNote(mData.note || '');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] text-white">
      <div className="px-4 sm:px-8 py-12 md:py-16 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F97316]/15 border border-[#F97316]/25 mb-4">
            <Calculator className="w-7 h-7 text-[#F97316]" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F97316] mb-2">
            Smart predictor
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">
            Rank → college outcomes
          </h1>
          <p className="text-white/55 font-medium max-w-xl mx-auto">
            Predict your rank range, then see Safe / Moderate / Reach colleges for MBBS, BDS, BAMS, BHMS, BUMS, BSMS or BNYS.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-3xl border border-white/10 bg-[#171B24] p-6 md:p-8 space-y-5 mb-10"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-left sm:col-span-1">
              <span className="text-xs font-bold uppercase tracking-wide text-white/40">Exam</span>
              <select
                value={exam}
                onChange={(e) => {
                  setExam(e.target.value);
                  setResult(null);
                  setMatches([]);
                }}
                className="mt-1.5 w-full border border-white/12 rounded-2xl px-3.5 py-3 font-semibold bg-[#0F1218] text-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/35"
              >
                {EXAMS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>

            {showCourse && (
              <label className="block text-left">
                <span className="text-xs font-bold uppercase tracking-wide text-white/40">Course</span>
                <select
                  value={course}
                  onChange={(e) => {
                    setCourse(e.target.value);
                    setResult(null);
                    setMatches([]);
                  }}
                  className="mt-1.5 w-full border border-white/12 rounded-2xl px-3.5 py-3 font-semibold bg-[#0F1218] text-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/35"
                >
                  {MEDICAL_COURSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block text-left">
              <span className="text-xs font-bold uppercase tracking-wide text-white/40">
                Score (out of {scoreCap})
              </span>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder={`e.g. ${Math.round(scoreCap * 0.75)}`}
                className="mt-1.5 w-full border border-white/12 rounded-2xl px-3.5 py-3 font-semibold bg-[#0F1218] text-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/35"
                required
              />
            </label>

            <label className={`block text-left ${showCourse ? '' : 'sm:col-span-1'}`}>
              <span className="text-xs font-bold uppercase tracking-wide text-white/40">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full border border-white/12 rounded-2xl px-3.5 py-3 font-semibold bg-[#0F1218] text-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/35"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <p className="text-red-300 text-sm font-semibold bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-orange w-full py-3.5 disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Calculating outcomes...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" /> Predict rank & colleges
              </>
            )}
          </button>
        </form>

        {result && (
          <div className="rounded-3xl border border-[#F97316]/25 bg-gradient-to-br from-[#F97316]/15 to-transparent p-8 text-center mb-10">
            <p className="text-sm font-bold uppercase tracking-wide mb-2 text-white/50">
              Estimated rank range
            </p>
            <p className="font-display text-4xl md:text-5xl font-bold mb-3">
              {result.predicted_rank_min.toLocaleString()} –{' '}
              {result.predicted_rank_max.toLocaleString()}
            </p>
            <p className="text-sm text-white/55 font-medium">{result.note}</p>
          </div>
        )}

        {matches.length > 0 && (
          <div>
            <div className="flex items-end justify-between gap-3 mb-5">
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-bold">Your college shortlist</h2>
                <p className="text-sm text-white/50 font-medium mt-1">
                  Balanced Safe · Moderate · Reach picks for category {category}
                </p>
              </div>
            </div>
            <CollegeMatchResults
              matches={matches}
              summary={summary || undefined}
              note={matchNote}
              dark
              rank={
                result
                  ? Math.round((result.predicted_rank_min + result.predicted_rank_max) / 2)
                  : undefined
              }
              category={category}
            />
          </div>
        )}

        <p className="text-center mt-12">
          <Link to="/compare" className="text-[#F97316] font-bold hover:underline">
            Or compare two colleges side-by-side →
          </Link>
        </p>
      </div>
    </div>
  );
}
