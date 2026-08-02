import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Phone, X, Calculator } from 'lucide-react';

export default function FloatingDock() {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const next = (window.scrollY || 0) > 380;
      setShow((prev) => (prev === next ? prev : next));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-5 right-4 sm:bottom-8 sm:right-8 z-[90] flex flex-col items-end gap-3"
        >
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="flex flex-col gap-2 mb-1"
              >
                {[
                  {
                    href: 'https://wa.me/7880119983',
                    label: 'WhatsApp counsellor',
                    icon: MessageCircle,
                    className: 'bg-[#25D366] text-white',
                    external: true,
                  },
                  {
                    href: 'tel:+917880119983',
                    label: 'Call +91 78801 19983',
                    icon: Phone,
                    className: 'bg-[#0c1222] text-white',
                    external: true,
                  },
                  {
                    href: '/rank-calculator',
                    label: 'Rank calculator',
                    icon: Calculator,
                    className: 'bg-white text-[#0c1222] border border-black/10',
                    external: false,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const cls = `inline-flex items-center gap-2.5 pl-4 pr-5 py-3 rounded-full shadow-xl font-semibold text-sm ${item.className}`;
                  if (item.external) {
                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        target={item.href.startsWith('http') ? '_blank' : undefined}
                        rel="noreferrer"
                        className={cls}
                      >
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </a>
                    );
                  }
                  return (
                    <Link key={item.label} to={item.href} className={cls}>
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2563eb] to-[#ec4899] text-white shadow-[0_16px_40px_rgba(37,99,235,0.4)] grid place-items-center hover:scale-105 transition-transform"
            aria-label="Quick actions"
          >
            {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
