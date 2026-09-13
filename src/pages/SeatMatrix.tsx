import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { MEDICAL_COURSES } from '../lib/courses';
import { AISeatMatrixAnalysis } from '../components/ui/AISeatMatrixAnalysis';

interface SeatRow {
  id: number;
  college_name: string;
  state: string;
  college_kind: string;
  total_seats: number;
  all_india: number;
  goi: number;
  remaining_seats: number;
  pwd: number;
  sainik: number;
  ff: number;
  gs: number;
  open_seats: number;
  nri_seats: number;
  year: number;
}

export default function SeatMatrix() {
  const [rows, setRows] = useState<SeatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState('All');
  const [fieldTab, setFieldTab] = useState<'ALL' | 'MBBS_BDS' | 'AYUSH' | 'NEET_PG'>('MBBS_BDS');
  const [course, setCourse] = useState('MBBS');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (kind !== 'All') params.set('kind', kind);
    if (course && course !== 'All') params.set('course', course);
    if (q) params.set('q', q);
    setLoading(true);
    fetch(`/api/seat-matrix?${params}`)
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []))
      .catch(() => setError('Failed to load seat matrix'))
      .finally(() => setLoading(false));
  }, [kind, course, q]);

  const totalSeats = rows.reduce((s, r) => s + (r.total_seats || 0), 0);

  return (
    <div className="px-4 sm:px-8 py-12 md:py-16 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-2">College data</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-3">Seat matrix — all medical courses</h1>
        <p className="text-text-grey font-medium max-w-2xl">
          Seat distribution for MBBS, BDS and AYUSH (BAMS, BHMS, BUMS, BSMS, BNYS) — filter by course and college type.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { l: 'Colleges', v: rows.length },
          { l: 'Total seats', v: totalSeats.toLocaleString() },
          { l: 'Govt rows', v: rows.filter((r) => r.college_kind?.includes('Government')).length },
          { l: 'Private rows', v: rows.filter((r) => r.college_kind === 'Private').length },
        ].map((s) => (
          <div key={s.l} className="zn-card p-4 text-center">
            <p className="text-2xl font-black">{s.v}</p>
            <p className="text-xs font-bold uppercase text-text-grey">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Field Filter Tabs */}
      <div className="flex gap-2 pb-1 overflow-x-auto mb-2">
        {[
          { id: 'MBBS_BDS', label: '🏥 MBBS / BDS' },
          { id: 'AYUSH', label: '🌿 AYUSH' },
          { id: 'NEET_PG', label: '🩺 NEET PG (MD/MS/Diploma)' },
          { id: 'ALL', label: '🌐 All Courses' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setFieldTab(f.id as any);
              if (f.id === 'MBBS_BDS') setCourse('MBBS');
              else if (f.id === 'AYUSH') setCourse('BAMS');
              else if (f.id === 'NEET_PG') setCourse('MD');
              else setCourse('All');
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
              fieldTab === f.id
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-slate-700 border-black/10 hover:border-primary/40'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Course Pills for Selected Field */}
      <div className="flex flex-wrap gap-2 mb-3">
        {(fieldTab === 'MBBS_BDS'
          ? ['All', 'MBBS', 'BDS']
          : fieldTab === 'AYUSH'
          ? ['All', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'BNYS']
          : fieldTab === 'NEET_PG'
          ? ['All', 'MD', 'MS', 'Diploma', 'DNB', 'MDS']
          : ['All', ...MEDICAL_COURSES]
        ).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCourse(c)}
            className={`px-3 py-1.5 rounded-full border font-semibold text-xs transition-all ${
              course === c
                ? 'bg-black text-white border-black shadow-md'
                : 'bg-white border-black/10 hover:border-black/30'
            }`}
          >
            {c === 'All' ? `All ${fieldTab === 'ALL' ? 'Courses' : fieldTab.replace('_', ' ')}` : c}
          </button>
        ))}
      </div>
      {/* Search row — always full width */}
      <div className="mb-3">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-grey" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search college"
            className="w-full border-2 border-black rounded pl-10 pr-3 py-2.5 font-medium"
          />
        </label>
      </div>
      {/* Filter buttons row — scrollable on mobile */}
      <div className="overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-2 flex-nowrap sm:flex-wrap mb-6">
          {['All', 'Government', 'Private', 'Government Dental', 'Government AYUSH', 'Private AYUSH', 'Private Dental'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`px-4 py-2 rounded border-2 border-black font-semibold text-sm whitespace-nowrap ${
                kind === k ? 'btn-dark border-transparent' : 'bg-white force-black border border-black/15'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
      
      <AISeatMatrixAnalysis searchQuery={q} s={{ dark: false }} />

      {loading ? (
        <div className="h-64 bg-grey-bg-light animate-pulse rounded-xl" />
      ) : error ? (
        <p className="text-red-600 font-semibold">{error}</p>
      ) : (
        <div className="table-responsive zn-card">
          <table className="w-full text-sm min-w-[720px] md:min-w-[960px]">
            <thead className="bg-black text-white">
              <tr>
                <th className="text-left p-3 font-bold whitespace-nowrap">College</th>
                <th className="text-left p-3 font-bold whitespace-nowrap">Type</th>
                <th className="text-right p-3 font-bold whitespace-nowrap">Total</th>
                <th className="text-right p-3 font-bold whitespace-nowrap">All India</th>
                <th className="text-right p-3 font-bold whitespace-nowrap">GOI</th>
                <th className="text-right p-3 font-bold whitespace-nowrap">NRI</th>
                <th className="text-right p-3 font-bold whitespace-nowrap">Left seats</th>
                <th className="text-right p-3 font-bold whitespace-nowrap">PWD</th>
                <th className="text-right p-3 font-bold whitespace-nowrap">Sainik</th>
                <th className="text-right p-3 font-bold whitespace-nowrap">FF</th>
                <th className="text-right p-3 font-bold whitespace-nowrap">GS</th>
                <th className="text-right p-3 font-bold whitespace-nowrap">Open</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={i % 2 ? 'bg-grey-bg-light' : 'bg-white'}>
                  <td className="p-3 font-semibold"><Link to={`/colleges/${encodeURIComponent(r.college_name)}`} className="hover:underline decoration-orange-500 underline-offset-4">{r.college_name}</Link></td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border border-black/10 ${
                      r.college_kind === 'Private' ? 'bg-orange-bg' : 'bg-green-bg'
                    }`}>{r.college_kind}</span>
                  </td>
                  <td className="p-3 text-right font-black whitespace-nowrap">{r.total_seats}</td>
                  <td className="p-3 text-right whitespace-nowrap">{r.all_india || '—'}</td>
                  <td className="p-3 text-right whitespace-nowrap">{r.goi || '—'}</td>
                  <td className="p-3 text-right whitespace-nowrap">{r.nri_seats || '—'}</td>
                  <td className="p-3 text-right whitespace-nowrap">{r.remaining_seats || '—'}</td>
                  <td className="p-3 text-right whitespace-nowrap">{r.pwd || '—'}</td>
                  <td className="p-3 text-right whitespace-nowrap">{r.sainik || '—'}</td>
                  <td className="p-3 text-right whitespace-nowrap">{r.ff || '—'}</td>
                  <td className="p-3 text-right whitespace-nowrap">{r.gs || '—'}</td>
                  <td className="p-3 text-right font-bold whitespace-nowrap">{r.open_seats || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
