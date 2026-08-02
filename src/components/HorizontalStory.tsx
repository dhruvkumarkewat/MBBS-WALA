import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const cards = [
  {
    tag: 'Start',
    title: 'Feeling stuck after NEET?',
    body: 'Rank, quota, fees, last dates — too much at once. We sit with your family and sort it step by step.',
    img: '/images/india/family-consult.jpg',
    path: '/about-us',
  },
  {
    tag: 'Data',
    title: 'Clear numbers, not guesswork',
    body: 'Seat charts and past cut-offs help you pick colleges that match your rank and budget.',
    img: '/images/india/college-2.jpg',
    path: '/cutoffs',
  },
  {
    tag: 'Support',
    title: 'A counsellor with you each round',
    body: 'Someone who knows All India and state rules, and tells you when to upgrade or hold.',
    img: '/images/india/counsel-meet.jpg',
    path: '/contact',
  },
  {
    tag: 'Result',
    title: 'College locked. Papers done.',
    body: 'From choice filling to final admission — we stay until the seat is confirmed.',
    img: '/images/india/doctors-group.jpg',
    path: '/testimonials',
  },
];

/**
 * Horizontal storytelling strip driven by vertical scroll (pinned track).
 */
export default function HorizontalStory() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 80, damping: 26, mass: 0.45 });
  const x = useTransform(smooth, [0, 1], ['0%', '-68%']);
  const progressW = useTransform(smooth, [0, 1], ['0%', '100%']);

  return (
    <section ref={ref} className="relative h-[280vh] bg-[#FFFFFF]">
      <div className="sticky top-0 h-[100svh] min-h-[560px] overflow-hidden flex flex-col justify-center">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#F97316] mb-2">
                How we work with you
              </p>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold text-[#0E1117] tracking-tight leading-[1.08]">
                From first call to{' '}
                <span className="italic text-[#F97316]">your college seat</span>
              </h2>
            </div>
            <div className="w-full sm:w-48">
              <div className="h-1 rounded-full bg-[#E5E7EB] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[#F97316]"
                  style={{ width: progressW }}
                />
              </div>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B7280]">
                Scroll to see each step
              </p>
            </div>
          </div>
        </div>

        <div className="relative w-full overflow-hidden">
          <motion.div style={{ x }} className="flex gap-5 sm:gap-6 pl-4 sm:pl-6 lg:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] pr-[20vw] will-change-transform">
            {cards.map((card, i) => (
              <article
                key={card.title}
                className="group relative shrink-0 w-[min(82vw,380px)] sm:w-[400px] rounded-[1.5rem] overflow-hidden border border-[#E5E7EB] bg-[#0E1117] shadow-[0_24px_60px_rgba(14,17,23,0.12)]"
              >
                <div className="relative h-52 sm:h-60 overflow-hidden">
                  <img
                    src={card.img}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0E1117] via-[#0E1117]/20 to-transparent" />
                  <span className="absolute top-4 left-4 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#0E1117]">
                    {String(i + 1).padStart(2, '0')} · {card.tag}
                  </span>
                </div>
                <div className="p-6 sm:p-7 text-white">
                  <h3 className="font-display text-2xl font-semibold leading-snug tracking-tight mb-3">
                    {card.title}
                  </h3>
                  <p className="text-sm font-medium leading-relaxed text-white/60 mb-5">
                    {card.body}
                  </p>
                  <Link
                    to={card.path}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#FB923C] hover:text-white transition-colors"
                  >
                    Continue <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
