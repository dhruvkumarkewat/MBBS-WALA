import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  Crosshair,
  Map,
  Search,
  Columns2,
  Heart,
  CalendarCheck2,
  Grid3x3,
  FolderOpen,
  CloudDownload,
  ClipboardList,
  BellRing,
  Gift,
  Wallet,
  Trophy,
  CircleUserRound,
  Headphones,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  type LucideIcon,
} from 'lucide-react';
import { useDashboard } from '../../contexts/DashboardContext';
import { useAuth } from '../../contexts/AuthContext';
import BrandLogo from '../BrandLogo';

type Item = { label: string; path: string; icon: LucideIcon; badge?: string };

const sections: { title: string; items: Item[] }[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'AI Assistant', path: '/dashboard/ai', icon: Sparkles, badge: 'New' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'College Predictor', path: '/dashboard/predictor', icon: Crosshair },
      { label: 'Closing Rank Map', path: '/dashboard/competition-map', icon: Map, badge: 'New' },
      { label: 'College Finder', path: '/dashboard/finder', icon: Search },
      { label: 'Compare', path: '/dashboard/compare', icon: Columns2 },
      { label: 'Saved Colleges', path: '/dashboard/saved', icon: Heart },
    ],
  },
  {
    title: 'Admissions',
    items: [
      { label: 'Counselling', path: '/dashboard/counselling', icon: CalendarCheck2 },
      { label: 'Seat Matrix', path: '/dashboard/seat-matrix', icon: Grid3x3 },
      { label: 'Documents', path: '/dashboard/documents', icon: FolderOpen },
      { label: 'Downloads', path: '/dashboard/downloads', icon: CloudDownload },
      { label: 'Applications', path: '/dashboard/applications', icon: ClipboardList },
    ],
  },
  {
    title: 'Rewards',
    items: [
      { label: 'Refer & Earn', path: '/dashboard/refer', icon: Gift, badge: '₹500' },
      { label: 'Wallet', path: '/dashboard/wallet', icon: Wallet },
      { label: 'Leaderboard', path: '/dashboard/leaderboard', icon: Trophy },
      { label: 'Notifications', path: '/dashboard/notifications', icon: BellRing },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', path: '/dashboard/profile', icon: CircleUserRound },
      { label: 'Support', path: '/dashboard/support', icon: Headphones },
    ],
  },
];

