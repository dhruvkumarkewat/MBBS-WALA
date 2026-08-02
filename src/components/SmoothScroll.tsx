import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Native scroll only — Lenis was blocking wheel/touch in iframe & dashboard shells.
 * Handles route hash + scroll-to-top on navigation.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // Unlock any stuck scroll locks from drawers/modals
    document.documentElement.classList.remove('lenis-stopped');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.height = '';
    document.body.style.touchAction = '';

    if (hash) {
      const id = hash.replace('#', '');
      const t = window.setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 80);
      return () => window.clearTimeout(t);
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return null;
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Clean legacy Lenis classes if present
    document.documentElement.classList.remove('lenis', 'lenis-smooth', 'lenis-stopped');
    document.documentElement.style.overflow = '';
    document.documentElement.style.height = '';
    document.body.style.overflow = '';
    document.body.style.overflowX = 'clip';
    document.body.style.height = '';
    document.body.style.position = '';

    return () => {
      document.documentElement.classList.remove('lenis-stopped');
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <>
      <ScrollToTop />
      {children}
    </>
  );
}

/** No-op stub so existing `useLenis()` callers keep compiling */
export function useLenis() {
  return null as unknown as {
    scroll: number;
    scrollTo: (...args: unknown[]) => void;
    stop: () => void;
    start: () => void;
    on: (event: string, cb: () => void) => (() => void) | void;
    off: (event: string, cb: () => void) => void;
  } | null;
}
