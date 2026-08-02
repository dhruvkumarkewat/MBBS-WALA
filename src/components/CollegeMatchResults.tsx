import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Shield, Target, Flame, Sparkles } from 'lucide-react';

export type MatchRow = {
  college_name: string;
  state: string;
  category: string;
  aiq_rank: number;
  aiq_score: number;
  state_rank_range: string;
  chance: string;
  chance_score: number;
  chance_tone: string;
  best_path: string;
  total_seats: number | null;
  open_seats: number | null;
  college_kind: string | null;
};

const toneStyles: Record<string, string> = {
  safe: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  likely: 'bg-teal-500/15 text-teal-200 border-teal-500/30',
  moderate: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  reach: 'bg-orange-500/15 text-orange-200 border-orange-500/30',
  stretch: 'bg-rose-500/15 text-rose-200 border-rose-500/30',
  muted: 'bg-white/10 text-white/60 border-white/15',
};

const toneIcon: Record<string, typeof Shield> = {
  safe: Shield,
  likely: Sparkles,
  moderate: Target,
  reach: Flame,
  stretch: Flame,
};

export default function CollegeMatchResults({
  matches,
  summary,
  note,
  dark = true,
  rank,
  category,
}: {
  matches: MatchRow[];
  summary?: { safe_count: number; moderate_count: number; reach_count: number; recommended: number };
  note?: string;
  dark?: boolean;
  rank?: number;
  category?: string;
}) {
  if (!matches?.length) {
    return (
      <div className={`rounded-2xl border p-8 text-center ${
        dark ? 'border-white/10 bg-white/5 text-white/70' : 'border-black/10 bg-white text-gray-600'
      }`}>
        <p className="font-bold mb-1">No strong matches for this rank band yet</p>
        <p className="text-sm mb-4">Try another category, or explore the full college directory.</p>
        <Link to="/colleges" className="btn-orange inline-flex px-6 py-2.5 text-sm">Browse colleges</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { l: 'Recommended', v: summary.recommended, c: 'text-[#F97316]' },
            { l: 'Safe / Likely', v: summary.safe_count, c: 'text-emerald-400' },
            { l: 'Moderate', v: summary.moderate_count, c: 'text-amber-300' },
            { l: 'Reach', v: summary.reach_count, c: 'text-orange-300' },
          ].map((s) => (
            <div
              key={s.l}
              className={`rounded-2xl border p-4 ${
                dark ? 'border-white/10 bg-[#171B24]' : 'border-black/8 bg-white shadow-sm'
              }`}
            >
              <p className={`text-2xl font-black ${dark ? s.c : 'text-black'}`}>{s.v}</p>
              <p className={`text-[11px] font-bold uppercase tracking-wide ${dark ? 'text-white/45' : 'text-gray-500'}`}>
                {s.l}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {matches.map((m) => {
          const Icon = toneIcon[m.chance_tone] || Target;
          return (
            <div
              key={`${m.college_name}-${m.category}`}
              className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                dark
                  ? 'border-white/10 bg-[#171B24] hover:border-[#F97316]/35'
                  : 'border-black/8 bg-white shadow-sm hover:shadow-md'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                      toneStyles[m.chance_tone] || toneStyles.muted
                    }`}>
                      <Icon className="w-3 h-3" />
                      {m.chance}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${
                      dark ? 'bg-white/8 text-white/60' : 'bg-gray-100 text-gray-600'
                    }`}>
                      via {m.best_path}
                    </span>
                    {m.college_kind && (
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${
                        m.college_kind.includes('Private')
                          ? 'bg-orange-500/15 text-orange-300'
                          : 'bg-emerald-500/15 text-emerald-300'
                      }`}>
                        {m.college_kind}
                      </span>
                    )}
                  </div>
                  <h3 className={`font-bold text-base sm:text-lg leading-snug ${dark ? 'text-white' : 'text-black'}`}>
                    {m.college_name}
                  </h3>
                  <p className={`text-sm font-medium flex items-center gap-1.5 mt-1 ${dark ? 'text-white/50' : 'text-gray-500'}`}>
                    <MapPin className="w-3.5 h-3.5" /> {m.state}
                  </p>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${dark ? 'text-white/40' : 'text-gray-400'}`}>
                    Fit score
                  </p>
                  <p className={`text-3xl font-black ${dark ? 'text-white' : 'text-black'}`}>{m.chance_score}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { l: 'AIQ close', v: m.aiq_rank ? m.aiq_rank.toLocaleString() : '—' },
                  { l: 'AIQ score', v: m.aiq_score || '—' },
                  { l: 'State band', v: m.state_rank_range || '—' },
                  { l: 'Seats', v: m.total_seats ? `${m.total_seats}${m.open_seats ? ` · ${m.open_seats} open` : ''}` : '—' },
                ].map((cell) => (
                  <div
                    key={cell.l}
                    className={`rounded-xl px-3 py-2 ${
                      dark ? 'bg-black/25' : 'bg-gray-50'
                    }`}
                  >
                    <p className={`text-[10px] font-bold uppercase ${dark ? 'text-white/40' : 'text-gray-400'}`}>{cell.l}</p>
                    <p className={`text-sm font-bold truncate ${dark ? 'text-white/90' : 'text-black'}`}>{cell.v}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {note && (
        <p className={`text-xs font-medium leading-relaxed ${dark ? 'text-white/40' : 'text-gray-500'}`}>{note}</p>
      )}

      <div className="flex flex-wrap gap-3">
        <Link to="/colleges" className="btn-orange inline-flex items-center gap-2 px-5 py-2.5 text-sm">
          Full directory <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to={rank ? `/compare?rank=${rank}&category=${encodeURIComponent(category || 'General')}` : '/compare'}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full border ${
            dark ? 'border-white/15 text-white hover:bg-white/5' : 'border-black/15 text-black hover:bg-gray-50'
          }`}
        >
          Compare colleges
        </Link>
        <Link to="/contact" className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full ${
          dark ? 'text-[#F97316]' : 'text-orange-600'
        }`}>
          Talk to counsellor
        </Link>
      </div>
    </div>
  );
}
