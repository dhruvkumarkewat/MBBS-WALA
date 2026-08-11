import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface AISeatMatrixAnalysisProps {
  searchQuery: string;
  s?: any;
}

export function AISeatMatrixAnalysis({ searchQuery, s = { dark: true } }: AISeatMatrixAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Only trigger if searchQuery looks like a specific college name (at least 3 chars)
  const shouldAnalyze = searchQuery && searchQuery.trim().length > 2;

  useEffect(() => {
    if (!shouldAnalyze) {
      setData(null);
      return;
    }

    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/ai-seat-matrix-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ college_name: searchQuery.trim() })
        });
        
        if (!res.ok) throw new Error('Failed to fetch AI analysis');
        
        const json = await res.json();
        if (json.college_name && json._raw_data_count > 0) {
          setData(json);
        } else {
          // If no data found in DB, show a friendly message instead of hiding
          setData({
            college_name: searchQuery.trim(),
            ai_verdict: "We couldn't find exact seat matrix data for this search term in our database.",
            seat_breakdown_summary: "Try using the exact college name or checking your spelling.",
            key_insights: ["No historical data available for this query."],
            recommendation: "Ensure you are using the correct college name as listed in the NMC/MCC directories."
          });
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Debounce the AI fetch to prevent spamming while typing
    const timeout = setTimeout(fetchAnalysis, 1500);
    return () => clearTimeout(timeout);
  }, [searchQuery, shouldAnalyze]);

  if (!shouldAnalyze) return null;
  if (!loading && !data && !error) return null;

  return (
    <div className={`mb-6 p-5 rounded-2xl border relative overflow-hidden ${s.dark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
      {/* Background glow */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <Sparkles className="w-5 h-5 text-orange-500" />
        <h3 className={`font-black text-sm uppercase tracking-wider ${s.dark ? 'text-white' : 'text-slate-900'}`}>
          Gemini AI Seat Matrix Analysis
        </h3>
      </div>

      <div className="relative z-10">
        {loading ? (
          <div className="flex items-center gap-3 text-orange-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-bold animate-pulse">Analyzing seat distribution data...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Could not analyze seat matrix: {error}</span>
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div>
              <h4 className={`text-lg font-black mb-1 ${s.dark ? 'text-orange-400' : 'text-orange-600'}`}>{data.college_name}</h4>
              <p className={`text-sm ${s.dark ? 'text-slate-300' : 'text-slate-700'}`}>{data.ai_verdict}</p>
            </div>
            
            <div className={`p-4 rounded-xl text-sm ${s.dark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200 shadow-sm'}`}>
              <p className="font-bold mb-2 text-orange-500">Seat Breakdown Summary:</p>
              <p className={s.dark ? 'text-slate-300' : 'text-slate-700'}>{data.seat_breakdown_summary}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl ${s.dark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500 mb-2">Key Insights</p>
                <ul className="list-disc pl-4 space-y-1">
                  {(data.key_insights || []).map((insight: string, i: number) => (
                    <li key={i} className={`text-xs ${s.dark ? 'text-slate-300' : 'text-slate-700'}`}>{insight}</li>
                  ))}
                </ul>
              </div>
              
              <div className={`p-4 rounded-xl ${s.dark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500 mb-2">Who should target?</p>
                <p className={`text-xs ${s.dark ? 'text-slate-300' : 'text-slate-700'}`}>{data.recommendation}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
