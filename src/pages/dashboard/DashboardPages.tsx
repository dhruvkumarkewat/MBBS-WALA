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
  ChevronDown,
  Crown,
  Sparkles,
} from 'lucide-react';
import { useDashboard } from '../../contexts/DashboardContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiJson } from '../../lib/api';
import { usePremium, UpgradePrompt, PremiumGate } from '../../lib/premium';
import { INDIAN_STATES, COUNSELLING_ROUNDS } from '../../lib/courses';
import Cutoffs from '../../pages/Cutoffs';
import { PredictorResults } from './PredictorResults';

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
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      text: "Hi — I'm your MBBSWala assistant. I use your live college/seat data tips. For ranks, open College Predictor (real /api/rank-calculator).",
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [userQueryCount, setUserQueryCount] = useState(0);

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
              <Link to="/packages" className="btn-orange inline-flex px-4 py-1.5 text-xs font-bold shadow-md">
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
  name: string;
  probability: string;
  expected_round: string;
  fees: string;
  quota: string;
  opening_rank: string;
  closing_rank: string;
  reason: string;
}

interface PredictorResponse {
  admission_summary?: {
    status: string;
    overall_confidence: string;
    ai_prediction_confidence: string;
    expected_probability: string;
    explanation: string;
  };
  college_predictions?: {
    safe: CollegePrediction[];
    moderate: CollegePrediction[];
    reach: CollegePrediction[];
  };
  unlikely_mbbs_guidance?: {
    active: boolean;
    message: string;
    private_options: {
      name: string;
      state: string;
      fees: string;
      probability: string;
      rounds: string;
      management_quota: boolean;
      nri_seats: boolean;
    }[];
  };
  management_quota_opportunities?: {
    college: string;
    expected_rank: string;
    approx_fees: string;
    hostel_fees: string;
    bond: string;
    total_cost: string;
    chances: string;
    donation_expected: boolean;
  }[];
  nri_quota?: {
    eligible_colleges: string[];
    approx_fees: string;
    eligibility: string;
    required_documents: string[];
  };
  alternative_courses?: {
    course: string;
    career_scope: string;
    average_salary: string;
    higher_studies: string;
    admission_chances: string;
    top_colleges: string[];
  }[];
  scholarships?: {
    government: string[];
    state: string[];
    private: string[];
    minority: string[];
    category: string[];
    income_based: string[];
  };
  counselling_strategy?: {
    round_1: string;
    round_2: string;
    round_3: string;
    stray_vacancy: string;
    aaccc: string;
    state_counselling: string;
  };
  expected_cutoff_comparison?: {
    college: string;
    last_year_closing_rank: string;
    your_rank: string;
    difference: string;
    admission_chance: string;
  }[];
  fee_comparison?: {
    government: string;
    private: string;
    management: string;
    nri: string;
    total_course_cost: string;
    hostel: string;
    miscellaneous: string;
    bond: string;
    penalty: string;
  };
  documents_required?: string[];
  important_advice?: string[];
  ai_recommendation?: string;
  smart_suggestions?: string[];
  dashboard_cards?: {
    govt_mbbs: string;
    pvt_mbbs: string;
    mgmt_quota: string;
    bds: string;
    ayush: string;
    scholarships: string;
    expected_fees: string;
    expected_rounds: string;
    confidence_score: string;
  };
  
  meta?: {
    exam_track?: string;
    authority?: string;
    round?: { round_id: string; label: string; status: string };
    data_basis_year?: number;
    qualifying_floor_met?: boolean;
  };
  _provider_used?: string;
  _response_time_ms?: number;
  _data_summary?: { colleges_in_context: number; scholarships_matched: number };
  disclaimers_fraud_warnings?: string[];
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
  const [quotas, setQuotas] = useState<string[]>(['AIQ', 'State']);
  const [round, setRound] = useState('Round 1');
  const [neetYear, setNeetYear] = useState(new Date().getFullYear());

  // State for AI form
  const [aiResponse, setAiResponse] = useState<PredictorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'colleges' | 'scholarships'>('colleges');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'High' | 'Moderate' | 'Reach'>('ALL');
  const [quotaFilter, setQuotaFilter] = useState<string>('ALL');

  // ── Persistence ──
  useEffect(() => {
    if (profile?.id) {
      const saved = localStorage.getItem(`mbbswala_prediction_v2_${profile.id}`);
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
      localStorage.setItem(`mbbswala_prediction_v2_${profile.id}`, JSON.stringify(aiResponse));
    }
  }, [aiResponse, profile?.id]);

