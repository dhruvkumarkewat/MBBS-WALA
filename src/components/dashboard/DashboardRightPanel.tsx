import { Link } from 'react-router-dom';
import {
  Crosshair,
  Heart,
  FolderOpen,
  CalendarCheck2,
  Sparkles,
  ArrowRight,
  Clock3,
  Map,
} from 'lucide-react';
import { useDashboard } from '../../contexts/DashboardContext';

const actions = [
  { t: 'Run predictor', to: '/dashboard/predictor', icon: Crosshair, bg: 'bg-orange-500 text-white', img: '/images/mbbswala/feat-05-map.jpg' },
  { t: 'Closing Rank Map', to: '/dashboard/competition-map', icon: Map, bg: 'bg-sky-500 text-white', img: '/images/mbbswala/feat-02-data.jpg' },
  { t: 'Saved colleges', to: '/dashboard/saved', icon: Heart, bg: 'bg-pink-500 text-white', img: '/images/mbbswala/tools-college.jpg' },
  { t: 'Upload docs', to: '/dashboard/documents', icon: FolderOpen, bg: 'bg-amber-500 text-white', img: '/images/mbbswala/feat-04-docs.jpg' },
  { t: 'Book call', to: '/dashboard/counselling', icon: CalendarCheck2, bg: 'bg-zinc-900 text-white', img: '/images/mbbswala/feature-counsel.jpg' },
];

export default function DashboardRightPanel() {
  const { dark } = useDashboard();

  const shell = dark
    ? 'bg-[#0f1117] border-white/[0.06] text-white'
    : 'bg-transparent text-[#111827]';

  return (
    <aside className={`hidden xl:flex w-[300px] shrink-0 flex-col gap-4 pl-1 pr-5 py-5 ${shell}`}>
      <div>
        <h3 className={`text-sm font-extrabold mb-3 px-1 ${dark ? 'text-white' : 'text-[#0f172a]'}`}>
          Quick actions
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {actions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className={`relative overflow-hidden rounded-[20px] p-4 flex flex-col gap-3 min-h-[108px] transition-all hover:-translate-y-0.5 hover:shadow-lg border ${
                dark ? 'bg-[#161922] border-white/[0.08]' : 'bg-white border-[#e5e7eb] shadow-sm'
              }`}
            >
              <img
                src={a.img}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-25"
              />
              <div
                className={`absolute inset-0 ${
                  dark ? 'bg-[#161922]/88' : 'bg-white/92'
                }`}
              />
              <span className={`relative z-10 w-10 h-10 rounded-2xl grid place-items-center ${a.bg} shadow-md`}>
                <a.icon className="w-4.5 h-4.5" strokeWidth={2.2} />
              </span>
              <span
                className={`relative z-10 text-[13px] font-extrabold leading-snug ${
                  dark ? 'text-white' : 'text-[#0f172a]'
                }`}
              >
                {a.t}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div
        className={`rounded-[22px] p-4 border ${
          dark
            ? 'bg-gradient-to-br from-orange-500/15 to-transparent border-orange-500/20'
            : 'bg-gradient-to-br from-[#fff7ed] to-white border-orange-100 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-8 h-8 rounded-xl bg-orange-500 text-white grid place-items-center">
            <Sparkles className="w-4 h-4" />
          </span>
          <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-[#0f172a]'}`}>AI tip of the day</p>
        </div>
        <p className={`text-[13px] font-semibold leading-relaxed mb-3 ${dark ? 'text-white/80' : 'text-[#1f2937]'}`}>
          With AIR ~15,000 General, prioritise MP govt newer colleges + strong private backups before Round 1 choice lock.
        </p>
        <Link
          to="/dashboard/ai"
          className="inline-flex items-center gap-1 text-sm font-bold text-[#f97316] hover:underline underline-offset-2"
        >
          Ask AI Assistant <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className={`rounded-[22px] p-4 border ${dark ? 'bg-[#161922] border-white/[0.06]' : 'bg-white border-[#eceff3] shadow-sm'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Clock3 className="w-4 h-4 text-orange-500" />
          <p className={`text-sm font-bold ${dark ? 'text-white' : 'text-[#0f172a]'}`}>Upcoming</p>
        </div>
        <ul className="space-y-3">
          {[
            { t: 'Choice filling prep', d: 'Review shortlist & docs' },
            { t: 'Counsellor slot', d: 'Book via Counselling tab' },
            { t: 'Seat matrix check', d: 'MP govt + private open seats' },
          ].map((u) => (
            <li key={u.t} className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0" />
              <div>
                <p className={`text-sm font-extrabold leading-tight ${dark ? 'text-white' : 'text-[#0f172a]'}`}>{u.t}</p>
                <p className={`text-xs font-semibold ${dark ? 'text-white/65' : 'text-[#4b5563]'}`}>{u.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
