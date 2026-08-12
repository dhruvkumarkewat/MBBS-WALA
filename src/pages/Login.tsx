import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  User,
  Phone,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Gift,
  Shield,
  GraduationCap,
  UserCheck,
  LockKeyhole,
} from 'lucide-react';
import supabase from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';
import { useAuth } from '../contexts/AuthContext';
import { apiJson } from '../lib/api';
import BrandLogo from '../components/BrandLogo';

/** Decorative 3D props — positioned only inside the left visual stage */
const stageProps = [
  {
    src: '/images/mbbswala/obj-stethoscope.png',
    alt: '3D stethoscope',
    className: 'w-[42%] max-w-[200px] -left-2 top-[6%]',
    delay: 0,
    rotate: -10,
  },
  {
    src: '/images/mbbswala/obj-cross.png',
    alt: '3D medical cross',
    className: 'w-[26%] max-w-[120px] -right-1 top-[4%]',
    delay: 0.12,
    rotate: 14,
  },
  {
    src: '/images/mbbswala/obj-heart.png',
    alt: '3D heart',
    className: 'w-[22%] max-w-[100px] -left-3 bottom-[18%]',
    delay: 0.22,
    rotate: -8,
  },
  {
    src: '/images/mbbswala/obj-clipboard.png',
    alt: '3D clipboard',
    className: 'w-[30%] max-w-[140px] -right-2 bottom-[12%]',
    delay: 0.32,
    rotate: 10,
  },
  {
    src: '/images/mbbswala/obj-kit.png',
    alt: '3D medical kit',
    className: 'w-[24%] max-w-[110px] right-[18%] top-[38%]',
    delay: 0.4,
    rotate: -12,
  },
];

const studentPerks = [
  'Verified seat matrix & cut-offs',
  'Indian college shortlists (AIQ & state)',
  'Human expert counselling support',
];

const staffPerks = [
  'Real-time student counselling CRM',
  'Direct tele-counselling & call logs',
  'Verified admission tracker & payouts',
];

interface LoginProps {
  defaultPortal?: 'student' | 'admin';
}

