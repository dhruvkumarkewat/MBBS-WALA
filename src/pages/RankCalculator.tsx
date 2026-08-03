import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Loader2, Sparkles, Trophy, Award, MapPin, CheckCircle2 } from 'lucide-react';
import CollegeMatchResults, { type MatchRow } from '../components/CollegeMatchResults';
import { MEDICAL_COURSES, maxScoreForCourse } from '../lib/courses';

const EXAMS = ['NEET UG', 'NEET PG', 'NEET MDS', 'INICET', 'NEET SS', 'DNB PDCET'];
const CATEGORIES = ['General', 'OBC', 'EWS', 'SC', 'ST'];
const POPULAR_STATES = [
  'All India (AIQ)',
  'Madhya Pradesh',
  'Maharashtra',
  'Uttar Pradesh',
  'Karnataka',
  'Delhi',
  'Rajasthan',
  'Tamil Nadu',
  'Gujarat',
  'West Bengal',
  'Kerala',
  'Bihar',
  'Andhra Pradesh',
  'Telangana',
  'Punjab',
  'Haryana',
  'Odisha',
];

const maxScores: Record<string, number> = {
  'NEET UG': 720,
  'NEET PG': 800,
  'NEET MDS': 960,
  INICET: 200,
  'NEET SS': 400,
  'DNB PDCET': 300,
};

const RANK_PRESETS = [
  { label: 'Top 5,000', value: '4500' },
  { label: '15,000', value: '15000' },
  { label: '35,000', value: '35000' },
  { label: '65,000', value: '65000' },
  { label: '1,00,000+', value: '110000' },
];

const SCORE_PRESETS = [
  { label: '650+ (Top GMCs)', value: '655' },
  { label: '600+ (Govt MBBS)', value: '605' },
  { label: '540+ (Safe State)', value: '545' },
  { label: '480+ (BDS / AYUSH)', value: '485' },
  { label: '380+ (Private / Deemed)', value: '385' },
];

