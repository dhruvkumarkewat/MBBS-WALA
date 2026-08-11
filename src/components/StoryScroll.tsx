import { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { ArrowRight, Compass, LineChart, Trophy, Sparkles } from 'lucide-react';

type Chapter = {
  id: string;
  step: string;
  label: string;
  title: string;
  body: string;
  points: string[];
  img: string;
  cta: { label: string; path: string };
  icon: typeof Compass;
  accent: string;
};

const chapters: Chapter[] = [
  {
    id: 'rank',
    step: '01',
    label: 'Rank',
    title: 'Know your real rank range',
    body: 'Put your marks in. Get a simple rank band. Then compare All India seats with state seats — no random guessing.',
    points: [
      'Marks converted to a clear rank range',
      'All India vs state options side by side',
      'Works with your category (General, OBC, SC, ST, EWS)',
    ],
    img: '/images/india/students.jpg',
    cta: { label: 'Open rank calculator', path: '/rank-calculator' },
    icon: Compass,
    accent: '#F97316',
  },
  {
    id: 'seats',
    step: '02',
    label: 'Seats',
    title: 'See colleges that fit you',
    body: 'Check seat numbers, past cut-offs and fees together. Make a short list that matches your rank, money and family preference.',
    points: [
      'MP and All India seat charts in one place',
      'Cut-offs by college and category',
      'Easy filters so you are not lost in long lists',
    ],
    img: '/images/india/college-1.jpg',
    cta: { label: 'View seat list', path: '/seat-matrix' },
    icon: LineChart,
    accent: '#FB923C',
  },
  {
    id: 'seat',
    step: '03',
    label: 'Seat',
    title: 'Get the right college seat',
    body: 'A real counsellor helps with choice filling for Indian MBBS seats — until the seat is confirmed and papers are done.',
    points: [
      'One counsellor with you in every round',
      'All India, state and deemed college options',
      'Document help till admission is final',
    ],
    img: '/images/india/doctors-group.jpg',
    cta: { label: 'Book counselling', path: '/contact' },
    icon: Trophy,
    accent: '#EA580C',
  },
];
function ChapterStage({
  chapter,
  index,
  total,
  progress,
}: {
  chapter: Chapter;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const start = index / total;
  const mid = (index + 0.45) / total;
  const mid2 = (index + 0.55) / total;
  const end = (index + 1) / total;

  const opacity = useTransform(
    progress,
    [start, start + 0.06, mid, mid2, end - 0.04, end],
    [0, 1, 1, 1, 1, 0]
  );
  const y = useTransform(progress, [start, mid, end], [56, 0, -40]);
  const scale = useTransform(progress, [start, mid, end], [0.94, 1, 0.97]);
  const imgY = useTransform(progress, [start, end], ['10%', '-10%']);
  const Icon = chapter.icon;

  return (
    <motion.div
      className="absolute inset-0 grid lg:grid-cols-12"
      style={{ opacity, y, scale, pointerEvents: 'none' }}
    >
      <div className="lg:col-span-5 p-5 sm:p-8 md:p-10 flex flex-col justify-center relative z-10">
        <div className="mb-4 sm:mb-5 inline-flex items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-2xl text-white shadow-[0_12px_32px_rgba(249,115,22,0.4)]"
            style={{
              background: `linear-gradient(145deg, ${chapter.accent}, #0E1117)`,
            }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
              Chapter {chapter.step}
            </p>
            <p className="text-sm font-semibold text-white/80">{chapter.label}</p>
          </div>
        </div>

        <h3 className="font-display text-2xl sm:text-3xl md:text-[2.4rem] font-semibold leading-[1.12] tracking-tight text-white">
          {chapter.title}
        </h3>
        <p className="mt-3 sm:mt-4 text-sm sm:text-[15px] font-medium leading-relaxed text-white/60 max-w-md">
          {chapter.body}
        </p>

        <ul className="mt-5 sm:mt-7 space-y-2.5 sm:space-y-3">
          {chapter.points.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm font-semibold text-white/90">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: chapter.accent }}
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 sm:mt-8" style={{ pointerEvents: 'auto' }}>
          <Link
            to={chapter.cta.path}
            className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#111827] shadow-lg transition-transform hover:-translate-y-0.5"
          >
            {chapter.cta.label}
            <ArrowRight className="h-4 w-4 text-[#F97316] transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <div className="lg:col-span-7 relative min-h-[200px] sm:min-h-[260px] lg:min-h-full overflow-hidden">
        <motion.img
          src={chapter.img}
          alt=""
          className="absolute inset-0 h-[120%] w-full object-cover -top-[10%]"
          style={{ y: imgY }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E1117]/85 via-[#0E1117]/15 to-transparent lg:bg-gradient-to-r lg:from-[#0E1117]/55 lg:via-[#0E1117]/10 lg:to-transparent" />
        <div className="absolute bottom-5 left-5 right-5 sm:bottom-7 sm:left-7 lg:hidden">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: chapter.accent }}
          >
            {chapter.step} — {chapter.label}
          </p>
          <p className="mt-1 font-display text-xl font-semibold text-white drop-shadow">
            {chapter.title}
          </p>
        </div>
        <div className="hidden lg:flex absolute top-6 right-6 items-center gap-2 rounded-full border border-white/20 bg-black/35 px-4 py-2 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Step</span>
          <span className="font-display text-lg font-semibold text-white">{chapter.step}</span>
        </div>
      </div>
    </motion.div>
  );
}

function JourneyPercent({ progress }: { progress: MotionValue<number> }) {
  const label = useTransform(progress, (v) => `${Math.round(v * 100)}%`);
  return <motion.span>{label}</motion.span>;
}

function ChapterRailItem({
  chapter,
  index,
  total,
  progress,
  activeIndexMV,
}: {
  chapter: Chapter;
  index: number;
  total: number;
  progress: MotionValue<number>;
  activeIndexMV: MotionValue<number>;
}) {
  const Icon = chapter.icon;
  const start = index / total;
  const end = (index + 1) / total;
  const fill = useTransform(progress, [start, end], [0, 1]);
  const fillWidth = useTransform(fill, (v) => `${Math.max(0, Math.min(1, v)) * 100}%`);
  const isActiveOpacity = useTransform(activeIndexMV, (v) =>
    Math.round(v) === index ? 1 : 0.5
  );
  const scale = useTransform(activeIndexMV, (v) =>
    Math.round(v) === index ? 1 : 0.98
  );

  return (
    <motion.div
      className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 sm:px-4 sm:py-3.5"
      style={{ opacity: isActiveOpacity, scale }}
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
            Ch. {chapter.step}
          </p>
          <p className="truncate text-xs sm:text-sm font-bold text-white">{chapter.label}</p>
        </div>
      </div>
      <div className="mt-2.5 h-0.5 overflow-hidden rounded-full bg-white/10">
        <motion.div className="h-full bg-[#F97316]" style={{ width: fillWidth }} />
      </div>
    </motion.div>
  );
}

/**
 * Apple-style sticky storytelling:
 * Tall scroll runway · pinned stage · chapters crossfade by scroll progress.
 */
export default function StoryScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 28,
    mass: 0.4,
  });

  const total = chapters.length;
  const progressWidth = useTransform(smooth, [0, 1], ['0%', '100%']);
  const glowX = useTransform(smooth, [0, 1], ['8%', '78%']);
  const activeIndexMV = useTransform(smooth, (v) =>
    Math.min(total - 1, Math.max(0, Math.floor(v * total + 0.001)))
  );

  return (
    <div ref={containerRef} className="relative" style={{ height: `${total * 115}vh` }}>
      <div className="sticky top-0 h-[100svh] min-h-[640px] overflow-hidden bg-[#0E1117] text-white">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <motion.div
            className="absolute top-[18%] h-[min(48vmax,520px)] w-[min(48vmax,520px)] -translate-x-1/2 rounded-full bg-[#F97316]/25 blur-[110px]"
            style={{ left: glowX }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_100%,rgba(249,115,22,0.14),transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,17,23,0.2)_0%,transparent_30%,rgba(14,17,23,0.55)_100%)]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '72px 72px',
            }}
          />
        </div>

        <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 shrink-0">
            <div className="max-w-xl">
              <p className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#F97316]">
                <Sparkles className="h-3.5 w-3.5" />
                Scroll to unfold the story
              </p>
              <h2 className="font-display text-3xl sm:text-4xl md:text-[2.75rem] font-semibold leading-[1.08] tracking-tight">
                Rank → Seats → <span className="italic text-[#F97316]">Seat</span>
              </h2>
              <p className="mt-2 max-w-md text-sm font-medium text-white/55 leading-relaxed hidden sm:block">
                Keep scrolling. Each chapter locks in as you move — a cinematic path from confusion to a confirmed college.
              </p>
            </div>

            <div className="w-full sm:w-56 shrink-0">
              <div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                <span>Journey</span>
                <JourneyPercent progress={smooth} />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#F97316] via-[#FB923C] to-[#FDBA74]"
                  style={{ width: progressWidth }}
                />
              </div>
            </div>
          </div>

          <div className="mb-5 sm:mb-6 flex gap-2 sm:gap-3 shrink-0">
            {chapters.map((c, i) => (
              <ChapterRailItem
                key={c.id}
                chapter={c}
                index={i}
                total={total}
                progress={smooth}
                activeIndexMV={activeIndexMV}
              />
            ))}
          </div>

          <div className="relative min-h-0 flex-1 rounded-[1.5rem] sm:rounded-[1.75rem] border border-white/10 bg-white/[0.035] backdrop-blur-[2px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.45)]">
            {chapters.map((chapter, i) => (
              <ChapterStage
                key={chapter.id}
                chapter={chapter}
                index={i}
                total={total}
                progress={smooth}
              />
            ))}
          </div>

          <p className="mt-3 sm:mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35 shrink-0">
            Scroll to continue the journey
          </p>
        </div>
      </div>
    </div>
  );
}
