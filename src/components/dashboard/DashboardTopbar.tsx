import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Menu,
  Moon,
  Sun,
  Search,
  Share2,
  Check,
  Crown,
  Crosshair,
  Map,
} from 'lucide-react';
import { useDashboard } from '../../contexts/DashboardContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePremium } from '../../lib/premium';
import { apiJson } from '../../lib/api';

export default function DashboardTopbar({ title }: { title?: string }) {
  const { dark, toggleDark, setSidebarOpen } = useDashboard();
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const [q, setQ] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notifs, setNotifs] = useState<Array<{ id: number; title: string; read: boolean }>>([]);
  const [displayName, setDisplayName] = useState(() => {
    return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '';
  });

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleShare = async () => {
    const url = window.location.href;
    const shareTitle = document.title || 'MBBSWala';
    const text = 'Check out MBBSWala for NEET Counselling and Predictions!';

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text, url });
        return; // Success natively
      } catch (err) {
        // Fallthrough to clipboard if aborted or failed
      }
    }
    
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  useEffect(() => {
    if (!user) {
      setDisplayName('');
      return;
    }
    const initial = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Student';
    setDisplayName(initial);

    apiJson<{ full_name?: string }>('/api/profile', {}, true)
      .then((p) => {
        if (p?.full_name && p.full_name.trim()) {
          setDisplayName(p.full_name.trim());
        }
      })
      .catch(() => {
        setDisplayName(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Student');
      });
    apiJson<Array<{ id: number; title: string; read: boolean }>>('/api/notifications', {}, true)
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifs(data);
        } else {
          setNotifs([]);
        }
      })
      .catch(() => setNotifs([]));
  }, [user]);

  useEffect(() => {
    const scrollContainer = document.getElementById('dash-scroll-container');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      
      if (currentScrollY < 50) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const unread = notifs.filter((n) => !n.read).length;
  const nameToUse = displayName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student';
  const initials = nameToUse
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((p: string) => p[0])
    .join('')
    .slice(0, 1)
    .toUpperCase() || 'S';

  const bar = dark
    ? 'bg-[#0b0d12]/92 border-white/[0.06] text-white'
    : 'bg-white/90 border-[#e8ecf1] text-[#111827]';

  return (
    <header className={`absolute top-0 left-0 right-0 w-full z-30 border-b backdrop-blur-2xl ${bar} pt-[env(safe-area-inset-top)] transition-transform duration-300 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="h-[56px] sm:h-[60px] flex items-center gap-2 sm:gap-3 px-3 sm:px-5">
        <button
          type="button"
          className={`md:hidden w-10 h-10 rounded-xl grid place-items-center touch-manipulation shrink-0 ${
            dark ? 'hover:bg-white/8' : 'hover:bg-black/5'
          }`}
          onClick={() => setSidebarOpen(true)}
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0 shrink-0">
          <p className={`text-[10px] font-bold uppercase tracking-[0.16em] hidden sm:block ${dark ? 'text-orange-400/80' : 'text-orange-600/80'}`}>
            Student portal
          </p>
          <h1 className="text-[15px] sm:text-[16px] font-bold tracking-tight leading-tight truncate max-w-[36vw] sm:max-w-none">
            {title || 'Dashboard'}
          </h1>
        </div>

        <div className="hidden lg:block flex-1 max-w-md relative mx-auto min-w-0">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${dark ? 'text-white/30' : 'text-[#9ca3af]'}`} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search colleges, cutoffs, docs…"
            className={`w-full rounded-full pl-11 pr-16 py-2 text-sm font-medium outline-none border transition-shadow ${
              dark
                ? 'bg-white/[0.04] border-white/10 placeholder:text-white/30 focus:ring-2 focus:ring-orange-500/25'
                : 'bg-white border-[#e8eaed] placeholder:text-[#9ca3af] shadow-sm focus:ring-2 focus:ring-orange-500/15'
            }`}
          />
          <kbd className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded-md border hidden xl:inline ${
            dark ? 'border-white/10 text-white/30' : 'border-[#e5e7eb] text-[#c0c4cc]'
          }`}>⌘ K</kbd>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          <Link
            to="/dashboard/predictor"
            className="hidden xl:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff7a1a] to-[#f97316] text-white px-3.5 py-1.5 text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 hover:brightness-105"
          >
            <Crosshair className="w-3.5 h-3.5" /> Predict
          </Link>
          <Link
            to="/dashboard/competition-map"
            className="hidden 2xl:inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white px-3.5 py-1.5 text-xs sm:text-sm font-bold shadow-md shadow-sky-500/20 hover:brightness-105"
            title="Closing Rank Map"
          >
            <Map className="w-3.5 h-3.5" /> Map
          </Link>

          {!isPremium && (
            <Link to="/dashboard/subscription" className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full grid place-items-center transition-colors ${dark ? 'hover:bg-white/8 text-amber-300' : 'hover:bg-orange-50 text-amber-500'}`} title="Upgrade to Premium">
              <Crown className="w-[18px] h-[18px]" />
            </Link>
          )}

          <button
            type="button"
            onClick={toggleDark}
            className="theme-toggle-premium"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className={`relative w-10 h-10 rounded-full grid place-items-center ${dark ? 'hover:bg-white/8 text-white/60' : 'hover:bg-[#f3f4f6] text-[#6b7280]'}`}
              aria-label="Notifications"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#f97316] text-[10px] font-bold text-white grid place-items-center ring-2 ring-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <>
                <button type="button" className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} aria-label="Close" />
                <div className={`absolute -right-16 sm:right-0 top-12 z-50 w-[280px] sm:w-80 rounded-2xl border p-2 shadow-2xl ${
                  dark ? 'bg-[#1a1d24] border-white/10' : 'bg-white border-[#e5e7eb]'
                }`}>
                  <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide opacity-50">Notifications</p>
                  {(notifs.length ? notifs.slice(0, 5) : [{ id: 0, title: 'No new notifications', read: true }]).map((n) => (
                    <Link
                      key={n.id || n.title}
                      to="/dashboard/notifications"
                      onClick={() => setNotifOpen(false)}
                      className={`block px-3 py-2.5 rounded-xl text-sm font-medium ${dark ? 'hover:bg-white/5' : 'hover:bg-[#f8fafc]'}`}
                    >
                      {n.title}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          <button 
            type="button" 
            onClick={handleShare}
            className={`w-10 h-10 rounded-full grid place-items-center transition-colors ${dark ? 'hover:bg-white/8 text-white/60' : 'hover:bg-[#f3f4f6] text-[#6b7280]'}`} 
            aria-label="Share"
          >
            {copied ? <Check className="w-[18px] h-[18px] text-green-500" /> : <Share2 className="w-[18px] h-[18px]" />}
          </button>

          <Link
            to="/dashboard/profile"
            className={`flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 border shadow-sm hover:shadow-md transition-shadow ${
              dark
                ? 'border-white/10 bg-white/[0.06] hover:bg-white/10'
                : 'border-black/5 bg-white'
            }`}
            title={nameToUse}
          >
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff7a1a] to-[#ea580c] text-white grid place-items-center text-xs font-bold shadow-md shadow-orange-500/30">
              {initials}
            </span>
            <span
              className={`text-sm font-bold max-w-[6rem] truncate hidden sm:inline ${
                dark ? 'text-white' : 'text-[#111827]'
              }`}
            >
              {nameToUse}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