export default function RankCalculator() {
  const [mode, setMode] = useState<'rank' | 'score'>('rank');
  const [exam, setExam] = useState('NEET UG');
  const [course, setCourse] = useState('MBBS');
  const [rank, setRank] = useState('15000');
  const [score, setScore] = useState('610');
  const [category, setCategory] = useState('General');
  const [state, setState] = useState('All India (AIQ)');

  const [result, setResult] = useState<{
    predicted_rank_min: number;
    predicted_rank_max: number;
    score?: number;
    rank?: number;
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

    let targetRank = 0;

    if (mode === 'rank') {
      const r = Number(rank);
      if (!rank || Number.isNaN(r) || r < 1 || r > 2500000) {
        setError('Please enter a valid All India Rank (AIR) between 1 and 25,00,000');
        return;
      }
      targetRank = r;
    } else {
      const s = Number(score);
      if (!score || Number.isNaN(s) || s < 0 || s > scoreCap) {
        setError(`Please enter a valid score between 0 and ${scoreCap}`);
        return;
      }
    }

    setLoading(true);
    try {
      // 1. Calculate / normalize rank & score
      const calcPayload =
        mode === 'rank'
          ? { exam, rank: targetRank, category, course: showCourse ? course : undefined }
          : { exam, score: Number(score), category, course: showCourse ? course : undefined };

      const res = await fetch('/api/rank-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calcPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Prediction calculation failed');
      setResult(data);

      if (mode === 'score') {
        targetRank = Math.round((data.predicted_rank_min + data.predicted_rank_max) / 2);
      }

      // 2. Fetch matched colleges
      const mRes = await fetch('/api/college-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rank: targetRank,
          category,
          state: state === 'All India (AIQ)' ? undefined : state,
          course: showCourse ? course : 'MBBS',
          limit: 18,
        }),
      });
      const mData = await mRes.json();
      if (mRes.ok) {
        setMatches(mData.matches || []);
        setSummary(mData.summary || null);
        setMatchNote(mData.note || '');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong while predicting colleges');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] text-white">
      <div className="px-4 sm:px-8 py-12 md:py-16 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F97316]/15 border border-[#F97316]/25 mb-4 shadow-lg shadow-orange-500/10">
            <Calculator className="w-7 h-7 text-[#F97316]" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F97316] mb-2 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Smart Medical Predictor
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight mb-3">
            Rank → College Predictor
          </h1>
          <p className="text-white/60 font-medium max-w-xl mx-auto leading-relaxed">
            Enter your <strong className="text-white">NEET All India Rank (AIR)</strong> or score to discover your Safe, Moderate, and Reach college admissions across MBBS, BDS, and AYUSH courses.
          </p>
        </div>

        {/* Input Mode Selector (Rank vs Score) */}
        <div className="flex p-1.5 rounded-2xl bg-white/[0.06] border border-white/10 max-w-md mx-auto mb-8">
          <button
            type="button"
            onClick={() => {
              setMode('rank');
              setResult(null);
              setMatches([]);
            }}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'rank'
                ? 'bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white shadow-lg shadow-orange-500/25'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>By NEET Rank (AIR)</span>
            <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded-full bg-white/20">
              Direct
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('score');
              setResult(null);
              setMatches([]);
            }}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'score'
                ? 'bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white shadow-lg shadow-orange-500/25'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>By Marks / Score</span>
          </button>
        </div>

        <form
          onSubmit={submit}
          className="rounded-3xl border border-white/10 bg-[#171B24] p-6 md:p-8 space-y-6 mb-10 shadow-2xl relative overflow-hidden"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Exam selector */}
            <label className="block text-left">
              <span className="text-xs font-bold uppercase tracking-wide text-white/50">Target Exam</span>
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

            {/* Course selector */}
            {showCourse && (
              <label className="block text-left">
                <span className="text-xs font-bold uppercase tracking-wide text-white/50">Course</span>
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

            {/* Primary input: RANK or SCORE */}
            {mode === 'rank' ? (
              <div className="block text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-orange-400">
                    All India Rank (AIR) *
                  </span>
                  <span className="text-[11px] text-white/40 font-medium">e.g. 15400</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="2500000"
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  placeholder="Enter your NEET AIR (e.g. 15400)"
                  className="mt-1.5 w-full border-2 border-orange-500/40 rounded-2xl px-3.5 py-3 font-bold text-lg bg-[#0F1218] text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-[#F97316]/35"
                  required
                />
                {/* Quick rank presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] font-bold text-white/40 uppercase self-center mr-1">
                    Quick:
                  </span>
                  {RANK_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setRank(p.value)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold border transition ${
                        rank === p.value
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="block text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-orange-400">
                    Score (out of {scoreCap}) *
                  </span>
                  <span className="text-[11px] text-white/40 font-medium">e.g. 610</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={scoreCap}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder={`e.g. ${Math.round(scoreCap * 0.75)}`}
                  className="mt-1.5 w-full border-2 border-orange-500/40 rounded-2xl px-3.5 py-3 font-bold text-lg bg-[#0F1218] text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-[#F97316]/35"
                  required
                />
                {/* Quick score presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] font-bold text-white/40 uppercase self-center mr-1">
                    Quick:
                  </span>
                  {SCORE_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setScore(p.value)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold border transition ${
                        score === p.value
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category selector */}
            <label className="block text-left">
              <span className="text-xs font-bold uppercase tracking-wide text-white/50">Counselling Category</span>
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

            {/* State Domicile filter */}
            <label className="block text-left sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wide text-white/50 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-orange-400" /> State Domicile / Quota Filter
              </span>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1.5 w-full border border-white/12 rounded-2xl px-3.5 py-3 font-semibold bg-[#0F1218] text-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/35"
              >
                {POPULAR_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <p className="text-red-300 text-sm font-semibold bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-2xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-orange w-full py-4 text-base font-black disabled:opacity-60 inline-flex items-center justify-center gap-2 shadow-xl shadow-orange-500/20 rounded-2xl cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Matching colleges from live cutoff matrix...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {mode === 'rank'
                  ? `Predict Colleges for Rank #${Number(rank || 0).toLocaleString()}`
                  : 'Calculate Rank & Predict Colleges'}
              </>
            )}
          </button>
        </form>

        {/* Prediction Summary Hero Card */}
        {result && (
          <div className="rounded-3xl border border-[#F97316]/30 bg-gradient-to-br from-[#F97316]/20 via-[#171B24] to-[#0F1218] p-6 sm:p-8 mb-10 shadow-2xl relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#F97316]">
                  {mode === 'rank' ? 'Rank Prediction Active' : 'Estimated Rank Outcome'}
                </p>
                <h3 className="font-display text-3xl md:text-4xl font-black text-white mt-1">
                  {mode === 'rank' ? (
                    <>AIR #{Number(result.rank || rank).toLocaleString()}</>
                  ) : (
                    <>
                      {result.predicted_rank_min.toLocaleString()} –{' '}
                      {result.predicted_rank_max.toLocaleString()}
                    </>
                  )}
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-full bg-white/10 text-xs font-bold text-white border border-white/10">
                  {category}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-orange-500/20 text-xs font-bold text-orange-300 border border-orange-500/30">
                  {course}
                </span>
                {result.score && (
                  <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                    ~{result.score} Marks
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm text-white/70 font-medium leading-relaxed max-w-2xl">
              {result.note}
            </p>
          </div>
        )}

        {/* Matched Colleges List */}
        {matches.length > 0 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl md:text-3xl font-black">
                  Recommended College Matches
                </h2>
                <p className="text-sm text-white/55 font-medium mt-1">
                  Categorized into Safe (high admission chance), Moderate (competitive), and Reach picks.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-white/50 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Live Cutoff Data
              </div>
            </div>

            <CollegeMatchResults
              matches={matches}
              summary={summary || undefined}
              note={matchNote}
              dark
              rank={
                mode === 'rank'
                  ? Number(rank)
                  : result
                  ? Math.round((result.predicted_rank_min + result.predicted_rank_max) / 2)
                  : undefined
              }
              category={category}
            />
          </div>
        )}

        <div className="mt-12 text-center p-6 rounded-3xl bg-white/[0.03] border border-white/8">
          <p className="text-sm text-white/60 mb-2">
            Need personalized one-on-one choice filling assistance or state quota guidance?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/packages" className="btn-orange px-5 py-2.5 text-sm font-bold">
              View Counselling Packages
            </Link>
            <Link to="/compare" className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-sm font-bold text-white transition">
              Compare 2 Colleges Side-by-Side →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
