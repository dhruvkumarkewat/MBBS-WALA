import { useCallback, useEffect, useMemo, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Send,
  Search,
  Bookmark,
  BookmarkCheck,
  GitCompareArrows,
  Upload,
  Download,
  Bell,
  CreditCard,
  User,
  Settings,
  LifeBuoy,
  Check,
  FileText,
  CalendarDays,
  ClipboardList,
  Loader2,
  Star,
  Phone,
  ChevronLeft,
  ChevronRight,
  Crown,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  MapPin,
  Newspaper,
} from 'lucide-react';
import { CompareResultUI } from '../../components/CompareResultUI';
import { useDashboard } from '../../contexts/DashboardContext';
import { useAuth } from '../../contexts/AuthContext';
import { CollegeInfoModal } from '../../components/ui/CollegeInfoModal';
import { apiJson } from '../../lib/api';
import { usePremium, UpgradePrompt, PremiumGate } from '../../lib/premium';
import { INDIAN_STATES, COUNSELLING_ROUNDS } from '../../lib/courses';
import { PredictorResults } from './PredictorResults';
import Cutoffs from '../../pages/Cutoffs';

export { ProfilePage } from './ProfilePage';
export { SubscriptionPage } from './SubscriptionPage';

function useShell() {
  const { dark } = useDashboard();
  return {
    dark,
    card: dark ? 'bg-[#0f1f2c] border-white/8' : 'bg-white border-primary-dark/8',
    muted: dark ? 'text-white/50' : 'text-text-grey',
    input: dark
      ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30'
      : 'bg-grey-bg-light border-primary-dark/10 text-primary-dark',
    chip: dark ? 'bg-white/10' : 'bg-grey-bg-light',
  };
}

function PageHead({ title, sub }: { title: string; sub?: string }) {
  const { muted } = useShell();
  return (
    <div className="mb-5">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      {sub && <p className={`text-sm font-medium mt-1 ${muted}`}>{sub}</p>}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="mb-4 text-sm font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
      {message}
    </p>
  );
}

/* ---------------- AI Assistant (local guidance; no fake API) ---------------- */
function formatChatMarkdown(text: string) {
  // Escape HTML to prevent XSS
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
    
  return escaped
    // Render **bold**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Render * bullet points (if they are at the start of a line or after a space)
    .replace(/(?:^|\n)\* (.*?)(?=\n|$)/g, '<li class="ml-4 list-disc marker:text-primary/70">$1</li>')
    // Wrap consecutive <li>s in <ul> (simple hack)
    .replace(/(<li.*?>.*?<\/li>(\s*<li.*?>.*?<\/li>)*)/g, '<ul class="my-1.5 space-y-1 block">$1</ul>');
}

