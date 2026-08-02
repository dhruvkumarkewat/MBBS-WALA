import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  PhoneCall,
  Trophy,
  Clock,
  Search,
  Plus,
  Check,
  X,
  Send,
  MessageSquare,
  FileText,
  Activity,
  Shield,
  Loader2,
  ArrowUpRight,
  ShoppingBag,
  Bell,
  UserPlus,
  Sparkles,
  TrendingUp,
  AlertCircle,
  IndianRupee,
} from 'lucide-react';
import { apiJson } from '../../lib/api';

/* ───────── shared UI (theme-safe via admin-shell CSS vars + classes) ───────── */

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`admin-card rounded-[1.35rem] border backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone = 'orange',
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
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
    <Card className="p-5 relative overflow-hidden group admin-card-hover transition-shadow">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${tones[tone]} opacity-[0.14] group-hover:opacity-25 transition-opacity`} />
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] admin-muted mb-1.5">{label}</p>
          <p className="text-3xl font-black tracking-tight admin-text tabular-nums">{value}</p>
          {hint && <p className="text-[11px] font-medium admin-muted mt-1">{hint}</p>}
        </div>
        <span className={`w-11 h-11 rounded-2xl grid place-items-center text-white bg-gradient-to-br ${tones[tone]} shadow-lg`}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
    </Card>
  );
}

function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className={`admin-badge admin-badge-${tone || 'slate'} inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold capitalize`}>
      {children}
    </span>
  );
}

function statusTone(s: string) {
  if (['completed', 'admitted', 'paid', 'approved', 'done', 'online', 'active'].includes(s)) return 'green';
  if (['pending', 'follow_up', 'new', 'assigned'].includes(s)) return 'orange';
  if (['in_progress'].includes(s)) return 'blue';
  if (['rejected', 'offline', 'unassigned', 'inactive'].includes(s)) return 'red';
  return 'slate';
}

