import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export function AdminCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`admin-card rounded-[1.35rem] border backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  subtitle,
  image,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 min-h-[168px] mb-6 shadow-2xl">
      <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B1220]/96 via-[#0B1220]/88 to-[#0B1220]/45" />
      <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-orange-500/25 blur-3xl" />
      <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-5 text-white">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-300 mb-2">{eyebrow}</p>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">{title}</h2>
          <p className="text-sm text-white/70 mt-2 font-medium leading-relaxed">{subtitle}</p>
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

export function QuickAction({
  to,
  icon: Icon,
  title,
  desc,
  image,
  tone = 'orange',
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  image?: string;
  tone?: 'orange' | 'blue' | 'green' | 'purple' | 'teal';
}) {
  const ring: Record<string, string> = {
    orange: 'from-orange-500 to-rose-500',
    blue: 'from-sky-500 to-indigo-500',
    green: 'from-emerald-500 to-teal-500',
    purple: 'from-violet-500 to-fuchsia-500',
    teal: 'from-teal-500 to-cyan-500',
  };
  return (
    <Link
      to={to}
      className="admin-card group relative overflow-hidden rounded-2xl border p-0 hover:-translate-y-1 transition-all duration-300 shadow-lg"
    >
      {image && (
        <div className="h-28 overflow-hidden relative">
          <img
            src={image}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
          <span
            className={`absolute bottom-3 left-3 w-10 h-10 rounded-xl grid place-items-center text-white bg-gradient-to-br ${ring[tone]} shadow-lg`}
          >
            <Icon className="w-5 h-5" />
          </span>
        </div>
      )}
      <div className="p-4">
        {!image && (
          <span
            className={`mb-3 w-11 h-11 rounded-2xl grid place-items-center text-white bg-gradient-to-br ${ring[tone]} shadow-lg`}
          >
            <Icon className="w-5 h-5" />
          </span>
        )}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-black admin-text">{title}</p>
            <p className="text-xs font-medium admin-muted mt-1 leading-relaxed">{desc}</p>
          </div>
          <ArrowRight className="w-4 h-4 admin-muted group-hover:text-orange-500 transition-colors shrink-0 mt-1" />
        </div>
      </div>
    </Link>
  );
}

export function AdminStat({
  label,
  value,
  icon: Icon,
  tone = 'orange',
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'orange' | 'blue' | 'green' | 'purple' | 'rose' | 'teal';
  hint?: string;
}) {
  const tones: Record<string, string> = {
    orange: 'from-[#FF7A1A] to-[#FF4D8D]',
    blue: 'from-[#2B8CFF] to-[#6366F1]',
    green: 'from-emerald-500 to-teal-500',
    purple: 'from-violet-500 to-fuchsia-500',
    rose: 'from-rose-500 to-pink-500',
    teal: 'from-teal-500 to-cyan-500',
  };
  return (
    <AdminCard className="p-5 relative overflow-hidden group admin-card-hover transition-shadow">
      <div
        className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${tones[tone]} opacity-[0.16] group-hover:opacity-30 transition-opacity`}
      />
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] admin-muted mb-1.5">{label}</p>
          <p className="text-3xl font-black tracking-tight admin-text tabular-nums">{value}</p>
          {hint && <p className="text-[11px] font-medium admin-muted mt-1">{hint}</p>}
        </div>
        <span
          className={`w-11 h-11 rounded-2xl grid place-items-center text-white bg-gradient-to-br ${tones[tone]} shadow-lg`}
        >
          <Icon className="w-5 h-5" />
        </span>
      </div>
    </AdminCard>
  );
}

export function AdminBadge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: string }) {
  return (
    <span
      className={`admin-badge admin-badge-${tone || 'slate'} inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold capitalize`}
    >
      {children}
    </span>
  );
}

export function AdminLoader() {
  return (
    <div className="py-20 grid place-items-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-xs font-bold uppercase tracking-wider admin-muted">Loading workspace…</p>
      </div>
    </div>
  );
}

export function AdminError({ msg }: { msg: string }) {
  return (
    <div className="admin-error rounded-2xl border p-6 font-semibold flex gap-3 items-start">
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  );
}

export function AdminToast({ text, tone = 'ok' }: { text: string; tone?: 'ok' | 'err' }) {
  if (!text) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-sm font-semibold px-4 py-2.5 rounded-xl border ${
        tone === 'ok' ? 'admin-toast-ok' : 'admin-toast-err'
      }`}
    >
      {text}
    </motion.p>
  );
}

export function statusTone(s: string) {
  if (['completed', 'admitted', 'paid', 'approved', 'done', 'online', 'active'].includes(s)) return 'green';
  if (['pending', 'follow_up', 'new', 'assigned'].includes(s)) return 'orange';
  if (['in_progress'].includes(s)) return 'blue';
  if (['rejected', 'offline', 'unassigned', 'inactive'].includes(s)) return 'red';
  return 'slate';
}

export function fmt(d?: string | null) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d;
  }
}

export function money(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export const AVATARS = [
  '/images/mbbswala/avatar-1.jpg',
  '/images/mbbswala/avatar-2.jpg',
  '/images/mbbswala/avatar-3.jpg',
  '/images/mbbswala/avatar-4.jpg',
  '/images/mbbswala/avatar-5.jpg',
];

export function avatarFor(key: string | number | undefined | null) {
  const s = String(key || '0');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * (i + 1)) % AVATARS.length;
  return AVATARS[h];
}