function isActive(pathname: string, path: string) {
  if (path === '/dashboard') return pathname === '/dashboard';
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function DashboardSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed: collapsed, setSidebarCollapsed, dark } =
    useDashboard();

  const setCollapsed = (v: boolean | ((c: boolean) => boolean)) => {
    if (typeof v === 'function') setSidebarCollapsed(v(collapsed));
    else setSidebarCollapsed(v);
  };

  const logout = async () => {
    await signOut();
    setSidebarOpen(false);
  };

  const width = collapsed ? 'w-[76px]' : 'w-[260px]';
  const displayName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';

  const NavBody = ({ mobile = false }: { mobile?: boolean }) => {
    const showLabels = !collapsed || mobile;
    return (
      <>
        {/* Clean brand header — no photo clutter */}
        <div
          className={`shrink-0 border-b ${dark ? 'border-white/[0.07]' : 'border-slate-200'} ${
            showLabels ? 'px-4 py-4' : 'px-2 py-4'
          }`}
        >
          <div className={`flex items-center ${showLabels ? 'gap-3' : 'justify-center'}`}>
            <Link
              to="/dashboard"
              onClick={() => mobile && setSidebarOpen(false)}
              className="flex items-center gap-2.5 min-w-0 !bg-transparent hover:opacity-95 transition-opacity"
            >
              {showLabels ? (
                <BrandLogo to="" size="sm" onDark className="pointer-events-none" />
              ) : (
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff7a1a] to-[#ea580c] text-white grid place-items-center text-[11px] font-black tracking-tight shadow-md shadow-orange-500/30 shrink-0">
                  MW
                </span>
              )}
            </Link>
            {mobile && (
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className={`ml-auto w-9 h-9 rounded-xl grid place-items-center ${dark ? 'bg-white/8 text-white/70' : 'bg-slate-100 text-slate-500'}`}
                aria-label="Close"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>
          {showLabels && (
            <div className={`mt-3 rounded-2xl border px-3 py-2.5 ${dark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-slate-50 border-slate-200'}`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-400/90">
                Student portal
              </p>
              <p className={`text-[13px] font-semibold truncate mt-0.5 ${dark ? 'text-white/90' : 'text-slate-900'}`}>{displayName}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto zn-scroll px-2.5 py-3 space-y-4">
          {sections.map((sec) => (
            <div key={sec.title}>
              {showLabels && (
                <p className={`px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${dark ? 'text-white/28' : 'text-slate-400'}`}>
                  {sec.title}
                </p>
              )}
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const active = isActive(pathname, item.path);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={item.label}
                      onClick={() => mobile && setSidebarOpen(false)}
                      className={`group relative flex items-center gap-3 rounded-xl transition-all duration-200 ${
                        showLabels ? 'px-3 py-2.5' : 'justify-center px-0 py-3'
                      } ${
                        active
                          ? 'bg-[#ff7a1a] text-white shadow-[0_8px_24px_rgba(255,122,26,0.35)]'
                          : dark ? 'text-white/55 hover:text-white hover:bg-white/[0.06]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.4 : 1.9} />
                      {showLabels && (
                        <>
                          <span className="text-[13.5px] font-semibold truncate flex-1">
                            {item.label}
                          </span>
                          {item.badge && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                active
                                  ? 'bg-white/20 text-white'
                                  : dark ? 'bg-orange-500/15 text-orange-300' : 'bg-orange-50 text-orange-600'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {!showLabels && item.badge && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-orange-400" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={`border-t p-2.5 space-y-0.5 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${dark ? 'border-white/[0.07]' : 'border-slate-200'}`}>
          <button
            type="button"
            onClick={logout}
            className={`w-full flex items-center gap-3 rounded-xl transition-colors ${dark ? 'text-rose-300/85 hover:bg-rose-500/10 hover:text-rose-200' : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'} ${
              showLabels ? 'px-3 py-2.5' : 'justify-center py-3'
            }`}
          >
            <LogOut className="w-[18px] h-[18px]" />
            {showLabels && <span className="text-[13.5px] font-semibold">Logout</span>}
          </button>
          {!mobile && (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className={`w-full flex items-center gap-3 rounded-xl transition-colors ${dark ? 'text-white/35 hover:text-white hover:bg-white/[0.06]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'} ${
                collapsed ? 'justify-center py-3' : 'px-3 py-2.5'
              }`}
            >
              {collapsed ? (
                <ChevronRight className="w-[18px] h-[18px]" />
              ) : (
                <ChevronLeft className="w-[18px] h-[18px]" />
              )}
              {!collapsed && <span className="text-[13.5px] font-semibold">Collapse</span>}
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <>
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] md:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[min(280px,88vw)] flex flex-col md:hidden transition-transform duration-300 ease-out pt-[env(safe-area-inset-top)] border-r ${dark ? 'bg-[#0b0d12] border-white/[0.06]' : 'bg-white shadow-sm border-slate-200'} ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {NavBody({ mobile: true })}
      </aside>

      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 z-40 flex-col transition-all duration-300 ${width} border-r ${dark ? 'bg-[#0b0d12] border-white/[0.06]' : 'bg-white shadow-sm border-slate-200'}`}
        data-collapsed={collapsed ? 'true' : 'false'}
      >
        {NavBody({ mobile: false })}
      </aside>

      <div className={`hidden md:block shrink-0 transition-all duration-300 ${width}`} aria-hidden />
    </>
  );
}
