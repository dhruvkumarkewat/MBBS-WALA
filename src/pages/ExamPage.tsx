import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';

interface Pkg {
  id: number;
  name: string;
  slug: string;
  price: number;
  price_label: string;
  description: string;
  long_description: string;
  features: string[] | string;
  color: string;
}

export default function ExamPage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, '');
  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError('');
    fetch(`/api/packages?slug=${encodeURIComponent(slug)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Not found');
        setPkg(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const parseFeatures = (f: string[] | string | undefined): string[] => {
    if (!f) return [];
    if (Array.isArray(f)) return f;
    try {
      const p = JSON.parse(f);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="h-10 w-48 bg-grey-bg-light animate-pulse rounded mb-6" />
        <div className="h-64 bg-grey-bg-light animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">Package not found</h1>
        <Link to="/packages" className="zn-cta inline-flex">
          Back to packages
        </Link>
      </div>
    );
  }

  const feats = parseFeatures(pkg.features);

  return (
    <div className="px-4 sm:px-8 py-12 md:py-16 max-w-4xl mx-auto">
      <Link
        to="/packages"
        className="inline-flex items-center gap-2 font-semibold mb-8 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> All packages
      </Link>

      <div className="zn-card p-8 md:p-12">
        <p className="text-xs font-bold uppercase tracking-widest text-text-grey mb-2">
          Counselling Package
        </p>
        <h1 className="text-4xl md:text-5xl font-bold mb-3">{pkg.name}</h1>
        <p className="text-4xl font-black mb-6 text-primary">
          {pkg.price === 0 ? 'Free' : `₹${pkg.price_label || pkg.price}`}
        </p>
        <p className="text-lg text-text-grey font-medium mb-4">
          {pkg.description}
        </p>
        {pkg.long_description && (
          <p className="mb-8 leading-relaxed font-medium">{pkg.long_description}</p>
        )}

        <h2 className="text-xl font-extrabold mb-4">What&apos;s included</h2>
        <ul className="space-y-3 mb-10">
          {feats.map((f) => (
            <li key={f} className="flex items-start gap-3 font-medium">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-green-bg grid place-items-center shrink-0">
                <Check className="w-3 h-3" strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-3">
          <Link to="/login" className="zn-cta zn-cta-primary">
            Get Started
          </Link>
          <a href="tel:+918069036000" className="zn-cta">
            Talk to an expert
          </a>
        </div>
      </div>
    </div>
  );
}
