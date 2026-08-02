import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wallet,
  Gift,
  Trophy,
  Medal,
  Target,
  Ticket,
  TrendingUp,
  History,
  Copy,
  Check,
  Share2,
  IndianRupee,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Crown,
  Flame,
  Coins,
  Gem,
  Megaphone,
  Sparkles,
  ChevronRight,
  Banknote,
} from 'lucide-react';
import { useDashboard } from '../../contexts/DashboardContext';
import { apiJson } from '../../lib/api';
import { BarChart } from '../../components/ui/Charts';
import Progress from '../../components/ui/Progress';

function useShell() {
  const { dark } = useDashboard();
  return {
    dark,
    card: dark
      ? 'bg-[#121820] border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.35)]'
      : 'bg-white border-black/5 shadow-[0_10px_40px_rgba(14,17,23,0.05)]',
    muted: dark ? 'text-white/50' : 'text-muted',
    input: dark
      ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30'
      : 'bg-[#f6f7f9] border-black/8 text-ink',
    soft: dark ? 'bg-white/5' : 'bg-[#f6f7f9]',
  };
}

function PageHead({ title, sub }: { title: string; sub?: string }) {
  const { muted } = useShell();
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
      {sub && <p className={`text-sm font-medium mt-1.5 ${muted}`}>{sub}</p>}
    </div>
  );
}

function Err({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="mb-4 text-sm font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
      {message}
    </p>
  );
}

function inr(n: number) {
  return `₹${(n || 0).toLocaleString('en-IN')}`;
}

const badgeIconMap: Record<string, typeof Trophy> = {
  share: Share2,
  users: Users,
  megaphone: Megaphone,
  trophy: Trophy,
  coins: Coins,
  gem: Gem,
  flame: Flame,
  medal: Medal,
};

const tierStyle: Record<string, string> = {
  bronze: 'from-amber-700/90 to-orange-800',
  silver: 'from-slate-400 to-slate-600',
  gold: 'from-amber-400 to-yellow-600',
};

