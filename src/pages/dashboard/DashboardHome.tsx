import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck2,
  Crosshair,
  Gift,
  Map,
  Sparkles,
  TrendingUp,
  Search,
  FolderOpen,
  Grid3x3,
  Columns2,
  Building2,
  Heart,
  FileCheck2,
  Layers,
  User,
  Award,
  ShieldCheck,
  GraduationCap,
  Phone,
  Edit3,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Newspaper,
} from 'lucide-react';
import { useDashboard } from '../../contexts/DashboardContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiJson } from '../../lib/api';

interface Summary {
  college_count: number;
  seat_rows: number;
  saved_count: number;
  documents: { total: number; uploaded: number };
  applications: Array<{
    id: number;
    name: string;
    status: string;
    external_id?: string;
    notes?: string;
  }>;
  unread_notifications: number;
  profile: {
    full_name?: string;
    name?: string;
    email?: string;
    phone?: string;
    category?: string;
    sub_category?: string;
    domicile?: string;
    domicile_state?: string;
    state?: string;
    district?: string;
    neet_rank?: number;
    rank?: string | number;
    neet_score?: number;
    score?: number;
    marks?: string | number;
    neet_percentile?: number;
    preferred_course?: string;
    college_preference?: string;
    tuition_budget?: string;
    pwd_status?: boolean;
    defence_quota?: boolean;
    freedom_fighter_quota?: boolean;
    is_premium?: boolean;
    subscription_plan?: string;
    profile_completed?: boolean;
    onboarding_done?: boolean;
    completion_percentage?: number;
  } | null;
}

