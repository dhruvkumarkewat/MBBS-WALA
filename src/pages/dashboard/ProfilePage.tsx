import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  User,
  GraduationCap,
  Sliders,
  Shield,
  Crown,
  Wallet,
  Copy,
  Check,
  Share2,
  Sparkles,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Award,
  BookOpen,
  Building,
  Key,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { usePremium } from '../../lib/premium';
import { apiJson } from '../../lib/api';
import supabase from '../../lib/supabase';

const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
  'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

const CATEGORIES = ['General', 'OBC', 'EWS', 'SC', 'ST', 'General-PwD', 'OBC-PwD', 'SC-PwD', 'ST-PwD'];
const COURSES = ['MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'BVSc'];
const EXAMS = ['NEET UG', 'NEET PG', 'NEET MDS', 'AYUSH UG', 'INI-CET'];

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const { isPremium, subscriptionPlan, premiumEndDate, refetch: refetchPremium } = usePremium();
  const { toast, success, error: toastError, info } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'personal' | 'academic' | 'preferences' | 'account'>('personal');
  const [loading, setLoading] = useState(true);
  const [syncingPlan, setSyncingPlan] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  const handleSyncPurchases = async () => {
    try {
      setSyncingPlan(true);
      const res = await apiJson<any>('/api/payment?action=sync-subscription', {
        method: 'POST',
      }, true);
      await refetchPremium();
      await loadProfile();
      if (res?.is_premium) {
        success('Plan Synchronized! 🎉', `Your ${res.subscription_plan || 'Premium'} plan is active.`);
      } else {
        success('Check Complete', 'No active subscription found. If you purchased offline or with a different email, please contact support.');
      }
    } catch (err: any) {
      toastError('Sync Error', err.message || 'Could not verify purchases');
    } finally {
      setSyncingPlan(false);
    }
  };

  // Form State
  const [form, setForm] = useState({
    // Personal
    full_name: '',
    phone: '',
    email: '',
    annual_income: '' as string | number,
    date_of_birth: '',
    gender: 'Other',
    state: 'Madhya Pradesh',
    district: '',
    category: 'General',
    sub_category: '',
    domicile: 'Madhya Pradesh',
    domicile_state: 'Madhya Pradesh',
    avatar_url: '',

    // Academic
    exam: 'NEET UG',
    neet_roll_number: '',
    neet_rank: '' as string | number,
    neet_score: '' as string | number,
    neet_percentile: '' as string | number,
    pcb_percentage: '' as string | number,
    twelfth_percentage: '' as string | number,
    passing_year: new Date().getFullYear(),
    attempt_number: 1,

    // Reservation
    pwd_status: false,
    ews_status: false,
    defence_quota: false,
    freedom_fighter_quota: false,
    has_sambal_card: false,
    studied_in_govt_school: false,
    minority_status: '',
    other_reservations: '',

    // Preferences
    preferred_states: [] as string[],
    preferred_course: 'MBBS',
    college_preference: 'Both',
    tuition_budget: 'Under 10 Lakhs/yr',
    hostel_required: true,
    language_preference: 'English',

    // Wallet & Extra
    referral_code: '',
    wallet_balance: 0,
    completion_percentage: 0,
  });

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiJson<any>('/api/profile', {}, true);

      setForm((prev) => ({
        ...prev,
        full_name: data.full_name || data.name || user?.user_metadata?.full_name || '',
        phone: data.phone || user?.user_metadata?.phone || '',
        email: data.email || user?.email || '',
        annual_income: data.annual_income ?? '',
        date_of_birth: data.date_of_birth ? data.date_of_birth.slice(0, 10) : '',
        gender: data.gender || 'Other',
        state: data.state || 'Madhya Pradesh',
        district: data.district || '',
        category: data.category || 'General',
        sub_category: data.sub_category || '',
        domicile: data.domicile || data.domicile_state || 'Madhya Pradesh',
        domicile_state: data.domicile_state || data.domicile || 'Madhya Pradesh',
        avatar_url: data.avatar_url || user?.user_metadata?.avatar_url || '',

        exam: data.exam || 'NEET UG',
        neet_roll_number: data.neet_roll_number || '',
        neet_rank: data.neet_rank ?? (data.rank ? Number(data.rank) : ''),
        neet_score: data.neet_score ?? (data.score ?? (data.marks ? Number(data.marks) : '')),
        neet_percentile: data.neet_percentile ?? data.percentile ?? '',
        pcb_percentage: data.pcb_percentage ?? '',
        twelfth_percentage: data.twelfth_percentage ?? '',
        passing_year: data.passing_year ?? new Date().getFullYear(),
        attempt_number: data.attempt_number ?? 1,

        pwd_status: Boolean(data.pwd_status),
        ews_status: Boolean(data.ews_status),
        defence_quota: Boolean(data.defence_quota),
        freedom_fighter_quota: Boolean(data.freedom_fighter_quota),
        has_sambal_card: Boolean(data.has_sambal_card),
        studied_in_govt_school: Boolean(data.studied_in_govt_school),
        minority_status: data.minority_status || '',
        other_reservations: data.other_reservations || '',

        preferred_states: Array.isArray(data.preferred_states) ? data.preferred_states : [],
        preferred_course: data.preferred_course || 'MBBS',
        college_preference: data.college_preference || 'Both',
        tuition_budget: data.tuition_budget || 'Under 10 Lakhs/yr',
        hostel_required: data.hostel_required !== undefined ? Boolean(data.hostel_required) : true,
        language_preference: data.language_preference || 'English',

        referral_code: data.referral_code || data.wallet?.referral_code || '',
        wallet_balance: data.wallet?.balance || 0,
        completion_percentage: data.completion_percentage || 50,
      }));
    } catch (e: any) {
      setError(e.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const handleSave = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (form.date_of_birth) {
        const dob = new Date(form.date_of_birth);
        const minAgeDate = new Date();
        minAgeDate.setFullYear(minAgeDate.getFullYear() - 16);
        if (dob > minAgeDate) {
          toastError('Validation Error', 'You must be at least 16 years old.');
          setSaving(false);
          return;
        }
      }

      const payload = {
        full_name: form.full_name,
        phone: form.phone,
        annual_income: form.annual_income !== '' ? Number(form.annual_income) : null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender,
        state: form.state,
        district: form.district,
        category: form.category,
        sub_category: form.sub_category,
        domicile: form.domicile,
        domicile_state: form.domicile,
        avatar_url: form.avatar_url,

        exam: form.exam,
        neet_roll_number: form.neet_roll_number,
        neet_rank: form.neet_rank !== '' ? Number(form.neet_rank) : null,
        neet_score: form.neet_score !== '' ? Number(form.neet_score) : null,
        neet_percentile: form.neet_percentile !== '' ? Number(form.neet_percentile) : null,
        pcb_percentage: form.pcb_percentage !== '' ? Number(form.pcb_percentage) : null,
        twelfth_percentage: form.twelfth_percentage !== '' ? Number(form.twelfth_percentage) : null,
        passing_year: form.passing_year ? Number(form.passing_year) : null,
        attempt_number: form.attempt_number ? Number(form.attempt_number) : 1,

        pwd_status: form.pwd_status,
        ews_status: form.ews_status,
        defence_quota: form.defence_quota,
        freedom_fighter_quota: form.freedom_fighter_quota,
        has_sambal_card: form.has_sambal_card,
        studied_in_govt_school: form.studied_in_govt_school,
        minority_status: form.minority_status,
        other_reservations: form.other_reservations,

        preferred_states: form.preferred_states,
        preferred_course: form.preferred_course,
        college_preference: form.college_preference,
        tuition_budget: form.tuition_budget,
        hostel_required: form.hostel_required,
        language_preference: form.language_preference,

        profile_completed: true,
      };

      let updated: any = null;
      try {
        updated = await apiJson<any>(
          '/api/profile',
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          },
          true
        );
      } catch (apiErr: any) {
        console.warn('API profile save warning, falling back to direct client update:', apiErr.message);
        if (user) {
          try {
            await supabase.from('profiles').upsert(
              {
                id: user.id,
                email: user.email,
                ...payload,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            );
          } catch {}

          try {
            await supabase.auth.updateUser({
              data: {
                full_name: payload.full_name,
                name: payload.full_name,
                phone: payload.phone,
                profile_completed: true,
              },
            });
          } catch {}
        }
        updated = { ...payload, id: user?.id || 'uid', email: user?.email || '', completion_percentage: 100 };
      }

      setForm((prev) => ({
        ...prev,
        completion_percentage: updated.completion_percentage || 100,
      }));

      success('Profile Updated', 'Your counselling profile and preferences have been securely saved.');
      refetchPremium();
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
      toastError('Save Failed', err.message || 'Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg('Password must be at least 6 characters');
      return;
    }
    setPasswordLoading(true);
    setPasswordMsg('');
    try {
      const { error: pErr } = await supabase.auth.updateUser({ password: newPassword });
      if (pErr) throw pErr;
      setPasswordMsg('Password changed successfully!');
      setNewPassword('');
      success('Password Changed', 'Your password has been updated.');
    } catch (err: any) {
      setPasswordMsg(err.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (!form.referral_code) return;
    navigator.clipboard.writeText(form.referral_code);
    setCopiedRef(true);
    info('Referral Code Copied', form.referral_code);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  const shareReferral = () => {
    const shareUrl = `${window.location.origin}/login?ref=${encodeURIComponent(form.referral_code)}`;
    const text = `Join MBBSWala for NEET Counselling, College Predictions & Cutoffs! Use my referral code ${form.referral_code} for exclusive benefits: ${shareUrl}`;
    if (navigator.share) {
      navigator.share({ title: 'Join MBBSWala NEET Counselling', text, url: shareUrl }).catch(() => {});
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const toggleStatePreference = (stateName: string) => {
    setForm((prev) => {
      const exists = prev.preferred_states.includes(stateName);
      return {
        ...prev,
        preferred_states: exists
          ? prev.preferred_states.filter((s) => s !== stateName)
          : [...prev.preferred_states, stateName],
      };
    });
  };

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-semibold text-muted-foreground">Loading your profile & preferences...</p>
      </div>
    );
  }

  const initials = (form.full_name || form.email || 'S')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card/80 to-card/40 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-primary to-orange-500 text-white font-black text-xl sm:text-2xl flex items-center justify-center shadow-lg shadow-primary/25 border-2 border-background">
                {initials}
              </div>
              {isPremium && (
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
                  <Crown className="w-3.5 h-3.5 fill-current" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-foreground">
                  {form.full_name || 'Student Profile'}
                </h1>
                {isPremium ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-black uppercase tracking-wider">
                    <Crown className="w-3 h-3" /> {subscriptionPlan || 'Premium'}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30 text-xs font-semibold">
                    Free Plan
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSyncPurchases}
                  disabled={syncingPlan}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-border/80 bg-background/50 hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all"
                  title="Check database and sync premium status"
                >
                  <RefreshCw className={`w-3 h-3 ${syncingPlan ? 'animate-spin text-primary' : ''}`} />
                  <span>{syncingPlan ? 'Syncing...' : 'Sync Purchases'}</span>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{form.email}</p>
              <p className="text-xs text-primary font-bold mt-1">
                {form.exam} Candidate · Category: {form.category} · Domicile: {form.domicile}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
            {/* Completion Meter */}
            <div className="bg-background/60 border border-border/60 rounded-2xl p-3 sm:p-4 min-w-[200px]">
              <div className="flex items-center justify-between gap-4 mb-1.5">
                <span className="text-xs font-bold text-muted-foreground">Profile Strength</span>
                <span className="text-xs font-black text-primary">{form.completion_percentage}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-orange-500 transition-all duration-500"
                  style={{ width: `${form.completion_percentage}%` }}
                />
              </div>
            </div>

            {!isPremium && (
              <button
                onClick={() => navigate('/dashboard/subscription')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20 hover:scale-[1.02] transition-all"
              >
                <Crown className="w-3.5 h-3.5" /> Upgrade to Premium
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border/50 overflow-x-auto no-scrollbar">
          {[
            { id: 'personal', label: 'Personal Details', icon: User },
            { id: 'academic', label: 'Academic & NEET', icon: GraduationCap },
            { id: 'preferences', label: 'Reservation & Preferences', icon: Sliders },
            { id: 'account', label: 'Account & Referral', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB CONTENT */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: PERSONAL DETAILS */}
        {activeTab === 'personal' && (
          <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div>
                <h3 className="text-base font-bold text-foreground">Personal Information</h3>
                <p className="text-xs text-muted-foreground">Your identity and domicile details for state quota verification.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Full Name (as per NEET Admit Card) *
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Mobile Number (WhatsApp) *
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/40 bg-muted/40 text-muted-foreground text-sm font-medium cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Annual Family Income (₹)
                </label>
                <input
                  type="number"
                  value={form.annual_income}
                  onChange={(e) => setForm({ ...form, annual_income: e.target.value })}
                  placeholder="e.g. 500000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Date of Birth
                </label>
                <input
                  type="date"
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
                  value={form.date_of_birth}
                  onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Gender
                </label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Social Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Domicile State (85% State Quota) *
                </label>
                <select
                  value={form.domicile}
                  onChange={(e) => setForm({ ...form, domicile: e.target.value, domicile_state: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  District / City
                </label>
                <input
                  type="text"
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  placeholder="e.g. Bhopal, Indore, Jaipur"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACADEMIC DETAILS */}
        {activeTab === 'academic' && (
          <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div>
                <h3 className="text-base font-bold text-foreground">NEET Score & Academic Records</h3>
                <p className="text-xs text-muted-foreground">Used for college prediction algorithms, cutoff matching, and choice filling.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Target Examination *
                </label>
                <select
                  value={form.exam}
                  onChange={(e) => setForm({ ...form, exam: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {EXAMS.map((ex) => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  NEET Roll Number
                </label>
                <input
                  type="text"
                  value={form.neet_roll_number}
                  onChange={(e) => setForm({ ...form, neet_roll_number: e.target.value })}
                  placeholder="e.g. 24041012345"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  All India Rank (AIR) *
                </label>
                <input
                  type="number"
                  value={form.neet_rank}
                  onChange={(e) => setForm({ ...form, neet_rank: e.target.value })}
                  placeholder="e.g. 14250"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  NEET Score (out of 720) *
                </label>
                <input
                  type="number"
                  value={form.neet_score}
                  onChange={(e) => setForm({ ...form, neet_score: e.target.value })}
                  placeholder="e.g. 625"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  min="0"
                  max="720"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  NEET Percentile
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={form.neet_percentile}
                  onChange={(e) => setForm({ ...form, neet_percentile: e.target.value })}
                  placeholder="e.g. 98.450"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  PCB Aggregate Percentage (12th Board)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.pcb_percentage}
                  onChange={(e) => setForm({ ...form, pcb_percentage: e.target.value })}
                  placeholder="e.g. 84.5"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  12th Passing Year
                </label>
                <input
                  type="number"
                  value={form.passing_year}
                  onChange={(e) => setForm({ ...form, passing_year: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  NEET Attempt Number
                </label>
                <select
                  value={form.attempt_number}
                  onChange={(e) => setForm({ ...form, attempt_number: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value={1}>1st Attempt (Fresher)</option>
                  <option value={2}>2nd Attempt (1st Dropper)</option>
                  <option value={3}>3rd Attempt</option>
                  <option value={4}>4th Attempt or more</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RESERVATIONS & PREFERENCES */}
        {activeTab === 'preferences' && (
          <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div>
                <h3 className="text-base font-bold text-foreground">Reservation Quotas & Preferences</h3>
                <p className="text-xs text-muted-foreground">Select any special quotas and your target preferences for smart choice lists.</p>
              </div>
            </div>

            {/* Quota Checkboxes */}
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { key: 'pwd_status', label: 'Persons with Disabilities (PwD Quota)' },
                { key: 'ews_status', label: 'Economically Weaker Section (EWS Certificate)' },
                { key: 'defence_quota', label: 'Armed Forces / Defence Personnel Ward (CW Quota)' },
                { key: 'freedom_fighter_quota', label: 'Freedom Fighter Ward (FF Quota)' },
                { key: 'has_sambal_card', label: 'Sambal Card / MMJKY Eligible (MP State)' },
                { key: 'studied_in_govt_school', label: 'Studied in Govt School (GS Quota)' },
                { key: 'hostel_required', label: 'Hostel Accommodation Required' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-border/50 bg-background/50 hover:bg-background cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={(form as any)[item.key]}
                    onChange={(e) => setForm({ ...form, [item.key]: e.target.checked })}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-semibold text-foreground">{item.label}</span>
                </label>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border/40">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Minority Status
                </label>
                <select
                  value={form.minority_status}
                  onChange={(e) => setForm({ ...form, minority_status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">None / Not Applicable</option>
                  <option value="Muslim">Muslim</option>
                  <option value="Christian">Christian</option>
                  <option value="Sikh">Sikh</option>
                  <option value="Buddhist">Buddhist</option>
                  <option value="Jain">Jain</option>
                  <option value="Parsi">Parsi</option>
                  <option value="Linguistic">Linguistic Minority</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Preferred Medical Course
                </label>
                <select
                  value={form.preferred_course}
                  onChange={(e) => setForm({ ...form, preferred_course: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {COURSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  College Type Preference
                </label>
                <select
                  value={form.college_preference}
                  onChange={(e) => setForm({ ...form, college_preference: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="Government">Government / AIIMS / Central Only</option>
                  <option value="Private">Private / Deemed Universities Only</option>
                  <option value="Both">Both (Govt + Private / Deemed)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Annual Tuition Budget
                </label>
                <select
                  value={form.tuition_budget}
                  onChange={(e) => setForm({ ...form, tuition_budget: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="Under 2 Lakhs/yr (Govt only)">Under 2 Lakhs/yr (Govt)</option>
                  <option value="Under 10 Lakhs/yr">Under 10 Lakhs/yr</option>
                  <option value="10 to 18 Lakhs/yr">10 to 18 Lakhs/yr</option>
                  <option value="18 to 25 Lakhs/yr">18 to 25 Lakhs/yr</option>
                  <option value="Flexible / Any">Flexible / Any Budget</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Teaching / Language Preference
                </label>
                <select
                  value={form.language_preference}
                  onChange={(e) => setForm({ ...form, language_preference: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="English">English</option>
                  <option value="Hindi / English Bilingual">Hindi / English Bilingual</option>
                  <option value="Regional State Language">Regional State Language</option>
                </select>
              </div>
            </div>

            {/* Preferred States Multi-Select */}
            <div className="pt-4 border-t border-border/40">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Preferred States for Admission ({form.preferred_states.length} Selected)
              </label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 rounded-2xl border border-border/50 bg-background/50">
                {INDIAN_STATES.map((st) => {
                  const selected = form.preferred_states.includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => toggleStatePreference(st)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                        selected
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {selected ? '✓ ' : '+ '} {st}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ACCOUNT, SUBSCRIPTION & REFERRALS */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* Subscription & Plan Status */}
            <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 grid place-items-center font-black">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Subscription Status</h3>
                    <p className="text-xs text-muted-foreground">
                      {isPremium
                        ? `Active Plan: ${subscriptionPlan || 'Premium'}`
                        : 'You are currently on the Free Starter Plan'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncPurchases}
                    disabled={syncingPlan}
                    className="px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingPlan ? 'animate-spin text-primary' : ''}`} />
                    <span>{syncingPlan ? 'Checking...' : 'Sync Purchases'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/subscription')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all"
                  >
                    {isPremium ? 'Manage Subscription' : 'Upgrade to Premium'}
                  </button>
                </div>
              </div>

              {isPremium && premiumEndDate && (
                <p className="text-xs text-muted-foreground">
                  Valid until: <span className="font-bold text-foreground">{new Date(premiumEndDate).toLocaleDateString()}</span>
                </p>
              )}
            </div>

            {/* Permanent Referral Code Card */}
            <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary grid place-items-center font-black">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Your Permanent Referral Code</h3>
                    <p className="text-xs text-muted-foreground">
                      Earn <span className="font-bold text-primary">₹500 per friend</span> who joins MBBSWala Premium.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">Wallet Balance:</span>
                  <span className="text-sm font-black text-emerald-500">₹{form.wallet_balance.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/wallet')}
                    className="text-xs text-primary font-bold hover:underline ml-1"
                  >
                    View Wallet →
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <div className="w-full sm:w-auto flex-1 flex items-center justify-between px-4 py-3 rounded-2xl bg-background border border-border/80">
                  <span className="font-mono font-black text-lg tracking-wider text-primary">
                    {form.referral_code || 'MBW-GEN-CODE'}
                  </span>
                  <button
                    type="button"
                    onClick={copyReferralCode}
                    className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy Code"
                  >
                    {copiedRef ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={shareReferral}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all"
                >
                  <Share2 className="w-4 h-4" /> Share on WhatsApp
                </button>
              </div>
            </div>

            {/* Change Password */}
            <div className="rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-border/40">
                <Key className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-base font-bold text-foreground">Security & Password</h3>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full sm:w-80 px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handlePasswordUpdate}
                  disabled={passwordLoading || !newPassword}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-all disabled:opacity-50"
                >
                  {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                </button>
              </div>
              {passwordMsg && <p className="text-xs font-semibold text-primary">{passwordMsg}</p>}
            </div>

            {/* Logout Action */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => signOut()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors"
              >
                Sign Out from this Device
              </button>
            </div>
          </div>
        )}

        {/* Global Save Bar */}
        <div className="sticky bottom-4 z-20 flex items-center justify-between gap-4 p-4 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/80 shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-muted-foreground font-medium">All changes sync automatically across all devices.</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Profile</span>
          </button>
        </div>
      </form>
    </div>
  );
}