/* ===================== REFER & EARN ===================== */
export function ReferEarnPage() {
  const s = useShell();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<{
    referral_code: string;
    share_url: string;
    rewards: { referrer: number; referee: number };
    stats: { total: number; completed: number; pending: number; earned: number };
    referrals: Array<{
      id: number;
      referee_name: string;
      referee_email: string;
      status: string;
      referrer_reward: number;
      created_at: string;
    }>;
  } | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [applyCode, setApplyCode] = useState('');
  const [applyMsg, setApplyMsg] = useState('');
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await apiJson<typeof data>('/api/referrals', {}, true);
      setData(d as NonNullable<typeof data>);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copy = async (text: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* ignore */
    }
  };

  const shareNative = async () => {
    if (!data) return;
    const text = `Join MBBSWala with my code ${data.referral_code} — get ₹${data.rewards.referee} off counselling. I get ₹${data.rewards.referrer} too! ${data.share_url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'MBBSWala Referral', text, url: data.share_url });
        await apiJson('/api/challenges', {
          method: 'POST',
          body: JSON.stringify({ challenge_slug: 'share-story' }),
        }, true).catch(() => null);
      } catch {
        /* cancelled */
      }
    } else {
      copy(text, 'link');
    }
  };

  const apply = async (e: FormEvent) => {
    e.preventDefault();
    if (!applyCode.trim()) return;
    setApplying(true);
    setApplyMsg('');
    try {
      const res = await apiJson<{ message: string; coupon_code?: string }>(
        '/api/referrals',
        {
          method: 'POST',
          body: JSON.stringify({ action: 'apply', code: applyCode.trim() }),
        },
        true
      );
      setApplyMsg(res.message + (res.coupon_code ? ` Coupon: ${res.coupon_code}` : ''));
      setApplyCode('');
      load();
    } catch (err: unknown) {
      setApplyMsg(err instanceof Error ? err.message : 'Failed');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="refer-earn max-w-5xl space-y-7">
      <div className="mb-2">
        <p className="refer-kicker mb-2">
          <Gift className="w-3.5 h-3.5 text-primary" /> Rewards programme
        </p>
        <h2 className="refer-page-title">
          Refer <span className="refer-amp">&</span> Earn
        </h2>
        <p className={`refer-page-sub mt-2 max-w-xl ${s.muted}`}>
          Share your personal code — friends unlock{' '}
          <span className="refer-em">₹500 off counselling</span>, you receive{' '}
          <span className="refer-em">₹500 in your wallet</span>.
        </p>
      </div>
      <Err message={error} />

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="refer-hero relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#0e1117] via-[#151b26] to-[#1c1917] p-7 md:p-10 text-white shadow-2xl"
      >
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-orange-500/25 blur-3xl" />
        <div className="absolute -left-8 bottom-0 w-44 h-44 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:18px_18px]" />
        <div className="relative grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/8 border border-white/10 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75 mb-5">
              <Gift className="w-3.5 h-3.5 text-orange-400" /> Double reward
            </div>
            <div className="flex gap-4 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex-1 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5">Friend gets</p>
                <p className="text-3xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent mb-1">
                  ₹500
                </p>
                <p className="text-[11px] font-medium text-orange-400/90">Discount coupon</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex-1 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5">You get</p>
                <p className="text-3xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent mb-1">
                  ₹500
                </p>
                <p className="text-[11px] font-medium text-amber-400/90">Wallet credit</p>
              </div>
            </div>
            <p className="refer-hero-body text-white/65 mb-7 max-w-md">
              Every friend who joins with your code unlocks a counselling discount — and your wallet
              credits the moment they apply it.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={shareNative}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 font-semibold text-[13px] tracking-wide transition-all shadow-lg shadow-orange-500/30"
              >
                <Share2 className="w-4 h-4" /> Share invite
              </button>
              <Link
                to="/dashboard/wallet"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/8 hover:bg-white/12 font-semibold text-[13px] tracking-wide border border-white/12"
              >
                <Wallet className="w-4 h-4" /> Open wallet
              </Link>
            </div>
          </div>
          <div className="space-y-3.5">
            <div className="rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/12 p-5">
              <p className="refer-label text-white/45 mb-2.5">Your referral code</p>
              <div className="flex items-center gap-3">
                <code className="refer-code flex-1 text-white">
                  {data?.referral_code || '—'}
                </code>
                <button
                  type="button"
                  onClick={() => data && copy(data.referral_code, 'code')}
                  className="h-11 w-11 rounded-xl bg-white text-ink grid place-items-center hover:scale-105 transition-transform shrink-0"
                  aria-label="Copy code"
                >
                  {copied === 'code' ? (
                    <Check className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div className="rounded-2xl bg-white/[0.07] backdrop-blur-md border border-white/12 p-5">
              <p className="refer-label text-white/45 mb-2.5">Invite link</p>
              <div className="flex items-center gap-3">
                <p className="refer-link flex-1 truncate text-white/80">
                  {data?.share_url || '—'}
                </p>
                <button
                  type="button"
                  onClick={() => data && copy(data.share_url, 'link')}
                  className="h-10 px-3.5 rounded-xl bg-white/12 text-[11px] font-semibold tracking-wide uppercase hover:bg-white/20 shrink-0"
                >
                  {copied === 'link' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { l: 'Total invites', v: data?.stats?.total ?? 0, icon: Users, c: 'text-sky-500' },
          { l: 'Completed', v: data?.stats?.completed ?? 0, icon: Check, c: 'text-emerald-500' },
          { l: 'Pending', v: data?.stats?.pending ?? 0, icon: Loader2, c: 'text-amber-500' },
          {
            l: 'Earned',
            v: inr(data?.stats?.earned ?? 0),
            icon: IndianRupee,
            c: 'text-orange-500',
          },
        ].map((x) => (
          <div key={x.l} className={`refer-stat rounded-2xl border p-5 ${s.card}`}>
            <div className="flex items-center justify-between mb-3">
              <x.icon className={`w-5 h-5 ${x.c}`} />
            </div>
            <p className="refer-stat-value">{x.v}</p>
            <p className={`refer-stat-label mt-1.5 ${s.muted}`}>{x.l}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* How it works */}
        <div className={`lg:col-span-2 rounded-2xl border p-6 ${s.card}`}>
          <h4 className="refer-section-title mb-5 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-primary" /> How it works
          </h4>
          <ol className="space-y-5">
            {[
              'Share your unique code or link with friends preparing for NEET / MBBS.',
              'They sign up and apply your code on this page (or at registration).',
              `They unlock ₹${data?.rewards.referee ?? 500} counselling discount coupon.`,
              `You instantly receive ₹${data?.rewards.referrer ?? 500} in your MBBSWala wallet.`,
            ].map((t, i) => (
              <li key={t} className="flex gap-3.5">
                <span className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-orange-700 text-white text-[12px] font-bold grid place-items-center shrink-0 shadow-sm shadow-orange-500/20">
                  {i + 1}
                </span>
                <span className={`refer-step-text pt-1 ${s.muted}`}>{t}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Apply code */}
        <div className={`lg:col-span-3 rounded-2xl border p-6 ${s.card}`}>
          <h4 className="refer-section-title mb-1.5">Have a friend&apos;s code?</h4>
          <p className={`refer-body mb-5 ${s.muted}`}>
            Apply once to unlock <span className="refer-em">₹500 off</span> your counselling package.
          </p>
          <form onSubmit={apply} className="flex flex-col sm:flex-row gap-2.5">
            <input
              value={applyCode}
              onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
              placeholder="Enter code e.g. MBWUSERA1B2"
              className={`refer-input flex-1 rounded-xl border px-4 py-3.5 ${s.input}`}
            />
            <button
              type="submit"
              disabled={applying}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-ink text-white font-semibold text-[13px] tracking-wide hover:opacity-90 disabled:opacity-60"
            >
              {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
              Apply code
            </button>
          </form>
          {applyMsg && (
            <p className="mt-3.5 text-sm font-semibold leading-relaxed text-emerald-600 bg-emerald-500/10 rounded-xl px-3.5 py-2.5">
              {applyMsg}
            </p>
          )}

          <div className="mt-7">
            <div className="flex items-center justify-between mb-4">
              <h4 className="refer-section-title">Your referrals</h4>
              <Link
                to="/dashboard/leaderboard"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary inline-flex items-center gap-1 hover:opacity-80"
              >
                Leaderboard <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto zn-scroll">
              {(data?.referrals || []).length === 0 && (
                <p className={`refer-body ${s.muted}`}>
                  No referrals yet — share your code to start earning.
                </p>
              )}
              {(data?.referrals || []).map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 ${s.soft}`}
                >
                  <div className="min-w-0">
                    <p className="refer-name truncate">
                      {r.referee_name || r.referee_email || 'Friend'}
                    </p>
                    <p className={`refer-meta mt-0.5 ${s.muted}`}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`refer-badge ${
                        r.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-600'
                          : 'bg-amber-500/15 text-amber-600'
                      }`}
                    >
                      {r.status}
                    </span>
                    {r.status === 'completed' && (
                      <p className="refer-reward mt-1">
                        +{inr(r.referrer_reward || 500)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== WALLET ===================== */
export function WalletPage() {
  const s = useShell();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState<{
    wallet: {
      balance: number;
      lifetime_earned: number;
      lifetime_withdrawn: number;
      referral_code: string;
    };
    transactions: Array<{
      id: number;
      type: string;
      amount: number;
      balance_after: number;
      description: string;
      created_at: string;
    }>;
    analytics: {
      monthly: Array<{ label: string; amount: number }>;
      total_earned: number;
      total_withdrawn: number;
      available: number;
    };
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await apiJson<typeof payload>('/api/wallet', {}, true);
        setPayload(d as NonNullable<typeof payload>);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const w = payload?.wallet;
  const monthly = payload?.analytics?.monthly || [];
  const chartValues = monthly.map((m) => m.amount);
  const chartLabels = monthly.map((m) => m.label);

  return (
    <div className="max-w-5xl space-y-6">
      <PageHead title="Wallet" sub="Referral rewards, bonuses and withdrawable balance" />
      <Err message={error} />

      <div className="grid md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="md:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e1117] to-[#1e293b] text-white p-6 md:p-8 border border-white/10"
        >
          <div className="absolute right-6 top-6 opacity-20">
            <Wallet className="w-24 h-24" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-2">
            Available balance
          </p>
          <p className="font-display text-5xl font-bold mb-6">{inr(w?.balance || 0)}</p>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-white/50 text-xs font-bold uppercase">Lifetime earned</p>
              <p className="font-black text-lg text-emerald-400">{inr(w?.lifetime_earned || 0)}</p>
            </div>
            <div>
              <p className="text-white/50 text-xs font-bold uppercase">Withdrawn</p>
              <p className="font-black text-lg">{inr(w?.lifetime_withdrawn || 0)}</p>
            </div>
            <div>
              <p className="text-white/50 text-xs font-bold uppercase">Code</p>
              <p className="font-mono font-bold">{w?.referral_code}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-6">
            <Link
              to="/dashboard/withdrawals"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-500 font-bold text-sm hover:bg-orange-400"
            >
              <Banknote className="w-4 h-4" /> Withdraw
            </Link>
            <Link
              to="/dashboard/refer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/15 font-bold text-sm"
            >
              Earn more
            </Link>
          </div>
        </motion.div>

        <div className={`rounded-3xl border p-5 ${s.card}`}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> 6-month earnings
          </p>
          {chartValues.some((d) => d > 0) ? (
            <BarChart data={chartValues} labels={chartLabels} height={160} />
          ) : (
            <div className={`h-40 rounded-2xl grid place-items-center text-sm ${s.soft} ${s.muted}`}>
              Earnings appear after referrals
            </div>
          )}
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${s.card}`}>
        <div className="px-5 py-4 border-b border-inherit flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <h4 className="font-bold">Recent activity</h4>
        </div>
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {(payload?.transactions || []).length === 0 && (
            <p className={`p-6 text-sm ${s.muted}`}>No transactions yet.</p>
          )}
          {(payload?.transactions || []).map((t) => {
            const credit = (t.amount || 0) >= 0 && t.type !== 'withdrawal';
            return (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3.5">
                <span
                  className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${
                    credit ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-500'
                  }`}
                >
                  {credit ? (
                    <ArrowDownLeft className="w-4 h-4" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{t.description}</p>
                  <p className={`text-xs ${s.muted}`}>
                    {t.type.replace(/_/g, ' ')} ·{' '}
                    {t.created_at ? new Date(t.created_at).toLocaleString('en-IN') : '—'}
                  </p>
                </div>
                <p className={`font-black tabular-nums ${credit ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {credit ? '+' : ''}
                  {inr(t.amount)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ===================== LEADERBOARD ===================== */
export function LeaderboardPage() {
  const s = useShell();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [board, setBoard] = useState<
    Array<{
      rank: number;
      name: string;
      lifetime_earned: number;
      referrals: number;
      is_you: boolean;
      referral_code: string;
    }>
  >([]);
  const [you, setYou] = useState<(typeof board)[0] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await apiJson<{ leaderboard: typeof board; you: (typeof board)[0] | null }>(
          '/api/leaderboard',
          {},
          true
        );
        setBoard(d.leaderboard || []);
        setYou(d.you);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const podium = useMemo(() => board.slice(0, 3), [board]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <PageHead title="Leaderboard" sub="Top earners this season — climb with successful referrals" />
      <Err message={error} />

      {/* Podium */}
      <div className="grid grid-cols-3 gap-3 items-end pt-4">
        {[podium[1], podium[0], podium[2]].map((p, idx) => {
          if (!p) {
            return <div key={idx} className={`rounded-2xl border h-28 ${s.card} opacity-40`} />;
          }
          const place = p.rank;
          const h = place === 1 ? 'h-44' : place === 2 ? 'h-36' : 'h-32';
          return (
            <motion.div
              key={p.rank}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`${h} rounded-2xl border p-4 flex flex-col items-center justify-end text-center ${s.card} ${
                p.is_you ? 'ring-2 ring-primary' : ''
              } ${place === 1 ? 'bg-gradient-to-b from-amber-500/15 to-transparent' : ''}`}
            >
              <div
                className={`h-12 w-12 rounded-full grid place-items-center font-black text-white mb-2 ${
                  place === 1
                    ? 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg shadow-orange-500/30'
                    : place === 2
                    ? 'bg-gradient-to-br from-slate-300 to-slate-500'
                    : 'bg-gradient-to-br from-amber-700 to-orange-900'
                }`}
              >
                {place === 1 ? <Crown className="w-6 h-6" /> : place}
              </div>
              <p className="font-bold text-sm truncate w-full">{p.name}</p>
              <p className="text-xs font-black text-primary">{inr(p.lifetime_earned)}</p>
              <p className={`text-[10px] font-bold ${s.muted}`}>{p.referrals} refs</p>
            </motion.div>
          );
        })}
      </div>

      {you && (
        <div className={`rounded-2xl border p-4 flex items-center justify-between ${s.card} ring-1 ring-primary/30`}>
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-primary/15 text-primary font-black grid place-items-center">
              #{you.rank}
            </span>
            <div>
              <p className="font-bold text-sm">Your rank</p>
              <p className={`text-xs ${s.muted}`}>{you.referrals} successful referrals</p>
            </div>
          </div>
          <p className="font-black text-primary">{inr(you.lifetime_earned)}</p>
        </div>
      )}

      <div className={`rounded-2xl border overflow-hidden ${s.card}`}>
        <div className="px-4 py-3 border-b border-inherit flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="font-bold text-sm">Full rankings</span>
        </div>
        <div className="divide-y divide-black/5">
          {board.length === 0 && (
            <p className={`p-6 text-sm ${s.muted}`}>No earners yet — be the first on the board.</p>
          )}
          {board.map((row) => (
            <div
              key={row.rank}
              className={`flex items-center gap-3 px-4 py-3 ${row.is_you ? (s.dark ? 'bg-primary/10' : 'bg-primary/5') : ''}`}
            >
              <span className={`w-8 text-center font-black text-sm ${s.muted}`}>#{row.rank}</span>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/80 to-teal-800 text-white text-xs font-black grid place-items-center">
                {row.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">
                  {row.name} {row.is_you && <span className="text-primary text-xs">· you</span>}
                </p>
                <p className={`text-xs ${s.muted}`}>{row.referrals} referrals</p>
              </div>
              <p className="font-black tabular-nums">{inr(row.lifetime_earned)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===================== BADGES ===================== */
export function BadgesPage() {
  const s = useShell();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [badges, setBadges] = useState<
    Array<{
      id: number;
      name: string;
      description: string;
      icon: string;
      tier: string;
      earned: boolean;
      earned_at: string | null;
      requirement_value: number;
      requirement_type: string;
    }>
  >([]);
  const [earnedCount, setEarnedCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const d = await apiJson<{ badges: typeof badges; earned_count: number }>(
          '/api/badges',
          {},
          true
        );
        setBadges(d.badges || []);
        setEarnedCount(d.earned_count || 0);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <PageHead
        title="Achievement Badges"
        sub={`${earnedCount} of ${badges.length} unlocked — keep referring to collect them all`}
      />
      <Err message={error} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {badges.map((b, i) => {
          const Icon = badgeIconMap[b.icon] || Medal;
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-2xl border p-5 relative overflow-hidden ${s.card} ${
                b.earned ? '' : 'opacity-70'
              }`}
            >
              <div
                className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${
                  tierStyle[b.tier] || tierStyle.bronze
                } text-white grid place-items-center mb-4 shadow-lg ${
                  b.earned ? '' : 'grayscale'
                }`}
              >
                <Icon className="w-7 h-7" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-wider text-primary mb-1">
                {b.tier}
              </p>
              <h4 className="font-bold mb-1">{b.name}</h4>
              <p className={`text-xs font-medium leading-relaxed ${s.muted}`}>{b.description}</p>
              {b.earned ? (
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-black uppercase text-emerald-600">
                  <Check className="w-3.5 h-3.5" /> Unlocked
                </span>
              ) : (
                <span className={`mt-3 inline-block text-[11px] font-bold ${s.muted}`}>
                  Goal: {b.requirement_value} {b.requirement_type}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== CHALLENGES ===================== */
export function ChallengesPage() {
  const s = useShell();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [list, setList] = useState<
    Array<{
      id: number;
      slug: string;
      title: string;
      description: string;
      reward_amount: number;
      target_count: number;
      progress: number;
      percent: number;
      status: string;
      challenge_type: string;
      ends_at: string;
    }>
  >([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiJson<{ challenges: typeof list }>('/api/challenges', {}, true);
      setList(d.challenges || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const completeShare = async (slug: string) => {
    setBusy(slug);
    try {
      await apiJson('/api/challenges', {
        method: 'POST',
        body: JSON.stringify({ challenge_slug: slug }),
      }, true);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <PageHead title="Challenges" sub="Hit targets, unlock bonus wallet credits" />
      <Err message={error} />

      <div className="space-y-4">
        {list.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-2xl border p-5 ${s.card}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex gap-4 min-w-0">
                <span className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 text-white grid place-items-center shrink-0 shadow-lg shadow-orange-500/20">
                  <Target className="w-6 h-6" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="font-bold">{c.title}</h4>
                    {c.status === 'completed' && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
                        Done
                      </span>
                    )}
                  </div>
                  <p className={`text-sm font-medium ${s.muted}`}>{c.description}</p>
                  <p className="text-sm font-black text-primary mt-2">
                    Reward {inr(c.reward_amount)}
                  </p>
                </div>
              </div>
              {c.challenge_type === 'share' && c.status !== 'completed' && (
                <button
                  type="button"
                  disabled={busy === c.slug}
                  onClick={() => completeShare(c.slug)}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink text-white text-sm font-bold disabled:opacity-60"
                >
                  {busy === c.slug ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                  Mark shared
                </button>
              )}
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className={s.muted}>
                  Progress {c.progress}/{c.target_count}
                </span>
                <span>{c.percent}%</span>
              </div>
              <Progress value={c.percent} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ===================== COUPONS ===================== */
export function CouponsPage() {
  const s = useShell();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [coupons, setCoupons] = useState<
    Array<{
      id: number;
      code: string;
      title: string;
      description: string;
      discount_amount: number;
      status: string;
      expires_at: string;
      source: string;
    }>
  >([]);
  const [copied, setCopied] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await apiJson<typeof coupons>('/api/coupons', {}, true);
      setCoupons((d as typeof coupons) || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copy = async (id: number, code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <PageHead title="Coupons" sub="Counselling discounts from referrals and campaigns" />
      <Err message={error} />

      {coupons.length === 0 && (
        <div className={`rounded-2xl border p-10 text-center ${s.card}`}>
          <Ticket className={`w-10 h-10 mx-auto mb-3 ${s.muted}`} />
          <p className="font-bold mb-1">No coupons yet</p>
          <p className={`text-sm mb-4 ${s.muted}`}>
            Apply a friend&apos;s referral code to unlock ₹500 off counselling.
          </p>
          <Link to="/dashboard/refer" className="text-primary font-bold text-sm">
            Go to Refer & Earn →
          </Link>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {coupons.map((c) => (
          <div
            key={c.id}
            className={`rounded-2xl border overflow-hidden ${s.card} ${
              c.status !== 'active' ? 'opacity-60' : ''
            }`}
          >
            <div className="bg-gradient-to-r from-orange-500 to-rose-500 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-80">Discount</p>
                <p className="text-3xl font-black">{inr(c.discount_amount)}</p>
              </div>
              <Ticket className="w-10 h-10 opacity-80" />
            </div>
            <div className="p-5">
              <h4 className="font-bold mb-1">{c.title}</h4>
              <p className={`text-sm mb-3 ${s.muted}`}>{c.description}</p>
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2 font-mono font-bold text-sm ${s.soft}`}>
                <span className="flex-1 tracking-wider">{c.code}</span>
                <button
                  type="button"
                  onClick={() => copy(c.id, c.code)}
                  className="text-primary"
                >
                  {copied === c.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-between mt-3 text-xs font-bold">
                <span
                  className={
                    c.status === 'active' ? 'text-emerald-600' : s.muted
                  }
                >
                  {c.status.toUpperCase()}
                </span>
                <span className={s.muted}>
                  Exp{' '}
                  {c.expires_at
                    ? new Date(c.expires_at).toLocaleDateString('en-IN')
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===================== EARNINGS ANALYTICS ===================== */
export function EarningsAnalyticsPage() {
  const s = useShell();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState<{
    monthly: Array<{ label: string; amount: number }>;
    total_earned: number;
    total_withdrawn: number;
    available: number;
  } | null>(null);
  const [refStats, setRefStats] = useState({ completed: 0, total: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [w, r] = await Promise.all([
          apiJson<{ analytics: NonNullable<typeof analytics> }>('/api/wallet', {}, true),
          apiJson<{ stats: { completed: number; total: number } }>('/api/referrals', {}, true),
        ]);
        setAnalytics(w.analytics);
        setRefStats(r.stats || { completed: 0, total: 0 });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const monthly = analytics?.monthly || [];
  const chartValues = monthly.map((m) => m.amount);
  const chartLabels = monthly.map((m) => m.label);
  const avg =
    chartValues.length > 0
      ? Math.round(chartValues.reduce((a, b) => a + b, 0) / chartValues.length)
      : 0;

  return (
    <div className="max-w-5xl space-y-6">
      <PageHead title="Earnings Analytics" sub="Track how your referral engine performs over time" />
      <Err message={error} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'Lifetime earned', v: inr(analytics?.total_earned || 0), icon: Coins },
          { l: 'Available', v: inr(analytics?.available || 0), icon: Wallet },
          { l: 'Withdrawn', v: inr(analytics?.total_withdrawn || 0), icon: Banknote },
          { l: 'Avg / month', v: inr(avg), icon: TrendingUp },
        ].map((x) => (
          <div key={x.l} className={`rounded-2xl border p-4 ${s.card}`}>
            <x.icon className="w-5 h-5 text-primary mb-2" />
            <p className="text-2xl font-black">{x.v}</p>
            <p className={`text-xs font-bold uppercase mt-1 ${s.muted}`}>{x.l}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-2xl border p-5 ${s.card}`}>
        <h4 className="font-bold mb-4">Monthly earnings</h4>
        {chartValues.some((d) => d > 0) ? (
          <BarChart data={chartValues} labels={chartLabels} height={220} />
        ) : (
          <div className={`h-48 rounded-2xl grid place-items-center ${s.soft} ${s.muted} text-sm`}>
            Charts populate after you earn referral rewards
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className={`rounded-2xl border p-5 ${s.card}`}>
          <h4 className="font-bold mb-3">Conversion</h4>
          <p className="text-3xl font-black mb-1">
            {refStats.total
              ? Math.round((refStats.completed / refStats.total) * 100)
              : 0}
            %
          </p>
          <p className={`text-sm ${s.muted} mb-3`}>
            {refStats.completed} completed of {refStats.total} invites
          </p>
          <Progress
            value={
              refStats.total
                ? Math.round((refStats.completed / refStats.total) * 100)
                : 0
            }
          />
        </div>
        <div className={`rounded-2xl border p-5 ${s.card}`}>
          <h4 className="font-bold mb-3">Per successful referral</h4>
          <p className="text-3xl font-black text-primary mb-1">₹500</p>
          <p className={`text-sm ${s.muted}`}>
            Fixed wallet credit · friend gets ₹500 counselling coupon
          </p>
          <Link
            to="/dashboard/refer"
            className="inline-flex items-center gap-1 mt-4 text-sm font-bold text-primary"
          >
            Invite more <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ===================== WITHDRAWALS ===================== */
export function WithdrawalsPage() {
  const s = useShell();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [balance, setBalance] = useState(0);
  const [list, setList] = useState<
    Array<{
      id: number;
      amount: number;
      method: string;
      account_detail: string;
      status: string;
      created_at: string;
    }>
  >([]);
  const [form, setForm] = useState({
    amount: '500',
    method: 'UPI',
    account_detail: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [w, h] = await Promise.all([
        apiJson<{ wallet: { balance: number } }>('/api/wallet', {}, true),
        apiJson<typeof list>('/api/withdrawals', {}, true),
      ]);
      setBalance(w.wallet?.balance || 0);
      setList((h as typeof list) || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setOk('');
    setSubmitting(true);
    try {
      await apiJson(
        '/api/withdrawals',
        {
          method: 'POST',
          body: JSON.stringify({
            amount: Number(form.amount),
            method: form.method,
            account_detail: form.account_detail,
          }),
        },
        true
      );
      setOk('Withdrawal request submitted. We process payouts within 2–3 business days.');
      setForm((f) => ({ ...f, account_detail: '' }));
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHead title="Withdrawal History" sub="Cash out wallet balance via UPI or bank transfer" />
      <Err message={error} />
      {ok && (
        <p className="text-sm font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3">
          {ok}
        </p>
      )}

      <div className={`rounded-2xl border p-5 flex flex-wrap items-center justify-between gap-4 ${s.card}`}>
        <div>
          <p className={`text-xs font-bold uppercase ${s.muted}`}>Withdrawable</p>
          <p className="text-3xl font-black">{inr(balance)}</p>
          <p className={`text-xs mt-1 ${s.muted}`}>Minimum ₹500 per request</p>
        </div>
        <Wallet className="w-10 h-10 text-primary opacity-60" />
      </div>

      <form onSubmit={submit} className={`rounded-2xl border p-5 space-y-4 ${s.card}`}>
        <h4 className="font-bold">New withdrawal</h4>
        <label className="block">
          <span className={`text-xs font-bold uppercase ${s.muted}`}>Amount (₹)</span>
          <input
            type="number"
            min={500}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className={`mt-1 w-full rounded-xl border px-4 py-3 font-bold ${s.input}`}
            required
          />
        </label>
        <label className="block">
          <span className={`text-xs font-bold uppercase ${s.muted}`}>Method</span>
          <select
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
            className={`mt-1 w-full rounded-xl border px-4 py-3 font-semibold ${s.input}`}
          >
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Paytm">Paytm</option>
          </select>
        </label>
        <label className="block">
          <span className={`text-xs font-bold uppercase ${s.muted}`}>
            {form.method === 'UPI' ? 'UPI ID' : 'Account details'}
          </span>
          <input
            value={form.account_detail}
            onChange={(e) => setForm({ ...form, account_detail: e.target.value })}
            placeholder={form.method === 'UPI' ? 'name@upi' : 'Account no / IFSC'}
            className={`mt-1 w-full rounded-xl border px-4 py-3 font-medium ${s.input}`}
            required
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold disabled:opacity-60"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
          Request withdrawal
        </button>
      </form>

      <div className={`rounded-2xl border overflow-hidden ${s.card}`}>
        <div className="px-5 py-3 border-b border-inherit font-bold text-sm flex items-center gap-2">
          <History className="w-4 h-4" /> History
        </div>
        {list.length === 0 ? (
          <p className={`p-6 text-sm ${s.muted}`}>No withdrawals yet.</p>
        ) : (
          <div className="divide-y divide-black/5">
            {list.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="font-bold text-sm">{inr(w.amount)}</p>
                  <p className={`text-xs ${s.muted}`}>
                    {w.method} · {w.account_detail} ·{' '}
                    {w.created_at ? new Date(w.created_at).toLocaleDateString('en-IN') : ''}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                    w.status === 'completed'
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : w.status === 'rejected'
                      ? 'bg-rose-500/15 text-rose-600'
                      : 'bg-amber-500/15 text-amber-600'
                  }`}
                >
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
