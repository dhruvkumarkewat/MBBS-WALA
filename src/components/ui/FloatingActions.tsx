import { useEffect, useState } from 'react';
import { ArrowUp, MessageCircle } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

/** Site chrome FABs — theme toggle + WhatsApp + scroll top (no music) */
export default function FloatingActions() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    // Hard-stop any leftover ambient audio from older builds
    try {
      const nodes = document.querySelectorAll('audio');
      nodes.forEach((a) => {
        a.pause();
        a.currentTime = 0;
        a.muted = true;
      });
      localStorage.setItem('mbbswala-ambient-music', 'off');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        setShowTop((prev) => {
          const next = y > 420;
          return prev === next ? prev : next;
        });
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-[90] flex flex-col items-end gap-2.5 pointer-events-none">
      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="pointer-events-auto w-11 h-11 rounded-full landing-fab grid place-items-center touch-manipulation transition-opacity"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      <div className="pointer-events-auto">
        <ThemeToggle className="landing-round shadow-lg" />
      </div>

      <a
        href="https://wa.me/7880119983"
        target="_blank"
        rel="noreferrer"
        className="pointer-events-auto w-12 h-12 rounded-full bg-[#25D366] text-white grid place-items-center shadow-[0_8px_24px_rgba(37,211,102,0.35)] hover:scale-105 active:scale-95 transition-transform touch-manipulation"
        aria-label="WhatsApp"
      >
        <MessageCircle className="w-5 h-5" fill="currentColor" />
      </a>
    </div>
  );
}
