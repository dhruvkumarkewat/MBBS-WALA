import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Crown,
  Check,
  ShieldCheck,
  CreditCard,
  History,
  AlertCircle,
  Loader2,
  Gift,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  X,
  Lock,
  Building2,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { usePremium } from '../../lib/premium';
import { apiJson } from '../../lib/api';

interface Plan {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  badge?: string;
  popular?: boolean;
  features: string[];
  description: string;
}

const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'BASIC',
    price: 99,
    originalPrice: 4999,
    badge: 'Most Popular',
    popular: true,
    description: 'Complete AI-powered choice filling, cutoffs, and predictions for MBBS, BDS, and AYUSH.',
    features: [
      '15 College Predictions',
      'MCC AIQ + All 28 State Quota Round-wise Cutoffs',
      'AI Smart Choice Preference Order Sequence',
      'Category & Domicile Matrix Analyzer',
      '24/7 AI Medical Counselling Chatbot',
      'Closing Rank Trends (2020-2024)',
      'Official Fee Structure & Bond Penalty Breakdown',
      'Permanent ₹500 Referral Rewards per friend',
    ],
  },
  {
    id: 'neet-ug-pro',
    name: 'NEET UG Counselling Pro',
    price: 4999,
    originalPrice: 11999,
    badge: 'Specialized',
    popular: false,
    description: 'Advanced clinical MD/MS and DNB hospital analytics and stipend trends.',
    features: [
      'All Clinical & Non-Clinical Speciality Predictors',
      'DNB & Private Medical College Cutoffs',
      'State Quota & In-service Quota Matrices',
      'Bond Conditions, Stipend & Bed Strength Audits',
      'AI Choice Filling Master Sequence',
      'Priority Mentor Helpline',
    ],
  },
  {
    id: 'ultimate',
    name: 'Ultimate Medical Master Bundle',
    price: 9999,
    originalPrice: 16999,
    badge: 'Best Value',
    popular: false,
    description: 'Everything in UG & PG, plus direct 1-on-1 human counsellor phone support.',
    features: [
      'Everything in NEET UG + PG Plans included',
      'Dedicated Senior Medical Counsellor Assigned',
      'Live Choice Locking Assistance on MCC/State Portal',
      'College Fee Structure & Hidden Fee Audit',
      'Direct WhatsApp Call Access with Senior Mentors',
      'Refund Protection & Choice Filing Guarantee',
    ],
  },
];

interface AuBankOrder {
  orderId: string;
  gateway: string;
  gatewayUrl: string;
  accessCode: string;
  merchantId: string;
  encRequest: string;
  amount: number;
  original_amount: number;
  currency: string;
  plan_slug: string;
  plan_name: string;
  isLiveGateway: boolean;
}

