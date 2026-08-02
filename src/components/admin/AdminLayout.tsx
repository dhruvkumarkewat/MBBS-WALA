import { useEffect, useState, createContext, useContext } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  UserCog,
  Activity,
  ShoppingCart,
  Wallet,
  Bell,
  LogOut,
  Menu,
  X,
  ClipboardList,
  History,
  Shield,
  Moon,
  Sun,
  GraduationCap,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiJson } from '../../lib/api';
import BrandLogo from '../BrandLogo';

type StaffInfo = {
  isStaff: boolean;
  role: string;
  staff?: {
    full_name: string;
    employee_id: string;
    role: string;
    photo_url?: string;
    presence?: string;
  };
};

type AdminThemeCtx = {
  dark: boolean;
  toggleDark: () => void;
};

const AdminThemeContext = createContext<AdminThemeCtx>({
  dark: false,
  toggleDark: () => undefined,
});

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}

type NavItem = {
  to: string;
  end?: boolean;
  label: string;
  hint: string;
  icon: typeof LayoutDashboard;
};

const superLinks: NavItem[] = [
  { to: '/admin', end: true, label: 'Command center', hint: 'Stats & today', icon: LayoutDashboard },
  { to: '/admin/purchases', label: 'Packages sold', hint: 'Assign counsellor', icon: ShoppingCart },
  { to: '/admin/students', label: 'All students', hint: 'Pipeline & assign', icon: Users },
  { to: '/admin/staff', label: 'Counsellors', hint: 'Create sub-admins', icon: UserCog },
  { to: '/admin/activity', label: 'Activity log', hint: 'Who did what', icon: Activity },
  { to: '/admin/sessions', label: 'Login history', hint: 'Staff sessions', icon: History },
  { to: '/admin/withdrawals', label: 'Withdrawals', hint: 'Approve payouts', icon: Wallet },
  { to: '/admin/notifications', label: 'Broadcast', hint: 'Notify team / students', icon: Bell },
];

const subLinks: NavItem[] = [
  { to: '/admin', end: true, label: 'My desk', hint: 'Your day at a glance', icon: LayoutDashboard },
  { to: '/admin/students', label: 'My students', hint: 'Assigned only', icon: Users },
  { to: '/admin/purchases', label: 'My packages', hint: 'Your paid cases', icon: ShoppingCart },
  { to: '/admin/followups', label: 'Follow-ups', hint: 'Calls due today', icon: ClipboardList },
  { to: '/admin/activity', label: 'My activity', hint: 'Your actions', icon: Activity },
];

const THEME_KEY = 'mb-admin-dark';