  const handleRecalculate = () => {
    setAiResponse(null);
    if (profile?.id) {
      localStorage.removeItem(`mbbswala_prediction_v2_${profile.id}`);
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
            state: quotas.includes('State') && !quotas.includes('AIQ') && domicileState ? domicileState : undefined,
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

        const fallbackColleges = filteredMatches.map((m) => {
          const isHomeState = Boolean(domicileState && (m.state || '').toLowerCase().includes(domicileState.toLowerCase()));
          const tier = toneToTier(m.chance_tone);
          return {
            name: m.college_name,
            probability: tier,
            expected_round: m.round || round || 'Round 1',
            fees: (m as any).fee ? `₹${Number((m as any).fee).toLocaleString('en-IN')}/yr` : 'N/A',
            quota: (m as any).quota || (isHomeState && quotas.includes('State') ? 'State' : 'AIQ'),
            opening_rank: '-',
            closing_rank: m.aiq_rank?.toString() || '-',
            reason: 'Legacy fallback match',
          };
        });

        setAiResponse({
          meta: { exam_track: examTrack, qualifying_floor_met: true },
          college_predictions: {
            safe: fallbackColleges.filter(c => c.probability === 'High'),
            moderate: fallbackColleges.filter(c => c.probability === 'Moderate'),
            reach: fallbackColleges.filter(c => c.probability === 'Reach'),
          },
          scholarships: {
            government: (legacy.scholarships || []).map((s: any) => s.name),
            state: [], private: [], minority: [], category: [], income_based: [],
          },
          disclaimers_fraud_warnings: ['Data from official counselling cutoffs.'],
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
  const isOnlyStateQuota = quotas.includes('State') && !quotas.includes('AIQ');

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
        <div className="space-y-4 mt-8">
          <PredictorResults 
            aiResponse={aiResponse} 
            s={s} 
            isPremium={isPremium} 
            domicileState={domicileState} 
          />
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
        await apiJson('/api/saved', { method: 'DELETE', body: JSON.stringify({ college_id: id }) }, true);
        setSavedIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      } else {
        await apiJson('/api/saved', { method: 'POST', body: JSON.stringify({ college_id: id }) }, true);
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
      ) : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {colleges.map((c) => {
              const isSaved = savedIds.has(c.id);
              return (
                <div key={c.id} className={`rounded-2xl border p-4 flex flex-col gap-2 ${s.card}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm leading-snug">{c.name}</h3>
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
        </>
      )}
    </div>
  );
}

function SearchableCollegeSelect({ value, onChange, colleges, placeholder }: { value: string, onChange: (v: string) => void, colleges: any[], placeholder?: string }) {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const s = useShell();

  useEffect(() => {
    if (!open) {
      const selected = colleges.find(c => String(c.id) === value);
      setInputValue(selected ? selected.name : '');
    }
  }, [value, colleges, open]);

  const filtered = colleges.filter(c => c.name.toLowerCase().includes(inputValue.toLowerCase())).slice(0, 50);

  return (
    <div className="relative">
      <div 
        className={`rounded-xl border px-3 py-2.5 text-sm font-semibold flex items-center justify-between ${s.input}`}
        onClick={() => setOpen(true)}
      >
        <input 
          className="w-full bg-transparent outline-none truncate"
          value={open ? inputValue : (colleges.find(c => String(c.id) === value)?.name || '')}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setInputValue('');
          }}
          placeholder={placeholder || 'Search college...'}
        />
        <ChevronDown className="w-4 h-4 opacity-50 shrink-0 cursor-pointer" />
      </div>
      
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border shadow-xl overflow-hidden flex flex-col max-h-[300px] ${s.card}`}>
            <div className="overflow-y-auto zn-scroll py-1">
              {filtered.length === 0 && <div className="p-3 text-sm opacity-50 text-center">No results</div>}
              {filtered.map(c => (
                <div 
                  key={c.id} 
                  className={`px-3 py-2 text-sm cursor-pointer ${s.dark ? 'hover:bg-white/5' : 'hover:bg-black/5'} ${String(c.id) === value ? 'font-bold text-orange-500' : ''}`}
                  onClick={() => {
                    onChange(String(c.id));
                    setInputValue(c.name);
                    setOpen(false);
                  }}
                >
                  {c.name}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Compare → enriched seats + cutoffs ---------------- */
export function ComparePage() {
  const s = useShell();
  const { isPremium } = usePremium();
  const [colleges, setColleges] = useState<College[]>([]);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
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
    apiJson<College[]>('/api/colleges?limit=9999')
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setColleges(list);
        if (list.length) {
          setA(String(list[0].id));
          setB(String(list[Math.min(1, list.length - 1)].id));
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
            <SearchableCollegeSelect
              value={a}
              onChange={setA}
              colleges={colleges}
              placeholder="Select first college"
            />
            <SearchableCollegeSelect
              value={b}
              onChange={setB}
              colleges={colleges}
              placeholder="Select second college"
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
            <>
              {payload.insights?.length > 0 && (
                <div className={`rounded-2xl border p-4 mb-4 space-y-2 ${s.card}`}>
                  <p className="text-xs font-bold uppercase tracking-wide text-primary">Insights</p>
                  {payload.insights.map((t) => (
                    <p key={t} className="text-sm font-medium flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {t}
                    </p>
                  ))}
                </div>
              )}

              <div className={`rounded-2xl border overflow-hidden ${s.card}`}>
                <div
                  className={`grid grid-cols-3 gap-2 p-4 border-b font-bold text-sm ${
                    s.dark ? 'border-white/8 bg-white/5' : 'border-primary-dark/8 bg-grey-bg-light'
                  }`}
                >
                  <span className={s.muted}>Field</span>
                  <span className="truncate">{payload.a.college.name}</span>
                  <span className="truncate">{payload.b.college.name}</span>
                </div>
                {payload.fields.map((r) => (
                  <div
                    key={r.key}
                    className={`grid grid-cols-3 gap-2 p-4 text-sm border-b last:border-0 ${
                      s.dark ? 'border-white/5' : 'border-primary-dark/5'
                    }`}
                  >
                    <span className={`font-bold ${s.muted}`}>{r.key}</span>
                    <span className={`font-semibold ${r.better === 'a' ? 'text-emerald-500' : ''}`}>
                      {r.a}
                    </span>
                    <span className={`font-semibold ${r.better === 'b' ? 'text-emerald-500' : ''}`}>
                      {r.b}
                    </span>
                  </div>
                ))}
              </div>

              {isPremium ? (
                <div className={`mt-4 rounded-2xl border overflow-x-auto ${s.card}`}>
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className={s.dark ? 'bg-white/5' : 'bg-grey-bg-light'}>
                        <th className="text-left p-3 font-bold">Category</th>
                        <th className="text-left p-3 font-bold">A AIQ</th>
                        <th className="text-left p-3 font-bold">A State</th>
                        <th className="text-left p-3 font-bold">B AIQ</th>
                        <th className="text-left p-3 font-bold">B State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payload.category_matrix.map((row) => (
                        <tr
                          key={row.category}
                          className={`border-t ${s.dark ? 'border-white/5' : 'border-primary-dark/5'}`}
                        >
                          <td className="p-3 font-bold text-primary">{row.category}</td>
                          <td className="p-3 font-semibold">
                            {row.a?.aiq_rank?.toLocaleString() || '—'}
                          </td>
                          <td className={`p-3 ${s.muted}`}>{row.a?.state_rank_range || '—'}</td>
                          <td className="p-3 font-semibold">
                            {row.b?.aiq_rank?.toLocaleString() || '—'}
                          </td>
                          <td className={`p-3 ${s.muted}`}>{row.b?.state_rank_range || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="relative mt-4">
                  <div className={`rounded-2xl border overflow-hidden ${s.card} select-none filter blur-sm pointer-events-none opacity-40`}>
                    <table className="w-full text-sm min-w-[640px]">
                      <thead>
                        <tr className={s.dark ? 'bg-white/5' : 'bg-grey-bg-light'}>
                          <th className="text-left p-3 font-bold">Category</th>
                          <th className="text-left p-3 font-bold">A AIQ</th>
                          <th className="text-left p-3 font-bold">A State</th>
                          <th className="text-left p-3 font-bold">B AIQ</th>
                          <th className="text-left p-3 font-bold">B State</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payload.category_matrix.slice(0, 3).map((row, i) => (
                          <tr key={i} className={`border-t ${s.dark ? 'border-white/5' : 'border-primary-dark/5'}`}>
                            <td className="p-3 font-bold text-primary">{row.category}</td>
                            <td className="p-3 font-semibold">--</td>
                            <td className={`p-3 ${s.muted}`}>--</td>
                            <td className="p-3 font-semibold">--</td>
                            <td className={`p-3 ${s.muted}`}>--</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl border border-orange-500/20 overflow-hidden">
                      <UpgradePrompt 
                        featureName="Compare Cutoffs & Fees" 
                        title="Content Locked"
                        description="Please purchase a NEET UG package to view detailed AIQ & State cutoff comparisons, fee structures, and precise insights." 
                      />
                    </div>
                  </div>
                </div>
              )}

              <p className={`mt-3 text-xs flex items-center gap-1 ${s.muted}`}>
                <GitCompareArrows className="w-3.5 h-3.5" /> Enriched from colleges + cutoffs + seat_matrix.
                Green = relatively better on that metric.
              </p>
            </>
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
        '/api/saved',
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
  type AppRow = {
    id: number;
    name: string;
    status: string;
    external_id?: string;
    notes?: string;
  };
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: 'NEET UG — State Quota',
    notes: '',
    external_id: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setApps(await apiJson<AppRow[]>('/api/applications', {}, true));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load counselling tracks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addTrack = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Please enter a counselling name');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await apiJson<AppRow>(
        '/api/applications',
        {
          method: 'POST',
          body: JSON.stringify({
            name: form.name.trim(),
            notes: form.notes.trim(),
            external_id: form.external_id.trim() || `TRACK-${Date.now().toString().slice(-6)}`,
            status: 'Draft',
          }),
        },
        true
      );
      setApps((prev) => [created, ...prev]);
      setForm({ name: 'NEET UG — State Quota', notes: '', external_id: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create track');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (app: AppRow, status: string) => {
    try {
      const updated = await apiJson<AppRow>(
        '/api/applications',
        { method: 'PUT', body: JSON.stringify({ id: app.id, status }) },
        true
      );
      setApps((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const presets = [
    'MCC AIQ UG',
    'MP DME State Counselling',
    'Deemed University Round',
    'NEET PG AIQ',
  ];

  return (
    <div className="max-w-4xl">
      <PageHead
        title="Counselling"
        sub="Manage your counselling tracks, book experts, and jump into live data tools"
      />
      <ErrorBox message={error} />

      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        {[
          { t: 'Book video call', d: 'WhatsApp to schedule a slot', href: 'https://wa.me/7880119983', icon: CalendarDays },
          { t: 'Call helpline', d: '+91 78801 19983 · 7 days', href: 'tel:+917880119983', icon: Phone },
        ].map((x) => (
          <a key={x.t} href={x.href} className={`rounded-2xl border p-5 flex gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md ${s.card}`}>
            <span className="w-11 h-11 rounded-xl bg-orange-500/15 text-orange-600 grid place-items-center shrink-0">
              <x.icon className="w-5 h-5" />
            </span>
            <div>
              <p className="font-bold">{x.t}</p>
              <p className={`text-xs font-medium ${s.muted}`}>{x.d}</p>
            </div>
          </a>
        ))}
      </div>


      <div className={`rounded-2xl border p-5 ${s.card}`}>
        <h3 className="font-bold mb-3">Data tools for counselling</h3>
        <div className="flex flex-wrap gap-2">
          <Link to="/dashboard/seat-matrix" className="zn-cta text-sm py-2">
            Seat matrix
          </Link>
          <Link to="/dashboard/cutoffs" className="zn-cta text-sm py-2">
            Public cutoffs
          </Link>
          <Link to="/dashboard/predictor" className="zn-cta zn-cta-primary text-sm py-2">
            Predictor
          </Link>
          <Link to="/dashboard/finder" className="zn-cta text-sm py-2">
            College finder
          </Link>
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

  useEffect(() => {
    setLoading(true);
    apiJson<{ data: Array<Record<string, unknown>>; totalPages: number }>(
      `/api/seat-matrix?paginate=1&page=${page}&limit=20`
    )
      .then((d) => {
        setRows(d.data || []);
        setTotalPages(d.totalPages || 1);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page]);

  const visibleRows = isPremium ? rows : rows.slice(0, 3);

  return (
    <div>
      <PageHead title="Seat Matrix" sub="Detailed seat breakdown by college, quota, and category" />
      <ErrorBox message={error} />
      
      <div className={`rounded-2xl border overflow-x-auto ${s.card}`}>
        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
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
                  <td className="p-3 font-semibold">{String(r.college_name)}</td>
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

      {!isPremium && rows.length > 3 && (
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
    { t: 'Public cutoffs page', to: '/dashboard/cutoffs' },
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
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    load();
  }, [load]);

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
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-3 mb-5">
        <PageHead title="Notifications" sub="GET/PUT /api/notifications" />
        <button type="button" onClick={markAll} className="zn-cta text-xs py-2 shrink-0">
          Mark all read
        </button>
      </div>
      <ErrorBox message={error} />
      {loading ? (
        <div className={`h-32 rounded-2xl animate-pulse ${s.chip}`} />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => !n.read && mark(n.id)}
              className={`w-full rounded-2xl border p-4 flex gap-3 text-left ${s.card} ${
                !n.read ? 'ring-1 ring-primary/30' : ''
              }`}
            >
              <Bell className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm">{n.title}</p>
                <p className={`text-xs ${s.muted}`}>{n.body}</p>
              </div>
              <span className={`text-[11px] font-semibold whitespace-nowrap ${s.muted}`}>
                {n.read ? 'Read' : 'Unread'}
              </span>
            </button>
          ))}
        </div>
      )}
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
