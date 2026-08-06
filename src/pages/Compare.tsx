import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GitCompareArrows, Loader2, CheckCircle2, Lightbulb, ChevronDown } from 'lucide-react';

import { MEDICAL_COURSES } from '../lib/courses';

interface College {
  id: number;
  name: string;
  city: string;
  state: string;
  country: string;
  college_type: string;
  course?: string;
}

type ComparePayload = {
  a: { college: College; highlights: Record<string, unknown> };
  b: { college: College; highlights: Record<string, unknown> };
  fields: Array<{ key: string; a: string | number; b: string | number; better?: string | null; hint?: string }>;
  category_matrix: Array<{
    category: string;
    a: { aiq_rank: number; aiq_score: number; state_rank_range: string } | null;
    b: { aiq_rank: number; aiq_score: number; state_rank_range: string } | null;
  }>;
  insights: string[];
};

function DarkSearchableSelect({ value, onChange, options, placeholder }: { value: string, onChange: (v: string) => void, options: { id: string, label: string }[], placeholder?: string }) {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      const selected = options.find(o => String(o.id) === value);
      setInputValue(selected ? selected.label : '');
    }
  }, [value, options, open]);

  const filtered = options.filter(o => o.label.toLowerCase().includes(inputValue.toLowerCase())).slice(0, 50);

  return (
    <div className="relative mt-1.5">
      <div 
        className="w-full border border-white/12 rounded-2xl px-3.5 py-3 font-semibold bg-[#171B24] text-white flex items-center justify-between focus-within:ring-2 focus-within:ring-[#F97316]/35 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <input 
          className="w-full bg-transparent outline-none truncate placeholder:text-white/30"
          value={open ? inputValue : (options.find(o => String(o.id) === value)?.label || '')}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setInputValue('');
          }}
          placeholder={placeholder || 'Search college...'}
        />
        <ChevronDown className="w-4 h-4 opacity-50 shrink-0 text-white" />
      </div>
      
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 top-full left-0 right-0 mt-2 rounded-xl border border-white/10 bg-[#171B24] shadow-2xl overflow-hidden flex flex-col max-h-[300px]">
            <div className="overflow-y-auto zn-scroll py-1">
              {filtered.length === 0 && <div className="p-3 text-sm opacity-50 text-center text-white">No results</div>}
              {filtered.map(o => (
                <div 
                  key={o.id} 
                  className={`px-3.5 py-2.5 text-sm cursor-pointer hover:bg-white/10 text-white ${String(o.id) === value ? 'font-bold text-[#F97316]' : ''}`}
                  onClick={() => {
                    onChange(String(o.id));
                    setInputValue(o.label);
                    setOpen(false);
                  }}
                >
                  {o.label}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Compare() {
  const [params, setParams] = useSearchParams();
  const [colleges, setColleges] = useState<College[]>([]);
  const [course, setCourse] = useState('All');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [data, setData] = useState<ComparePayload | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingCmp, setLoadingCmp] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoadingList(true);
    const qs = new URLSearchParams({ limit: '9999' });
    if (course !== 'All') qs.set('course', course);
    fetch(`/api/colleges?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
        setColleges(list);
        const qa = params.get('a');
        const qb = params.get('b');
        if (list.length) {
          setA(qa && list.some((c: College) => String(c.id) === qa) ? qa : String(list[0].id));
          setB(
            qb && list.some((c: College) => String(c.id) === qb)
              ? qb
              : String(list[Math.min(1, list.length - 1)].id)
          );
        } else {
          setA('');
          setB('');
        }
      })
      .catch(() => setError('Failed to load colleges'))
      .finally(() => setLoadingList(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course]); // Removed params to prevent reload loops

  useEffect(() => {
    if (!a || !b || a === b) {
      setData(null);
      return;
    }
    const controller = new AbortController();
    setLoadingCmp(true);
    setError('');
    fetch(`/api/college-compare?a=${a}&b=${b}`, { signal: controller.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Compare failed');
        setData(d);
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Compare failed');
        setData(null);
      })
      .finally(() => setLoadingCmp(false));
    return () => controller.abort();
  }, [a, b]);

  useEffect(() => {
    if (a && b) {
      const qs = new URLSearchParams();
      if (a) qs.set('a', a);
      if (b) qs.set('b', b);
      if (course !== 'All') qs.set('course', course);
      setParams(qs, { replace: true });
    }
  }, [a, b, course, setParams]);

  const options = useMemo(
    () =>
      colleges
        .filter(c => c.name && c.name.trim().length > 2 && c.name.trim() !== 'N/A')
        .map((c) => ({
          id: String(c.id),
          label: `${c.name}${c.city && c.city.trim() !== '-' ? ` · ${c.city}` : ''}${c.course ? ` · ${c.course}` : ''}`,
        })),
    [colleges]
  );

  return (
    <div className="min-h-screen bg-[#0B0D12] text-white">
      <div className="px-4 sm:px-8 py-12 md:py-16 max-w-5xl mx-auto">
        <div className="mb-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F97316] mb-2">
            Decision tool
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">Compare colleges</h1>
          <p className="text-white/55 font-medium max-w-2xl">
            Side-by-side seats, AIQ closing ranks and category cutoffs for MBBS, BDS, BAMS, BHMS, BUMS, BSMS and BNYS.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-6">
          <button
            type="button"
            onClick={() => setCourse('All')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${
              course === 'All' ? 'bg-[#F97316] text-white' : 'bg-white/8 text-white/60'
            }`}
          >
            All courses
          </button>
          {MEDICAL_COURSES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCourse(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                course === c ? 'bg-[#F97316] text-white' : 'bg-white/8 text-white/60'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loadingList ? (
          <div className="h-40 rounded-3xl bg-white/5 animate-pulse" />
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                { label: 'College A', value: a, set: setA },
                { label: 'College B', value: b, set: setB },
              ].map((side) => (
                <label key={side.label} className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-white/40">
                    {side.label}
                  </span>
                  <DarkSearchableSelect
                    value={side.value}
                    onChange={(val) => side.set(val)}
                    options={options}
                  />
                </label>
              ))}
            </div>

            {a === b && (
              <p className="text-amber-200 text-sm font-semibold mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                Pick two different colleges to compare.
              </p>
            )}
            {error && (
              <p className="text-red-300 text-sm font-semibold mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            {loadingCmp && (
              <div className="flex items-center justify-center gap-2 py-16 text-white/50">
                <Loader2 className="w-5 h-5 animate-spin text-[#F97316]" /> Loading comparison…
              </div>
            )}

            {data && !loadingCmp && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  {[data.a, data.b].map((side, idx) => (
                    <div
                      key={side.college.id}
                      className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#171B24] to-[#12151C] p-6"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-widest text-[#F97316] mb-2">
                        College {idx === 0 ? 'A' : 'B'}
                      </p>
                      <h2 className="font-display text-2xl font-bold leading-snug mb-2">
                        {side.college.name}
                      </h2>
                      <p className="text-sm text-white/50 font-medium">
                        {[side.college.city, side.college.state, side.college.country]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/8">
                          {side.college.college_type}
                        </span>
                        {side.highlights.total_seats != null && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#F97316]/15 text-orange-200">
                            {String(side.highlights.total_seats)} seats
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {data.insights?.length > 0 && (
                  <div className="rounded-3xl border border-[#F97316]/20 bg-[#F97316]/10 p-5 sm:p-6">
                    <p className="flex items-center gap-2 font-bold mb-3">
                      <Lightbulb className="w-4 h-4 text-[#F97316]" /> Insights
                    </p>
                    <ul className="space-y-2">
                      {data.insights.map((t) => (
                        <li key={t} className="flex items-start gap-2 text-sm text-white/80 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-3xl border border-white/10 overflow-hidden bg-[#171B24]">
                  <div className="grid grid-cols-3 gap-2 p-4 border-b border-white/10 bg-white/5 font-bold text-sm">
                    <span className="text-white/50">Field</span>
                    <span className="truncate">{data.a.college.name}</span>
                    <span className="truncate">{data.b.college.name}</span>
                  </div>
                  {data.fields.map((r) => (
                    <div
                      key={r.key}
                      className="grid grid-cols-3 gap-2 p-4 text-sm border-b border-white/5 last:border-0"
                    >
                      <span className="font-bold text-white/45">
                        {r.key}
                        {r.hint && (
                          <span className="block text-[10px] font-medium text-white/30 normal-case tracking-normal">
                            {r.hint}
                          </span>
                        )}
                      </span>
                      <span
                        className={`font-semibold ${
                          r.better === 'a' ? 'text-emerald-300' : 'text-white/90'
                        }`}
                      >
                        {r.a}
                      </span>
                      <span
                        className={`font-semibold ${
                          r.better === 'b' ? 'text-emerald-300' : 'text-white/90'
                        }`}
                      >
                        {r.b}
                      </span>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="font-display text-2xl font-bold mb-3">Category cutoffs</h3>
                  <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[#171B24]">
                    <table className="w-full text-sm min-w-[720px]">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5 text-left">
                          <th className="p-4 font-bold text-white/50">Category</th>
                          <th className="p-4 font-bold">A · AIQ rank</th>
                          <th className="p-4 font-bold">A · State band</th>
                          <th className="p-4 font-bold">B · AIQ rank</th>
                          <th className="p-4 font-bold">B · State band</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.category_matrix.map((row) => (
                          <tr key={row.category} className="border-b border-white/5 last:border-0">
                            <td className="p-4 font-bold text-[#F97316]">{row.category}</td>
                            <td className="p-4 font-semibold">
                              {row.a?.aiq_rank?.toLocaleString() || '—'}
                            </td>
                            <td className="p-4 text-white/70">{row.a?.state_rank_range || '—'}</td>
                            <td className="p-4 font-semibold">
                              {row.b?.aiq_rank?.toLocaleString() || '—'}
                            </td>
                            <td className="p-4 text-white/70">{row.b?.state_rank_range || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs text-white/40 font-medium flex items-center gap-1.5">
                    <GitCompareArrows className="w-3.5 h-3.5" />
                    Live data from colleges, cutoffs & seat matrix tables. Green values mark the relatively stronger side for that metric.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Link to="/rank-calculator" className="btn-orange px-6 py-3 text-sm">
                    Run rank predictor
                  </Link>
                  <Link
                    to="/contact"
                    className="px-6 py-3 text-sm font-bold rounded-full border border-white/15 hover:bg-white/5"
                  >
                    Get counsellor help
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