export default function AdminLayout() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState('');
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const admin = localStorage.getItem(THEME_KEY);
    if (admin === '1') return true;
    if (admin === '0') return false;
    return localStorage.getItem('mb-dash-dark') === '1';
  });

  const toggleDark = () => setDark((d) => !d);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, dark ? '1' : '0');
  }, [dark]);

  useEffect(() => {
    if (mobileOpen) {
      document.documentElement.classList.add('scroll-lock');
    } else {
      document.documentElement.classList.remove('scroll-lock');
    }
    return () => document.documentElement.classList.remove('scroll-lock');
  }, [mobileOpen]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/admin' } });
      return;
    }

    let alive = true;
    (async () => {
      try {
        const info = await apiJson<StaffInfo>('/api/admin-auth', {}, true);
        if (!alive) return;
        if (!info.isStaff) {
          setError('This account is not staff. Use Super Admin or Counsellor login.');
          setLoading(false);
          return;
        }
        setStaffInfo(info);
        await apiJson(
          '/api/admin-auth',
          { method: 'POST', body: JSON.stringify({ action: 'login' }) },
          true
        );
        const hb = setInterval(() => {
          apiJson(
            '/api/admin-auth',
            { method: 'POST', body: JSON.stringify({ action: 'heartbeat' }) },
            true
          ).catch(() => {});
        }, 60000);
        (window as unknown as { __adminHb?: ReturnType<typeof setInterval> }).__adminHb = hb;
        setLoading(false);
      } catch (e: unknown) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Failed to load admin session');
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
      const hb = (window as unknown as { __adminHb?: ReturnType<typeof setInterval> }).__adminHb;
      if (hb) clearInterval(hb);
    };
  }, [user, authLoading, navigate]);

  const logout = async () => {
    try {
      await apiJson(
        '/api/admin-auth',
        { method: 'POST', body: JSON.stringify({ action: 'logout' }) },
        true
      );
    } catch {
      /* ignore */
    }
    await signOut();
    navigate('/login');
  };

  if (authLoading || loading) {
    return (
      <div className={`min-h-screen grid place-items-center ${dark ? 'bg-[#0a0b10] text-white' : 'bg-[#F4F7FB] text-slate-800'}`}>
        <div className="text-center">
          <img src="/images/mbbswala/logo-master.png" alt="MBBS WAALA" className="h-12 w-auto mx-auto mb-4 object-contain animate-pulse" />
          <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className={`text-sm font-semibold ${dark ? 'text-white/80' : 'text-slate-600'}`}>
            Opening MBBSWALA CRM…
          </p>
        </div>
      </div>
    );
  }

  if (error || !staffInfo?.isStaff) {
    return (
      <div className={`min-h-screen grid place-items-center px-4 ${dark ? 'bg-[#0a0b10]' : 'bg-[#F4F7FB]'}`}>
        <div
          className={`max-w-lg w-full rounded-3xl border p-8 text-center shadow-2xl overflow-hidden relative ${
            dark ? 'border-white/10 bg-[#141820] text-white' : 'border-slate-200 bg-white text-slate-900'
          }`}
        >
          <img
            src="/images/mbbswala/india-counsel-meet.jpg"
            alt=""
            className="absolute inset-0 w-full h-36 object-cover opacity-40"
          />
          <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-transparent to-[inherit]" />
          <div className="relative pt-28">
            <Shield className="w-10 h-10 text-orange-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Admin access required</h1>
            <p className={`text-sm mb-6 ${dark ? 'text-white/70' : 'text-slate-500'}`}>{error || 'Not authorized'}</p>
            <div
              className={`text-left text-[11px] rounded-2xl p-4 mb-6 font-mono space-y-3 leading-relaxed ${
                dark ? 'bg-black/40 text-white/85' : 'bg-slate-50 text-slate-700 border border-slate-100'
              }`}
            >
              <p className="text-orange-500 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> Demo logins (copy-paste)
              </p>
              <p>
                <span className="text-orange-400 font-bold">Super Admin</span>
                <br />
                admin@mbbswala.in · Admin@123456
                <br />
                <span className="opacity-70">Sees everyone · assigns packages · manages staff</span>
              </p>
              <p>
                <span className="text-sky-400 font-bold">Counsellor (Sub-admin)</span>
                <br />
                counsellor@mbbswala.in · Counsel@123
                <br />
                <span className="opacity-70">Only own students · notes · follow-ups · chat</span>
              </p>
              <p>
                <span className="text-emerald-400 font-bold">Student portal</span>
                <br />
                aarav.student@mbbswala.in · Student@123
              </p>
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                type="button"
                onClick={() => signOut().then(() => navigate('/login'))}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 font-bold text-sm text-white shadow-lg shadow-orange-500/30"
              >
                Switch account
              </button>
              <Link
                to="/"
                className={`px-5 py-2.5 rounded-full border font-bold text-sm ${
                  dark ? 'border-white/20 text-white' : 'border-slate-200 text-slate-700'
                }`}
              >
                Home
              </Link>
              <button
                type="button"
                onClick={toggleDark}
                className={`px-4 py-2.5 rounded-full border font-bold text-sm inline-flex items-center gap-2 ${
                  dark ? 'border-white/20 text-white' : 'border-slate-200 text-slate-700'
                }`}
              >
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                Theme
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const links = staffInfo.role === 'super_admin' ? superLinks : subLinks;
  const name = staffInfo.staff?.full_name || 'Admin';
  const isSuper = staffInfo.role === 'super_admin';
  const photo = staffInfo.staff?.photo_url || '/images/mbbswala/avatar-1.jpg';

  return (
    <AdminThemeContext.Provider value={{ dark, toggleDark }}>
      <div
        className={`admin-shell min-h-screen ${
          dark ? 'admin-dark bg-[#0a0b10] text-slate-100' : 'admin-light bg-[#F4F7FB] text-slate-900'
        }`}
        data-admin-theme={dark ? 'dark' : 'light'}
      >
        {/* Mobile top */}
        <div
          className={`lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 backdrop-blur border-b ${
            dark ? 'bg-[#0f1117]/95 border-white/10 text-white' : 'bg-white/90 border-slate-200 text-slate-900'
          }`}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className={`p-2 rounded-xl border ${dark ? 'border-white/10 bg-white/5' : 'border-slate-200'}`}
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm">MBBSWALA · {isSuper ? 'Super' : 'Counsellor'}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleDark}
              className={`p-2 rounded-xl border ${dark ? 'border-white/10 bg-white/5 text-amber-300' : 'border-slate-200 text-slate-600'}`}
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={logout}
              className={`p-2 rounded-xl border ${dark ? 'border-white/10 bg-white/5' : 'border-slate-200'}`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-screen">
          <aside
            className={`admin-drawer fixed lg:sticky top-0 z-50 h-[100dvh] w-[min(268px,88vw)] shrink-0 transition-transform duration-300 ease-out ${
              mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
          >
            {/* Matches student dashboard sidebar — clean dark SaaS, no photo clutter */}
            <div className="h-full bg-[#0b0d12] text-white flex flex-col border-r border-white/[0.06]">
              <div className="shrink-0 border-b border-white/[0.07] px-4 py-4">
                <div className="flex items-center gap-2.5">
                  <BrandLogo to="/admin" size="md" onDark imgClassName="!max-w-[168px]" />
                  <button
                    type="button"
                    className="lg:hidden ml-auto p-2 rounded-xl bg-white/8 text-white/70"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] px-3 py-2.5 flex items-center gap-3">
                  <img
                    src={photo}
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-orange-400/40 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/mbbswala/avatar-1.jpg';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-400">
                      {isSuper ? 'Super Admin' : 'Counsellor'}
                    </p>
                    <p className="text-[13px] font-semibold text-white truncate leading-tight">
                      {name}
                    </p>
                    {staffInfo.staff?.employee_id && (
                      <p className="text-[11px] text-white/60 font-medium truncate">
                        {staffInfo.staff.employee_id}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto overscroll-contain px-2.5 py-3 space-y-0.5" data-lenis-prevent>
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
                  {isSuper ? 'Admin menu' : 'Counsellor menu'}
                </p>
                {links.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition touch-manipulation ${
                        isActive
                          ? 'bg-[#ff7a1a] !text-white shadow-[0_8px_24px_rgba(255,122,26,0.35)]'
                          : '!text-white/75 hover:!text-white hover:bg-white/[0.08]'
                      }`
                    }
                  >
                    <l.icon className="w-[18px] h-[18px] shrink-0 opacity-90" />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold block leading-tight text-[13.5px]">{l.label}</span>
                      <span className="text-[10px] text-white/55 font-medium block mt-0.5 leading-snug">
                        {l.hint}
                      </span>
                    </span>
                  </NavLink>
                ))}
              </nav>

              <div className="p-2.5 border-t border-white/[0.07] space-y-0.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={toggleDark}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-white/55 hover:text-white hover:bg-white/[0.06] text-sm font-semibold"
                >
                  <span className="inline-flex items-center gap-3">
                    {dark ? <Sun className="w-[18px] h-[18px] text-amber-300" /> : <Moon className="w-[18px] h-[18px]" />}
                    {dark ? 'Light mode' : 'Dark mode'}
                  </span>
                  <span className={`w-9 h-5 rounded-full relative transition-colors ${dark ? 'bg-orange-500' : 'bg-white/20'}`}>
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        dark ? 'left-[18px]' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/55 hover:text-white hover:bg-white/[0.06] text-[13.5px] font-semibold"
                >
                  <GraduationCap className="w-[18px] h-[18px]" /> Student dashboard
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-300/85 hover:bg-rose-500/10 hover:text-rose-200 text-[13.5px] font-semibold touch-manipulation"
                >
                  <LogOut className="w-[18px] h-[18px]" /> Sign out
                </button>
              </div>
            </div>
          </aside>

          {mobileOpen && (
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            />
          )}

          <main className="flex-1 min-w-0 admin-main">
            <div
              className={`hidden lg:flex items-center justify-between px-8 py-5 sticky top-0 z-20 backdrop-blur-xl border-b ${
                dark ? 'bg-[#0a0b10]/90 border-white/[0.06]' : 'bg-[#F4F7FB]/90 border-slate-200/80'
              }`}
            >
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.14em] ${dark ? 'text-orange-300/90' : 'text-slate-500'}`}>
                  MBBSWALA CRM · {isSuper ? 'Full access' : 'Assigned students only'}
                </p>
                <h1 className={`text-2xl font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
                  {isSuper ? 'Super Admin console' : 'Counsellor workspace'}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleDark}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-bold transition ${
                    dark
                      ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-orange-200 hover:text-orange-600 shadow-sm'
                  }`}
                >
                  {dark ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5" />}
                  {dark ? 'Light' : 'Dark'}
                </button>
                <Link
                  to="/dashboard/notifications"
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition ${
                    dark
                      ? 'bg-white/5 border-white/10 text-white/80 hover:text-orange-300'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-orange-200 hover:text-orange-600'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  My alerts
                </Link>
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
                    dark
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 sm:px-6 lg:px-8 pb-10 pt-4 lg:pt-2 admin-content"
            >
              <Outlet context={{ staffInfo, dark }} />
            </motion.div>
          </main>
        </div>
      </div>
    </AdminThemeContext.Provider>
  );
}