function statusStyle(status: string, dark: boolean) {
  const s = (status || '').toLowerCase();
  if (s === 'submitted' || s === 'active' || s === 'confirmed') {
    return dark
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (s === 'in progress' || s === 'review') {
    return dark
      ? 'bg-sky-500/15 text-sky-300 border-sky-500/25'
      : 'bg-sky-50 text-sky-700 border-sky-200';
  }
  return dark
    ? 'bg-orange-500/15 text-orange-300 border-orange-500/25'
    : 'bg-orange-50 text-orange-700 border-orange-200';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function ActivityChart({ dark }: { dark: boolean }) {
  const points = useMemo(() => {
    const vals = [12, 18, 14, 22, 19, 28, 24, 32, 30, 38, 35, 42];
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const w = 180;
    const h = 64;
    return vals
      .map((v, i) => {
        const x = (i / (vals.length - 1)) * w;
        const y = h - ((v - min) / (max - min || 1)) * (h - 8) - 4;
        return `${x},${y}`;
      })
      .join(' ');
  }, []);

  return (
    <div
      className={`rounded-2xl p-4 min-w-[200px] ${
        dark
          ? 'bg-white/[0.04] border border-white/10'
          : 'bg-white border border-orange-100/80 shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
            dark ? 'text-white/40' : 'text-[#9ca3af]'
          }`}
        >
          Weekly activity
        </p>
        <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
      </div>
      <svg viewBox="0 0 180 64" className="w-full h-[64px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="actFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke="#f97316"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
        <polygon fill="url(#actFill)" points={`0,64 ${points} 180,64`} />
      </svg>
    </div>
  );
}

function NewsWidget({ dark }: { dark: boolean }) {
  const [headline, setHeadline] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://newsdata.io/api/1/news?apikey=pub_cff7c67139b447a58b649e9cc2d292ac&q=neet OR "medical college"&country=in&language=en')
      .then(r => r.json())
      .then(d => {
        if (d && d.results && d.results.length > 0) {
          setHeadline(d.results[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Link
      to="/dashboard/notifications"
      className={`rounded-2xl p-4 flex flex-col gap-2 transition-all hover:-translate-y-0.5 ${
        dark
          ? 'bg-gradient-to-br from-teal-500/10 to-emerald-500/5 border border-teal-500/20 shadow-lg shadow-teal-500/5 hover:border-teal-500/40'
          : 'bg-gradient-to-br from-teal-50 to-emerald-50/50 border border-teal-200/50 shadow-sm hover:border-teal-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
          <Newspaper className="w-4 h-4" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest">Live News</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-teal-600/50 dark:text-teal-400/50" />
      </div>
      {loading ? (
        <div className="space-y-1.5">
          <div className="h-4 bg-teal-500/20 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-teal-500/10 rounded animate-pulse w-1/2" />
        </div>
      ) : headline ? (
        <div>
          <p className={`text-sm font-bold line-clamp-2 leading-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
            {headline.title}
          </p>
          <p className={`text-[10px] mt-1.5 font-semibold ${dark ? 'text-teal-200/50' : 'text-teal-700/60'}`}>
            {headline.source_id || 'Update'} • {new Date(headline.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      ) : (
        <p className={`text-xs font-medium ${dark ? 'text-white/50' : 'text-slate-500'}`}>
          No latest updates found.
        </p>
      )}
    </Link>
  );
}

export default function DashboardHome() {
  const { dark } = useDashboard();
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [data, notifs] = await Promise.all([
          apiJson<Summary>('/api/dashboard-summary', {}, true).catch(() => null),
          apiJson<any[]>('/api/notifications', {}, true).catch(() => [])
        ]);
        if (!cancelled) {
          if (data) setSummary(data);
          if (notifs) {
            setUnreadAlerts(notifs.filter(n => !n.read).length);
          }
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const name =
    summary?.profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Student';

  const unread = unreadAlerts || summary?.unread_notifications || 0;
  const card = dark
    ? 'bg-[#12151c] border-white/[0.07]'
    : 'bg-white border-[#e8ecf1] shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

  const tools = [
    {
      t: 'College predictor',
      d: 'Match rank → realistic colleges',
      to: '/dashboard/predictor',
      icon: Crosshair,
      accent: 'from-orange-500 to-amber-500',
      img: '/images/mbbswala/feat-05-map.jpg',
    },
    {
      t: 'Closing rank map',
      d: 'State competition at a glance',
      to: '/dashboard/competition-map',
      icon: Map,
      accent: 'from-sky-500 to-blue-600',
      img: '/images/mbbswala/feat-02-data.jpg',
    },
    {
      t: 'College finder',
      d: 'Browse college list',
      to: '/dashboard/finder',
      icon: Search,
      accent: 'from-violet-500 to-indigo-600',
      img: '/images/mbbswala/tools-college.jpg',
    },
    {
      t: 'Compare colleges',
      d: 'Fees, seats & cutoffs side by side',
      to: '/dashboard/compare',
      icon: Columns2,
      accent: 'from-emerald-500 to-teal-600',
      img: '/images/mbbswala/feature-college.jpg',
    },
    {
      t: 'Seat matrix',
      d: 'MP govt & private seat charts',
      to: '/dashboard/seat-matrix',
      icon: Grid3x3,
      accent: 'from-rose-500 to-pink-600',
      img: '/images/mbbswala/tools-data.jpg',
    },
    {
      t: 'Counselling',
      d: 'Track your counselling rounds',
      to: '/dashboard/counselling',
      icon: CalendarCheck2,
      accent: 'from-slate-600 to-slate-800',
      img: '/images/mbbswala/feat-04-docs.jpg',
    },
  ];

  const stats = [
    {
      l: 'Colleges',
      v: loading ? '…' : String(summary?.college_count ?? 0),
      to: '/dashboard/finder',
      icon: Building2,
      img: '/images/mbbswala/tools-college.jpg',
    },
    {
      l: 'Shortlist',
      v: loading ? '…' : String(summary?.saved_count ?? 0),
      to: '/dashboard/saved',
      icon: Heart,
      img: '/images/mbbswala/india-college-1.jpg',
    },
    {
      l: 'Seat rows',
      v: loading ? '…' : String(summary?.seat_rows ?? 0),
      to: '/dashboard/seat-matrix',
      icon: Layers,
      img: '/images/mbbswala/tools-data.jpg',
    },
    {
      l: 'Counselling',
      v: loading ? '…' : 'Open',
      to: '/dashboard/counselling',
      icon: CalendarCheck2,
      img: '/images/mbbswala/feat-04-docs.jpg',
    },
  ];

  return (
    <div className="max-w-[1080px] mx-auto w-full space-y-5 pb-8">
      {/* Hero */}
      <section
        className={`relative overflow-hidden rounded-[24px] border p-5 sm:p-7 ${
          dark
            ? 'bg-gradient-to-br from-[#1a1410] via-[#12151c] to-[#0f1117] border-orange-500/15'
            : 'bg-gradient-to-br from-[#fff8f3] via-white to-[#f8fafc] border-orange-100 shadow-sm'
        }`}
      >
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-orange-400/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-600">
                Student dashboard
              </span>
            </div>

            <h2
              className={`text-[1.65rem] sm:text-[2rem] font-bold tracking-tight leading-[1.15] mb-2 ${
                dark ? 'text-white' : 'text-[#0f172a]'
              }`}
            >
              {greeting()},{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff7a1a] to-[#f97316]">
                {name}
              </span>
            </h2>
            <p
              className={`text-[14px] sm:text-[15px] font-semibold leading-relaxed max-w-xl mb-5 ${
                dark ? 'text-white/70' : 'text-[#374151]'
              }`}
            >
              Your command centre for ranks, colleges, seat matrix, documents and counsellor
              booking.
            </p>

            {error && <p className="mb-4 text-sm font-semibold text-red-500">{error}</p>}

            <div className="flex flex-wrap gap-2">
              <Link
                to="/dashboard/predictor"
                className="inline-flex items-center gap-2 rounded-full bg-[#111827] text-white px-4 py-2.5 text-sm font-bold shadow-lg hover:bg-black transition-colors"
              >
                <Crosshair className="w-4 h-4" /> Run predictor
              </Link>
              <Link
                to="/dashboard/competition-map"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0ea5e9] to-[#2563eb] text-white px-4 py-2.5 text-sm font-bold shadow-lg shadow-sky-500/20"
              >
                <Map className="w-4 h-4" /> Rank map
              </Link>
              <Link
                to="/dashboard/refer"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff7a1a] to-[#f97316] text-white px-4 py-2.5 text-sm font-bold shadow-lg shadow-orange-500/25"
              >
                <Gift className="w-4 h-4" /> Refer ₹500
              </Link>
              <Link
                to="/dashboard/counselling"
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold border ${
                  dark
                    ? 'border-white/15 bg-white/5 hover:bg-white/10'
                    : 'border-[#e5e7eb] bg-white hover:bg-[#f8fafc] shadow-sm'
                }`}
              >
                <CalendarCheck2 className="w-4 h-4" /> Book counsellor
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-3 shrink-0 w-full sm:w-auto sm:min-w-[210px]">
            <ActivityChart dark={dark} />
            <div
              className={`rounded-2xl p-4 flex items-center justify-between ${
                dark
                  ? 'bg-white/[0.04] border border-white/10'
                  : 'bg-white border border-orange-100 shadow-sm'
              }`}
            >
              <div>
                <p className="text-2xl font-black text-orange-500 leading-none">
                  {loading ? '…' : `+${unread}`}
                </p>
                <p className={`text-xs font-semibold mt-1 ${dark ? 'text-white/45' : 'text-[#9ca3af]'}`}>
                  unread alerts
                </p>
              </div>
              <Link
                to="/dashboard/notifications"
                className="text-sm font-bold text-orange-500 inline-flex items-center gap-1 hover:underline"
              >
                Inbox <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            
            <NewsWidget dark={dark} />
          </div>
        </div>
      </section>

      {/* Candidate NEET Profile & Quota Snapshot */}
      {summary?.profile && (
        <section
          className={`rounded-[22px] border p-5 sm:p-6 transition-all ${
            dark
              ? 'bg-gradient-to-br from-[#151922] via-[#10131a] to-[#0c0e14] border-white/10 shadow-lg'
              : 'bg-gradient-to-br from-white via-orange-50/20 to-slate-50 border-orange-100/80 shadow-[0_2px_8px_rgba(249,115,22,0.06)]'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-dashed border-orange-500/20">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-orange-500/25 shrink-0">
                {(summary.profile.full_name || summary.profile.name || user?.email || 'S')
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-base sm:text-lg font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
                    {summary.profile.full_name || summary.profile.name || 'Candidate Profile'}
                  </h3>
                  {summary.profile.profile_completed || summary.profile.onboarding_done ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                      <CheckCircle2 className="w-3 h-3" /> Profile Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                      <AlertCircle className="w-3 h-3" /> Incomplete
                    </span>
                  )}
                </div>
                <div className={`text-xs font-semibold flex items-center gap-3 flex-wrap mt-0.5 ${dark ? 'text-white/60' : 'text-slate-500'}`}>
                  {summary.profile.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3 text-orange-500" />
                      {summary.profile.phone}
                    </span>
                  )}
                  {summary.profile.email && <span>{summary.profile.email}</span>}
                  <span className="text-orange-500 font-bold">
                    {summary.profile.preferred_course || 'MBBS'} • {summary.profile.domicile_state || summary.profile.domicile || 'All India'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/dashboard/profile"
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  dark
                    ? 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                    : 'bg-white hover:bg-orange-50 text-slate-800 border border-slate-200 shadow-sm'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-orange-500" /> Edit Profile & Score
              </Link>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {/* NEET Score */}
            <div
              className={`p-3.5 rounded-xl border ${
                dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-100 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${dark ? 'text-white/60' : 'text-slate-500'}`}>
                  NEET Score
                </span>
                <Award className="w-4 h-4 text-orange-500" />
              </div>
              <p className={`text-xl sm:text-2xl font-black tabular-nums ${dark ? 'text-white' : 'text-slate-900'}`}>
                {summary.profile.neet_score != null
                  ? `${summary.profile.neet_score} / 720`
                  : summary.profile.score != null
                  ? `${summary.profile.score} / 720`
                  : summary.profile.marks
                  ? `${summary.profile.marks} / 720`
                  : '—'}
              </p>
              <p className={`text-[11px] font-semibold mt-0.5 ${dark ? 'text-white/50' : 'text-slate-400'}`}>
                {summary.profile.neet_percentile
                  ? `${summary.profile.neet_percentile}% Percentile`
                  : 'Official NEET Marks'}
              </p>
            </div>

            {/* NEET Rank */}
            <div
              className={`p-3.5 rounded-xl border ${
                dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-100 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${dark ? 'text-white/60' : 'text-slate-500'}`}>
                  NEET Rank (AIR)
                </span>
                <TrendingUp className="w-4 h-4 text-sky-500" />
              </div>
              <p className={`text-xl sm:text-2xl font-black tabular-nums ${dark ? 'text-white' : 'text-slate-900'}`}>
                {summary.profile.neet_rank != null
                  ? `#${Number(summary.profile.neet_rank).toLocaleString('en-IN')}`
                  : summary.profile.rank
                  ? `#${Number(summary.profile.rank).toLocaleString('en-IN')}`
                  : '—'}
              </p>
              <p className={`text-[11px] font-semibold mt-0.5 ${dark ? 'text-white/50' : 'text-slate-400'}`}>
                All India Merit Rank
              </p>
            </div>

            {/* Domicile State & Quota */}
            <div
              className={`p-3.5 rounded-xl border ${
                dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-100 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${dark ? 'text-white/60' : 'text-slate-500'}`}>
                  State Domicile
                </span>
                <Map className="w-4 h-4 text-emerald-500" />
              </div>
              <p className={`text-base sm:text-lg font-black truncate ${dark ? 'text-white' : 'text-slate-900'}`}>
                {summary.profile.domicile_state || summary.profile.domicile || summary.profile.state || 'All India'}
              </p>
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> 85% State Quota
              </p>
            </div>

            {/* Category & Quotas */}
            <div
              className={`p-3.5 rounded-xl border ${
                dark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-100 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${dark ? 'text-white/60' : 'text-slate-500'}`}>
                  Category / Quotas
                </span>
                <GraduationCap className="w-4 h-4 text-violet-500" />
              </div>
              <p className={`text-base sm:text-lg font-black truncate ${dark ? 'text-white' : 'text-slate-900'}`}>
                {summary.profile.category || 'General (UR)'}
              </p>
              <p className={`text-[11px] font-semibold mt-0.5 truncate ${dark ? 'text-white/50' : 'text-slate-400'}`}>
                {summary.profile.pwd_status
                  ? 'PwD Quota Active'
                  : summary.profile.defence_quota
                  ? 'Defence Quota Active'
                  : summary.profile.tuition_budget
                  ? `Budget: ${summary.profile.tuition_budget}`
                  : 'AIQ + State Eligible'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Stats with images + high-contrast text (light & dark) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Link
            key={s.l}
            to={s.to}
            className={`group relative overflow-hidden rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md ${
              dark ? 'border-white/10 bg-[#12151c]' : 'border-[#e5e7eb] bg-white shadow-sm'
            }`}
          >
            <div className="absolute inset-0">
              <img
                src={s.img}
                alt=""
                className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity"
              />
              <div
                className={`absolute inset-0 ${
                  dark
                    ? 'bg-gradient-to-t from-[#0a0b10] via-[#12151c]/70 to-[#12151c]/20'
                    : 'bg-gradient-to-t from-white via-white/80 to-white/20'
                }`}
              />
            </div>
            <div className="relative z-10 p-4">
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`w-9 h-9 rounded-xl grid place-items-center ${
                    dark ? 'bg-orange-500 text-white' : 'bg-orange-500 text-white'
                  } shadow-md shadow-orange-500/25`}
                >
                  <s.icon className="w-4 h-4" strokeWidth={2.4} />
                </span>
                <ArrowRight
                  className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                    dark ? 'text-white/60' : 'text-[#4b5563]'
                  }`}
                />
              </div>
              <p
                className={`text-[11px] font-extrabold uppercase tracking-wide mb-1 ${
                  dark ? 'text-white/70' : 'text-[#374151]'
                }`}
              >
                {s.l}
              </p>
              <p
                className={`text-2xl font-black tracking-tight tabular-nums ${
                  dark ? 'text-white' : 'text-[#0f172a]'
                }`}
              >
                {s.v}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Tools grid — images restored + readable labels */}
      <div>
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h3 className={`font-bold text-[15px] ${dark ? 'text-white' : 'text-[#0f172a]'}`}>
            Quick tools
          </h3>
          <Link to="/dashboard/finder" className="text-xs font-bold text-orange-500 hover:underline">
            View all
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className={`group relative overflow-hidden rounded-[20px] border transition-all hover:-translate-y-0.5 hover:shadow-md min-h-[132px] ${
                dark ? 'border-white/10 bg-[#12151c]' : 'border-[#e5e7eb] bg-white shadow-sm'
              }`}
            >
              <div className="absolute inset-0">
                <img
                  src={tool.img}
                  alt=""
                  className="w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-105 transition-all duration-500"
                />
                <div
                  className={`absolute inset-0 ${
                    dark
                      ? 'bg-gradient-to-r from-[#0a0b10] via-[#12151c]/80 to-[#12151c]/20'
                      : 'bg-gradient-to-r from-white via-white/80 to-white/20'
                  }`}
                />
              </div>
              <div className="relative z-10 p-4 flex flex-col h-full">
                <span
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.accent} text-white grid place-items-center mb-3 shadow-md`}
                >
                  <tool.icon className="w-4.5 h-4.5" />
                </span>
                <p className={`font-bold text-[15px] mb-0.5 ${dark ? 'text-white' : 'text-[#0f172a]'}`}>
                  {tool.t}
                </p>
                <p className={`text-xs font-semibold ${dark ? 'text-white/70' : 'text-[#4b5563]'}`}>
                  {tool.d}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
