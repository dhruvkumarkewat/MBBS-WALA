import { useEffect, useState } from 'react';
import { MapPin, Briefcase } from 'lucide-react';

interface Job {
  id: number;
  title: string;
  location: string;
  type: string;
  description: string;
}

export default function Careers() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/careers')
      .then((r) => r.json())
      .then((d) => setJobs(Array.isArray(d) ? d : []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 sm:px-8 py-12 md:py-16 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-dark mb-3">Careers at MBBSWala</h1>
        <p className="text-text-grey font-medium text-lg">
          Help thousands of medical aspirants make better counselling decisions.
        </p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 bg-grey-bg-light animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {jobs.map((j) => (
            <a
              key={j.id}
              href={`mailto:info@mbbswala.in?subject=Application: ${encodeURIComponent(j.title)}`}
              className="zn-card p-5 block"
            >
              <h3 className="font-extrabold text-lg text-primary-dark mb-2">{j.title}</h3>
              <div className="flex flex-wrap gap-3 text-sm font-medium text-text-grey mb-2">
                <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {j.location}</span>
                <span className="inline-flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {j.type}</span>
              </div>
              <p className="text-sm font-medium">{j.description}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
