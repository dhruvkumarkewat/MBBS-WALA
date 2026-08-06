import React, { useEffect, useState } from 'react';
import { X, MapPin, Building, Globe, Bed, GraduationCap, Banknote, ShieldCheck } from 'lucide-react';

interface CollegeInfoModalProps {
  collegeName: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CollegeInfoModal({ collegeName, isOpen, onClose }: CollegeInfoModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && collegeName) {
      fetchCollegeInfo();
    } else {
      setData(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, collegeName]);

  const fetchCollegeInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('/api/ai-college-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ college_name: collegeName })
      });
      
      if (!res.ok) throw new Error('Failed to fetch college information');
      
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-3xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 bg-slate-800/80">
          <h2 className="text-lg sm:text-xl font-black pr-8 truncate text-white">
            {collegeName}
          </h2>
          <button 
            onClick={onClose}
            className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 rounded-full bg-white/5 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-slate-300 hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-orange-500"></div>
              <p className="text-orange-400 font-medium text-sm animate-pulse">
                Gemini AI is researching this college...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <button 
                onClick={fetchCollegeInfo}
                className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-sm font-bold transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : data ? (
            <div className="space-y-6">
              
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-slate-800/80 border border-orange-500/20 rounded-xl p-3 sm:p-4 hover:border-orange-500/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-orange-500/80">Location</span>
                  </div>
                  <p className="font-bold text-sm text-slate-200">{data.location || 'N/A'}</p>
                </div>
                
                <div className="bg-slate-800/80 border border-emerald-500/20 rounded-xl p-3 sm:p-4 hover:border-emerald-500/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-500/80">Type</span>
                  </div>
                  <p className="font-bold text-sm text-slate-200">{data.type || 'N/A'}</p>
                </div>

                <div className="bg-slate-800/80 border border-blue-500/20 rounded-xl p-3 sm:p-4 hover:border-blue-500/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-500/80">Established</span>
                  </div>
                  <p className="font-bold text-sm text-slate-200">{data.established || 'N/A'}</p>
                </div>

                <div className="bg-slate-800/80 border border-rose-500/20 rounded-xl p-3 sm:p-4 hover:border-rose-500/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Bed className="w-4 h-4 text-rose-500" />
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-500/80">Hospital Beds</span>
                  </div>
                  <p className="font-bold text-sm text-slate-200">{data.hospital_beds || 'N/A'}</p>
                </div>

                <div className="bg-slate-800/80 border border-purple-500/20 rounded-xl p-3 sm:p-4 hover:border-purple-500/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4 text-purple-500" />
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-purple-500/80">MBBS Seats</span>
                  </div>
                  <p className="font-bold text-sm text-slate-200">{data.total_mbbs_seats || 'N/A'}</p>
                </div>

                <div className="bg-slate-800/80 border border-amber-500/20 rounded-xl p-3 sm:p-4 hover:border-amber-500/40 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-500/80">Est. Fees</span>
                  </div>
                  <p className="font-bold text-sm text-slate-200">{data.estimated_fees || 'N/A'}</p>
                </div>
              </div>

              {/* Website Button */}
              {data.official_website && (
                <a 
                  href={data.official_website.startsWith('http') ? data.official_website : `https://${data.official_website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full p-3 sm:p-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-500/25 border border-orange-400/50"
                >
                  <Globe className="w-5 h-5" />
                  Visit Official Website
                </a>
              )}

              {/* About Section */}
              <div className="space-y-3 bg-slate-800/50 p-4 sm:p-5 rounded-xl border border-white/5">
                <h3 className="text-sm font-black uppercase tracking-wider text-orange-400 border-b border-white/10 pb-2">About the College</h3>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {data.about || 'Information not available.'}
                </p>
              </div>

              {/* University & Ranking */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-slate-800/80 p-4 rounded-xl border border-blue-500/20">
                  <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">Affiliated University</h4>
                  <p className="text-sm font-semibold text-slate-200">{data.affiliated_university || 'N/A'}</p>
                </div>
                <div className="bg-slate-800/80 p-4 rounded-xl border border-pink-500/20">
                  <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-pink-400 mb-2">Ranking & Reputation</h4>
                  <p className="text-sm font-semibold text-slate-200">{data.ranking_and_reputation || 'N/A'}</p>
                </div>
              </div>

              {/* Facilities */}
              {data.facilities && data.facilities.length > 0 && (
                <div className="space-y-3 bg-slate-800/50 p-4 sm:p-5 rounded-xl border border-white/5">
                  <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 border-b border-white/10 pb-2">Facilities</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.facilities.map((fac: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full text-xs font-bold shadow-sm shadow-emerald-500/10">
                        {fac}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
