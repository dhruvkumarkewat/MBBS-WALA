import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Crown,
  Check,
  Sparkles,
  ShieldCheck,
  Zap,
  CreditCard,
  History,
  AlertCircle,
  Loader2,
  Gift,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  RefreshCw,
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
    id: 'neet-ug',
    name: 'BASIC',
    price: 99,
    originalPrice: 4999,
    badge: 'Most Popular',
    popular: true,
    description: 'Complete AI-powered choice filling, cutoffs, and predictions for MBBS, BDS, and AYUSH.',
    features: [
      'Unlimited College Predictor (1000+ Colleges)',
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
    id: 'neet-pg',
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
    id: 'ultimate-bundle',
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

export function SubscriptionPage() {
  const { user } = useAuth();
  const { isPremium, subscriptionPlan, premiumEndDate, refetch: refetchPremium } = usePremium();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [activeSub, setActiveSub] = useState<any>(null);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralMsg, setReferralMsg] = useState({ type: '', text: '' });

  const applyReferral = async () => {
    if (!referralCode.trim()) return;
    setReferralMsg({ type: '', text: 'Checking code...' });
    try {
      const res = await apiJson<{ valid: boolean; discount: number; message?: string; error?: string }>(`/api/referrals?code=${referralCode}&validate=1`);
      if (res.valid) {
        setReferralMsg({ type: 'success', text: `Valid code! ₹${res.discount} discount will be applied at checkout.` });
      } else {
        setReferralMsg({ type: 'error', text: res.message || res.error || 'Invalid or unusable code.' });
      }
    } catch (err: any) {
      setReferralMsg({ type: 'error', text: err.message || 'Error validating code.' });
    }
  };

  const handleSyncPurchases = async () => {
    try {
      setSyncing(true);
      setError('');
      const data = await apiJson<any>('/api/payment?action=sync-subscription', {
        method: 'POST',
      }, true);
      await refetchPremium();
      await loadData();
      if (data?.is_premium) {
        success('Plan Restored! 🎉', `Your ${data.subscription_plan || 'Premium'} plan is active.`);
      } else {
        success('Verification Done', 'If you purchased under a different email or offline, please contact support with your payment receipt.');
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

  const handleUpgrade = async (plan: Plan) => {
    if (!user) {
      toastError('Login Required', 'Please login to subscribe.');
      return;
    }

    if (isPremium) {
      success('Already Subscribed', `You already have an active ${subscriptionPlan || 'Premium'} plan. Taking you to your Dashboard...`);
      navigate('/dashboard', { replace: true });
      return;
    }

    try {
      setUpgradingPlan(plan.id);
      setError('');

      // 1. Create order
      const orderRes = await apiJson<any>('/api/payment?action=create-order', {
        method: 'POST',
        body: JSON.stringify({
          plan_slug: plan.id,
          plan_name: plan.name,
          amount: plan.price,
          referral_code: referralCode.trim()
        }),
      }, true);

      if (orderRes?.already_subscribed) {
        success('Plan Active', 'You already have an active subscription. Redirecting to Dashboard...');
        await refetchPremium();
        navigate('/dashboard', { replace: true });
        return;
      }

      // Load Razorpay SDK dynamically
      const loadRazorpay = () => {
        return new Promise((resolve) => {
          if ((window as any).Razorpay) {
            resolve(true);
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const isLoaded = await loadRazorpay();
      if (!isLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your connection.');
      }

      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: 'MBBSWala Premium',
        description: plan.name,
        order_id: orderRes.orderId,
        handler: async function (response: any) {
          try {
            setUpgradingPlan(plan.id);
            const verifyRes = await apiJson<any>('/api/payment?action=verify', {
              method: 'POST',
              body: JSON.stringify({
                order_id: response.razorpay_order_id || orderRes.orderId,
                payment_id: response.razorpay_payment_id || `pay_${Date.now()}_mock`,
                signature: response.razorpay_signature,
                plan_slug: plan.id,
                plan_name: plan.name,
                amount: plan.price,
              }),
            }, true);

            success('🎉 Payment Successful!', `Welcome to ${plan.name}! All predictor tools and cutoffs are unlocked.`);
            await refetchPremium();
            await loadData();
            // Direct redirect to Dashboard
            navigate('/dashboard', { replace: true });
          } catch (err: any) {
            toastError('Verification Failed', err.message || 'Could not verify payment');
          } finally {
            setUpgradingPlan(null);
          }
        },
        prefill: {
          name: user?.user_metadata?.full_name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#f97316',
        },
        modal: {
          ondismiss: function () {
            setUpgradingPlan(null);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', async function (response: any) {
        toastError('Payment Failed', response.error.description);
        setUpgradingPlan(null);
        try {
          await apiJson('/api/payment?action=fail', {
            method: 'POST',
            body: JSON.stringify({
              order_id: response.error.metadata.order_id || orderRes.orderId,
              error_description: response.error.description
            })
          }, true);
        } catch (e) {
          console.error('Failed to record payment failure', e);
        }
      });
      rzp.open();

    } catch (err: any) {
      if (err.message?.includes('already have an active subscription') || err.message?.includes('already_subscribed')) {
        success('Already Subscribed', 'You already have an active plan. Redirecting to Dashboard...');
        await refetchPremium();
        navigate('/dashboard', { replace: true });
      } else {
        setError(err.message || 'Payment failed. Please try again.');
        toastError('Upgrade Failed', err.message || 'Could not complete transaction');
      }
      setUpgradingPlan(null);
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
              <p className={`mt-2 text-xs font-semibold ${referralMsg.type === 'success' ? 'text-emerald-500' : 'text-destructive'}`}>
                {referralMsg.text}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = isPremium && subscriptionPlan?.toLowerCase().includes(plan.id);
          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl border flex flex-col p-5 lg:p-4 xl:p-6 transition-all duration-300 ${plan.popular
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
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What's included:</p>
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
                  if (isPremium) {
                    navigate('/dashboard');
                  } else {
                    handleUpgrade(plan);
                  }
                }}
                disabled={upgradingPlan !== null}
                className={`w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${isCurrent
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
                    : isPremium
                      ? 'bg-muted text-foreground hover:bg-muted/80'
                      : plan.popular
                        ? 'bg-gradient-to-r from-primary to-orange-500 text-white shadow-lg shadow-primary/25 hover:opacity-95 hover:scale-[1.02]'
                        : 'bg-primary text-primary-foreground hover:opacity-90'
                  } disabled:opacity-50`}
              >
                {upgradingPlan === plan.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Activating Premium...</span>
                  </>
                ) : isCurrent ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Active Plan — Open Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : isPremium ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Unlocked — Go to Dashboard</span>
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
                    <td className="py-3 px-3 font-black text-foreground">₹{Number(p.amount || 0).toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono text-muted-foreground">{p.order_id || p.payment_id || '—'}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${p.status === 'failed'
                          ? 'bg-destructive/10 text-destructive'
                          : p.status === 'created' || p.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-emerald-500/10 text-emerald-500'
                        }`}>
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
    </div>
  );
}
