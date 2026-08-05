import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Crown, Sparkles, CheckCircle2, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiJson } from './api';

export interface PremiumState {
  isPremium: boolean;
  subscriptionStatus: 'free' | 'active' | 'expired' | 'cancelled';
  subscriptionPlan: string;
  premiumEndDate: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const PremiumContext = createContext<PremiumState>({
  isPremium: false,
  subscriptionStatus: 'free',
  subscriptionPlan: 'Free Plan',
  premiumEndDate: null,
  loading: true,
  refetch: async () => {},
});

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [status, setStatus] = useState<'free' | 'active' | 'expired' | 'cancelled'>('free');
  const [plan, setPlan] = useState('Free Plan');
  const [endDate, setEndDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    if (!user) {
      setIsPremium(false);
      setStatus('free');
      setPlan('Free Plan');
      setEndDate(null);
      setLoading(false);
      return;
    }

    try {
      // 1. Check Profile endpoint
      const res = await apiJson<{
        is_premium?: boolean;
        subscription_status?: string;
        subscription_plan?: string;
        premium_end_date?: string | null;
        payment_status?: string;
      }>('/api/profile', {}, true);

      let premium = Boolean(res?.is_premium) || 
                    res?.subscription_status === 'active' || 
                    res?.payment_status === 'Paid' ||
                    Boolean(user.user_metadata?.is_premium);
      let subStatus = (res?.subscription_status as any) || (premium ? 'active' : 'free');
      let subPlan = res?.subscription_plan && res.subscription_plan !== 'Free Plan'
        ? res.subscription_plan
        : (premium ? 'NEET Counselling Pro' : 'Free Plan');
      let subEndDate = res?.premium_end_date || null;

      // 2. Secondary verification via Payment endpoint if still not recognized
      if (!premium) {
        try {
          const payRes = await apiJson<{
            is_premium?: boolean;
            subscription_status?: string;
            subscription_plan?: string;
            subscription?: { end_date?: string; plan_name?: string };
            payments?: any[];
          }>('/api/payment', {}, true);

          if (payRes?.is_premium || payRes?.payments?.some((p: any) => p.status === 'captured' || p.status === 'success' || p.status === 'paid')) {
            premium = true;
            subStatus = 'active';
            subPlan = payRes.subscription_plan || payRes.subscription?.plan_name || 'NEET Counselling Pro';
            subEndDate = payRes.subscription?.end_date || subEndDate;
          }
        } catch (pErr) {
          console.warn('Premium verification secondary check warning:', pErr);
        }
      }

      setIsPremium(premium);
      setStatus(subStatus);
      setPlan(subPlan);
      setEndDate(subEndDate);
    } catch {
      // Fallback to user metadata check
      const metaPrem = Boolean(user.user_metadata?.is_premium);
      setIsPremium(metaPrem);
      setStatus(metaPrem ? 'active' : 'free');
      setPlan(metaPrem ? 'NEET Counselling Pro' : 'Free Plan');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return (
    <PremiumContext.Provider
      value={{
        isPremium,
        subscriptionStatus: status,
        subscriptionPlan: plan,
        premiumEndDate: endDate,
        loading,
        refetch: checkStatus,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export const usePremium = () => useContext(PremiumContext);

export interface UpgradePromptProps {
  title?: string;
  description?: string;
  featureName?: string;
  compact?: boolean;
  className?: string;
}

export function UpgradePrompt({
  title = 'Unlock 1000+ College Predictions & Complete Counselling Suite',
  description = 'Get instant access to round-wise cutoffs, admission probability, seat matrix, college comparisons, and personalized AI counselling.',
  featureName,
  compact = false,
  className = '',
}: UpgradePromptProps) {
  const navigate = useNavigate();

  if (compact) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 grid place-items-center font-black shadow-lg shadow-amber-500/20">
            <Crown className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
              <span>{featureName ? `Premium Feature: ${featureName}` : 'Upgrade to Premium'}</span>
              <span className="text-[10px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                PRO
              </span>
            </h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/dashboard/subscription')}
          className="whitespace-nowrap inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:opacity-95 transition-all hover:scale-[1.02]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Upgrade Now
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-card to-card/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl ${className}`}
    >
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black uppercase tracking-wider mb-4">
          <Crown className="w-3.5 h-3.5" />
          <span>Premium Access</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-foreground mb-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground max-w-2xl mb-6">
          {description}
        </p>

        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {[
            'Unlimited College Predictions & Accuracy Scores',
            'Round 1, 2, 3 & Mop-up Cutoff Trends (2020-2024)',
            'MCC & AACCC Official Seat Matrix & Vacancies',
            'Smart Choice Filling Order & Strategy Guide',
            '24/7 AI Medical Counselling Assistant',
            'State-wise Quota & Domicile Advantage Analytics',
          ].map((perk, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs text-foreground/90 font-medium">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{perk}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/40">
          <button
            onClick={() => navigate('/dashboard/subscription')}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl text-sm font-black bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Crown className="w-4 h-4" />
            Upgrade to Premium Now
            <ArrowRight className="w-4 h-4" />
          </button>

          <Link
            to="/packages"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Compare All Plans & Pricing →
          </Link>
        </div>
      </div>
    </div>
  );
}

export interface PremiumGateProps {
  children: ReactNode;
  featureName?: string;
  compactPrompt?: boolean;
}

export function PremiumGate({ children, featureName, compactPrompt = false }: PremiumGateProps) {
  const { isPremium, loading } = usePremium();

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm animate-pulse">
        Checking access...
      </div>
    );
  }

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="select-none filter blur-sm pointer-events-none opacity-40">
        {children}
      </div>
      <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <UpgradePrompt featureName={featureName} compact={compactPrompt} />
        </div>
      </div>
    </div>
  );
}