function fmt(d?: string | null) {
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

function money(n: number) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function Loader() {
  return (
    <div className="py-20 grid place-items-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-xs font-bold uppercase tracking-wider admin-muted">Loading</p>
      </div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="admin-error rounded-2xl border p-6 font-semibold flex gap-3 items-start">
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  );
}

function Toast({ text, tone = 'ok' }: { text: string; tone?: 'ok' | 'err' }) {
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

/* ───────── Overview ───────── */

export function AdminOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    apiJson('/api/admin-overview', {}, true)
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (err) return <ErrorBox msg={err} />;

  const s = data.stats || {};
  const isSuper = data.role === 'super_admin';
  const pipeline = data.pipeline || [];
  const maxPipe = Math.max(1, ...pipeline.map((p: any) => p.count));
  const firstName = data.staff?.full_name?.split(' ')[0] || (isSuper ? 'Admin' : 'Counsellor');

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 min-h-[200px] shadow-2xl">
        <img
          src={isSuper ? '/images/mbbswala/india-gmc.jpg' : '/images/mbbswala/india-family-consult.jpg'}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1220]/96 via-[#0B1220]/88 to-[#0B1220]/40" />
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-orange-500/25 blur-3xl rounded-full" />
        <div className="relative z-10 p-6 md:p-8 flex flex-wrap items-end justify-between gap-4 text-white">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-300 mb-2 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              {isSuper ? 'Super Admin · full control' : 'Counsellor · your students only'}
            </p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              {isSuper ? 'Command center for paid packages & assignments' : `Welcome back, ${firstName}`}
            </h2>
            <p className="text-sm text-white/70 mt-2 font-medium leading-relaxed">
              {isSuper
                ? 'See revenue, unassigned paid students, counsellor load — then assign in one click. Student + counsellor both get notified.'
                : 'Work your assigned pipeline: update status, add notes, schedule follow-ups, and message families.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/students" className="px-4 py-2.5 rounded-full bg-white text-slate-900 text-sm font-bold shadow-lg">
              {isSuper ? 'All students' : 'My students'}
            </Link>
            {isSuper ? (
              <Link to="/admin/purchases" className="px-4 py-2.5 rounded-full bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-500/30">
                Assign packages
              </Link>
            ) : (
              <Link to="/admin/followups" className="px-4 py-2.5 rounded-full bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-500/30">
                Follow-ups due
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Easy next steps */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(isSuper
          ? [
              { to: '/admin/purchases', t: '1. Packages sold', d: 'Mark paid & assign counsellor', img: '/images/mbbswala/india-college-1.jpg', icon: ShoppingBag },
              { to: '/admin/students', t: '2. Assign students', d: 'Match counsellor to each case', img: '/images/mbbswala/india-students.jpg', icon: Users },
              { to: '/admin/staff', t: '3. Manage team', d: 'Add / pause counsellors', img: '/images/mbbswala/india-doctors-group.jpg', icon: Shield },
              { to: '/admin/notifications', t: '4. Broadcast', d: 'Alert staff or students', img: '/images/mbbswala/india-doctor.jpg', icon: Bell },
            ]
          : [
              { to: '/admin/students', t: '1. Open a student', d: 'See rank, package, history', img: '/images/mbbswala/india-students.jpg', icon: Users },
              { to: '/admin/followups', t: '2. Call follow-ups', d: 'Clear due reminders', img: '/images/mbbswala/india-counsel-meet.jpg', icon: PhoneCall },
              { to: '/admin/purchases', t: '3. My packages', d: 'Paid cases on your desk', img: '/images/mbbswala/india-college-2.jpg', icon: ShoppingBag },
              { to: '/admin/activity', t: '4. My activity', d: 'What you did today', img: '/images/mbbswala/dash-insights.png', icon: Activity },
            ]
        ).map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="admin-card group overflow-hidden rounded-2xl border hover:-translate-y-1 transition-all duration-300"
          >
            <div className="h-24 relative overflow-hidden">
              <img src={q.img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-2 left-2 w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 grid place-items-center text-white shadow-lg">
                <q.icon className="w-4 h-4" />
              </span>
            </div>
            <div className="p-3.5">
              <p className="font-black text-sm admin-text">{q.t}</p>
              <p className="text-[11px] admin-muted font-medium mt-0.5">{q.d}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat label="Students" value={s.total_students} icon={Users} tone="blue" hint={`${s.paid_students || 0} paid packages`} />
        <Stat label="Active pipeline" value={s.pending} icon={Clock} tone="orange" hint={`${s.in_progress || 0} in progress`} />
        <Stat label="Admitted" value={s.admitted} icon={Trophy} tone="green" hint={`${s.conversion_rate || 0}% conversion`} />
        <Stat
          label={isSuper ? 'Unassigned paid' : 'Follow-ups due'}
          value={isSuper ? s.unassigned_paid : s.pending_followups}
          icon={isSuper ? AlertCircle : PhoneCall}
          tone={isSuper ? 'rose' : 'purple'}
          hint={isSuper ? 'Needs counsellor' : 'Pending today'}
        />
      </div>

      {isSuper && (
        <div className="grid sm:grid-cols-3 gap-4">
          <Stat label="Tracked revenue" value={money(s.revenue)} icon={IndianRupee} tone="teal" />
          <Stat label="This month" value={money(s.month_revenue)} icon={TrendingUp} tone="orange" />
          <Stat label="Online counsellors" value={`${s.online_staff}/${s.total_staff}`} icon={Shield} tone="purple" />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-lg text-slate-900">Counselling pipeline</h3>
              <p className="text-xs text-slate-400 font-medium">Where every student stands right now</p>
            </div>
          </div>
          <div className="space-y-3">
            {pipeline.map((p: any) => (
              <div key={p.key} className="grid grid-cols-[120px_1fr_40px] sm:grid-cols-[140px_1fr_48px] items-center gap-3">
                <p className="text-xs font-bold text-slate-600">{p.label}</p>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500 transition-all"
                    style={{ width: `${Math.max(4, (p.count / maxPipe) * 100)}%` }}
                  />
                </div>
                <p className="text-sm font-black text-slate-900 text-right tabular-nums">{p.count}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <h3 className="font-black text-lg mb-4">Live activity</h3>
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {(data.todayActivity || []).length === 0 && (
              <p className="text-sm text-slate-400 font-medium">No activity yet today.</p>
            )}
            {(data.todayActivity || []).map((a: any) => (
              <div key={a.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800">{a.action}</p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {a.staff_name} · {fmt(a.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-lg">Recent students</h3>
            <Link to="/admin/students" className="text-sm font-bold text-orange-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {(data.students || []).map((st: any) => (
              <Link
                key={st.id}
                to={`/admin/students/${st.id}`}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{st.full_name}</p>
                  <p className="text-xs text-slate-400 font-medium">
                    AIR {st.neet_rank?.toLocaleString() || '—'} · {st.state || '—'} · {st.purchased_counselling || st.purchased_course || 'No package'}
                  </p>
                </div>
                <Badge tone={statusTone(st.counselling_status)}>{st.counselling_status}</Badge>
              </Link>
            ))}
          </div>
        </Card>

        {isSuper ? (
          <Card className="p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg">Counsellor board</h3>
              <Link to="/admin/staff" className="text-sm font-bold text-orange-600 hover:underline">
                Manage
              </Link>
            </div>
            <div className="space-y-3">
              {(data.staffList || []).map((c: any, idx: number) => (
                <div key={c.user_id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/80">
                  <img
                    src={c.photo_url || `/images/mbbswala/avatar-${(idx % 5) + 1}.jpg`}
                    alt=""
                    className="w-11 h-11 rounded-xl object-cover ring-2 ring-white"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/mbbswala/avatar-1.jpg';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm text-slate-900">{c.full_name}</p>
                      <Badge tone={statusTone(c.presence || 'offline')}>{c.presence || 'offline'}</Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium truncate">
                      {c.assigned_count || 0} students · {c.pending_count || 0} pending · {c.admitted_count || 0} admitted
                    </p>
                  </div>
                </div>
              ))}
              {!(data.staffList || []).length && <p className="text-sm text-slate-400">No active counsellors</p>}
            </div>
          </Card>
        ) : (
          <Card className="p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg">Pending follow-ups</h3>
              <Link to="/admin/followups" className="text-sm font-bold text-orange-600 hover:underline">
                Open
              </Link>
            </div>
            <div className="space-y-2">
              {(data.followups || []).slice(0, 6).map((f: any) => (
                <div key={f.id} className="p-3 rounded-2xl border border-slate-100">
                  <p className="font-bold text-sm">Student #{f.student_id}</p>
                  <p className="text-xs text-slate-500">{f.note || '—'}</p>
                  <p className="text-[11px] text-orange-600 font-bold mt-1">Due {fmt(f.due_at)}</p>
                </div>
              ))}
              {!(data.followups || []).length && <p className="text-sm text-slate-400 font-medium">All caught up 🎉</p>}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ───────── Staff ───────── */

export function AdminStaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', employee_id: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    apiJson<any[]>('/api/admin-staff', {}, true)
      .then(setStaff)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await apiJson('/api/admin-staff', { method: 'POST', body: JSON.stringify(form) }, true);
      setMsg('Sub-admin created successfully');
      setShowForm(false);
      setForm({ full_name: '', email: '', password: '', phone: '', employee_id: '' });
      load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (s: any) => {
    await apiJson(
      '/api/admin-staff',
      { method: 'PUT', body: JSON.stringify({ user_id: s.user_id, is_active: !s.is_active }) },
      true
    );
    load();
  };

  const remove = async (s: any) => {
    if (!confirm(`Delete counsellor ${s.full_name}?`)) return;
    await apiJson('/api/admin-staff', { method: 'DELETE', body: JSON.stringify({ user_id: s.user_id }) }, true);
    load();
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight">Sub-admin / Counsellors</h2>
          <p className="text-sm text-slate-500 font-medium">Create accounts, monitor load & presence</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 text-white text-sm font-bold shadow-lg"
        >
          <Plus className="w-4 h-4" /> New counsellor
        </button>
      </div>

      <Toast text={msg} />
      {err && <Toast text={err} tone="err" />}

      {showForm && (
        <Card className="p-5 md:p-6">
          <form onSubmit={create} className="grid sm:grid-cols-2 gap-3">
            {[
              ['full_name', 'Full name'],
              ['email', 'Login email'],
              ['password', 'Temp password'],
              ['phone', 'Phone'],
              ['employee_id', 'Employee ID (optional)'],
            ].map(([k, label]) => (
              <label key={k} className="text-sm font-semibold text-slate-600">
                {label}
                <input
                  required={k !== 'employee_id' && k !== 'phone'}
                  type={k === 'password' ? 'password' : k === 'email' ? 'email' : 'text'}
                  value={(form as any)[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </label>
            ))}
            <div className="sm:col-span-2 flex gap-2 pt-1">
              <button
                disabled={busy}
                type="submit"
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold text-sm disabled:opacity-60"
              >
                {busy ? 'Creating…' : 'Create sub-admin'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-full border border-slate-200 font-bold text-sm">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {staff.map((s, idx) => (
          <Card key={s.user_id} className="p-5">
            <div className="flex items-start gap-4">
              <img
                src={s.photo_url || `/images/mbbswala/avatar-${(idx % 5) + 1}.jpg`}
                alt=""
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-orange-100"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/mbbswala/avatar-1.jpg';
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg text-slate-900">{s.full_name}</h3>
                  <Badge tone={statusTone(s.presence || 'offline')}>{s.presence || 'offline'}</Badge>
                  <Badge tone={s.is_active ? 'green' : 'red'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
                <p className="text-xs text-slate-400 font-medium mb-3">
                  {s.employee_id} · {s.email} · {s.phone || 'No phone'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mb-4">
                  {[
                    ['Assigned', s.assigned_count ?? 0],
                    ['Pending', s.pending_count ?? 0],
                    ['Today', s.contacted_today ?? 0],
                    ['Rating', s.student_rating ?? '—'],
                  ].map(([l, v]) => (
                    <div key={l as string} className="rounded-xl bg-slate-50 py-2.5">
                      <p className="text-base font-black text-slate-900">{v as any}</p>
                      <p className="text-[10px] uppercase font-bold text-slate-400">{l as string}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mb-1">
                  <span className="font-bold">Now:</span> {s.current_activity || '—'}
                </p>
                <p className="text-xs text-slate-400 mb-3">
                  Last login {fmt(s.last_login)} · Activity {fmt(s.last_activity)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => toggleActive(s)} className="px-3 py-1.5 rounded-full text-xs font-bold border border-slate-200 hover:bg-slate-50">
                    {s.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button type="button" onClick={() => remove(s)} className="px-3 py-1.5 rounded-full text-xs font-bold border border-rose-200 text-rose-600 hover:bg-rose-50">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ───────── Students list ───────── */

export function AdminStudentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('sub_admin');
  const [toast, setToast] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const auth = await apiJson<any>('/api/admin-auth', {}, true);
      setRole(auth.role);
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      const data = await apiJson<any[]>(`/api/admin-students?${params}`, {}, true);
      setRows(data);
      if (auth.role === 'super_admin') {
        const s = await apiJson<any[]>('/api/admin-staff', {}, true);
        setStaff(s.filter((x) => x.is_active));
      }
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    load();
  }, [load]);

  const assign = async (studentId: number, staffId: string) => {
    await apiJson(
      '/api/admin-students',
      {
        method: 'PUT',
        body: JSON.stringify({
          id: studentId,
          assigned_to: staffId || null,
          counselling_status: staffId ? 'assigned' : 'unassigned',
        }),
      },
      true
    );
    setToast(staffId ? 'Counsellor assigned — student & sub-admin notified' : 'Student unassigned');
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight">{role === 'super_admin' ? 'All students' : 'My assigned students'}</h2>
          <p className="text-sm text-slate-500 font-medium">
            {role === 'super_admin' ? 'Assign paid packages to counsellors (dual notification)' : 'Your counselling pipeline'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, phone"
              className="pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium w-56 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">
            <option value="">All statuses</option>
            {['new', 'assigned', 'in_progress', 'follow_up', 'completed', 'admitted', 'unassigned'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Toast text={toast} />

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-10">
            <Loader />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[960px]">
              <thead className="bg-slate-50/90 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="text-left p-4 font-bold">Student</th>
                  <th className="text-left p-4 font-bold">Rank / State</th>
                  <th className="text-left p-4 font-bold">Package</th>
                  <th className="text-left p-4 font-bold">Status</th>
                  {role === 'super_admin' && <th className="text-left p-4 font-bold">Assign counsellor</th>}
                  <th className="text-left p-4 font-bold">Last contact</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-orange-50/40 cursor-pointer transition-colors" onClick={() => navigate(`/admin/students/${r.id}`)}>
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{r.full_name}</p>
                      <p className="text-xs text-slate-400">
                        {r.email} · {r.phone}
                      </p>
                      {r.user_id ? (
                        <span className="inline-flex mt-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Portal linked</span>
                      ) : (
                        <span className="inline-flex mt-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">No portal login</span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="font-semibold">{r.neet_rank?.toLocaleString() || '—'}</p>
                      <p className="text-xs text-slate-400">
                        {r.category} · {r.state}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{r.purchased_counselling || r.purchased_course || '—'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge tone={statusTone(r.payment_status)}>{r.payment_status}</Badge>
                        {r.payment_amount > 0 && <span className="text-xs font-bold text-slate-500">{money(r.payment_amount)}</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge tone={statusTone(r.counselling_status)}>{r.counselling_status}</Badge>
                    </td>
                    {role === 'super_admin' && (
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={r.assigned_to || ''}
                          onChange={(e) => assign(r.id, e.target.value)}
                          className="rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold max-w-[180px] bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
                        >
                          <option value="">Unassigned</option>
                          {staff.map((s) => (
                            <option key={s.user_id} value={s.user_id}>
                              {s.full_name}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    <td className="p-4 text-xs text-slate-500 font-medium">{fmt(r.last_contact_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="p-10 text-center text-slate-400 font-medium">No students found</p>}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ───────── Student detail ───────── */

export function AdminStudentDetailPage() {
  const { id } = useParams();
  const [pack, setPack] = useState<any>(null);
  const [role, setRole] = useState('sub_admin');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [followNote, setFollowNote] = useState('');
  const [followDue, setFollowDue] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [staff, setStaff] = useState<any[]>([]);

  const load = useCallback(async () => {
    const auth = await apiJson<any>('/api/admin-auth', {}, true);
    setRole(auth.role);
    const data = await apiJson<any>(`/api/admin-students?id=${id}`, {}, true);
    setPack(data);
    setStatus(data.student.counselling_status);
    if (auth.role === 'super_admin') {
      const s = await apiJson<any[]>('/api/admin-staff', {}, true);
      setStaff(s.filter((x) => x.is_active));
    }
  }, [id]);

  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, [load]);

  if (err) return <ErrorBox msg={err} />;
  if (!pack) return <Loader />;

  const st = pack.student;

  const addNote = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try {
      await apiJson('/api/admin-notes', { method: 'POST', body: JSON.stringify({ student_id: st.id, note }) }, true);
      setNote('');
      setToast('Note saved');
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const sendMsg = async () => {
    if (!msg.trim()) return;
    setBusy(true);
    try {
      await apiJson('/api/admin-messages', { method: 'POST', body: JSON.stringify({ student_id: st.id, message: msg }) }, true);
      setMsg('');
      setToast('Message sent');
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const schedule = async () => {
    if (!followDue) return;
    setBusy(true);
    try {
      await apiJson(
        '/api/admin-followups',
        { method: 'POST', body: JSON.stringify({ student_id: st.id, due_at: followDue, note: followNote }) },
        true
      );
      setFollowNote('');
      setFollowDue('');
      setToast('Follow-up scheduled');
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadDoc = async () => {
    if (!docTitle.trim()) return;
    setBusy(true);
    try {
      await apiJson(
        '/api/admin-documents',
        { method: 'POST', body: JSON.stringify({ student_id: st.id, title: docTitle, file_url: docUrl }) },
        true
      );
      setDocTitle('');
      setDocUrl('');
      setToast('Document recorded');
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveStatus = async () => {
    setBusy(true);
    try {
      await apiJson('/api/admin-students', { method: 'PUT', body: JSON.stringify({ id: st.id, counselling_status: status, contacted: true }) }, true);
      setToast('Status updated');
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const assign = async (staffId: string) => {
    setBusy(true);
    try {
      await apiJson(
        '/api/admin-students',
        {
          method: 'PUT',
          body: JSON.stringify({ id: st.id, assigned_to: staffId || null, counselling_status: staffId ? 'assigned' : 'unassigned' }),
        },
        true
      );
      setToast(staffId ? 'Assigned — student & counsellor notified' : 'Unassigned');
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 min-h-[150px]">
        <img src="/images/mbbswala/india-counsel-meet.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1220]/95 via-[#0B1220]/85 to-[#0B1220]/35" />
        <div className="relative z-10 p-5 md:p-6 flex flex-wrap items-end justify-between gap-4 text-white">
          <div className="flex items-center gap-4">
            <img
              src={`/images/mbbswala/avatar-${(Number(st.id) % 5) + 1}.jpg`}
              alt=""
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-orange-400/50 shadow-xl"
            />
            <div>
              <Link to="/admin/students" className="text-xs font-bold text-orange-300 hover:underline">
                ← Back to students
              </Link>
              <h2 className="text-2xl font-black tracking-tight mt-1">{st.full_name}</h2>
              <p className="text-sm text-white/70 font-medium">
                {st.email} · {st.phone} · AIR {st.neet_rank?.toLocaleString() || '—'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(st.counselling_status)}>{st.counselling_status}</Badge>
            <Badge tone={statusTone(st.payment_status)}>{st.payment_status}</Badge>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] font-semibold admin-muted">
        <p className="admin-card rounded-xl border px-3 py-2">① Update status after each call</p>
        <p className="admin-card rounded-xl border px-3 py-2">② Save notes for the next counsellor</p>
        <p className="admin-card rounded-xl border px-3 py-2">③ Message the family when needed</p>
        <p className="admin-card rounded-xl border px-3 py-2">④ Schedule a follow-up so nothing slips</p>
      </div>

      <Toast text={toast} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Info label="Package" value={st.purchased_counselling || st.purchased_course || '—'} />
        <Info label="Amount" value={money(st.payment_amount)} />
        <Info label="State / Category" value={`${st.state || '—'} · ${st.category || '—'}`} />
        <Info label="Exam" value={st.exam || 'NEET UG'} />
      </div>

      {role === 'super_admin' && (
        <Card className="p-5 flex flex-wrap items-center gap-3">
          <UserPlus className="w-5 h-5 text-orange-500" />
          <p className="font-bold text-sm mr-auto">Assign counsellor</p>
          <select
            value={st.assigned_to || ''}
            onChange={(e) => assign(e.target.value)}
            disabled={busy}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold min-w-[200px]"
          >
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.user_id} value={s.user_id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-500" /> Update status
          </h3>
          <div className="flex flex-wrap gap-2">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold flex-1 min-w-[160px]">
              {['assigned', 'in_progress', 'follow_up', 'completed', 'admitted', 'new', 'unassigned'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button type="button" disabled={busy} onClick={saveStatus} className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-bold disabled:opacity-60">
              Save + mark contacted
            </button>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-500" /> Internal notes
          </h3>
          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
            {(pack.notes || []).map((n: any) => (
              <div key={n.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-800">{n.note}</p>
                <p className="text-[11px] text-slate-400 mt-1">{fmt(n.created_at)}</p>
              </div>
            ))}
            {!(pack.notes || []).length && <p className="text-sm text-slate-400">No notes yet</p>}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Add counselling note…" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm mb-2" />
          <button type="button" disabled={busy} onClick={addNote} className="px-4 py-2 rounded-full bg-orange-500 text-white text-sm font-bold">
            Save note
          </button>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-orange-500" /> Messages
          </h3>
          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
            {(pack.messages || []).map((m: any) => (
              <div key={m.id} className={`rounded-xl p-3 text-sm ${m.sender_role === 'student' ? 'bg-sky-50' : 'bg-orange-50'}`}>
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">{m.sender_role}</p>
                <p className="font-medium">{m.message}</p>
              </div>
            ))}
            {!(pack.messages || []).length && <p className="text-sm text-slate-400">No messages</p>}
          </div>
          <div className="flex gap-2">
            <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Write a message…" className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <button type="button" disabled={busy} onClick={sendMsg} className="px-3 py-2 rounded-xl bg-slate-900 text-white">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold mb-3">Schedule follow-up</h3>
          <input type="datetime-local" value={followDue} onChange={(e) => setFollowDue(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm mb-2" />
          <input value={followNote} onChange={(e) => setFollowNote(e.target.value)} placeholder="Follow-up note" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm mb-2" />
          <button type="button" disabled={busy} onClick={schedule} className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-bold">
            Schedule
          </button>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Documents
          </h3>
          <div className="space-y-2 mb-3">
            {(pack.documents || []).map((d: any) => (
              <div key={d.id} className="rounded-xl bg-slate-50 p-3 text-sm flex justify-between gap-2">
                <span className="font-semibold">{d.title}</span>
                {d.file_url ? (
                  <a href={d.file_url} target="_blank" rel="noreferrer" className="text-orange-600 font-bold text-xs">
                    Open
                  </a>
                ) : null}
              </div>
            ))}
            {!(pack.documents || []).length && <p className="text-sm text-slate-400">No documents</p>}
          </div>
          <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Document title" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm mb-2" />
          <input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="File URL (optional)" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm mb-2" />
          <button type="button" disabled={busy} onClick={uploadDoc} className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-bold">
            Upload record
          </button>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold mb-3">Purchase history</h3>
          <div className="space-y-2">
            {(pack.purchases || []).map((p: any) => (
              <div key={p.id} className="flex justify-between text-sm border-b border-slate-100 py-2">
                <span className="font-semibold">
                  {p.item_name} <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                </span>
                <span className="font-bold">
                  {money(p.amount)} · {fmt(p.created_at)}
                </span>
              </div>
            ))}
            {!(pack.purchases || []).length && <p className="text-sm text-slate-400">No purchases linked</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-card rounded-2xl border p-3.5 shadow-sm">
      <p className="text-[10px] uppercase font-bold admin-muted tracking-wider">{label}</p>
      <p className="font-bold admin-text mt-0.5">{value}</p>
    </div>
  );
}

/* ───────── Activity / Sessions / Followups ───────── */

export function AdminActivityPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiJson<any[]>('/api/admin-activity?limit=150', {}, true)
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <Loader />;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black flex items-center gap-2">
        <Activity className="w-5 h-5 text-orange-500" /> Activity log
      </h2>
      <Card className="divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.id} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 text-sm">
            <div>
              <p className="font-bold text-slate-900">{r.action}</p>
              <p className="text-xs text-slate-400">
                {r.entity_type} {r.entity_id || ''} · staff {String(r.staff_id).slice(0, 8)}…
              </p>
            </div>
            <p className="text-xs font-semibold text-slate-500">{fmt(r.created_at)}</p>
          </div>
        ))}
        {!rows.length && <p className="p-8 text-center text-slate-400">No activity yet</p>}
      </Card>
    </div>
  );
}

export function AdminSessionsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiJson<any[]>('/api/admin-sessions?limit=100', {}, true)
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <Loader />;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black">Login history</h2>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              <th className="text-left p-3 font-bold">User</th>
              <th className="text-left p-3 font-bold">Login</th>
              <th className="text-left p-3 font-bold">Logout</th>
              <th className="text-left p-3 font-bold">Duration</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-3 font-mono text-xs">{String(r.user_id).slice(0, 12)}…</td>
                <td className="p-3">{fmt(r.login_at)}</td>
                <td className="p-3">{fmt(r.logout_at)}</td>
                <td className="p-3 font-semibold">{r.duration_seconds != null ? `${Math.round(r.duration_seconds / 60)} min` : 'Active'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function AdminFollowupsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const load = () => {
    setLoading(true);
    apiJson<any[]>('/api/admin-followups?status=pending', {}, true)
      .then(setRows)
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const done = async (id: number) => {
    await apiJson('/api/admin-followups', { method: 'PUT', body: JSON.stringify({ id, status: 'done' }) }, true);
    load();
  };

  if (loading) return <Loader />;
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[1.5rem] min-h-[120px] border border-white/10">
        <img src="/images/mbbswala/india-family-consult.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1220]/92 to-[#0B1220]/40" />
        <div className="relative z-10 p-6 text-white">
          <h2 className="text-xl font-black">Pending follow-ups</h2>
          <p className="text-sm text-white/70 font-medium mt-1">Call or message, then mark Done so your desk stays clean.</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {rows.map((f) => (
          <Card key={f.id} className="p-4 flex items-center justify-between gap-3">
            <button type="button" className="text-left flex-1 min-w-0" onClick={() => navigate(`/admin/students/${f.student_id}`)}>
              <div className="flex items-center gap-3">
                <img
                  src={`/images/mbbswala/avatar-${(Number(f.student_id) % 5) + 1}.jpg`}
                  alt=""
                  className="w-11 h-11 rounded-xl object-cover"
                />
                <div>
                  <p className="font-bold">Student #{f.student_id}</p>
                  <p className="text-sm text-slate-500">{f.note || 'Open profile for full context'}</p>
                  <p className="text-xs text-orange-600 font-bold mt-1">Due {fmt(f.due_at)}</p>
                </div>
              </div>
            </button>
            <button type="button" onClick={() => done(f.id)} className="px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold shrink-0">
              Mark done
            </button>
          </Card>
        ))}
        {!rows.length && <p className="text-slate-400 font-medium col-span-2 text-center py-10">All caught up 🎉</p>}
      </div>
    </div>
  );
}

/* ───────── Purchases (premium assign flow) ───────── */

export function AdminPurchasesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [err, setErr] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    neet_rank: '',
    state: 'Madhya Pradesh',
    item_name: 'NEET UG Counselling',
    amount: '2499',
    assigned_staff_id: '',
    item_type: 'counselling',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        apiJson<any[]>('/api/admin-purchases', {}, true),
        apiJson<any[]>('/api/admin-staff', {}, true).catch(() => []),
      ]);
      setRows(p);
      setStaff((s || []).filter((x: any) => x.is_active !== false && x.role !== 'super_admin'));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total = useMemo(() => rows.filter((r) => r.status === 'paid').reduce((s, r) => s + (r.amount || 0), 0), [rows]);
  const unassigned = useMemo(() => rows.filter((r) => r.status === 'paid' && !r.assigned_staff_id).length, [rows]);

  const assign = async (purchaseId: number, staffId: string) => {
    setBusy(true);
    setErr('');
    try {
      await apiJson(
        '/api/admin-purchases',
        { method: 'PUT', body: JSON.stringify({ id: purchaseId, assigned_staff_id: staffId || null }) },
        true
      );
      setToast(staffId ? 'Counsellor assigned — both student & sub-admin notified' : 'Assignment cleared');
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const createPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await apiJson(
        '/api/admin-purchases',
        {
          method: 'POST',
          body: JSON.stringify({
            full_name: form.full_name,
            email: form.email,
            phone: form.phone,
            neet_rank: form.neet_rank ? Number(form.neet_rank) : null,
            state: form.state,
            item_name: form.item_name,
            item_type: form.item_type,
            amount: Number(form.amount) || 0,
            assigned_staff_id: form.assigned_staff_id || null,
            status: 'paid',
          }),
        },
        true
      );
      setToast(
        form.assigned_staff_id
          ? 'Purchase recorded & counsellor assigned — dual notifications sent'
          : 'Purchase recorded. Assign a counsellor when ready.'
      );
      setShowForm(false);
      setForm({
        full_name: '',
        email: '',
        phone: '',
        neet_rank: '',
        state: 'Madhya Pradesh',
        item_name: 'NEET UG Counselling',
        amount: '2499',
        assigned_staff_id: '',
        item_type: 'counselling',
      });
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-500" /> Purchases & assignments
          </h2>
          <p className="text-sm text-slate-500 font-medium">When you assign a counsellor, both student and sub-admin get a notification</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-bold shadow-lg shadow-orange-500/25"
        >
          <Plus className="w-4 h-4" /> Record purchase
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Paid revenue" value={money(total)} icon={IndianRupee} tone="green" />
        <Stat label="Total purchases" value={rows.length} icon={ShoppingBag} tone="blue" />
        <Stat label="Awaiting assign" value={unassigned} icon={UserPlus} tone="rose" hint="Paid but no counsellor" />
      </div>

      <Toast text={toast} />
      {err && <Toast text={err} tone="err" />}

      {showForm && (
        <Card className="p-5 md:p-6">
          <h3 className="font-black mb-4">New paid package</h3>
          <form onSubmit={createPurchase} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              ['full_name', 'Student name', 'text'],
              ['email', 'Email', 'email'],
              ['phone', 'Phone', 'tel'],
              ['neet_rank', 'NEET rank', 'number'],
              ['state', 'State', 'text'],
              ['item_name', 'Package name', 'text'],
              ['amount', 'Amount (₹)', 'number'],
            ].map(([k, label, type]) => (
              <label key={k} className="text-sm font-semibold text-slate-600">
                {label}
                <input
                  required={k === 'full_name' || k === 'item_name'}
                  type={type}
                  value={(form as any)[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-medium"
                />
              </label>
            ))}
            <label className="text-sm font-semibold text-slate-600">
              Package type
              <select value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-medium">
                <option value="counselling">Counselling</option>
                <option value="course">Course</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Assign counsellor now
              <select
                value={form.assigned_staff_id}
                onChange={(e) => setForm({ ...form, assigned_staff_id: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-medium"
              >
                <option value="">Assign later</option>
                {staff.map((s) => (
                  <option key={s.user_id} value={s.user_id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2 pt-1">
              <button disabled={busy} type="submit" className="px-5 py-2.5 rounded-full bg-slate-900 text-white font-bold text-sm disabled:opacity-60">
                {busy ? 'Saving…' : 'Save purchase'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-full border border-slate-200 font-bold text-sm">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[980px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="text-left p-4 font-bold">Package</th>
                <th className="text-left p-4 font-bold">Student</th>
                <th className="text-left p-4 font-bold">Amount</th>
                <th className="text-left p-4 font-bold">Status</th>
                <th className="text-left p-4 font-bold">Counsellor</th>
                <th className="text-left p-4 font-bold">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="p-4">
                    <p className="font-bold text-slate-900">{r.item_name}</p>
                    <p className="text-[11px] text-slate-400 font-medium capitalize">{r.item_type}</p>
                  </td>
                  <td className="p-4">
                    {r.student ? (
                      <>
                        <Link to={`/admin/students/${r.student.id}`} className="font-bold text-slate-900 hover:text-orange-600">
                          {r.student.full_name}
                        </Link>
                        <p className="text-xs text-slate-400">
                          AIR {r.student.neet_rank?.toLocaleString() || '—'} · {r.student.state || '—'}
                        </p>
                      </>
                    ) : (
                      <span className="text-slate-400">#{r.student_id || '—'}</span>
                    )}
                  </td>
                  <td className="p-4 font-black text-slate-900">{money(r.amount)}</td>
                  <td className="p-4">
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  </td>
                  <td className="p-4">
                    <select
                      disabled={busy || r.status !== 'paid'}
                      value={r.assigned_staff_id || ''}
                      onChange={(e) => assign(r.id, e.target.value)}
                      className="rounded-xl border border-slate-200 px-2.5 py-2 text-xs font-semibold max-w-[180px] bg-white disabled:opacity-50"
                    >
                      <option value="">Unassigned</option>
                      {staff.map((s) => (
                        <option key={s.user_id} value={s.user_id}>
                          {s.full_name}
                        </option>
                      ))}
                    </select>
                    {r.counsellor && (
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        {r.counsellor.presence === 'online' ? '● Online' : '○ Offline'}
                      </p>
                    )}
                  </td>
                  <td className="p-4 text-xs font-medium text-slate-500">{fmt(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="p-10 text-center text-slate-400 font-medium">No purchases yet</p>}
        </div>
      </Card>
    </div>
  );
}

export function AdminWithdrawalsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState<Record<number, string>>({});

  const load = () => {
    setLoading(true);
    apiJson<any[]>('/api/admin-withdrawals', {}, true)
      .then(setRows)
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const act = async (id: number, status: 'approved' | 'rejected') => {
    await apiJson(
      '/api/admin-withdrawals',
      { method: 'PUT', body: JSON.stringify({ id, status, remarks: remarks[id] || '' }) },
      true
    );
    load();
  };

  if (loading) return <Loader />;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black">Withdrawal requests</h2>
      <div className="space-y-3">
        {rows.map((w) => (
          <Card key={w.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold">
                  {money(w.amount)} · {w.method}
                </p>
                <p className="text-xs text-slate-500 font-mono">{w.account_detail}</p>
                <p className="text-xs text-slate-400 mt-1">
                  User {String(w.user_id).slice(0, 10)}… · {fmt(w.created_at)}
                </p>
              </div>
              <Badge tone={statusTone(w.status)}>{w.status}</Badge>
            </div>
            {w.status === 'pending' && (
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  value={remarks[w.id] || ''}
                  onChange={(e) => setRemarks({ ...remarks, [w.id]: e.target.value })}
                  placeholder="Remarks"
                  className="flex-1 min-w-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <button type="button" onClick={() => act(w.id, 'approved')} className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-emerald-500 text-white text-sm font-bold">
                  <Check className="w-4 h-4" /> Approve
                </button>
                <button type="button" onClick={() => act(w.id, 'rejected')} className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-rose-500 text-white text-sm font-bold">
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            )}
          </Card>
        ))}
        {!rows.length && <p className="text-slate-400 font-medium text-center py-12">No withdrawal requests</p>}
      </div>
    </div>
  );
}

export function AdminNotifyPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'students' | 'staff' | 'all'>('students');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const res = await apiJson<{ sent: number }>('/api/admin-notify', {
        method: 'POST',
        body: JSON.stringify({ title, body, audience }),
      }, true);
      setMsg(`Notification delivered to ${res.sent} recipient(s)`);
      setTitle('');
      setBody('');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="text-xl font-black flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-500" /> Broadcast notification
        </h2>
        <p className="text-sm text-slate-500 font-medium">Push in-app alerts to students, counsellors, or everyone</p>
      </div>
      <Card className="p-5 md:p-6">
        <form onSubmit={send} className="space-y-3">
          <label className="block text-sm font-semibold">
            Audience
            <select value={audience} onChange={(e) => setAudience(e.target.value as any)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-medium">
              <option value="students">Students with portal accounts</option>
              <option value="staff">Active sub-admins / counsellors</option>
              <option value="all">Everyone (students + staff)</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Title
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="e.g. Choice filling starts tomorrow" />
          </label>
          <label className="block text-sm font-semibold">
            Message
            <textarea required value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Clear, actionable message…" />
          </label>
          {msg && <Toast text={msg} />}
          {err && <Toast text={err} tone="err" />}
          <button disabled={busy} type="submit" className="px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold text-sm disabled:opacity-60 shadow-lg shadow-orange-500/20">
            {busy ? 'Sending…' : 'Send notification'}
          </button>
        </form>
      </Card>
    </div>
  );
}
