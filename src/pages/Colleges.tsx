import { useEffect, useMemo, useState } from 'react';
import { MapPin, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import SelectField from '../components/ui/SelectField';
import SearchInput from '../components/ui/SearchInput';
import { SkeletonCard } from '../components/ui/Skeleton';
import { staggerContainer, staggerItem } from '../lib/motion';
import { MEDICAL_COURSE_OPTIONS } from '../lib/courses';

interface College {
  id: number;
  name: string;
  city: string;
  state: string;
  country: string;
  college_type: string;
  course: string;
}

export default function Colleges() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [state, setState] = useState('All');
  const [type, setType] = useState('All');
  const [course, setCourse] = useState('All');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ country: 'INDIA' });
    if (course !== 'All') params.set('course', course);
    fetch(`/api/colleges?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
        setColleges(
          list.filter((c: College) => {
            const ctry = (c.country || '').toUpperCase();
            return !ctry || ctry === 'INDIA' || ctry === 'IN';
          })
        );
      })
      .catch(() => setError('Failed to load colleges'))
      .finally(() => setLoading(false));
  }, [course]);

  const states = useMemo(() => {
    const list = colleges.map((c) => c.state).filter(Boolean);
    return ['All', ...Array.from(new Set(list)).sort()];
  }, [colleges]);

  const filtered = colleges.filter((c) => {
    if (state !== 'All' && c.state !== state) return false;
    if (type !== 'All' && c.college_type !== type) return false;
    if (course !== 'All' && (c.course || 'MBBS') !== course) return false;
    if (
      q &&
      !c.name.toLowerCase().includes(q.toLowerCase()) &&
      !(c.city || '').toLowerCase().includes(q.toLowerCase()) &&
      !(c.course || '').toLowerCase().includes(q.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="px-4 sm:px-8 py-12 md:py-16 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#ff5a1f] mb-2">
          College Data
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-black mb-3">
          Medical Colleges Directory
        </h1>
        <p className="text-[#5b6472] font-medium max-w-2xl">
          Explore Indian medical colleges for MBBS, BDS, BAMS, BHMS, BUMS, BSMS and BNYS — filter by course, state and type.
        </p>
      </div>

      <div className="zn-card p-4 md:p-5 mb-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-visible relative z-20">
        <div className="sm:col-span-2 lg:col-span-1">
          <span className="block text-xs font-bold text-[#5b6472] uppercase tracking-wide mb-1.5">
            Search
          </span>
          <SearchInput value={q} onChange={setQ} loading={loading} placeholder="College, city or course" />
        </div>
        <SelectField
          label="Course"
          value={course}
          onChange={setCourse}
          options={MEDICAL_COURSE_OPTIONS}
        />
        <SelectField
          label="State"
          value={state}
          onChange={setState}
          options={states.map((s) => ({
            value: s,
            label: s === 'All' ? 'All states' : s,
          }))}
        />
        <SelectField
          label="Type"
          value={type}
          onChange={setType}
          options={[
            { value: 'All', label: 'All types' },
            { value: 'Government', label: 'Government' },
            { value: 'Private', label: 'Private' },
          ]}
        />
      </div>

      <p className="text-sm font-semibold text-[#5b6472] mb-4">
        {filtered.length} colleges found
      </p>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-600 font-semibold">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="zn-card p-10 text-center">
          <p className="font-bold text-black mb-2">No colleges match these filters</p>
          <p className="text-sm text-[#5b6472] mb-4">Try clearing state, type or search text.</p>
          <button
            type="button"
            onClick={() => {
              setQ('');
              setState('All');
              setType('All');
              setCourse('All');
            }}
            className="btn-dark px-6 py-2.5"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          key={`${state}-${type}-${course}-${q}`}
        >
          {filtered.map((c) => (
            <motion.div
              key={c.id}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className="zn-card p-5 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-extrabold leading-snug text-black">{c.name}</h2>
                <span
                  className={`shrink-0 text-xs font-bold px-2 py-1 rounded-lg border border-black/10 ${
                    c.college_type === 'Government' ? 'bg-[#bbf7d0]' : 'bg-[#fed7aa]'
                  }`}
                >
                  {c.college_type}
                </span>
              </div>
              <p className="text-sm font-medium text-[#5b6472] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {[c.city, c.state].filter(Boolean).join(', ') || '—'}
              </p>
              <p className="text-xs font-bold uppercase tracking-wide text-primary flex items-center gap-1 mt-auto pt-2">
                <Building2 className="w-3.5 h-3.5" /> {c.course || 'MBBS'} · India
              </p>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
