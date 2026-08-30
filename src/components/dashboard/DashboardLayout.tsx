import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { DashboardProvider, useDashboard } from '../../contexts/DashboardContext';
import DashboardSidebar from './DashboardSidebar';
import DashboardTopbar from './DashboardTopbar';
import DashboardRightPanel from './DashboardRightPanel';
import { mainNav } from './navConfig';
import PageTransition from '../ui/PageTransition';

function titleFromPath(pathname: string) {
  const exact = mainNav.find((n) => n.path === pathname);
  if (exact) return exact.label;
  const partial = mainNav.find((n) => n.path !== '/dashboard' && pathname.startsWith(n.path));
  return partial?.label || 'Dashboard';
}

function Shell() {
  const { dark } = useDashboard();
  const location = useLocation();
  const title = titleFromPath(location.pathname);
  const isHome = location.pathname === '/dashboard';

  // Ensure document can never trap scroll while dashboard is mounted
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.classList.remove('lenis', 'lenis-smooth', 'lenis-stopped');
    html.style.overflow = '';
    html.style.height = '';
    body.style.overflow = '';
    body.style.position = '';
    body.style.height = '';
    body.style.touchAction = '';
    return () => {
      body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className={`dash-shell h-[100dvh] max-h-[100dvh] min-h-0 flex overflow-hidden ${
        dark ? 'bg-[#0a0b10] text-white dash-dark' : 'bg-[#f4f6fa] text-[#111827] dash-light'
      }`}
    >
      <DashboardSidebar />
      <div className="relative flex-1 flex flex-col min-w-0 min-h-0 w-full max-w-[100vw] overflow-hidden">
        <DashboardTopbar title={title} />
        <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
          <main
            id="dash-scroll-container"
            className="flex-1 min-w-0 min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="h-[56px] sm:h-[60px] w-full shrink-0 pointer-events-none" aria-hidden="true" />
            <div className="dash-main-pad px-3 xs:px-4 sm:px-5 lg:px-6 py-4 sm:py-5 pb-[max(5.5rem,env(safe-area-inset-bottom))] md:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <AnimatePresence mode="wait" initial={false}>
                <PageTransition key={location.pathname} id={location.pathname} className="min-h-0">
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-[1400px] mx-auto"
                  >
                    <Outlet />
                  </motion.div>
                </PageTransition>
              </AnimatePresence>
            </div>
          </main>
          {isHome && (
            <div className="hidden xl:block shrink-0 min-h-0 overflow-y-auto">
              <div className="h-[56px] sm:h-[60px] w-full shrink-0 pointer-events-none" aria-hidden="true" />
              <DashboardRightPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <DashboardProvider>
      <Shell />
    </DashboardProvider>
  );
}
