import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { easeOut } from '../../lib/motion';

const C = {
  brand: '#f97316',
  brand2: '#fb923c',
  ink: '#0e1117',
  muted: '#e5e7eb',
  teal: '#14b8a6',
  violet: '#8b5cf6',
  rose: '#f43f5e',
  amber: '#f59e0b',
};

export function Sparkline({
  data,
  className,
  color = C.brand,
}: {
  data: number[];
  className?: string;
  color?: string;
}) {
  const max = Math.max(...data, 1);
  const reduce = useReducedMotion();
  return (
    <div className={cn('flex items-end gap-0.5 h-8', className)} aria-hidden>
      {data.map((v, i) => (
        <motion.span
          key={i}
          className="flex-1 rounded-sm min-w-[3px]"
          style={{ background: color, opacity: 0.35 + (v / max) * 0.65 }}
          initial={reduce ? false : { height: 0 }}
          animate={{ height: `${(v / max) * 100}%` }}
          transition={{ ...easeOut, delay: i * 0.03 }}
        />
      ))}
    </div>
  );
}

export function BarChart({
  data,
  labels,
  className,
  height = 180,
  colors = [C.brand, C.ink, C.amber, C.teal],
}: {
  data: number[];
  labels?: string[];
  className?: string;
  height?: number;
  colors?: string[];
}) {
  const max = Math.max(...data, 1);
  const reduce = useReducedMotion();
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end gap-2.5" style={{ height }}>
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
            <motion.div
              className="w-full rounded-t-lg origin-bottom cursor-default shadow-sm"
              style={{
                height: `${Math.max((v / max) * 100, 4)}%`,
                background: `linear-gradient(180deg, ${colors[i % colors.length]}ee 0%, ${colors[i % colors.length]} 100%)`,
              }}
              title={String(v)}
              initial={reduce ? false : { scaleY: 0, opacity: 0.4 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ ...easeOut, delay: i * 0.05 }}
              whileHover={reduce ? undefined : { filter: 'brightness(1.08)' }}
            />
          </div>
        ))}
      </div>
      {labels && (
        <div className="flex justify-between mt-2.5 text-[10px] sm:text-xs font-bold text-muted">
          {labels.map((l) => (
            <span key={l} className="flex-1 text-center truncate">
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function LineChart({
  data,
  className,
  stroke = C.brand,
  fill = 'rgba(249,115,22,0.15)',
}: {
  data: number[];
  className?: string;
  stroke?: string;
  fill?: string;
}) {
  const w = 100;
  const h = 40;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const line = pts.join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  const reduce = useReducedMotion();

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('w-full h-24', className)} preserveAspectRatio="none" aria-hidden>
      <motion.polygon
        points={area}
        fill={fill}
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

export function DonutChart({
  segments,
  size = 120,
  thickness = 14,
  centerLabel,
  className,
}: {
  segments: { value: number; color?: string; label?: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  className?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const colors = [C.brand, C.ink, C.teal, C.violet, C.amber];
  const reduce = useReducedMotion();

  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={thickness} className="dark:stroke-white/10" />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * c;
          const dash = `${len} ${c - len}`;
          const el = (
            <motion.circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color || colors[i % colors.length]}
              strokeWidth={thickness}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {centerLabel && (
        <motion.span
          className="absolute text-center"
          initial={reduce ? false : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <span className="block text-lg font-black">{centerLabel}</span>
        </motion.span>
      )}
    </div>
  );
}