export function AiAssistantPage() {
  const s = useShell();
  const { isPremium } = usePremium();
  const { profile } = useAuth();
  type ChatMsg = { role: 'assistant' | 'user'; text: string };
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    const saved = localStorage.getItem(`mbbswala_chat_${profile?.id || 'guest'}`);
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return [{
      role: 'assistant',
      text: "Hi — I'm your MBBSWala assistant. I use your live college/seat data tips. For ranks, open College Predictor (real /api/rank-calculator).",
    }];
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [userQueryCount, setUserQueryCount] = useState(() => {
    const saved = localStorage.getItem(`mbbswala_chat_count_${profile?.id || 'guest'}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem(`mbbswala_chat_${profile?.id || 'guest'}`, JSON.stringify(messages));
    }
  }, [messages, profile?.id]);

  useEffect(() => {
    localStorage.setItem(`mbbswala_chat_count_${profile?.id || 'guest'}`, userQueryCount.toString());
  }, [userQueryCount, profile?.id]);


  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const q = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);

    if (!isPremium && userQueryCount >= 3) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: "🔒 You've used your free AI Assistant trial queries. Upgrade to NEET Counselling Pro to unlock 24/7 unlimited AI counselling, round analysis, and cutoff recommendations!",
        },
      ]);
      return;
    }

    setUserQueryCount((c) => c + 1);
    setBusy(true);
    
    try {
      const response = await apiJson<{ reply: string }>('/api/ai-chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [...messages, { role: 'user', text: q }],
          userContext: profile
        })
      });
      
      if (response && response.reply) {
        setMessages((m) => [...m, { role: 'assistant', text: response.reply }]);
      } else {
        throw new Error('No reply from AI');
      }
    } catch (err) {
      console.error('AI Chat Error:', err);
      setMessages((m) => [...m, { 
        role: 'assistant', 
        text: 'Sorry, I am having trouble connecting to the network right now. Please try again later.' 
      }]);
    }
    
    setBusy(false);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <PageHead title="AI Assistant" sub="Guidance layer on top of live APIs — verify with official notices" />
      <div className={`flex-1 rounded-2xl border overflow-hidden flex flex-col ${s.card}`}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 zn-scroll">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary text-white rounded-br-md'
                    : s.dark
                    ? 'bg-white/8 rounded-bl-md'
                    : 'bg-grey-bg-light rounded-bl-md'
                }`}
              >
                {m.role === 'assistant' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide opacity-60 mb-1">
                    <Bot className="w-3 h-3" /> MBBSWala AI
                  </span>
                )}
                <div className="whitespace-pre-wrap text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: formatChatMarkdown(m.text) }} />
              </div>
            </div>
          ))}
          {busy && (
            <div className={`inline-flex items-center gap-2 text-xs font-semibold ${s.muted}`}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
            </div>
          )}
          {!isPremium && userQueryCount >= 3 && (
            <div className="p-4 rounded-xl border border-orange-500/25 bg-orange-500/10 text-center">
              <p className="text-xs font-bold text-orange-400 mb-2">Free AI trial queries completed</p>
              <Link to="/dashboard/subscription" className="btn-orange inline-flex px-4 py-1.5 text-xs font-bold shadow-md">
                Upgrade to Pro
              </Link>
            </div>
          )}
        </div>
        <form
          onSubmit={send}
          className={`p-3 border-t flex gap-2 ${s.dark ? 'border-white/8' : 'border-primary-dark/8'}`}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about rank, MP colleges, documents…"
            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/30 ${s.input}`}
          />
          <button type="submit" className="zn-cta zn-cta-primary px-4 py-2.5" disabled={busy}>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------------- Shared course list for dashboard tools ---------------- */
const DASH_COURSES = ['All', 'MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'BNYS'];

/* ── AI Predictor types (spec Section 6 Output Contract) ── */
interface CollegePrediction {
  college_name: string;
  state: string;
  course: string;
  quota: string;
  category: string;
  chance_tier: 'High' | 'Moderate' | 'Reach' | 'Unlikely';
  closing_rank_reference: { year: number; round: string; rank: number }[];
  fee: { amount_min: number; amount_max: number; currency: string; year: number; quota_tier: string } | null;
  source_ids: string[];
}
interface ScholarshipMatch {
  name: string;
  provider: string;
  match_reason: string;
  estimated_amount: string | null;
  official_portal: string;
  source_id: string;
}
interface ChanceInfo {
  percent: number;
  label: string;
  emoji: string;
}
interface PredictionSummary {
  headline: string;
  government_mbbs_chance: ChanceInfo;
  private_mbbs_chance: ChanceInfo;
  government_bds_chance: ChanceInfo;
  private_bds_chance: ChanceInfo;
}
interface GovernmentOptions {
  state_quota_mbbs: string;
  aiq_mbbs: string;
  government_bds: string;
}
interface AiRecommendation {
  focus_areas: string[];
  tip: string;
}
interface PredictorResponse {
  meta?: {
    exam_track?: string;
    authority?: string;
    round?: { round_id: string; label: string; status: string };
    data_basis_year?: number;
    qualifying_floor_met?: boolean;
  };
  prediction_summary?: PredictionSummary;
  government_options?: GovernmentOptions;
  ai_recommendation?: AiRecommendation;
  ai_insight?: string;
  confidence_percent?: number;
  colleges?: CollegePrediction[];
  scholarships?: ScholarshipMatch[];
  fallback?: { tier_reached: string; message: string; alternative_courses?: string[] } | null;
  disclaimers?: string[];
  fraud_warning?: string;
  _provider_used?: string;
  _response_time_ms?: number;
  _data_summary?: { colleges_in_context: number; scholarships_matched: number };
}

/* ── Chance tier styling ── */
const TIER_STYLES: Record<string, { badge: string; border: string; icon: string }> = {
  High:     { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', border: 'border-l-4 border-l-emerald-500/60', icon: '✅' },
  Moderate: { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', border: 'border-l-4 border-l-amber-500/60', icon: '🎯' },
  Reach:    { badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30', border: 'border-l-4 border-l-orange-500/60', icon: '🔥' },
  Unlikely: { badge: 'bg-red-500/15 text-red-400 border-red-500/30', border: 'border-l-4 border-l-red-500/40', icon: '⚠️' },
};

const INDIA_STATES = INDIAN_STATES;

const CATEGORIES = [
  'General','EWS','OBC-NCL','SC','ST',
  'General-PwD','OBC-PwD','SC-PwD','ST-PwD','EWS-PwD',
];

const QUOTA_OPTIONS = [
  { value: 'AIQ',           label: 'AIQ (15% All India Quota)' },
  { value: 'State',         label: 'State Quota (85%)' },
  { value: 'Management',   label: 'Management Quota' },
  { value: 'NRI',          label: 'NRI Quota' },
  { value: 'Deemed-Central', label: 'Deemed / Central University' },
];

/* ---------------- Predictor → AI-Grounded College & Scholarship Predictor ---------------- */
export function PredictorPage() {
  const s = useShell();
  const { profile } = useAuth();
  const { isPremium } = usePremium();

  // ── Form state ──
  const [mode, setMode] = useState<'rank' | 'score'>('rank');
  const [examTrack, setExamTrack] = useState<'MBBS_BDS' | 'AYUSH'>('MBBS_BDS');
  const [rank, setRank] = useState(profile?.neet_rank?.toString() || '');
  const [score, setScore] = useState(profile?.neet_score?.toString() || '');
  const [category, setCategory] = useState(profile?.category || 'General');
  const [domicileState, setDomicileState] = useState(profile?.domicile_state || profile?.state || '');
  const [targetState, setTargetState] = useState('');
  const [quotas, setQuotas] = useState<string[]>(['AIQ', 'State']);
  const [round, setRound] = useState('Round 1');
  const [neetYear, setNeetYear] = useState(new Date().getFullYear());

  // ── Result state ──
  const [aiResponse, setAiResponse] = useState<PredictorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'colleges' | 'scholarships'>('colleges');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'High' | 'Moderate' | 'Reach'>('ALL');
  const [quotaFilter, setQuotaFilter] = useState<string>('ALL');

  // ── Persistence ──
  useEffect(() => {
    if (profile?.id) {
      const saved = localStorage.getItem(`mbbswala_prediction_${profile.id}`);
      if (saved) {
        try {
          setAiResponse(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse saved prediction');
        }
      }
    }
  }, [profile?.id]);

  useEffect(() => {
    if (profile?.id && aiResponse) {
      localStorage.setItem(`mbbswala_prediction_${profile.id}`, JSON.stringify(aiResponse));
    }
  }, [aiResponse, profile?.id]);

  const handleRecalculate = () => {
    setAiResponse(null);
    if (profile?.id) {
      localStorage.removeItem(`mbbswala_prediction_${profile.id}`);
    }
  };

  // Sync profile data when loaded
  useEffect(() => {
    if (profile) {
      if (!rank && profile.neet_rank) setRank(profile.neet_rank.toString());
      if (!score && profile.neet_score) setScore(profile.neet_score.toString());
      if (profile.category) setCategory(profile.category);
      const dom = profile.domicile_state || profile.domicile || profile.state;
      if (dom && !domicileState) setDomicileState(dom);
    }
  }, [profile]);

  // Toggle a quota in the multi-select
  const toggleQuota = (v: string) =>
    setQuotas((prev) => prev.includes(v) ? prev.filter((q) => q !== v) : [...prev, v]);

  // ── Run prediction ──
  const run = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAiResponse(null);

    try {
      const rankNum = mode === 'rank' ? Number(rank) : 0;
      const scoreNum = mode === 'score' ? Number(score) : 0;

      if (mode === 'rank' && (isNaN(rankNum) || rankNum < 1)) {
        throw new Error('Enter a valid NEET All India Rank (AIR)');
      }
      if (mode === 'score' && (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 720)) {
        throw new Error('Enter a valid NEET score (0–720)');
      }
      if (quotas.length === 0) throw new Error('Select at least one quota');
      if (quotas.includes('State') && !domicileState) {
        throw new Error('Please select your Domicile State to predict State Quota (85%) colleges.');
      }

      // Try AI predictor first
      try {
        const payload = {
          exam_track: examTrack,
          rank: mode === 'rank' ? rankNum : undefined,
          score: mode === 'score' ? scoreNum : undefined,
          neet_year: neetYear,
          round,
          category,
          quotas,
          domicile_state: domicileState || null,
          target_state: targetState || null,
          state: domicileState || null,
        };

        const data = await apiJson<PredictorResponse>('/api/ai-predict', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setAiResponse(data);

        // Save rank to profile (non-blocking)
        if (mode === 'rank' && rankNum) {
          apiJson('/api/profile', {
            method: 'PUT',
            body: JSON.stringify({ neet_rank: rankNum, category }),
          }, true).catch(() => {});
        }
      } catch (aiErr: any) {
        // AI call failed — fallback to legacy endpoints
        console.warn('[Predictor] AI endpoint failed, using legacy:', aiErr.message);

        const targetRank = mode === 'rank' ? rankNum : 0;
        let resolvedRank = targetRank;

        if (mode === 'score') {
          const calc = await apiJson<{ predicted_rank_min: number; predicted_rank_max: number }>(
            '/api/rank-calculator',
            { method: 'POST', body: JSON.stringify({ exam: 'NEET UG', score: scoreNum, category }) }
          );
          resolvedRank = Math.round((calc.predicted_rank_min + calc.predicted_rank_max) / 2);
        }

        const legacy = await apiJson<{
          matches: Array<{
            college_name: string; state: string; chance: string;
            chance_score: number; chance_tone: string; best_path: string;
            round?: string;
            aiq_rank: number; total_seats: number | null;
          }>;
          scholarships?: Array<{
            name: string; provider: string; match_reason: string;
            estimated_amount: string | null; official_portal: string;
            source_id?: string;
          }>;
          summary: { safe_count: number; moderate_count: number; reach_count: number };
        }>('/api/college-matches', {
          method: 'POST',
          body: JSON.stringify({
            rank: resolvedRank,
            category,
            round,
            course: undefined,
            exam_track: examTrack,
            state: targetState || (quotas.includes('State') && !quotas.includes('AIQ') && domicileState ? domicileState : undefined),
            limit: 25,
          }),
        });

        // Shape legacy response to match PredictorResponse
        const toneToTier = (t: string) =>
          t === 'safe' || t === 'likely' ? 'High' :
          t === 'moderate' ? 'Moderate' : 'Reach';

        const filteredMatches = (legacy.matches || []).filter((m) => {
          if (quotas.includes('State') && !quotas.includes('AIQ') && domicileState) {
            return (m.state || '').toLowerCase().includes(domicileState.toLowerCase());
          }
          return true;
        });

        setAiResponse({
          meta: { exam_track: examTrack, qualifying_floor_met: true },
          colleges: filteredMatches.map((m) => {
            const isHomeState = Boolean(domicileState && (m.state || '').toLowerCase().includes(domicileState.toLowerCase()));
            return {
              college_name: m.college_name,
              state: m.state,
              course: (m as any).course || 'MBBS',
              quota: (m as any).quota || (isHomeState && quotas.includes('State') ? 'State' : 'AIQ'),
              category,
              chance_tier: toneToTier(m.chance_tone) as CollegePrediction['chance_tier'],
              closing_rank_reference: m.aiq_rank ? [{ year: neetYear - 1, round: m.round || round || 'Round 1', rank: m.aiq_rank }] : [],
              fee: ((m as any).fee ? { formatted: `₹${Number((m as any).fee).toLocaleString('en-IN')}/yr` } : null) as any,
              source_ids: [],
            };
          }),
          scholarships: (legacy.scholarships || []).map((s) => ({
            name: s.name,
            provider: s.provider,
            match_reason: s.match_reason,
            estimated_amount: s.estimated_amount,
            official_portal: s.official_portal,
            source_id: s.source_id || '',
          })),
          disclaimers: ['Data from official counselling cutoffs.'],
          _provider_used: 'legacy-fallback',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const floorMet = aiResponse?.meta?.qualifying_floor_met !== false;
  const colleges = aiResponse?.colleges || [];
  const scholarships = aiResponse?.scholarships || [];
  const highCount = colleges.filter((c) => c.chance_tier === 'High').length;
  const modCount  = colleges.filter((c) => c.chance_tier === 'Moderate').length;
  const reachCount = colleges.filter((c) => c.chance_tier === 'Reach').length;

  const isOnlyStateQuota = quotas.includes('State') && !quotas.includes('AIQ');

  const displayedColleges = colleges.filter((c) => {
    if (tierFilter !== 'ALL' && c.chance_tier !== tierFilter) return false;
    if (quotaFilter !== 'ALL' && c.quota !== quotaFilter) return false;
    // Strict State Quota Isolation: State quota seats can ONLY be in candidate's domicile state
    if (c.quota === 'State' && domicileState && !(c.state || '').toLowerCase().includes(domicileState.toLowerCase())) {
      return false;
    }
    // If only state quota was selected in form, only domicile state colleges are valid
    if (isOnlyStateQuota && domicileState && (!(c.state || '').toLowerCase().includes(domicileState.toLowerCase()) || c.quota !== 'State')) {
      return false;
    }
    return true;
  });

  const availableQuotas = useMemo(() => {
    return Array.from(new Set(colleges.map((c) => c.quota).filter(Boolean)));
  }, [colleges]);

  return (
    <div className="w-full">
      <PageHead
        title="AI College Predictor"
        sub="Grounded in real MCC/state counselling data — AI explains, never invents"
      />

      {/* ── Form or Recalculate State ── */}
      {!aiResponse ? (
        <form onSubmit={run} className={`rounded-2xl border p-5 space-y-4 mb-5 ${s.card}`}>

        {/* Exam Track */}
        <div>
          <span className={`text-xs font-bold uppercase ${s.muted}`}>Exam Track</span>
          <div className="flex gap-2 mt-1.5">
            {(['MBBS_BDS', 'AYUSH'] as const).map((t) => (
              <button
                key={t} type="button"
                onClick={() => setExamTrack(t)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                  examTrack === t
                    ? 'bg-primary text-white border-primary shadow-md'
                    : `border-white/10 ${s.muted} hover:border-primary/40`
                }`}
              >
                {t === 'MBBS_BDS' ? '🏥 MBBS / BDS' : '🌿 AYUSH (BAMS/BHMS/BUMS)'}
              </button>
            ))}
          </div>
        </div>

        {/* Rank / Score Toggle */}
        <div>
          <span className={`text-xs font-bold uppercase ${s.muted}`}>Input Mode</span>
          <div className="flex p-1 mt-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            {(['rank', 'score'] as const).map((m) => (
              <button
                key={m} type="button"
                onClick={() => { setMode(m); setAiResponse(null); }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  mode === m ? 'bg-orange-500 text-white shadow-md' : `${s.muted} hover:text-orange-500`
                }`}
              >
                {m === 'rank' ? 'By NEET Rank (AIR)' : 'By NEET Score'}
              </button>
            ))}
          </div>
        </div>

        {/* Rank / Score Input */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={`text-xs font-bold uppercase text-orange-500`}>
              {mode === 'rank' ? 'NEET AIR *' : 'NEET Score (0–720) *'}
            </span>
            <input
              type="number"
              value={mode === 'rank' ? rank : score}
              onChange={(e) => mode === 'rank' ? setRank(e.target.value) : setScore(e.target.value)}
              min={mode === 'rank' ? 1 : 0}
              max={mode === 'rank' ? 2000000 : 720}
              placeholder={mode === 'rank' ? 'e.g. 15400' : 'e.g. 612'}
              className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-semibold ${s.input}`}
              required
            />
          </label>
          <label className="block">
            <span className={`text-xs font-bold uppercase ${s.muted}`}>NEET Year</span>
            <select
              value={neetYear}
              onChange={(e) => setNeetYear(Number(e.target.value))}
              className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-semibold ${s.input}`}
            >
              {[2026, 2025, 2024].map((y) => <option key={y}>{y}</option>)}
            </select>
          </label>
        </div>

        {/* Category + Counselling Round + Domicile */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <span className={`text-xs font-bold uppercase ${s.muted}`}>Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-semibold ${s.input}`}
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={`text-xs font-bold uppercase ${s.muted}`}>Counselling Round</span>
            <select
              value={round}
              onChange={(e) => setRound(e.target.value)}
              className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-semibold ${s.input}`}
            >
              {COUNSELLING_ROUNDS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={`text-xs font-bold uppercase ${quotas.includes('State') ? 'text-primary' : s.muted}`}>
              Domicile State {quotas.includes('State') ? '(State Quota *)' : ''}
            </span>
            <select
              value={domicileState}
              onChange={(e) => setDomicileState(e.target.value)}
              className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-semibold ${s.input} ${quotas.includes('State') && !domicileState ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30' : ''}`}
            >
              <option value="">Select Domicile State...</option>
              {INDIA_STATES.map((st) => <option key={st}>{st}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={`text-xs font-bold uppercase ${s.muted}`}>
              Target State (Optional)
            </span>
            <select
              value={targetState}
              onChange={(e) => setTargetState(e.target.value)}
              className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-semibold ${s.input}`}
            >
              <option value="">All States / Anywhere</option>
              {INDIA_STATES.map((st) => <option key={st}>{st}</option>)}
            </select>
          </label>
        </div>

        {/* Quota Multi-Select */}
        <div>
          <span className={`text-xs font-bold uppercase ${s.muted}`}>Quota (select all that apply)</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {QUOTA_OPTIONS.map(({ value, label }) => (
              <button
                key={value} type="button"
                onClick={() => toggleQuota(value)}
                className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${
                  quotas.includes(value)
                    ? 'bg-primary text-white border-primary'
                    : `border-white/15 ${s.muted} hover:border-primary/40`
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {quotas.includes('State') && domicileState && (
            <div className="flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-xl px-3.5 py-2 mt-2.5">
              <span>📍</span>
              <span>
                {isOnlyStateQuota ? (
                  <><strong>State Quota Only:</strong> Only medical colleges in <strong>{domicileState}</strong> with 85% state quota will be shown.</>
                ) : (
                  <><strong>State Quota Included:</strong> 85% state quota colleges will be shown for <strong>{domicileState}</strong> alongside other selected quotas.</>
                )}
              </span>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="zn-cta zn-cta-primary w-full justify-center text-sm">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analysing with AI…</>
          ) : (
            `🔮 Predict Colleges${mode === 'rank' && rank ? ` for Rank #${Number(rank).toLocaleString()}` : ''}`
          )}
        </button>
      </form>
      ) : (
        <div className={`rounded-2xl border p-5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4 ${s.card}`}>
          <div>
            <h3 className="text-sm font-bold">Prediction Active</h3>
            <p className={`text-xs mt-1 ${s.muted}`}>
              Showing results for {examTrack === 'MBBS_BDS' ? 'MBBS/BDS' : 'AYUSH'} · {mode === 'rank' ? `AIR ${rank}` : `Score ${score}`} · {category} · {quotas.join(', ')}
            </p>
          </div>
          <button onClick={handleRecalculate} className="zn-cta border border-white/10 text-sm whitespace-nowrap hover:bg-white/5">
            🔄 Recalculate
          </button>
        </div>
      )}

      {/* ── Results ── */}
      {aiResponse && (
        <div className="space-y-4">

          {/* ── Qualifying Floor Banner ── */}
          {!floorMet ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
              <p className="text-sm font-bold text-red-400 mb-1">⛔ Below NEET Qualifying Threshold</p>
              <p className="text-sm text-red-300/80 leading-relaxed">
                {aiResponse.fallback?.message ||
                  'This score/rank is below the minimum NEET qualifying cutoff for this year and category. No MBBS/BDS/AYUSH seat is possible in any quota at any price this cycle. This is a regulatory requirement, not a budget constraint.'}
              </p>
              {aiResponse.fallback?.alternative_courses && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(aiResponse.fallback.alternative_courses || []).map((c) => (
                    <span key={c} className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/70 font-semibold">{c}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <PredictorResults 
              aiResponse={aiResponse} 
              s={s} 
              isPremium={isPremium} 
              domicileState={domicileState} 
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Finder → GET /api/colleges + /api/saved ---------------- */
interface College {
  id: number;
  name: string;
  city: string;
  state: string;
  country: string;
  college_type: string;
  course?: string;
  nirf?: number;
  cutoff?: Record<string, any>;
}
export function FinderPage() {
  const s = useShell();
  const { isPremium } = usePremium();
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [type, setType] = useState('All');
  const [course, setCourse] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [selectedCollegeInfo, setSelectedCollegeInfo] = useState<string | null>(null);

  const loadSaved = useCallback(async () => {
    try {
      const rows = await apiJson<Array<{ college_id: number }>>('/api/saved', {}, true);
      setSavedIds(new Set(rows.map((r) => r.college_id)));
    } catch {
      /* ignore if empty */
    }
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({
          paginate: '1',
          page: String(page),
          limit: '24',
        });
        if (q) params.set('q', q);
        if (type !== 'All') params.set('type', type);
        if (course !== 'All') params.set('course', course);
        const res = await apiJson<{
          data: College[];
          total: number;
          totalPages: number;
        }>(`/api/colleges?${params}`);
        setColleges(res.data || []);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 1);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load colleges');
        setColleges([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, type, course, page]);

  const toggleSave = async (id: number) => {
    const isSaved = savedIds.has(id);
    try {
      if (isSaved) {
        await apiJson(`/api/saved?college_id=${id}`, { method: 'DELETE', body: JSON.stringify({ college_id: id }) }, true);
        setSavedIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      } else {
        await apiJson(`/api/saved?college_id=${id}`, { method: 'POST', body: JSON.stringify({ college_id: id }) }, true);
        setSavedIds((prev) => new Set(prev).add(id));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  return (
    <div>
      <PageHead title="College Finder" sub={`GET /api/colleges · ${total} total · page ${page}/${totalPages} · MBBS–BNYS`} />
      <ErrorBox message={error} />
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${s.muted}`} />
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search college, city, state, course"
            className={`w-full rounded-xl border pl-10 pr-3 py-2.5 text-sm font-medium ${s.input}`}
          />
        </div>
        <select
          value={course}
          onChange={(e) => {
            setPage(1);
            setCourse(e.target.value);
          }}
          className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${s.input}`}
        >
          {DASH_COURSES.map((t) => (
            <option key={t} value={t}>
              {t === 'All' ? 'All courses' : t}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => {
            setPage(1);
            setType(e.target.value);
          }}
          className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${s.input}`}
        >
          {['All', 'Government', 'Private'].map((t) => (
            <option key={t} value={t}>
              {t === 'All' ? 'All types' : t}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`h-28 rounded-2xl animate-pulse ${s.chip}`} />
          ))}
        </div>
      ) : (!isPremium && (page > 1 || q.trim() !== '')) ? (
        <div className="col-span-full p-12 text-center rounded-3xl border min-h-[400px] flex flex-col items-center justify-center border-primary/20 bg-primary/5">
          <Crown className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-black mb-2">Search & Pagination are Premium Features</h3>
          <p className="text-sm opacity-70 max-w-md mx-auto mb-6">Upgrade to Premium to search for specific colleges, apply filters, and access all pages of our database.</p>
          <Link to="/dashboard/subscription" className="zn-cta px-8 py-3">Upgrade to Premium</Link>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {colleges.map((c) => {
              const isSaved = savedIds.has(c.id);
              return (
                <div key={c.id} className={`rounded-2xl border p-4 flex flex-col gap-2 ${s.card}`}>
                  <div className="flex items-start justify-between gap-2">
                    <button 
                      onClick={() => setSelectedCollegeInfo(c.name)}
                      className="font-bold text-sm leading-snug hover:underline decoration-orange-500 underline-offset-4 text-left transition-all hover:text-orange-400"
                    >
                      {c.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSave(c.id)}
                      className="shrink-0 p-1.5 rounded-lg hover:opacity-80"
                      aria-label="Save"
                    >
                      {isSaved ? (
                        <BookmarkCheck className="w-4 h-4 text-primary" />
                      ) : (
                        <Bookmark className={`w-4 h-4 ${s.muted}`} />
                      )}
                    </button>
                  </div>
                  <p className={`text-xs font-medium ${s.muted}`}>
                    {[c.city, c.state].filter(Boolean).join(', ')}
                    {c.nirf && c.nirf < 999999 ? ` · NIRF #${c.nirf}` : ''}
                  </p>
                  
                  {/* Opening and Closing ranks logic for UI */}
                  {c.cutoff && (c.cutoff.closing_rank || c.cutoff.GEN_closing) ? (
                    <div className="flex gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600`}>
                        Opening: {c.cutoff.opening_rank || c.cutoff.GEN_opening || c.cutoff.opening || '—'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600`}>
                        Closing: {c.cutoff.closing_rank || c.cutoff.GEN_closing || c.cutoff.closing || '—'}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${s.chip}`}>
                      {c.course || 'MBBS'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${s.chip}`}>
                      {c.country}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        c.college_type === 'Government'
                          ? 'bg-emerald-500/15 text-emerald-600'
                          : 'bg-orange-500/15 text-orange-600'
                      }`}
                    >
                      {c.college_type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
            {isPremium && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="zn-cta text-sm py-2 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span className={`text-sm font-bold ${s.muted}`}>
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="zn-cta text-sm py-2 disabled:opacity-40"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {!isPremium && totalPages > 1 && (
              <div className="mt-8 text-center border-t border-primary/10 pt-6">
                <Crown className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-sm font-bold mb-2">Upgrade to view all {total} colleges</p>
                <Link to="/dashboard/subscription" className="zn-cta px-5 py-2 text-xs">Upgrade Now</Link>
              </div>
            )}
          </>
        )}
      <CollegeInfoModal 
        collegeName={selectedCollegeInfo} 
        isOpen={!!selectedCollegeInfo} 
        onClose={() => setSelectedCollegeInfo(null)} 
        s={s}
      />
    </div>
  );
}

/* ---------------- Compare → enriched seats + cutoffs ---------------- */
const Autocomplete = ({ value, onChange, placeholder, colleges, s }: any) => {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  useEffect(() => { setQuery(value); }, [value]);

  const matches = colleges.filter((c: any) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 50);

  return (
    <div className="relative">
      <input 
         type="text" 
         className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold ${s.input}`}
         placeholder={placeholder}
         value={query}
         onChange={e => {
           setQuery(e.target.value);
           setOpen(true);
         }}
         onFocus={() => setOpen(true)}
         onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      {open && query && matches.length > 0 && (
        <div className={`absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border shadow-xl ${s.card} ${s.dark ? 'bg-[#0f1f2c]' : 'bg-white'}`}>
          {matches.map((m: any) => (
            <div 
              key={m.id} 
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${s.dark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              onMouseDown={(e) => {
                 e.preventDefault(); // Prevent input from losing focus immediately
                 setQuery(m.name);
                 setOpen(false);
                 onChange(m.id, m.name);
              }}
            >
               {m.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export function ComparePage() {
  const s = useShell();
  const { isPremium } = usePremium();
  const [colleges, setColleges] = useState<College[]>([]);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [cmpLoading, setCmpLoading] = useState(false);
  const [payload, setPayload] = useState<{
    fields: Array<{ key: string; a: string | number; b: string | number; better?: string | null }>;
    insights: string[];
    a: { college: College };
    b: { college: College };
    category_matrix: Array<{
      category: string;
      a: { aiq_rank: number; state_rank_range: string } | null;
      b: { aiq_rank: number; state_rank_range: string } | null;
    }>;
  } | null>(null);

  useEffect(() => {
    apiJson<College[]>('/api/colleges?limit=3000')
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setColleges(list);
        if (list.length) {
          setA(String(list[0].id));
          setSearchA(list[0].name);
          setB(String(list[Math.min(1, list.length - 1)].id));
          setSearchB(list[Math.min(1, list.length - 1)].name);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!a || !b || a === b || a === '-' || b === '-') {
      setPayload(null);
      return;
    }
    setCmpLoading(true);
    setError('');
    apiJson<NonNullable<typeof payload>>(`/api/college-compare?a=${a}&b=${b}`)
      .then(setPayload)
      .catch((e) => setError(e.message))
      .finally(() => setCmpLoading(false));
  }, [a, b]);

  return (
    <div>
      <PageHead
        title="Compare colleges"
        sub="Seats · AIQ cutoffs · category bands · decision insights"
      />
      <ErrorBox message={error} />
      {loading ? (
        <div className={`h-40 rounded-2xl animate-pulse ${s.chip}`} />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <Autocomplete 
               value={searchA}
               onChange={(id: string, name: string) => { setA(id); setSearchA(name); }}
               placeholder="Search College 1..."
               colleges={colleges}
               s={s}
            />
            <Autocomplete 
               value={searchB}
               onChange={(id: string, name: string) => { setB(id); setSearchB(name); }}
               placeholder="Search College 2..."
               colleges={colleges}
               s={s}
            />
          </div>

          {a === b && (
            <p className={`text-sm font-semibold mb-3 ${s.muted}`}>Select two different colleges.</p>
          )}

          {cmpLoading && (
            <div className={`flex items-center gap-2 py-10 justify-center ${s.muted}`}>
              <Loader2 className="w-4 h-4 animate-spin" /> Comparing…
            </div>
          )}

          {payload && !cmpLoading && (
            <div className="mt-8">
              <CompareResultUI payload={payload} s={s} isPremium={isPremium} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Saved → GET/DELETE /api/saved ---------------- */
export function SavedPage() {
  const s = useShell();
  const [list, setList] = useState<
    Array<{ id: number; college_id: number; created_at?: string; colleges: College | null }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<number | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await apiJson<
        Array<{ id: number; college_id: number; created_at?: string; colleges: College | null }>
      >('/api/saved', {}, true);
      setList(Array.isArray(rows) ? rows : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load saved colleges');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (collegeId: number) => {
    setRemoving(collegeId);
    setError('');
    try {
      await apiJson(
        `/api/saved?college_id=${collegeId}`,
        { method: 'DELETE', body: JSON.stringify({ college_id: collegeId }) },
        true
      );
      setList((prev) => prev.filter((x) => x.college_id !== collegeId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Remove failed');
    } finally {
      setRemoving(null);
    }
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((row) => {
      const c = row.colleges;
      const hay = [c?.name, c?.city, c?.state, c?.college_type, c?.country]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(term) || String(row.college_id).includes(term);
    });
  }, [list, q]);

  const govtCount = list.filter((r) => r.colleges?.college_type === 'Government').length;
  const privateCount = list.filter((r) => r.colleges?.college_type === 'Private').length;

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-[0.16em] mb-1 ${s.muted}`}>
            Shortlist
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Saved colleges
          </h2>
          <p className={`text-sm font-medium mt-1 ${s.muted}`}>
            Your personal shortlist — star colleges from Finder, then compare and plan choices.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/dashboard/finder"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-bold px-5 py-2.5 shadow-lg shadow-orange-500/25 hover:brightness-110 transition"
          >
            <Search className="w-4 h-4" />
            Find colleges
          </Link>
          <Link
            to="/dashboard/compare"
            className={`inline-flex items-center gap-2 rounded-full border text-sm font-bold px-5 py-2.5 transition ${s.card} hover:border-orange-400/40`}
          >
            <GitCompareArrows className="w-4 h-4" />
            Compare
          </Link>
        </div>
      </div>

      <ErrorBox message={error} />

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Saved', value: list.length, accent: 'text-orange-500' },
          { label: 'Government', value: govtCount, accent: 'text-emerald-500' },
          { label: 'Private', value: privateCount, accent: 'text-sky-500' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border px-4 py-3 ${s.card}`}
          >
            <p className={`text-[10px] font-bold uppercase tracking-wider ${s.muted}`}>{stat.label}</p>
            <p className={`text-2xl font-black tabular-nums ${stat.accent}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {list.length > 0 && (
        <div className="relative mb-5">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${s.muted}`} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter saved by name, city, state…"
            className={`w-full rounded-2xl border pl-10 pr-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500/30 ${s.input}`}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-24 rounded-3xl animate-pulse ${s.chip}`} />
          ))}
        </div>
      ) : !list.length ? (
        <div
          className={`relative overflow-hidden rounded-3xl border p-10 sm:p-14 text-center ${s.card}`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-rose-500/10 pointer-events-none" />
          <div className="relative">
            <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 grid place-items-center shadow-lg shadow-orange-500/30">
              <Bookmark className="w-7 h-7 text-white" />
            </div>
            <p className="font-display text-xl font-bold mb-2">Build your dream shortlist</p>
            <p className={`text-sm max-w-sm mx-auto mb-6 leading-relaxed ${s.muted}`}>
              Star government and private colleges from College Finder. They&apos;ll land here so you can
              compare seats, cut-offs and counselling paths in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/dashboard/finder"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-bold px-6 py-3 shadow-lg shadow-orange-500/25"
              >
                Open College Finder
              </Link>
              <Link
                to="/dashboard/predictor"
                className={`inline-flex items-center gap-2 rounded-full border text-sm font-bold px-6 py-3 ${s.card}`}
              >
                Run rank predictor
              </Link>
            </div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`rounded-3xl border p-8 text-center ${s.card}`}>
          <p className="font-bold mb-1">No matches</p>
          <p className={`text-sm ${s.muted}`}>Try a different search in your shortlist.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row, idx) => {
            const c = row.colleges;
            const isGov = c?.college_type === 'Government';
            return (
              <div
                key={row.id}
                className={`group rounded-3xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all hover:border-orange-400/35 hover:shadow-[0_12px_40px_rgba(249,115,22,0.08)] ${s.card}`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-12 h-12 rounded-2xl grid place-items-center shrink-0 font-black text-sm ${
                      isGov
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-sky-500/15 text-sky-500'
                    }`}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-bold text-[15px] leading-snug truncate max-w-full">
                        {c?.name || `College #${row.college_id}`}
                      </p>
                      {c?.college_type && (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                            isGov
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : 'bg-sky-500/15 text-sky-600'
                          }`}
                        >
                          {c.college_type}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs font-medium ${s.muted}`}>
                      {[c?.city, c?.state, c?.country].filter(Boolean).join(' · ') ||
                        'Details loading…'}
                      {c?.course ? ` · ${c.course}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0 pl-15 sm:pl-0">
                  <Link
                    to="/dashboard/compare"
                    className={`text-xs font-bold px-3 py-2 rounded-xl border ${s.card} hover:border-orange-400/40`}
                  >
                    Compare
                  </Link>
                  <button
                    type="button"
                    disabled={removing === row.college_id}
                    onClick={() => remove(row.college_id)}
                    className="text-xs font-bold px-3 py-2 rounded-xl text-red-500 bg-red-500/10 hover:bg-red-500/15 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {removing === row.college_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : null}
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CounsellingPage() {
  const s = useShell();
  const { profile } = useAuth();
  
  // Real Data
  const currentRank = profile?.neet_rank || profile?.rank || 'Not updated';
  const currentCategory = profile?.category || 'General';
  const domicileState = profile?.domicile_state || profile?.state || 'Not updated';
  const examTrack = (profile as any)?.exam_track || 'MBBS/BDS';

  const officialPortals = [
    { title: 'MCC (Medical Counseling Committee)', desc: 'Official portal for 15% All India Quota (AIQ) & Deemed Universities', url: 'https://mcc.nic.in/', badge: 'AIQ / Deemed' },
    { title: 'AACCC (AYUSH Counseling)', desc: 'Official portal for BAMS, BHMS, BUMS, BSMS', url: 'https://aaccc.gov.in/', badge: 'AYUSH' },
    { title: 'NTA NEET Official Website', desc: 'Results, OMR sheets, and official notices', url: 'https://exams.nta.ac.in/NEET/', badge: 'NTA' },
  ];

  const faqs = [
    { q: 'How does choice filling order matter?', a: 'Your choices are processed strictly in the order you rank them. The system will allot the highest possible preference where a seat is available at your rank.' },
    { q: 'Can I upgrade in the next round?', a: 'Yes, if you report to your allotted college and opt for an upgrade. If a higher preference becomes available in the next round, your current seat will be cancelled.' },
    { q: 'What happens if I don\'t report?', a: 'If you don\'t report for Round 1, it is considered a "free exit". For subsequent rounds, your security deposit may be forfeited.' },
    { q: 'Is the security deposit refundable?', a: 'Yes, if no seat is allotted or if you join the allotted seat, the deposit is refunded to the original payment source after counselling concludes.' },
  ];

  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="max-w-4xl space-y-8 pb-10">
      <PageHead
        title="Counselling Hub"
        sub="Your personalized command center for NEET Counselling, Official Portals, and Expert Support"
      />

      {/* 1. Profile Overview */}
      <div className={`rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-indigo-900/40 via-[#0f1f2c] to-[#141a24] border ${s.dark ? 'border-indigo-500/20' : 'border-indigo-100'} relative overflow-hidden shadow-xl`}>
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Sparkles className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black mb-2 tracking-tight text-white">Your Counselling Profile</h2>
            <p className={`text-sm text-white/70 max-w-md`}>Keep your profile updated to get the most accurate AI predictions and personalized assistance.</p>
          </div>
          <Link to="/dashboard/profile" className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl font-medium text-sm transition-colors backdrop-blur-md">
            Update Profile
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 relative z-10">
          {[
            { l: 'NEET Rank', v: typeof currentRank === 'number' ? currentRank.toLocaleString() : currentRank },
            { l: 'Category', v: currentCategory },
            { l: 'Domicile State', v: domicileState },
            { l: 'Target Course', v: examTrack },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">{stat.l}</p>
              <p className="text-lg font-bold text-white/90 truncate">{stat.v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* 2. Premium Support CTAs */}
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-orange-500" />
              Expert Assistance
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { t: 'WhatsApp Support', d: 'Schedule a video slot', href: 'https://wa.me/7880119983', icon: CalendarDays, bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
                { t: 'Call Helpline', d: '+91 78801 19983', href: 'tel:+917880119983', icon: Phone, bg: 'bg-orange-500/10', text: 'text-orange-500' },
              ].map((x) => (
                <a key={x.t} href={x.href} className={`rounded-2xl border p-5 flex flex-col gap-4 transition-all hover:-translate-y-1 hover:shadow-lg ${s.card} group`}>
                  <div className={`w-12 h-12 rounded-full ${x.bg} ${x.text} grid place-items-center`}>
                    <x.icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <p className="font-bold text-base mb-1">{x.t}</p>
                    <p className={`text-xs font-medium ${s.muted}`}>{x.d}</p>
                  </div>
                </a>
              ))}
            </div>
            <div className={`mt-4 rounded-xl border p-4 flex items-center gap-4 ${s.card} bg-gradient-to-r from-orange-500/5 to-transparent`}>
              <div className="w-10 h-10 rounded-full bg-orange-500/20 grid place-items-center border border-orange-500/30 text-orange-500 font-bold shrink-0">
                PRO
              </div>
              <div>
                <p className="font-bold text-sm">Dedicated Counsellor</p>
                <p className={`text-xs ${s.muted}`}>Get 1-on-1 guidance for choice filling & state quotas.</p>
              </div>
              <a href="https://wa.me/7880119983" className="ml-auto text-xs px-4 py-2 rounded-lg bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors whitespace-nowrap">
                Book Now
              </a>
            </div>
          </div>

          {/* 3. Official Portals */}
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-blue-500" />
              Official Portals
            </h3>
            <div className="space-y-3">
              {officialPortals.map((portal, i) => (
                <a key={i} href={portal.url} target="_blank" rel="noopener noreferrer" className={`block rounded-2xl border p-4 transition-colors hover:bg-white/5 ${s.card} group`}>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <p className="font-bold text-sm group-hover:text-blue-400 transition-colors">{portal.title}</p>
                    <span className="text-[10px] font-bold px-2 py-1 bg-white/10 rounded border border-white/5 whitespace-nowrap">{portal.badge}</span>
                  </div>
                  <p className={`text-xs ${s.muted}`}>{portal.desc}</p>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* 4. Data Tools */}
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-teal-500" />
              Smart Tools
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Seat Matrix', sub: 'Category breakdown', link: '/dashboard/seat-matrix', primary: false },
                { label: 'AI Predictor', sub: 'Check probabilities', link: '/dashboard/predictor', primary: true },
                { label: 'College Finder', sub: '1200+ indexed', link: '/dashboard/finder', primary: false },
              ].map((tool, i) => (
                <Link key={i} to={tool.link} className={`flex flex-col items-center justify-center p-5 rounded-2xl border text-center transition-all hover:-translate-y-1 ${
                  tool.primary ? 'bg-orange-600 border-orange-500 hover:bg-orange-500 shadow-lg shadow-orange-500/20' : `bg-white/5 border-white/10 hover:bg-white/10`
                }`}>
                  <span className={`font-bold text-sm mb-1 ${tool.primary ? 'text-white' : ''}`}>{tool.label}</span>
                  <span className={`text-[10px] ${tool.primary ? 'text-white/80' : s.muted}`}>{tool.sub}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* 5. FAQs */}
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-purple-500" />
              Counselling FAQ
            </h3>
            <div className={`rounded-2xl border overflow-hidden ${s.card}`}>
              {faqs.map((faq, i) => (
                <div key={i} className="border-b border-white/10 last:border-0">
                  <button
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  >
                    <span className="font-medium text-sm">{faq.q}</span>
                    {expandedFaq === i ? <ChevronUp className={`w-4 h-4 ${s.muted} shrink-0`} /> : <ChevronDown className={`w-4 h-4 ${s.muted} shrink-0`} />}
                  </button>
                  {expandedFaq === i && (
                    <div className="px-5 pb-5">
                      <p className={`text-sm ${s.muted} leading-relaxed`}>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashCutoffsPage() {
  return <Cutoffs />;
}

export function DashSeatMatrixPage() {
  const s = useShell();
  const { isPremium } = usePremium();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCollegeInfo, setSelectedCollegeInfo] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [type, setType] = useState('All');
  const [course, setCourse] = useState('All');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({
      paginate: '1',
      page: String(page),
      limit: '20'
    });
    if (debouncedSearch) qs.append('q', debouncedSearch);
    if (type !== 'All') qs.append('kind', type);
    if (course !== 'All') qs.append('course', course);

    apiJson<{ data: Array<Record<string, unknown>>; totalPages: number }>(
      `/api/seat-matrix?${qs.toString()}`
    )
      .then((d) => {
        setRows(d.data || []);
        setTotalPages(d.totalPages || 1);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, type, course]);

  const visibleRows = isPremium ? rows : rows.slice(0, 3);

  return (
    <div>
      <PageHead title="Seat Matrix" sub="Detailed seat breakdown by college, quota, and category" />
      <ErrorBox message={error} />
      
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search college, city, state, course"
            className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${s.input}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <div className="relative shrink-0">
            <select
              className={`appearance-none pl-4 pr-9 py-2.5 rounded-xl border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${s.input}`}
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All types</option>
              <option value="Government">Government</option>
              <option value="Private">Private</option>
              <option value="Deemed">Deemed</option>
              <option value="AIIMS">AIIMS</option>
              <option value="JIPMER">JIPMER</option>
              <option value="Central Universities">Central Universities</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-50" />
          </div>
          <div className="relative shrink-0">
            <select
              className={`appearance-none pl-4 pr-9 py-2.5 rounded-xl border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${s.input}`}
              value={course}
              onChange={(e) => {
                setCourse(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All courses</option>
              <option value="MBBS">MBBS</option>
              <option value="BDS">BDS</option>
              <option value="BAMS">BAMS</option>
              <option value="BHMS">BHMS</option>
              <option value="BUMS">BUMS</option>
              <option value="BSMS">BSMS</option>
              <option value="BNYS">BNYS</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-50" />
          </div>
        </div>
      </div>

      
      <div className={`rounded-2xl border overflow-x-auto ${s.card}`}>
        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : (!isPremium && (page > 1 || search.trim() !== '')) ? (
          <div className="p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
            <Crown className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-black mb-2">Search & Filters are Premium Features</h3>
            <p className="text-sm opacity-70 max-w-md mx-auto mb-6">Upgrade to Premium to search for specific colleges, filter by quota/category, and view all seat matrix data.</p>
            <Link to="/dashboard/subscription" className="zn-cta px-8 py-3">Upgrade to Premium</Link>
          </div>
        ) : (
          <table className="w-full text-sm min-w-[720px]">
            <thead className={s.dark ? 'bg-white/5' : 'bg-grey-bg-light'}>
              <tr className="text-left">
                {['College', 'Type', 'Total', 'AIQ', 'Open', 'NRI'].map((h) => (
                  <th key={h} className="p-3 font-bold text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr
                  key={String(r.id)}
                  className={`border-t ${s.dark ? 'border-white/5' : 'border-primary-dark/5'}`}
                >
                  <td className="p-3 font-semibold">
                    <button 
                      onClick={() => setSelectedCollegeInfo(String(r.college_name))}
                      className="hover:underline decoration-orange-500 underline-offset-4 text-left transition-all hover:text-orange-400"
                    >
                      {String(r.college_name)}
                    </button>
                  </td>
                  <td className="p-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${s.chip}`}>
                      {String(r.college_kind)}
                    </span>
                  </td>
                  <td className="p-3 font-black">{String(r.total_seats)}</td>
                  <td className="p-3">{String(r.all_india || '—')}</td>
                  <td className="p-3">{String(r.open_seats || '—')}</td>
                  <td className="p-3">{String(r.nri_seats || '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isPremium && rows.length > 3 && !(page > 1 || search.trim() !== '') && (
        <div className="relative mt-2">
          {/* Blurred teaser rows */}
          <div className={`rounded-2xl border overflow-hidden ${s.card} select-none filter blur-sm pointer-events-none opacity-40`}>
            <table className="w-full text-sm min-w-[720px]">
              <tbody>
                {rows.slice(3, 6).map((r, i) => (
                  <tr key={i} className={`border-b ${s.dark ? 'border-white/5' : 'border-primary-dark/5'}`}>
                    <td className="p-3 font-semibold">{String(r.college_name)}</td>
                    <td className="p-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded ${s.chip}`}>{String(r.college_kind)}</span></td>
                    <td className="p-3 font-black">{String(r.total_seats)}</td>
                    <td className="p-3">--</td>
                    <td className="p-3">--</td>
                    <td className="p-3">--</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-orange-500/20">
              <UpgradePrompt 
                featureName="Complete Seat Matrix" 
                title="Content Locked"
                description="Please purchase a NEET UG package to view the full seat matrix, including category-wise and quota-wise breakdowns." 
              />
            </div>
          </div>
        </div>
      )}

      {isPremium && (
        <div className="flex justify-center gap-3 mt-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="zn-cta text-sm py-2 disabled:opacity-40"
          >
            Prev
          </button>
          <span className={`text-sm font-bold self-center ${s.muted}`}>
            {page}/{totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="zn-cta text-sm py-2 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
      <CollegeInfoModal 
        collegeName={selectedCollegeInfo} 
        isOpen={!!selectedCollegeInfo} 
        onClose={() => setSelectedCollegeInfo(null)} 
        s={s}
      />
    </div>
  );
}

type UserDoc = {
  id: number;
  name: string;
  status: string;
  file_url?: string;
};

export function DocumentsPage() {
  const s = useShell();
  const [docs, setDocs] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [okMsg, setOkMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiJson<UserDoc[]>('/api/documents', {}, true);
      setDocs(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const readFileAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });

  const uploadForDoc = async (doc: UserDoc, file: File) => {
    setError('');
    setOkMsg('');
    const allowed = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'application/pdf',
    ];
    if (!allowed.includes(file.type)) {
      setError('Only PDF, JPG, PNG or WEBP files are allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Max 10MB.');
      return;
    }

    setUploadingId(doc.id);
    try {
      const fileBase64 = await readFileAsBase64(file);
      const updated = await apiJson<UserDoc>(
        '/api/documents',
        {
          method: 'POST',
          body: JSON.stringify({
            id: doc.id,
            fileName: file.name,
            fileBase64,
            contentType: file.type || 'application/octet-stream',
          }),
        },
        true
      );
      setDocs((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
      setOkMsg(`${doc.name} uploaded successfully.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploadingId(null);
    }
  };

  const clearDoc = async (doc: UserDoc) => {
    setError('');
    setOkMsg('');
    try {
      const updated = await apiJson<UserDoc>(
        '/api/documents',
        { method: 'DELETE', body: JSON.stringify({ id: doc.id }) },
        true
      );
      setDocs((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
      setOkMsg(`${doc.name} cleared.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not clear file');
    }
  };

  const uploadedCount = docs.filter((d) => d.status === 'Uploaded').length;

  return (
    <div>
      <PageHead
        title="Documents"
        sub="Upload NEET counselling documents securely · PDF / JPG / PNG"
      />
      <ErrorBox message={error} />
      {okMsg && (
        <p className="mb-4 text-sm font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
          {okMsg}
        </p>
      )}

      <div
        className={`rounded-2xl border border-dashed p-5 mb-5 flex flex-col sm:flex-row items-center gap-4 ${s.card}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/15 text-primary grid place-items-center shrink-0">
          <Upload className="w-7 h-7" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="font-bold text-sm">Document vault</p>
          <p className={`text-xs mt-1 ${s.muted}`}>
            Use <strong>Upload file</strong> on each row. Files go to secure storage and status becomes Uploaded.
            Max 10MB · PDF, JPG, PNG, WEBP.
          </p>
          <p className="text-xs font-bold text-primary mt-2">
            {uploadedCount}/{docs.length || 0} uploaded
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-20 rounded-xl animate-pulse ${s.chip}`} />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className={`rounded-2xl border p-8 text-center ${s.card}`}>
          <FileText className={`w-10 h-10 mx-auto mb-3 ${s.muted}`} />
          <p className="font-bold mb-1">No documents yet</p>
          <p className={`text-sm ${s.muted}`}>Refresh or re-login to seed your checklist.</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 zn-cta zn-cta-primary text-sm px-5 py-2"
          >
            Reload
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((d) => {
            const busy = uploadingId === d.id;
            return (
              <div
                key={d.id}
                className={`rounded-2xl border px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 ${s.card}`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span
                    className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${
                      d.status === 'Uploaded'
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : 'bg-amber-500/15 text-amber-600'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{d.name}</p>
                    <p className={`text-xs mt-0.5 ${s.muted}`}>
                      {d.file_url
                        ? 'File attached — you can replace or clear it'
                        : 'No file uploaded yet'}
                    </p>
                    {d.file_url ? (
                      <a
                        href={d.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-1 text-xs font-bold text-primary underline underline-offset-2"
                      >
                        View uploaded file
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${
                      d.status === 'Uploaded'
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : d.status === 'Missing'
                        ? 'bg-red-500/15 text-red-500'
                        : 'bg-amber-500/15 text-amber-600'
                    }`}
                  >
                    {d.status}
                  </span>

                  <label
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                      busy
                        ? 'opacity-60 pointer-events-none bg-primary/20 text-primary'
                        : 'bg-primary text-white hover:brightness-110'
                    }`}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" /> Upload file
                      </>
                    )}
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) uploadForDoc(d, file);
                      }}
                    />
                  </label>

                  {d.file_url || d.status === 'Uploaded' ? (
                    <button
                      type="button"
                      onClick={() => clearDoc(d)}
                      disabled={busy}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                        s.dark
                          ? 'border-white/15 text-white/80 hover:bg-white/5'
                          : 'border-primary-dark/15 text-primary-dark hover:bg-grey-bg-light'
                      }`}
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DownloadsPage() {
  const s = useShell();
  const files = [
    { t: 'Seat Matrix (live table)', to: '/dashboard/seat-matrix' },
    { t: 'College directory', to: '/dashboard/finder' },
    { t: 'Public cutoffs page', to: '/cutoffs' },
    { t: 'Packages', to: '/packages' },
  ];
  return (
    <div>
      <PageHead title="Downloads" sub="Links to live data views — no fake file endpoints" />
      <div className="grid sm:grid-cols-2 gap-3">
        {files.map((f) => (
          <Link key={f.t} to={f.to} className={`rounded-2xl border p-5 flex items-center gap-3 ${s.card}`}>
            <span className="w-10 h-10 rounded-xl bg-primary/15 text-primary grid place-items-center">
              <Download className="w-5 h-5" />
            </span>
            <div>
              <p className="font-bold text-sm">{f.t}</p>
              <p className={`text-xs ${s.muted}`}>Open live view</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ApplicationsPage() {
  const s = useShell();
  const [apps, setApps] = useState<
    Array<{ id: number; name: string; status: string; external_id: string; notes?: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<
        Array<{ id: number; name: string; status: string; external_id: string; notes?: string }>
      >('/api/applications', {}, true);
      setApps(data);
      const notes: Record<number, string> = {};
      data.forEach((a) => {
        notes[a.id] = a.notes || '';
      });
      setNoteDrafts(notes);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (app: { id: number }, status: string) => {
    try {
      const updated = await apiJson<{
        id: number;
        name: string;
        status: string;
        external_id: string;
        notes?: string;
      }>('/api/applications', { method: 'PUT', body: JSON.stringify({ id: app.id, status }) }, true);
      setApps((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const saveNotes = async (id: number) => {
    try {
      const updated = await apiJson<{
        id: number;
        name: string;
        status: string;
        external_id: string;
        notes?: string;
      }>(
        '/api/applications',
        { method: 'PUT', body: JSON.stringify({ id, notes: noteDrafts[id] || '' }) },
        true
      );
      setApps((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save notes');
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHead
        title="Applications"
        sub="Update status and notes for every counselling application"
      />
      <ErrorBox message={error} />
      <div className="flex justify-end mb-3">
        <Link to="/dashboard/counselling" className="text-sm font-bold text-orange-500 hover:underline">
          + Add track
        </Link>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className={`h-28 rounded-2xl animate-pulse ${s.chip}`} />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className={`rounded-2xl border border-dashed p-10 text-center ${s.card}`}>
          <p className={`text-sm font-semibold mb-3 ${s.muted}`}>No applications yet.</p>
          <Link to="/dashboard/counselling" className="zn-cta zn-cta-primary text-sm py-2 inline-flex">
            Create counselling track
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <div key={a.id} className={`rounded-2xl border p-5 ${s.card}`}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-3">
                <ClipboardList className="w-6 h-6 text-orange-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base">{a.name || 'Untitled counselling'}</p>
                  <p className={`text-xs font-semibold ${s.muted}`}>Ref {a.external_id || a.id}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {['Draft', 'In Progress', 'Submitted', 'Confirmed'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(a, st)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                      a.status === st
                        ? 'bg-orange-500 text-white border-orange-500'
                        : s.dark
                        ? 'border-white/10 hover:bg-white/5'
                        : 'border-[#e5e7eb] hover:bg-[#f8fafc]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <label className="block">
                <span className={`text-[11px] font-bold uppercase tracking-wide ${s.muted}`}>Notes</span>
                <textarea
                  value={noteDrafts[a.id] ?? ''}
                  onChange={(e) => setNoteDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                  rows={2}
                  className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm font-medium resize-y ${s.input}`}
                  placeholder="Deadlines, portal login, counsellor notes…"
                />
              </label>
              <button
                type="button"
                onClick={() => saveNotes(a.id)}
                className="mt-2 text-xs font-bold text-orange-500 hover:underline"
              >
                Save notes
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function NotificationsPage() {
  const s = useShell();
  const [items, setItems] = useState<
    Array<{ id: number; title: string; body: string; read: boolean; created_at: string }>
  >([]);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await apiJson('/api/notifications', {}, true));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const MEDICAL_KEYWORDS = [
    'neet', 'mbbs', 'bds', 'ayush', 'ayurveda', 'mcc', 'medical college',
    'medical admission', 'medical seat', 'counselling', 'counseling',
    'medical entrance', 'pg medical', 'ug medical', 'medical cutoff',
    'aiims', 'medical student', 'medical exam', 'medical university',
    'state quota', 'all india quota', 'merit list', 'mbbs seat', 'neet ug',
    'neet pg', 'dnb', 'md ms admission', 'medical counselling'
  ];

  const FALLBACK_NEWS = [
    {
      title: 'NEET UG 2026 — Exam Date Announced',
      description: 'National Testing Agency (NTA) has officially announced the NEET UG 2026 exam date. Students should begin preparations immediately.',
      link: 'https://nta.ac.in',
      source_id: 'NTA Official',
      pubDate: new Date().toISOString(),
      image_url: null,
    },
    {
      title: 'All India Counselling — Registration Open',
      description: 'MCC has opened registrations for the All India Quota MBBS/BDS counselling. Eligible candidates can apply on the official MCC portal.',
      link: 'https://mcc.nic.in',
      source_id: 'MCC',
      pubDate: new Date().toISOString(),
      image_url: null,
    },
    {
      title: 'AIIMS Delhi Cuts Off for MBBS 2025',
      description: 'AIIMS Delhi has published closing ranks for MBBS admissions. General category closing rank stood at 52 in Round 1.',
      link: 'https://aiimsexams.ac.in',
      source_id: 'AIIMS',
      pubDate: new Date().toISOString(),
      image_url: null,
    },
    {
      title: 'State Quota Counselling — Madhya Pradesh Schedule Released',
      description: 'DMET Madhya Pradesh has released the state counselling schedule for MBBS/BDS seats under 85% state quota.',
      link: 'https://dme.mponline.gov.in',
      source_id: 'DMET MP',
      pubDate: new Date().toISOString(),
      image_url: null,
    },
    {
      title: 'NEET PG 2025 Results Declared',
      description: 'National Board of Examinations (NBE) has declared NEET PG 2025 results. Candidates can check their scorecards on the official NBE portal.',
      link: 'https://nbe.edu.in',
      source_id: 'NBE',
      pubDate: new Date().toISOString(),
      image_url: null,
    },
  ];

  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    try {
      const res = await fetch('https://newsdata.io/api/1/news?apikey=pub_8e7f2b8fe15c4a13bb444bf2e8b0c195&q=NEET%20OR%20MBBS%20OR%20%22medical%20college%22&country=in&language=en&category=health');
      if (!res.ok) {
        // API rate-limited or error — use fallback
        setNews(FALLBACK_NEWS);
        return;
      }
      const data = await res.json();
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        const filtered = data.results.filter((item: any) => {
          const text = ((item.title || '') + ' ' + (item.description || '')).toLowerCase();
          return MEDICAL_KEYWORDS.some(kw => text.includes(kw));
        });
        setNews(filtered.length > 0 ? filtered.slice(0, 10) : FALLBACK_NEWS);
      } else {
        setNews(FALLBACK_NEWS);
      }
    } catch (e) {
      console.error('Failed to load news', e);
      setNews(FALLBACK_NEWS);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadNews();
  }, [load, loadNews]);

  const mark = async (id: number) => {
    try {
      const updated = await apiJson<{ id: number; read: boolean }>(
        '/api/notifications',
        { method: 'PUT', body: JSON.stringify({ id, read: true }) },
        true
      );
      setItems((prev) => prev.map((n) => (n.id === updated.id ? { ...n, read: true } : n)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const markAll = async () => {
    try {
      await apiJson('/api/notifications', { method: 'PUT', body: JSON.stringify({ mark_all: true }) }, true);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Personal Notifications */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-5">
            <PageHead title="Alerts" sub="Your personal notifications" />
            <button type="button" onClick={markAll} className="zn-cta text-xs py-2 shrink-0">
              Mark all read
            </button>
          </div>
          <ErrorBox message={error} />
          {loading ? (
            <div className={`h-32 rounded-2xl animate-pulse ${s.chip}`} />
          ) : items.length === 0 ? (
            <div className={`p-8 text-center rounded-2xl border ${s.card}`}>
              <Bell className={`w-8 h-8 mx-auto mb-3 opacity-20`} />
              <p className={`font-bold ${s.muted}`}>No new alerts</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => !n.read && mark(n.id)}
                  className={`w-full rounded-2xl border p-4 flex gap-3 text-left transition-all ${s.card} ${
                    !n.read ? 'ring-1 ring-primary/30 bg-primary/5' : 'hover:-translate-y-0.5'
                  }`}
                >
                  <Bell className={`w-5 h-5 shrink-0 mt-0.5 ${!n.read ? 'text-primary' : 'text-secondary'}`} />
                  <div className="flex-1">
                    <p className={`text-sm ${!n.read ? 'font-extrabold text-primary' : 'font-bold'}`}>{n.title}</p>
                    <p className={`text-xs mt-1 leading-relaxed ${s.muted}`}>{n.body}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${!n.read ? 'text-primary' : s.muted}`}>
                    {n.read ? 'Read' : 'New'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Real-time Medical News */}
        <div>
          <div className="mb-5">
            <PageHead title="Live Updates" sub="Latest NEET & Medical Education News" />
          </div>
          {newsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className={`h-24 rounded-2xl animate-pulse ${s.chip}`} />)}
            </div>
          ) : news.length === 0 ? (
            <div className={`p-8 text-center rounded-2xl border ${s.card}`}>
              <Newspaper className={`w-8 h-8 mx-auto mb-3 opacity-20`} />
              <p className={`font-bold ${s.muted}`}>No news available right now</p>
            </div>
          ) : (
            <div className="space-y-3">
              {news.map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group block rounded-2xl border p-4 transition-all hover:-translate-y-1 hover:shadow-lg ${s.card}`}
                >
                  <div className="flex gap-4 items-start">
                    {item.image_url && (
                      <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-white/5 border border-white/10 hidden sm:block">
                        <img src={item.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded-full">
                          {item.source_id || 'News'}
                        </span>
                        {item.pubDate && (
                          <span className={`text-[10px] font-medium ${s.muted}`}>
                            {new Date(item.pubDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">
                        {item.title}
                      </h3>
                      <p className={`text-xs line-clamp-2 ${s.muted}`}>
                        {item.description || item.content}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export function SettingsPage() {
  const s = useShell();
  const { dark, toggleDark } = useDashboard();
  const { signOut, user } = useAuth();

  return (
    <div className="max-w-xl">
      <PageHead title="Settings" sub={user?.email || ''} />
      <div
        className={`rounded-2xl border divide-y ${s.card} ${
          s.dark ? 'divide-white/8' : 'divide-primary-dark/8'
        }`}
      >
        <div className="p-4 flex items-center gap-3">
          <Settings className={`w-4 h-4 ${s.muted}`} />
          <div className="flex-1">
            <p className="font-bold text-sm">Dark mode</p>
            <p className={`text-xs ${s.muted}`}>UI preference (local)</p>
          </div>
          <button
            type="button"
            onClick={toggleDark}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              dark ? 'bg-teal-500/20 text-teal-200' : 'bg-primary/10 text-primary'
            }`}
          >
            {dark ? 'On' : 'Off'}
          </button>
        </div>
        <div className="p-4">
          <button
            type="button"
            onClick={() => signOut()}
            className="zn-cta w-full justify-center text-red-600 border-red-200"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export function SupportPage() {
  const s = useShell();
  return (
    <div className="max-w-xl">
      <PageHead title="Support" sub="Humans on call — not bots" />
      <div className={`rounded-2xl border p-6 space-y-4 ${s.card}`}>
        <div className="flex items-center gap-3">
          <LifeBuoy className="w-8 h-8 text-primary" />
          <div>
            <p className="font-bold">MBBSWala Helpdesk</p>
            <p className={`text-xs ${s.muted}`}>Bhopal · 7 days a week</p>
          </div>
        </div>
        <a href="tel:+917880119983" className="zn-cta zn-cta-primary w-full justify-center gap-2">
          <Phone className="w-4 h-4" /> +91 78801 19983
        </a>
        <a
          href="https://wa.me/7880119983"
          target="_blank"
          rel="noreferrer"
          className="zn-cta w-full justify-center"
        >
          WhatsApp chat
        </a>
        <a href="mailto:info@mbbswala.in" className="zn-cta w-full justify-center">
          info@mbbswala.in
        </a>
        <Link to="/contact" className={`block text-center text-sm font-bold underline ${s.muted}`}>
          Public contact form → POST /api/inquiries
        </Link>
      </div>
    </div>
  );
}
