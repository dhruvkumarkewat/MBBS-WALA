import { useEffect, useMemo, useState } from 'react';
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

const perks = [
  'Verified seat matrix & cut-offs',
  'Indian college shortlists (AIQ & state)',
  'Human expert counselling support',
];

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const from = (location.state as { from?: string } | null)?.from || '/dashboard';

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      // Staff accounts go to admin CRM; everyone else to student dashboard / intended route
      let res: { isStaff?: boolean; role?: string } | undefined;
      try {
        res = await apiJson<{ isStaff?: boolean; role?: string }>(
          '/api/admin-auth',
          {},
          true
        );
        if (cancelled) return;
        if (res?.isStaff) {
          navigate('/admin', { replace: true });
          return;
        }
      } catch {
        /* not staff */
      }
      if (!cancelled) {
        if (from.startsWith('/admin') && !res?.isStaff) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate(from, { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, navigate, from]);

  const title = useMemo(
    () => (mode === 'login' ? 'Welcome back' : 'Create your account'),
    [mode]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }
    if (mode === 'signup' && (!name.trim() || !phone.trim())) {
      setError('Name and phone are required to sign up.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: signErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim(), phone: phone.trim() },
          },
        });
        if (signErr) throw signErr;
        if (data.user) {
          try {
            await apiJson(
              '/api/profile',
              {
                method: 'PUT',
                body: JSON.stringify({
                  full_name: name.trim(),
                  phone: phone.trim(),
                }),
              },
              true
            );
          } catch {
            /* profile seeds on first GET */
          }
        }
        setMsg('Account created. Redirecting…');
      } else {
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signErr) throw signErr;
        setMsg('Signed in successfully. Redirecting…');
      }
      if (!remember) {
        /* session still stored by supabase client; remember is UX-only */
      }
      // Prefer admin CRM when this account is staff (same login page)
      try {
        const info = await apiJson<{ isStaff?: boolean }>('/api/admin-auth', {}, true);
        if (info?.isStaff) {
          navigate('/admin', { replace: true });
          return;
        }
      } catch {
        /* student */
      }
      navigate(from, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next);
    setError('');
    setMsg('');
  };

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
            <div className="auth-pill mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em]">
              <Sparkles className="h-3.5 w-3.5" />
              Premium counselling portal
            </div>
            <h2 className="auth-heading font-display text-3xl xs:text-4xl sm:text-5xl font-bold leading-[1.08] tracking-tight">
              Your medical seat journey,{' '}
              <span className="auth-heading-accent">beautifully simple</span>
            </h2>
            <p className="auth-sub mt-4 text-base sm:text-lg font-medium leading-relaxed max-w-md">
              Sign in to unlock rank tools, MP seat matrix, Indian college shortlists and expert MBBS counselling.
            </p>

            <ul className="mt-6 space-y-2.5 hidden sm:block">
              {perks.map((p, i) => (
                <motion.li
                  key={p}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="auth-perk flex items-center gap-3 text-[15px] font-semibold"
                >
                  <span className="auth-perk-icon grid h-8 w-8 place-items-center rounded-full shadow-sm">
                    <CheckCircle2 className="h-4 w-4" />
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
              {/* padding room so floating props don't clip */}
              <div className="relative mx-auto w-full max-w-[520px] px-8 sm:px-12 py-8 sm:py-10">
                {/* main hero card */}
                <div className="relative z-10 overflow-hidden rounded-[1.75rem] border border-black/[0.06] bg-gradient-to-br from-[#FFF7ED] via-white to-[#F8FAFC] p-3 shadow-[0_30px_80px_rgba(15,23,42,0.1)]">
                  <img
                    src="/images/mbbswala/login-3d-hero.png"
                    alt="MBBSWala medical counselling"
                    className="h-auto w-full rounded-[1.25rem] object-cover aspect-[16/11]"
                  />
                </div>

                {/* 3D props orbiting the card — never over the form */}
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
                        y: [0, -10, 0],
                      }}
                      transition={{
                        opacity: { duration: 0.55, delay: item.delay },
                        scale: { duration: 0.55, delay: item.delay },
                        y: {
                          duration: 4.8 + item.delay * 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: item.delay,
                        },
                      }}
                      draggable={false}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* ── Right: clean auth card only ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="order-1 lg:order-2 mx-auto w-full max-w-[420px]"
        >
          <div className="relative">
            <div className="auth-card-glow absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-orange-100/50 via-white to-orange-50/30 blur-xl" />

            <div className="auth-card relative overflow-hidden rounded-[1.75rem] p-5 xs:p-6 sm:p-8 md:p-9">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 auth-card-shine" />

              <div className="relative text-center">
                <div className="mb-4 sm:mb-5 flex justify-center">
                  {/* Full official MBBS WAALA logo */}
                  <BrandLogo to="/" size="lg" imgClassName="!object-center mx-auto" />
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h1 className="auth-card-title font-display text-[1.75rem] xs:text-3xl sm:text-4xl font-bold tracking-tight">
                      {title}
                    </h1>
                    <p className="auth-card-sub mt-2 text-[14px] sm:text-[15px] font-medium px-1">
                      {mode === 'login'
                        ? 'Access counselling tools and booking.'
                        : 'Join families planning medical admissions.'}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

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
                    {m === 'login' ? 'Login' : 'Sign up'}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="relative mt-6 space-y-4">
                <AnimatePresence initial={false}>
                  {mode === 'signup' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <Field
                        label="Full name"
                        icon={<User className="h-4 w-4" />}
                        focused={focused === 'name'}
                      >
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onFocus={() => setFocused('name')}
                          onBlur={() => setFocused(null)}
                          className="login-input"
                          placeholder="Your full name"
                          autoComplete="name"
                        />
                      </Field>
                      <Field
                        label="Phone"
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
                        />
                      </Field>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Field
                  label="Email"
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
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </Field>

                <Field
                  label="Password"
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

                {mode === 'login' && (
                  <div className="flex items-center justify-between gap-2 pt-0.5 text-sm">
                    <label className="auth-remember flex cursor-pointer items-center gap-2 font-semibold min-w-0">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="h-4 w-4 shrink-0 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                      />
                      <span className="truncate">Remember me</span>
                    </label>
                    <button
                      type="button"
                      className="auth-link font-bold shrink-0 touch-manipulation"
                      onClick={() =>
                        setMsg(
                          'Password reset link can be sent after account verification. Call +91 78801 19983 for help.'
                        )
                      }
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {error && (
                    <motion.p
                      key="err"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="auth-alert-error rounded-xl px-3 py-2.5 text-sm font-semibold"
                    >
                      {error}
                    </motion.p>
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
                  className="auth-submit-btn group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3.5 text-[15px] font-bold transition disabled:opacity-70 touch-manipulation"
                >
                  <span className="relative flex items-center gap-2">
                    {loading ? (
                      <>
                        <span className="auth-btn-spinner h-4 w-4 rounded-full" />
                        Please wait…
                      </>
                    ) : (
                      <>
                        {mode === 'login' ? 'Login' : 'Create account'}
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </>
                    )}
                  </span>
                </motion.button>
              </form>

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
                  <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.8 3.8 14.6 3 12 3 7 3 3 7 3 12s4 9 9 9c5.2 0 8.6-3.6 8.6-8.7 0-.6-.1-1-.2-1.5H12z"/>
                </svg>
                Sign in with Google
              </button>

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

              <p className="auth-card-sub mt-6 text-center text-sm font-medium">
                {mode === 'login' ? (
                  <>
                    New here?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('signup')}
                      className="auth-link font-bold touch-manipulation"
                    >
                      Create account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="auth-link font-bold touch-manipulation"
                    >
                      Login
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>

          <p className="mt-6 sm:mt-7 text-center">
            <Link to="/" className="auth-back inline-flex items-center gap-1 text-sm font-bold transition touch-manipulation">
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
          boxShadow: focused
            ? '0 0 0 4px rgba(249,115,22,0.14)'
            : '0 0 0 0 rgba(249,115,22,0)',
        }}
        className={`login-field-shell relative flex items-center overflow-hidden rounded-2xl border transition-colors ${
          focused ? 'is-focused' : ''
        }`}
      >
        <span className={`auth-field-icon pointer-events-none absolute left-3.5 z-[1] transition-colors ${focused ? 'is-focused' : ''}`}>
          {icon}
        </span>
        {children}
        {trailing && <span className="absolute right-2 z-[1]">{trailing}</span>}
      </motion.div>
    </label>
  );
}
