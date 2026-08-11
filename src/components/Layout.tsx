import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import FloatingActions from './ui/FloatingActions';
import SmoothScroll from './SmoothScroll';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Marketing shell — theme-aware light/dark landing.
 * Scroll restore handled in SmoothScroll.
 */
export default function Layout() {
  const location = useLocation();
  const { theme } = useTheme();

  useEffect(() => {
    document.documentElement.dataset.route = location.pathname;
  }, [location.pathname]);

  return (
    <SmoothScroll>
      <div
        className={`min-h-[100dvh] flex flex-col overflow-x-clip overflow-y-visible ds-page landing-shell theme-${theme}`}
        data-landing-theme={theme}
      >
        <Navbar />
        <main className="flex-1 min-w-0 w-full overflow-visible ds-page">
          <Outlet />
        </main>
        <Footer />
        <FloatingActions />
      </div>
    </SmoothScroll>
  );
}