export function SubscriptionPage() {
  const { user } = useAuth();
  const { isPremium, subscriptionPlan, premiumEndDate, refetch: refetchPremium } = usePremium();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [activeSub, setActiveSub] = useState<any>(null);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralMsg, setReferralMsg] = useState({ type: '', text: '' });

  // AU Bank Checkout Modal State
  const [checkoutOrder, setCheckoutOrder] = useState<AuBankOrder | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const auBankFormRef = useRef<HTMLFormElement>(null);

  // Handle redirect callback query parameters (?payment=success or ?payment=failed)
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const paymentError = searchParams.get('error');

    if (paymentStatus === 'success') {
      success('🎉 Payment Successful!', 'Welcome to MBBSWala Premium! All predictor tools and cutoffs are unlocked.');
      refetchPremium();
      loadData();
      // Clean query params
      navigate('/dashboard', { replace: true });
    } else if (paymentStatus === 'failed') {
      toastError('Payment Incomplete', paymentError || 'Payment was declined or cancelled. Please try again.');
      // Clean query params
      navigate('/dashboard/subscription', { replace: true });
    }
  }, [searchParams]);

  // Listen for iframe/modal postMessages
  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (e.data?.type === 'AUBANK_SUCCESS') {
        setCheckoutOrder(null);
        success('🎉 Payment Successful!', 'Welcome to MBBSWala Premium! All tools are now unlocked.');
        await refetchPremium();
        await loadData();
        navigate('/dashboard', { replace: true });
      } else if (e.data?.type === 'AUBANK_FAILED') {
        toastError('Payment Declined', e.data.error || 'Transaction was declined by your bank.');
        setCheckoutOrder(null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const applyReferral = async () => {
    if (!referralCode.trim()) return;
    setReferralMsg({ type: '', text: 'Checking code...' });
    try {
      const res = await apiJson<{ valid: boolean; discount: number; message?: string; error?: string }>(
        `/api/referrals?code=${referralCode}&validate=1`
      );
      if (res.valid) {
        setReferralMsg({
          type: 'success',
          text: `Valid code! ₹${res.discount} discount will be applied at checkout.`,
        });
      } else {
        setReferralMsg({
          type: 'error',
          text: res.message || res.error || 'Invalid or unusable code.',
        });
      }
    } catch (err: any) {
      setReferralMsg({ type: 'error', text: err.message || 'Error validating code.' });
    }
  };

  const handleSyncPurchases = async () => {
    try {
      setSyncing(true);
      setError('');
      const data = await apiJson<any>(
        '/api/payment?action=sync-subscription',
        { method: 'POST' },
        true
      );
      await refetchPremium();
      await loadData();
      if (data?.is_premium) {
        success('Plan Restored! 🎉', `Your ${data.subscription_plan || 'Premium'} plan is active.`);
      } else {
        success(
          'Verification Done',
          'If you purchased under a different email or offline, please contact support with your payment receipt.'
        );
      }
    } catch (err: any) {
      toastError('Sync Failed', err.message || 'Could not verify purchases.');
    } finally {
      setSyncing(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiJson<any>('/api/payment', {}, true);
      setPayments(data.payments || []);
      setActiveSub(data.subscription || null);
    } catch (e: any) {
      console.warn('Subscription fetch:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Initiate AU Bank payment checkout
  const handleUpgrade = async (plan: Plan) => {
    if (!user) {
      toastError('Login Required', 'Please login to subscribe.');
      return;
    }

    if (isPremium && subscriptionPlan === plan.name) {
      success('Plan Active', 'You already have this plan active! Redirecting to Dashboard...');
      navigate('/dashboard', { replace: true });
      return;
    }

    try {
      setUpgradingPlan(plan.id);
      setError('');

      // Create AU Bank order on backend
      const orderRes = await apiJson<AuBankOrder>(
        '/api/payment?action=create-order',
        {
          method: 'POST',
          body: JSON.stringify({
            plan_slug: plan.id,
            referral_code: referralCode.trim(),
          }),
        },
        true
      );

      if ((orderRes as any)?.already_subscribed) {
        success('Plan Active', 'You already have an active subscription. Redirecting to Dashboard...');
        await refetchPremium();
        navigate('/dashboard', { replace: true });
        return;
      }

      // Open AU Bank Checkout Modal
      setCheckoutOrder(orderRes);
    } catch (err: any) {
      if (
        err.message?.includes('already have an active subscription') ||
        err.message?.includes('already_subscribed')
      ) {
        success('Already Subscribed', 'You already have an active plan. Redirecting to Dashboard...');
        await refetchPremium();
        navigate('/dashboard', { replace: true });
      } else {
        setError(err.message || 'Payment initiation failed. Please try again.');
        toastError('Upgrade Failed', err.message || 'Could not create order');
      }
    } finally {
      setUpgradingPlan(null);
    }
  };

  // Submit to AU Bank Live Payment Gateway
  const handleProceedToAuBank = () => {
    if (!checkoutOrder) return;
    setIsProcessingCheckout(true);

    if (checkoutOrder.isLiveGateway && checkoutOrder.encRequest) {
      if (auBankFormRef.current) {
        auBankFormRef.current.submit();
      }
    }
  };

  // Sandbox simulation payment when live keys are pending
  const handleSimulatePayment = async () => {
    if (!checkoutOrder) return;
    try {
      setIsProcessingCheckout(true);
      const res = await apiJson<any>(
        '/api/payment?action=verify-aubank',
        {
          method: 'POST',
          body: JSON.stringify({
            order_id: checkoutOrder.orderId,
            payment_id: `AUB_SIM_${Date.now()}`,
            is_simulated: true,
          }),
        },
        true
      );

      success('🎉 Payment Successful!', `Welcome to ${checkoutOrder.plan_name}! Premium is now active.`);
      setCheckoutOrder(null);
      await refetchPremium();
      await loadData();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toastError('Verification Failed', err.message || 'Could not simulate payment');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-black uppercase tracking-wider">
          <Crown className="w-3.5 h-3.5" />
          <span>Membership & Plans</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">
          Supercharge Your Medical Counselling
        </h1>
        <p className="text-sm text-muted-foreground">
          Unlock 1000+ AI College Predictions, MCC & State Round-wise Cutoffs, Seat Matrices, and Smart Choice Filling.
        </p>
        <div className="pt-1 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleSyncPurchases}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all shadow-sm"
            title="Scan database to detect and link past purchases"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
            <span>{syncing ? 'Checking Database...' : 'Restore / Sync Purchases'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Subscription Status Banner */}
      {isPremium ? (
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-card to-amber-500/5 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 grid place-items-center font-black shadow-lg shadow-amber-500/25">
                <Crown className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-foreground">
                    {subscriptionPlan || 'Premium Membership'}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                    Active & Paid
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {premiumEndDate
                    ? `Valid until ${new Date(premiumEndDate).toLocaleDateString()}`
                    : 'Unlimited 1-Year Access Active'} • All AI predictions and cutoffs are unlocked.
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs font-semibold text-primary">
                  <Link to="/dashboard/predictor" className="hover:underline">
                    Predictor →
                  </Link>
                  <Link to="/dashboard/wallet" className="hover:underline">
                    Wallet & Referrals →
                  </Link>
                  <Link to="/dashboard/profile" className="hover:underline">
                    Profile →
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-orange-500 text-white text-xs font-bold shadow-lg shadow-primary/25 hover:opacity-95 transition-all flex items-center gap-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Referral Code UI */}
      {!isPremium && (
        <div className="max-w-md mx-auto mb-6">
          <div className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-foreground mb-2">Have a friend's referral code?</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter code e.g. MBWUSERA1B2"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="flex-1 rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm font-semibold uppercase outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={applyReferral}
                className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Verify
              </button>
            </div>
            {referralMsg.text && (
              <p
                className={`mt-2 text-xs font-semibold ${
                  referralMsg.type === 'success' ? 'text-emerald-500' : 'text-destructive'
                }`}
              >
                {referralMsg.text}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const PLAN_LEVELS: Record<string, number> = {
            basic: 1,
            'neet-ug-pro': 2,
            ultimate: 3,
          };

          const PLAN_NAME_LEVELS: Record<string, number> = {
            'BASIC Plan': 1,
            BASIC: 1,
            basic: 1,
            'NEET UG Counselling Pro': 2,
            'neet-ug-pro': 2,
            'Ultimate Medical Master Bundle': 3,
            ultimate: 3,
            'Premium Plan': 2,
            'NEET Counselling Pro': 2,
          };

          const currentPlanLevel = isPremium ? PLAN_NAME_LEVELS[subscriptionPlan || ''] || 0 : 0;
          const thisPlanLevel = PLAN_LEVELS[plan.id] || 0;

          const isCurrent = isPremium && currentPlanLevel === thisPlanLevel;
          const isIncluded = isPremium && currentPlanLevel > thisPlanLevel;
          const isUpgrade = isPremium && currentPlanLevel < thisPlanLevel;

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl border flex flex-col p-5 lg:p-4 xl:p-6 transition-all duration-300 ${
                plan.popular
                  ? 'border-primary bg-gradient-to-b from-primary/10 via-card to-card shadow-2xl shadow-primary/15 md:-translate-y-2'
                  : 'border-border/60 bg-card hover:border-border shadow-sm'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-primary to-orange-500 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                  {plan.badge}
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-black text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>
              </div>

              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-foreground">
                  ₹{plan.price.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground line-through">
                  ₹{plan.originalPrice.toLocaleString()}
                </span>
                <span className="text-[10px] font-black text-emerald-500 uppercase px-1.5 py-0.5 rounded bg-emerald-500/10">
                  {Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100)}% OFF
                </span>
              </div>

              <div className="space-y-3 mb-8 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  What's included:
                </p>
                {plan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isCurrent || isIncluded) {
                    navigate('/dashboard');
                  } else {
                    handleUpgrade(plan);
                  }
                }}
                disabled={upgradingPlan !== null}
                className={`w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  isCurrent || isIncluded
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
                    : plan.popular
                    ? 'bg-gradient-to-r from-primary to-orange-500 text-white shadow-lg shadow-primary/25 hover:opacity-95 hover:scale-[1.02]'
                    : 'bg-primary text-primary-foreground hover:opacity-90'
                } disabled:opacity-50`}
              >
                {upgradingPlan === plan.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting AU Bank...</span>
                  </>
                ) : isCurrent ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Active Plan — Open Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : isIncluded ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Unlocked (Included) — Go to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : isUpgrade ? (
                  <>
                    <Crown className="w-4 h-4" />
                    <span>Upgrade Plan Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    <span>Unlock Plan Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Referral Earning Banner */}
      <div className="rounded-3xl border border-border/60 bg-gradient-to-r from-emerald-500/10 via-card to-card p-6 sm:p-8 backdrop-blur-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-500 grid place-items-center font-black">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Earn ₹500 with Every Referral</h3>
            <p className="text-xs text-muted-foreground">
              Every friend who joins using your permanent referral code earns you ₹500 directly into your withdrawable wallet.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/dashboard/referrals')}
          className="whitespace-nowrap px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all"
        >
          View Referral Program →
        </button>
      </div>

      {/* Payment History Table */}
      {payments.length > 0 && (
        <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border/40">
            <History className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-base font-bold text-foreground">Transaction & Invoices History</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground uppercase">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Plan / Description</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Gateway</th>
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border/20 hover:bg-muted/30">
                    <td className="py-3 px-3 font-medium">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-3 font-bold text-foreground">{p.plan_slug || 'Premium Plan'}</td>
                    <td className="py-3 px-3 font-black text-foreground">
                      ₹{Number(p.amount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-semibold text-muted-foreground uppercase text-[10px]">
                      {p.gateway === 'aubank' ? 'AU Bank' : p.gateway || 'AU Bank'}
                    </td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">
                      {p.order_id || p.payment_id || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          p.status === 'failed'
                            ? 'bg-destructive/10 text-destructive'
                            : p.status === 'created' || p.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-emerald-500/10 text-emerald-500'
                        }`}
                      >
                        {p.status || 'captured'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── AU Bank Checkout Modal (Razorpay-Style) ────────────────────────── */}
      {checkoutOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden text-foreground">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-600 via-primary to-amber-500 p-6 text-white relative">
              <button
                type="button"
                onClick={() => {
                  if (!isProcessingCheckout) setCheckoutOrder(null);
                }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white grid place-items-center transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 grid place-items-center backdrop-blur-md">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">AU Small Finance Bank</h3>
                  <p className="text-[11px] text-white/80 font-medium">Secure Payment Gateway</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-white/75">Plan</span>
                  <p className="text-sm font-black">{checkoutOrder.plan_name}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-white/75">Total Amount</span>
                  <p className="text-2xl font-black">₹{checkoutOrder.amount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Pricing breakdown */}
              <div className="bg-muted/40 rounded-2xl p-4 border border-border/60 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Base Plan Price:</span>
                  <span className="font-semibold text-foreground">
                    ₹{checkoutOrder.original_amount.toLocaleString()}
                  </span>
                </div>

                {checkoutOrder.original_amount > checkoutOrder.amount && (
                  <div className="flex justify-between text-emerald-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" />
                      Referral Discount:
                    </span>
                    <span>-₹{(checkoutOrder.original_amount - checkoutOrder.amount).toLocaleString()}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-border/40 flex justify-between font-bold text-sm text-foreground">
                  <span>Payable Now:</span>
                  <span className="text-primary font-black">₹{checkoutOrder.amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Supported Payment Channels */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                  Available Payment Options
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                  <div className="p-3 rounded-xl border border-border/60 bg-card flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>UPI (GPay / PhonePe / Paytm)</span>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-card flex items-center gap-2.5">
                    <CreditCard className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Cards (Visa / Master / RuPay)</span>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-card flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Net Banking (50+ Banks)</span>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-card flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                    <span>AU Bank Direct / Wallets</span>
                  </div>
                </div>
              </div>

              {/* Hidden Form for Live AU Bank Gateway Submission */}
              {checkoutOrder.isLiveGateway && checkoutOrder.encRequest && (
                <form
                  ref={auBankFormRef}
                  method="POST"
                  action={checkoutOrder.gatewayUrl}
                  className="hidden"
                >
                  <input type="hidden" name="encRequest" value={checkoutOrder.encRequest} />
                  <input type="hidden" name="access_code" value={checkoutOrder.accessCode} />
                </form>
              )}

              {/* Payment Actions */}
              {checkoutOrder.isLiveGateway ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleProceedToAuBank}
                    disabled={isProcessingCheckout}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-primary to-orange-500 text-white font-bold text-sm shadow-xl shadow-primary/25 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessingCheckout ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Opening AU Bank Gateway...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Proceed to AU Bank Payment (₹{checkoutOrder.amount})</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>256-Bit SSL Encrypted • Authorized by Reserve Bank of India</span>
                  </p>
                </div>
              ) : (
                /* Developer / Sandbox Mode (When AU Bank production keys are pending in .env) */
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      <span>AU Bank Test / Sandbox Mode</span>
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Production credentials can be added to <code className="text-primary font-mono font-bold">.env</code> (AUBANK_MERCHANT_ID, AUBANK_ACCESS_CODE, AUBANK_WORKING_KEY).
                      You can test the instant premium unlock below:
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSimulatePayment}
                    disabled={isProcessingCheckout}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-xl shadow-emerald-600/25 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessingCheckout ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Activating Premium...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Complete Test Payment (Instant Unlock)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubscriptionPage;
