import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import PackagesGrid from '../components/PackagesGrid';

interface Pkg {
  id: number;
  name: string;
  slug: string;
  price: number;
  price_label: string;
  description: string;
  features: string[] | string;
}

export default function Packages() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('all');

  useEffect(() => {
    fetch('/api/packages')
      .then((r) => r.json())
      .then((d) => setPackages(Array.isArray(d) ? d : []))
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, []);

  const parseFeatures = (f: string[] | string): string[] => {
    if (Array.isArray(f)) return f;
    try {
      const p = JSON.parse(f);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  };

  const filtered =
    tab === 'all' ? packages : packages.filter((p) => p.slug === tab);

  return (
    <div className="px-4 sm:px-8 py-12 md:py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <p className="text-xs font-bold uppercase tracking-widest text-text-grey mb-2">
          Packages
        </p>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Big On Data.{' '}
          <span className="zn-highlight">Light On Your Pocket.</span>
        </h1>
        <p className="text-text-grey font-medium">
          Choose a counselling package that fits your exam and budget.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-10">
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded border-2 border-black font-semibold ${
            tab === 'all' ? 'btn-dark border-transparent' : 'bg-white force-black border border-black/15'
          }`}
        >
          All
        </button>
        {packages.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => setTab(p.slug)}
            className={`px-4 py-2 rounded border-2 border-black font-semibold ${
              tab === p.slug ? 'btn-dark border-transparent' : 'bg-white force-black border border-black/15'
            }`}
          >
            {p.name.replace(' Counselling', '')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 bg-grey-bg-light animate-pulse rounded-xl" />
          ))}
        </div>
      ) : tab === 'all' ? (
        <div className="max-w-5xl mx-auto mb-16">
          <PackagesGrid />
        </div>
      ) : null}

      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {(tab === 'all' ? packages : filtered).map((pkg) => {
          const feats = parseFeatures(pkg.features);
          return (
            <div key={pkg.id} className="zn-card p-7 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-extrabold">{pkg.name}</h2>
                  <p className="text-text-grey text-sm font-medium mt-1">
                    {pkg.description}
                  </p>
                </div>
                <p className="text-3xl font-black shrink-0">
                  {pkg.price === 0 ? 'Free' : `₹${pkg.price_label || pkg.price}`}
                </p>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {feats.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm font-medium">
                    <span className="mt-0.5 w-[18px] h-[18px] rounded-full bg-green-bg grid place-items-center shrink-0">
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>
              <Link to="/login" className="zn-cta w-full justify-center">
                Get Started
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