export default function Login({ defaultPortal }: LoginProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isStaff, isProfileComplete, profileLoading } = useAuth();

  // Determine initial portal based on props, URL params, or pathname
  const initialPortal = useMemo<'student' | 'admin'>(() => {
    if (defaultPortal) return defaultPortal;
    const searchParam = new URLSearchParams(window.location.search).get('portal');
    if (searchParam === 'admin' || searchParam === 'staff' || searchParam === 'counselor') return 'admin';
    if (searchParam === 'student') return 'student';
    if (
      location.pathname.includes('/admin') ||
      location.pathname.includes('/staff') ||
      location.pathname.includes('/counselor')
    ) {
      return 'admin';
    }
    return 'student';
  }, [defaultPortal, location.pathname]);

  const [portal, setPortal] = useState<'student' | 'admin'>(initialPortal);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(() => {
    return new URLSearchParams(window.location.search).get('ref') || '';
  });
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);

  const isRefFromURL = useMemo(() => !!new URLSearchParams(window.location.search).get('ref'), []);
  const from = (location.state as { from?: string } | null)?.from || '/dashboard';

  // Detect if we are processing an OAuth callback
  const isOAuthRedirect = useMemo(() => {
    return window.location.hash.includes('access_token=') || window.location.hash.includes('type=recovery');
  }, []);

  const routingDone = useRef(false);
  const isSubmitting = useRef(false);

  useEffect(() => {
    routingDone.current = false;
  }, [user, portal]);

  // Sync portal if defaultPortal prop changes
  useEffect(() => {
    if (defaultPortal) {
      setPortal(defaultPortal);
    }
  }, [defaultPortal]);

  // Automatic routing for already authenticated users
  useEffect(() => {
    if (!user || profileLoading || routingDone.current || isSubmitting.current) return;
    routingDone.current = true;
    let cancelled = false;

    (async () => {
      // Check if user is staff
      let staffAccount = isStaff;
      if (!staffAccount) {
        try {
          const staffRes = await apiJson<{ isStaff?: boolean }>('/api/admin-auth', {}, true);
          if (cancelled) return;
          if (staffRes?.isStaff) staffAccount = true;
        } catch {
          try {
            const { data } = await supabase
              .from('staff_profiles')
              .select('role, is_active')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .maybeSingle();
            if (cancelled) return;
            if (data?.role) staffAccount = true;
          } catch {
            /* not staff */
          }
        }
      }

      if (cancelled) return;

      if (staffAccount) {
        navigate('/admin', { replace: true });
        return;
      }

      // If non-staff user visits Admin portal while logged in
      if (portal === 'admin') {
        setError('Your current account is a student account. Please sign in with an Admin/Counsellor account.');
        return;
      }

      // Normal student routing
      if (!isProfileComplete) {
        navigate('/onboarding', { replace: true });
      } else if (from.startsWith('/admin')) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isStaff, isProfileComplete, profileLoading, portal, from, navigate]);

  const switchPortal = (next: 'student' | 'admin') => {
    setPortal(next);
    setMode('login');
    setError('');
    setMsg('');
  };

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next);
    setError('');
    setMsg('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    if (portal === 'student' && mode === 'signup' && (!name.trim() || !phone.trim())) {
      setError('Name and phone number are required to create a student account.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    isSubmitting.current = true;

    try {
      const cleanEmail = email.trim().toLowerCase();

      // --- DIRECT SUPER ADMIN LOGIN (admin@gmail.com / admin@mbbswala.in) ---
      if (cleanEmail === 'admin@gmail.com' || cleanEmail === 'admin@mbbswala.in') {
        try {
          const adminRes = await apiJson<{ ok: boolean; token: string; isStaff: boolean; role: string }>(
            '/api/admin-auth',
            {
              method: 'POST',
              body: JSON.stringify({
                action: 'direct_login',
                email: cleanEmail,
                password,
              }),
            }
          );

          if (adminRes?.ok && adminRes?.token) {
            localStorage.setItem('mbbswala_admin_token', adminRes.token);
            localStorage.setItem('mbbswala_admin_email', cleanEmail);
            setMsg('Super Admin credentials verified. Opening MBBSWALA CRM…');
            window.location.href = '/admin';
            return;
          }
        } catch (adminErr: any) {
          throw new Error(adminErr?.message || 'Invalid Super Admin password.');
        }
      }

      if (portal === 'admin') {
        // --- ADMIN / COUNSELOR LOGIN FLOW ---
        const { data: authData, error: signErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signErr) throw signErr;
        if (!authData.user) throw new Error('Failed to retrieve user session.');

        // Verify Staff Status
        let isStaffVerified = false;
        try {
          const info = await apiJson<{ isStaff?: boolean; role?: string }>('/api/admin-auth', {}, true);
          if (info?.isStaff) isStaffVerified = true;
        } catch {
          // Direct fallback to Supabase table
          try {
            const { data: staffRow } = await supabase
              .from('staff_profiles')
              .select('role, is_active')
              .eq('user_id', authData.user.id)
              .eq('is_active', true)
              .maybeSingle();
            if (staffRow?.role) isStaffVerified = true;
          } catch {
            /* not staff */
          }
        }

        if (!isStaffVerified) {
          setError(
            'Access Restricted: No active counsellor or administrator record found for this account. If you are a student or parent, please switch to the Student Portal below.'
          );
          setLoading(false);
          isSubmitting.current = false;
          return;
        }

        // Record Staff Login Action
        try {
          await apiJson('/api/admin-auth', { method: 'POST', body: JSON.stringify({ action: 'login' }) }, true);
        } catch {
          /* optional logging */
        }

        setMsg('Staff credentials verified. Opening MBBSWALA CRM…');
        navigate('/admin', { replace: true });
        return;
      } else {
        // --- STUDENT LOGIN / SIGNUP FLOW ---
        const cleanEmail = email.trim().toLowerCase();

        if (mode === 'signup') {
          // 1. Pre-check if email already exists in profiles or students database
          try {
            const { data: existingList } = await supabase
              .from('profiles')
              .select('id, email')
              .ilike('email', cleanEmail)
              .limit(1);

            if (existingList && existingList.length > 0) {
              setError(`An account with email "${cleanEmail}" already exists. Please enter your password to log in.`);
              setMode('login');
              setLoading(false);
              isSubmitting.current = false;
              return;
            }
          } catch {
            /* proceed with auth provider check */
          }

          // 2. Call Supabase signUp
          const { data, error: signErr } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                full_name: name.trim(),
                phone: phone.trim(),
                referred_by_code: referralCode.trim() || undefined,
              },
            },
          });

          if (signErr) {
            const errLower = signErr.message?.toLowerCase() || '';
            if (
              errLower.includes('already registered') ||
              errLower.includes('already exists') ||
              errLower.includes('user_already_exists') ||
              (signErr as any).status === 422
            ) {
              setError(`An account with email "${cleanEmail}" already exists. Please enter your password to log in.`);
              setMode('login');
              setLoading(false);
              isSubmitting.current = false;
              return;
            }
            throw signErr;
          }

          // 3. Supabase empty identities detection (when email exists & email confirmation is active)
          if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
            setError(`An account with email "${cleanEmail}" already exists. Please enter your password to log in.`);
            setMode('login');
            setLoading(false);
            isSubmitting.current = false;
            return;
          }

          if (data?.user) {
            try {
              await apiJson(
                '/api/profile',
                {
                  method: 'PUT',
                  body: JSON.stringify({
                    full_name: name.trim(),
                    phone: phone.trim(),
                    referred_by_code: referralCode.trim() || undefined,
                  }),
                },
                true
              );
            } catch {
              /* profile seeds on first GET */
            }
          }

          setMsg('Account created successfully. Welcome to MBBSWALA!');
          navigate('/onboarding', { replace: true });
          return;
        } else {
          const { error: signErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (signErr) throw signErr;
          setMsg('Signed in successfully. Redirecting…');
        }

        // Check if user is staff (e.g. staff logged in via student portal)
        let isStaffAccount = false;
        try {
          const info = await apiJson<{ isStaff?: boolean }>('/api/admin-auth', {}, true);
          if (info?.isStaff) isStaffAccount = true;
        } catch {
          try {
            const { data: session } = await supabase.auth.getSession();
            const uid = session?.session?.user?.id;
            if (uid) {
              const { data: staffRow } = await supabase
                .from('staff_profiles')
                .select('role, is_active')
                .eq('user_id', uid)
                .eq('is_active', true)
                .maybeSingle();
              if (staffRow?.role) isStaffAccount = true;
            }
          } catch {
            /* not staff */
          }
        }

        if (isStaffAccount) {
          navigate('/admin', { replace: true });
          return;
        }

        // Normal student profile verification
        try {
          const prof = await apiJson<any>('/api/profile', {}, true);
          const isComplete =
            prof?.profile_completed ||
            prof?.onboarding_done ||
            localStorage.getItem('onboarding_done_flag') === 'true' ||
            (Boolean(prof?.phone) && Boolean(prof?.category) && (prof?.neet_score != null || prof?.neet_rank != null));
          if (!isComplete) {
            navigate('/onboarding', { replace: true });
            return;
          }
        } catch {
          if (localStorage.getItem('onboarding_done_flag') !== 'true') {
            navigate('/onboarding', { replace: true });
            return;
          }
        }

        navigate(from.startsWith('/admin') ? '/dashboard' : from, { replace: true });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.';
      const errLower = errMsg.toLowerCase();

      if (
        errLower.includes('already registered') ||
        errLower.includes('already exists') ||
        errLower.includes('user_already_exists')
      ) {
        setError(`An account with email "${email.trim()}" already exists. Please enter your password to log in.`);
        setMode('login');
      } else if (errLower.includes('invalid login credentials') && portal === 'student') {
        setError('Invalid login credentials. If you are logging in as Admin or Counsellor, please switch to the "Admin & Counsellor" tab above.');
      } else {
        setError(errMsg);
      }
      isSubmitting.current = false;
    } finally {
      setLoading(false);
    }
  };

  const portalTitle = useMemo(() => {
    if (portal === 'admin') return 'Staff & Counsellor Login';
    return mode === 'login' ? 'Welcome back' : 'Create student account';
  }, [portal, mode]);

  const portalSubtitle = useMemo(() => {
    if (portal === 'admin') return 'Access MBBSWALA Admin CRM & Counsellor Workstation.';
    return mode === 'login'
      ? 'Access counselling predictor, cutoffs & packages.'
      : 'Join thousands of medical aspirants planning their dream admission.';
  }, [portal, mode]);

  // If user is already authenticated and routing to dashboard/admin, or in OAuth callback / active submit, show clean loading page
  const isRoutingActive =
    Boolean((user && !error && (portal === 'student' || isStaff)) || isOAuthRedirect || (loading && isSubmitting.current));

  if (isRoutingActive) {
    return (
      <div className="auth-page relative min-h-[calc(100dvh-5rem)] flex items-center justify-center p-6">
        <div className="pointer-events-none absolute inset-0 auth-page-ambient" aria-hidden />
        <div className="relative z-10 text-center max-w-sm">
          <div className="w-12 h-12 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white tracking-tight mb-1">
            {portal === 'admin' || isStaff ? 'Opening Staff Workstation…' : 'Opening your counselling workspace…'}
          </h3>
          <p className="text-xs text-white/70 font-medium">
            {msg || 'Verifying your credentials and session…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page relative min-h-[calc(100dvh-5rem)] overflow-hidden">
      {/* Soft ambient — theme aware */}
      <div className="pointer-events-none absolute inset-0 auth-page-ambient" aria-hidden />

      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-5rem)] max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-14">
        {/* ── Left: brand + staged 3D composition ── */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="order-2 lg:order-1"
        >
          <div className="max-w-xl mx-auto lg:mx-0">
            <div className="mb-5 flex justify-center lg:justify-start">
              <BrandLogo to="/" size="lg" onDark={false} imgClassName="!object-left" />
            </div>

            {portal === 'admin' ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 border border-orange-500/20 px-3.5 py-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 mb-5">
                <Shield className="h-3.5 w-3.5" />
                Staff Administration Console
              </div>
            ) : (
              <div className="auth-pill mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em]">
                <Sparkles className="h-3.5 w-3.5" />
                Premium counselling portal
              </div>
            )}

            <h2 className="auth-heading font-display text-3xl xs:text-4xl sm:text-5xl font-bold leading-[1.08] tracking-tight">
              {portal === 'admin' ? (
                <>
                  Empowering counsellors,{' '}
                  <span className="auth-heading-accent">driving admissions</span>
                </>
              ) : (
                <>
                  Your medical seat journey,{' '}
                  <span className="auth-heading-accent">beautifully simple</span>
                </>
              )}
            </h2>

            <p className="auth-sub mt-4 text-base sm:text-lg font-medium leading-relaxed max-w-md">
              {portal === 'admin'
                ? 'Sign in with your verified MBBSWALA employee credentials to manage student profiles, calls, and seat allocations.'
                : 'Sign in to unlock AI rank tools, MP state quota matrix, Indian college shortlists and human expert MBBS counselling.'}
            </p>

            <ul className="mt-6 space-y-2.5 hidden sm:block">
              {(portal === 'admin' ? staffPerks : studentPerks).map((p, i) => (
                <motion.li
                  key={p}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="auth-perk flex items-center gap-3 text-[15px] font-semibold"
                >
                  <span className="auth-perk-icon grid h-8 w-8 place-items-center rounded-full shadow-sm">
                    {portal === 'admin' ? <ShieldCheck className="h-4 w-4 text-orange-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  </span>
                  {p}
                </motion.li>
              ))}
            </ul>

            {/* Visual stage — objects stay inside this box only */}
            <motion.div
              className="relative mt-8 lg:mt-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7 }}
            >
              <div className="relative mx-auto w-full max-w-[520px] px-8 sm:px-12 py-8 sm:py-10">
                <div className="relative z-10 overflow-hidden rounded-[1.75rem] border border-black/[0.06] bg-gradient-to-br from-[#FFF7ED] via-white to-[#F8FAFC] p-3 shadow-[0_30px_80px_rgba(15,23,42,0.1)]">
                  <img
                    src={portal === 'admin' ? '/images/mbbswala/india-counsel-meet.jpg' : '/images/mbbswala/login-3d-hero.png'}
                    alt="MBBSWala Medical Counselling"
                    className="h-auto w-full rounded-[1.25rem] object-cover aspect-[16/11]"
                  />
                </div>

                <div className="pointer-events-none absolute inset-0 z-20 hidden sm:block">
                  {stageProps.map((item) => (
                    <motion.img
                      key={item.src}
                      src={item.src}
                      alt={item.alt}
                      className={`absolute object-contain drop-shadow-[0_18px_36px_rgba(15,23,42,0.14)] ${item.className}`}
                      style={{ rotate: item.rotate }}
                      initial={{ opacity: 0, scale: 0.8, y: 16 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: [0, -6, 0],
                        transition: {
                          opacity: { delay: item.delay, duration: 0.5 },
                          scale: { delay: item.delay, duration: 0.5 },
                          y: {
                            repeat: Infinity,
                            repeatType: 'mirror',
                            duration: 3.6 + item.delay * 2,
                            ease: 'easeInOut',
                          },
                        },
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* ── Right: Auth form card with dedicated Portal Switcher ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="order-1 lg:order-2"
        >
          <div className="mx-auto w-full max-w-[460px]">
            {/* ── Portal Selector Tabs (Student vs Admin/Counselor) ── */}
            <div className="auth-portal-track mb-4 p-1.5 rounded-2xl grid grid-cols-2 gap-1.5 shadow-sm backdrop-blur-sm">
              <button
                type="button"
                onClick={() => switchPortal('student')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  portal === 'student'
                    ? 'auth-portal-tab-active-student shadow-md'
                    : 'auth-portal-tab-inactive hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                <GraduationCap
                  className={`h-4 w-4 shrink-0 ${
                    portal === 'student' ? 'text-orange-400' : 'text-slate-600 dark:text-slate-400'
                  }`}
                />
                <span className={portal === 'student' ? 'text-white' : 'text-slate-800 dark:text-slate-200'}>
                  Student Login
                </span>
              </button>

              <button
                type="button"
                onClick={() => switchPortal('admin')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  portal === 'admin'
                    ? 'auth-portal-tab-active-admin shadow-md shadow-orange-500/25'
                    : 'auth-portal-tab-inactive hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                <Shield
                  className={`h-4 w-4 shrink-0 ${
                    portal === 'admin' ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                  }`}
                />
                <span className={portal === 'admin' ? 'text-white' : 'text-slate-800 dark:text-slate-200'}>
                  Admin & Counsellor
                </span>
              </button>
            </div>

            <div className="auth-card relative rounded-3xl p-6 sm:p-8 lg:p-9 shadow-[0_24px_70px_rgba(15,23,42,0.08)] border border-black/[0.06] dark:border-white/10">
              <div className="text-center">
                {portal === 'admin' && (
                  <div className="mb-3 flex justify-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[11px] font-bold border border-orange-500/20 flex items-center gap-1">
                      <UserCheck className="h-3 w-3" /> Super Admin
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold border border-blue-500/20 flex items-center gap-1">
                      <LockKeyhole className="h-3 w-3" /> Counsellor
                    </span>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${portal}-${mode}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h1 className="auth-card-title font-display text-[1.65rem] xs:text-3xl font-bold tracking-tight">
                      {portalTitle}
                    </h1>
                    <p className="auth-card-sub mt-2 text-[13.5px] sm:text-[14.5px] font-medium px-1">
                      {portalSubtitle}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {isOAuthRedirect ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-100 border-t-orange-500 mb-6 mx-auto" />
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">Authenticating...</h3>
                  <p className="text-sm font-medium text-slate-500 mt-2 max-w-[240px] mx-auto">
                    Please wait while we log you in securely.
                  </p>
                </div>
              ) : (
                <>
                  {/* Student Mode Switcher (Login vs Sign up) */}
                  {portal === 'student' && (
                    <div className="auth-mode-track relative mt-6 grid grid-cols-2 rounded-2xl p-1">
                      <motion.div
                        className="auth-mode-thumb absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl shadow-md"
                        animate={{ left: mode === 'login' ? 4 : 'calc(50% + 0px)' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                      {(['login', 'signup'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => switchMode(m)}
                          className={`auth-mode-btn relative z-10 py-2.5 text-sm font-bold capitalize transition-colors touch-manipulation ${
                            mode === m ? 'is-active' : ''
                          }`}
                        >
                          {m === 'login' ? 'Student Login' : 'New Sign Up'}
                        </button>
                      ))}
                    </div>
                  )}

                  <form onSubmit={submit} className="relative mt-6 space-y-4">
                    <AnimatePresence initial={false}>
                      {portal === 'student' && mode === 'signup' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4 overflow-hidden"
                        >
                          <Field
                            label="Student full name"
                            icon={<User className="h-4 w-4" />}
                            focused={focused === 'name'}
                          >
                            <input
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              onFocus={() => setFocused('name')}
                              onBlur={() => setFocused(null)}
                              className="login-input"
                              placeholder="e.g. Aryan Sharma"
                              autoComplete="name"
                              required={mode === 'signup'}
                            />
                          </Field>
                          <Field
                            label="WhatsApp phone number"
                            icon={<Phone className="h-4 w-4" />}
                            focused={focused === 'phone'}
                          >
                            <input
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              onFocus={() => setFocused('phone')}
                              onBlur={() => setFocused(null)}
                              className="login-input"
                              placeholder="+91 98765 43210"
                              autoComplete="tel"
                              type="tel"
                              required={mode === 'signup'}
                            />
                          </Field>
                          <Field
                            label="Referral Code (Optional)"
                            icon={<Gift className="h-4 w-4 text-emerald-500" />}
                            focused={focused === 'referral'}
                          >
                            <input
                              value={referralCode}
                              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                              onFocus={() => !isRefFromURL && setFocused('referral')}
                              onBlur={() => setFocused(null)}
                              className={`login-input uppercase tracking-wider font-mono font-bold ${
                                isRefFromURL ? 'opacity-70 cursor-not-allowed text-muted-foreground' : ''
                              }`}
                              placeholder="e.g. MBW-7880"
                              autoComplete="off"
                              readOnly={isRefFromURL}
                            />
                            {isRefFromURL && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                                Applied
                              </div>
                            )}
                          </Field>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Field
                      label={portal === 'admin' ? 'Staff Email address' : 'Email address'}
                      icon={<Mail className="h-4 w-4" />}
                      focused={focused === 'email'}
                    >
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocused('email')}
                        onBlur={() => setFocused(null)}
                        className="login-input"
                        placeholder={portal === 'admin' ? 'admin@mbbswala.in' : 'student@example.com'}
                        autoComplete="email"
                        required
                      />
                    </Field>

                    <Field
                      label={portal === 'admin' ? 'Staff Password' : 'Password'}
                      icon={<Lock className="h-4 w-4" />}
                      focused={focused === 'password'}
                      trailing={
                        <button
                          type="button"
                          onClick={() => setShowPass((v) => !v)}
                          className="auth-eye rounded-lg p-1.5 transition touch-manipulation"
                          aria-label={showPass ? 'Hide password' : 'Show password'}
                        >
                          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    >
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocused('password')}
                        onBlur={() => setFocused(null)}
                        className="login-input pr-10"
                        placeholder="••••••••"
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        required
                      />
                    </Field>

                    {(portal === 'admin' || mode === 'login') && (
                      <div className="flex items-center justify-between gap-2 pt-0.5 text-sm">
                        <label className="auth-remember flex cursor-pointer items-center gap-2 font-semibold min-w-0">
                          <input
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="h-4 w-4 shrink-0 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                          />
                          <span className="truncate">Keep me signed in</span>
                        </label>
                        <button
                          type="button"
                          className="auth-link font-bold shrink-0 touch-manipulation"
                          onClick={() =>
                            setMsg(
                              'Password assistance: Please contact MBBSWALA Central Helpdesk at +91 78801 19983.'
                            )
                          }
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div
                          key="err"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="auth-alert-error rounded-xl p-3 text-sm font-semibold space-y-2"
                        >
                          <p>{error}</p>
                          {portal === 'admin' && (
                            <button
                              type="button"
                              onClick={() => switchPortal('student')}
                              className="text-xs font-bold underline text-rose-700 dark:text-rose-300 hover:opacity-80 block"
                            >
                              👉 Click here to switch to Student Portal
                            </button>
                          )}
                        </motion.div>
                      )}
                      {msg && !error && (
                        <motion.p
                          key="ok"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="auth-alert-ok rounded-xl px-3 py-2.5 text-sm font-semibold"
                        >
                          {msg}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: loading ? 1 : 1.01, y: loading ? 0 : -1 }}
                      whileTap={{ scale: loading ? 1 : 0.985 }}
                      className={`auth-submit-btn group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3.5 text-[15px] font-bold transition disabled:opacity-70 touch-manipulation ${
                        portal === 'admin'
                          ? '!bg-gradient-to-r !from-orange-500 !to-amber-500 !shadow-orange-500/25'
                          : ''
                      }`}
                    >
                      <span className="relative flex items-center gap-2">
                        {loading ? (
                          <>
                            <span className="auth-btn-spinner h-4 w-4 rounded-full" />
                            Verifying credentials…
                          </>
                        ) : (
                          <>
                            {portal === 'admin'
                              ? 'Sign in to Staff CRM'
                              : mode === 'login'
                              ? 'Sign in to Student Dashboard'
                              : 'Create student account'}
                            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                          </>
                        )}
                      </span>
                    </motion.button>
                  </form>

                  {/* Student Google OAuth */}
                  {portal === 'student' && (
                    <>
                      <div className="relative my-5 sm:my-6 flex items-center gap-3">
                        <div className="auth-divider h-px flex-1" />
                        <span className="auth-card-sub text-[11px] font-bold uppercase tracking-[0.16em]">
                          or continue with
                        </span>
                        <div className="auth-divider h-px flex-1" />
                      </div>

                      <button
                        type="button"
                        onClick={() => signInWithGoogle('MBBSWala')}
                        className="auth-google mb-4 sm:mb-5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition touch-manipulation"
                      >
                        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
                          <path
                            fill="#EA4335"
                            d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.8 3.8 14.6 3 12 3 7 3 3 7 3 12s4 9 9 9c5.2 0 8.6-3.6 8.6-8.7 0-.6-.1-1-.2-1.5H12z"
                          />
                        </svg>
                        Sign in with Google
                      </button>
                    </>
                  )}

                  {/* Security Compliance Badge for Staff / Privacy Badge for Students */}
                  {portal === 'admin' ? (
                    <div className="auth-privacy flex items-start gap-3 rounded-2xl p-3.5 mt-5 bg-orange-500/5 border border-orange-500/15">
                      <span className="auth-privacy-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                        <Shield className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="auth-card-title text-xs sm:text-sm font-bold text-orange-950 dark:text-orange-200">
                          Secure Staff Portal
                        </p>
                        <p className="auth-card-sub mt-0.5 text-[11px] sm:text-xs font-medium leading-relaxed">
                          Authorized counsellors only. Session logs and IP addresses are audited for security.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="auth-privacy flex items-start gap-3 rounded-2xl p-3.5">
                      <span className="auth-privacy-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl">
                        <ShieldCheck className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="auth-card-title text-sm font-bold">Bank-grade privacy mindset</p>
                        <p className="auth-card-sub mt-0.5 text-xs font-medium leading-relaxed">
                          Your counselling data stays protected. Need help?{' '}
                          <a href="tel:+917880119983" className="auth-link font-bold">
                            +91 78801 19983
                          </a>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Cross-portal quick switch footer */}
                  <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/10 text-center text-xs sm:text-sm font-medium">
                    {portal === 'admin' ? (
                      <p className="text-slate-600 dark:text-white/70">
                        Looking for Student or Parent Portal?{' '}
                        <button
                          type="button"
                          onClick={() => switchPortal('student')}
                          className="auth-link font-bold text-orange-600 dark:text-orange-400 ml-1 touch-manipulation hover:underline"
                        >
                          Switch to Student Login →
                        </button>
                      </p>
                    ) : (
                      <p className="text-slate-600 dark:text-white/70">
                        MBBSWALA Counsellor or Admin?{' '}
                        <button
                          type="button"
                          onClick={() => switchPortal('admin')}
                          className="auth-link font-bold text-orange-600 dark:text-orange-400 ml-1 touch-manipulation hover:underline"
                        >
                          Open Staff Console →
                        </button>
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="mt-6 sm:mt-7 text-center">
            <Link
              to="/"
              className="auth-back inline-flex items-center gap-1 text-sm font-bold transition touch-manipulation"
            >
              ← Back to home
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
  focused,
  trailing,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  focused: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="block text-left">
      <span className="auth-field-label mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em]">
        {label}
      </span>
      <motion.div
        animate={{
          boxShadow: focused ? '0 0 0 4px rgba(249,115,22,0.14)' : '0 0 0 0 rgba(249,115,22,0)',
        }}
        className={`login-field-shell relative flex items-center overflow-hidden rounded-2xl border transition-colors ${
          focused ? 'is-focused' : ''
        }`}
      >
        <span
          className={`auth-field-icon pointer-events-none absolute left-3.5 z-[1] transition-colors ${
            focused ? 'is-focused' : ''
          }`}
        >
          {icon}
        </span>
        {children}
        {trailing && <span className="absolute right-2 z-[1]">{trailing}</span>}
      </motion.div>
    </label>
  );
}
