import { Link } from 'react-router-dom';
import { Crown, Sparkles, AlertTriangle, FileText, IndianRupee, MapPin, Search } from 'lucide-react';
import React, { useState } from 'react';
import { CollegeInfoModal } from '../../components/ui/CollegeInfoModal';

// Interfaces mapping to PredictorResponse
interface PredictorResultsProps {
  aiResponse: any;
  s: any;
  isPremium: boolean;
  domicileState: string;
}

const getQuotaStyle = (quota: string) => {
  if (!quota) return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  const q = quota.toLowerCase();
  if (q.includes('management') || q.includes('deemed') || q.includes('nri') || q.includes('private')) {
    return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
  }
  if (q.includes('aiq') || q.includes('all india')) {
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  }
  if (q.includes('state')) {
    return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  }
  return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
};

const CollegeGroupList = ({ colleges, s, isPremium, maxFreeCount, bgClass, borderClass, isReach, onCollegeClick, candidateRank }: any) => {
  const safeColleges = Array.isArray(colleges) ? colleges : (colleges ? [colleges] : []);
  if (safeColleges.length === 0) return null;
  const displayColleges = [...safeColleges].sort((a, b) => {
    const probA = parseInt(String(a.probability || '0').replace(/\D/g, '')) || 0;
    const probB = parseInt(String(b.probability || '0').replace(/\D/g, '')) || 0;
    if (probB !== probA) return probB - probA;
    // Sort by rank ascending (best colleges first) if probability is equal
    const rankA = parseInt(String(a.closing_rank || '0').replace(/\D/g, '')) || 0;
    const rankB = parseInt(String(b.closing_rank || '0').replace(/\D/g, '')) || 0;
    return rankA - rankB;
  }).slice(0, isPremium ? 1000 : maxFreeCount);

  // First group by course, then by quota
  const groupedByCourse = displayColleges.reduce((acc: any, c: any) => {
    const course = c.course || 'MBBS';
    const q = c.quota || 'Other';
    if (!acc[course]) acc[course] = {};
    if (!acc[course][q]) acc[course][q] = [];
    acc[course][q].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groupedByCourse)
        .sort(([a], [b]) => (a === 'MBBS' ? -1 : b === 'MBBS' ? 1 : a.localeCompare(b)))
        .map(([course, quotas]: [string, any]) => {
        const sortedQuotas = Object.keys(quotas).sort((a, b) => {
          if (a === 'AIQ') return -1;
          if (b === 'AIQ') return 1;
          if (a === 'State') return -1;
          if (b === 'State') return 1;
          return a.localeCompare(b);
        });

        return (
          <div key={course} className="space-y-4">
            <h3 className={`text-sm font-black uppercase tracking-wider text-primary border-b-2 border-primary/20 pb-2`}>
              Recommended {course} Colleges
            </h3>
            {sortedQuotas.map((quota) => (
              <div key={quota} className="space-y-3">
                <h4 className={`text-[11px] font-bold uppercase tracking-wider ${s.muted} border-b ${s.dark ? 'border-white/10' : 'border-slate-200'} pb-1.5`}>
                  {quota} Quota
                </h4>
                {quotas[quota].map((c: any, i: number) => (
                  <div key={i} className={`rounded-xl border ${bgClass} ${borderClass} p-4`}>
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <button 
                        onClick={() => onCollegeClick(c.name)} 
                        className="font-bold text-sm hover:underline decoration-orange-500 underline-offset-4 text-left transition-all hover:text-orange-400"
                      >
                        {c.name}
                      </button>
                      {c.nmc_recognition && (
                        <span className="shrink-0 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          {c.nmc_recognition}
                        </span>
                      )}
                    </div>
                    
                    {!isReach ? (
                      <>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${borderClass} bg-white/5 flex items-center gap-1`}>
                            {c.confidence === 'High' ? 'Very Safe' : (c.confidence === 'Moderate' ? 'Moderate' : 'Reach')} <span className="opacity-50">|</span> {c.probability}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {c.expected_round}
                          </span>
                          {c.category && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20">
                              {c.category}
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 text-[11px] gap-4 mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
                          <div className="col-span-2 flex justify-between items-center bg-black/20 p-2 rounded">
                            <div className="text-center">
                              <div className={s.muted}>Your Rank</div>
                              <div className="font-bold text-white">{candidateRank > 0 ? candidateRank : 'N/A'}</div>
                            </div>
                            <div className="text-center">
                              <div className={s.muted}>Expected Closing</div>
                              <div className="font-bold text-orange-400">{c.predicted_closing_rank || c.closing_rank}</div>
                            </div>
                            <div className="text-center">
                              <div className={s.muted}>Safety Margin</div>
                              <div className={`font-bold ${c.margin && c.margin.includes('+') ? 'text-emerald-400' : 'text-rose-400'}`}>{c.margin || 'N/A'}</div>
                            </div>
                          </div>
                          
                          <div className="col-span-2 md:col-span-1">
                            <div className="flex justify-between">
                              <span className={s.muted}>Tuition Fee: </span>
                              {c.is_fee_verified ? <span className="text-emerald-400">✔ Verified</span> : <span className="text-yellow-500">⚠ Not Verified</span>}
                            </div>
                            <div className="font-bold">{c.tuition_fee || c.fees || 'See official prospectus'}</div>
                          </div>
                          
                          <div className="col-span-2 md:col-span-1">
                            <div className="flex justify-between">
                              <span className={s.muted}>Seats: </span>
                              {c.is_seats_verified ? <span className="text-emerald-400">✔ Verified</span> : <span className="text-yellow-500">⚠ Not Verified</span>}
                            </div>
                            <div className="font-bold">{c.seats || 'Data unavailable'}</div>
                          </div>
                          
                          <div className="col-span-2 md:col-span-1">
                            <div className="flex justify-between">
                              <span className={s.muted}>Hospital Beds: </span>
                              {c.is_hospital_beds_verified ? <span className="text-emerald-400">✔ Verified</span> : <span className="text-yellow-500">⚠ Not Verified</span>}
                            </div>
                            <div className="font-bold">{c.hospital_beds || 'Data unavailable'}</div>
                          </div>
                          
                          <div className="col-span-2 md:col-span-1">
                            <div className="flex justify-between">
                              <span className={s.muted}>Stipend: </span>
                              {c.is_internship_stipend_verified ? <span className="text-emerald-400">✔ Verified</span> : <span className="text-yellow-500">⚠ Not Verified</span>}
                            </div>
                            <div className="font-bold">{c.internship_stipend || 'Data unavailable'}</div>
                          </div>
                          
                          <div className="col-span-2">
                            <div className="flex justify-between">
                              <span className={s.muted}>Bond: </span>
                              {c.is_bond_verified ? <span className="text-emerald-400">✔ Verified</span> : <span className="text-yellow-500">⚠ Not Verified</span>}
                            </div>
                            <div className="font-bold text-rose-400">{c.bond || 'Data unavailable'}</div>
                          </div>
                        </div>

                        {Array.isArray(c.historical_trend) && c.historical_trend.length > 0 && (
                          <div className="mt-4">
                            <h5 className={`text-[10px] uppercase font-bold mb-2 ${s.muted}`}>Historical Trends</h5>
                            
                            <div className="relative pt-6 mb-4 flex items-end gap-3 h-28 border-b border-white/10 pb-6 bg-black/10 rounded-lg px-4 border border-white/5">
                              {candidateRank > 0 && (
                                <div 
                                  className="absolute left-0 right-0 border-t-2 border-dashed border-orange-500/50 z-0 flex items-center pointer-events-none"
                                  style={{
                                    bottom: `calc(1.5rem + ${Math.min(100, Math.max(0, (candidateRank / Math.max(candidateRank, ...c.historical_trend.map((x:any) => parseInt(String(x.closing_rank).replace(/\\D/g, '')) || 0))) * 100))}% * 0.7)` // 0.7 scales it so it fits in the container better
                                  }}
                                >
                                  <span className="absolute left-2 -top-4 text-[9px] font-bold text-orange-500 bg-black/50 px-1 rounded">Your Rank: {candidateRank}</span>
                                </div>
                              )}
                              
                              {c.historical_trend.map((t: any, idx: number) => {
                                const maxVal = Math.max(
                                  candidateRank, 
                                  ...c.historical_trend.map((x:any) => parseInt(String(x.closing_rank).replace(/\\D/g, '')) || 0)
                                );
                                const val = parseInt(String(t.closing_rank).replace(/\\D/g, '')) || 0;
                                const pct = maxVal > 0 ? (val / maxVal) * 100 : 50;
                                
                                return (
                                  <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative h-full z-10">
                                    <div className="absolute -top-5 text-[10px] font-bold text-white opacity-70 group-hover:opacity-100 transition-opacity">
                                      {t.closing_rank}
                                    </div>
                                    <div 
                                      className="w-full max-w-[40px] bg-primary/40 rounded-t-md hover:bg-primary transition-all duration-300 relative border-x border-t border-primary/50 shadow-[0_0_10px_rgba(var(--color-primary),0.2)]" 
                                      style={{ height: `${Math.max(5, pct * 0.7)}%` }}
                                    >
                                    </div>
                                    <div className={`absolute -bottom-5 text-[9px] font-bold uppercase ${s.muted}`}>{t.year}</div>
                                  </div>
                                )
                              })}
                            </div>
                            
                            <div className="overflow-x-auto rounded border border-white/10 hidden md:block">
                              <table className="w-full text-left text-[10px] border-collapse bg-black/10">
                                <thead>
                                  <tr className={`border-b ${s.dark ? 'border-white/10' : 'border-black/10'}`}>
                                    <th className="px-3 py-1.5 font-bold">Year</th>
                                    <th className="px-3 py-1.5 font-bold text-right">Opening</th>
                                    <th className="px-3 py-1.5 font-bold text-right">Closing</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {c.historical_trend.map((t: any, idx: number) => (
                                    <tr key={idx} className={`border-b last:border-0 ${s.dark ? 'border-white/5' : 'border-black/5'}`}>
                                      <td className="px-3 py-1">{t.year}</td>
                                      <td className="px-3 py-1 text-right opacity-80">{t.opening_rank || '-'}</td>
                                      <td className="px-3 py-1 text-right font-bold text-primary">{t.closing_rank}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        
                        {Array.isArray(c.data_source) && c.data_source.length > 0 && (
                          <div className="mt-4">
                            <h5 className={`text-[10px] uppercase font-bold mb-2 ${s.muted}`}>Data Source</h5>
                            <div className="flex flex-wrap gap-1.5 text-[9px]">
                              {c.data_source.map((ds: string, idx: number) => (
                                <span key={idx} className={`px-2 py-0.5 rounded bg-white/5 ${ds === 'Verified' ? 'text-emerald-400 font-bold border border-emerald-500/20 bg-emerald-500/10' : 'text-slate-400'}`}>
                                  {ds === 'Verified' ? '✓ Verified' : ds}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className={`mt-4 p-3 rounded bg-blue-500/5 border border-blue-500/10`}>
                          <p className={`text-[11px] leading-relaxed italic ${s.muted}`}>💡 {c.reason}</p>
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-2 text-xs gap-2 mt-2">
                        <div>
                          <span className={s.muted}>Expected Closing: </span>
                          <span className="font-bold text-orange-500">{c.predicted_closing_rank || c.closing_rank}</span>
                        </div>
                        <div>
                          <span className={s.muted}>Round: </span>
                          <span className="font-bold">{c.expected_round}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export function PredictorResults({ aiResponse, s, isPremium, domicileState }: PredictorResultsProps) {
  const [selectedCollegeInfo, setSelectedCollegeInfo] = useState<string | null>(null);

  if (!aiResponse) return null;

  // Map legacy/fallback colleges format to college_predictions if missing
  const preds = aiResponse.college_predictions || (() => {
    if (!aiResponse.colleges || !Array.isArray(aiResponse.colleges)) return null;
    const mapCollege = (c: any) => ({
      name: c.college_name,
      probability: c.chance_tier,
      expected_round: c.closing_rank_reference?.[0]?.round || 'Round 1',
      fees: c.fee?.formatted || 'N/A',
      quota: c.quota,
      closing_rank: c.closing_rank_reference?.[0]?.rank || c.closing_rank || 'N/A',
      reason: 'Based on historical cutoffs',
    });
    return {
      safe: aiResponse.colleges.filter((c: any) => c.chance_tier === 'High').map(mapCollege),
      moderate: aiResponse.colleges.filter((c: any) => c.chance_tier === 'Moderate').map(mapCollege),
      reach: aiResponse.colleges.filter((c: any) => c.chance_tier === 'Reach').map(mapCollege),
    };
  })();

  return (
    <div className="space-y-6">
      
      {/* ── Summary Strip ── */}
      <div className={`rounded-2xl border p-4 ${s.card}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="font-bold text-sm">
            AI Predictor Analysis Complete
            {aiResponse.meta?.authority && (
              <span className={`ml-2 text-xs font-semibold ${s.muted}`}>
                via {aiResponse.meta.authority}
              </span>
            )}
          </p>
          {aiResponse._provider_used && aiResponse._provider_used !== 'legacy-fallback' && (
            <p className={`text-[10px] font-medium mt-0.5 ${s.muted}`}>
              AI: {aiResponse._provider_used} · {aiResponse._response_time_ms || 0}ms
            </p>
          )}
        </div>
      </div>

      {/* ── Admission Summary ── */}
      {aiResponse.admission_summary && (
        <div className={`rounded-2xl border p-5 ${s.card}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎯</span>
            <h3 className="font-black text-sm uppercase tracking-wider">Admission Summary</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
             <div className="bg-primary/10 rounded-xl p-3 border border-primary/20">
               <p className="text-[10px] uppercase font-bold text-primary mb-1">Status</p>
               <p className="text-sm font-black text-primary">{aiResponse.admission_summary.status}</p>
             </div>
             <div className={`${s.dark ? 'bg-white/5' : 'bg-slate-50'} rounded-xl p-3 border border-slate-500/20`}>
               <p className={`text-[10px] uppercase font-bold ${s.muted} mb-1`}>Expected Probability</p>
               <p className="text-sm font-black text-emerald-500">{aiResponse.admission_summary.expected_probability}</p>
             </div>
             <div className={`${s.dark ? 'bg-white/5' : 'bg-slate-50'} rounded-xl p-3 border border-slate-500/20`}>
               <p className={`text-[10px] uppercase font-bold ${s.muted} mb-1`}>Data Reliability</p>
               <p className="text-sm font-black text-blue-500">{aiResponse.admission_summary.data_reliability || 'High'}</p>
             </div>
           </div>
          
          <p className={`text-sm leading-relaxed ${s.muted}`}>
            {aiResponse.admission_summary.explanation}
          </p>
        </div>
      )}

      {/* ── Safe Colleges ── */}
      {preds?.safe && preds.safe.length > 0 && (
        <div className={`rounded-2xl border p-5 ${s.card} border-l-4 border-l-emerald-500/60`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">✅</span>
            <h3 className="font-black text-sm uppercase tracking-wider">Safe Colleges (High Chance)</h3>
          </div>
          <CollegeGroupList 
            colleges={preds?.safe || []} 
            s={s} isPremium={isPremium} maxFreeCount={3}
            bgClass={s.dark ? 'bg-emerald-900/10' : 'bg-emerald-50'} 
            borderClass="border-emerald-500/30" 
            isReach={false}
            onCollegeClick={setSelectedCollegeInfo}
            candidateRank={aiResponse.query?.score_or_rank?.value || 0}
          />
          
          {!isPremium && (preds?.safe?.length || 0) > 3 && (
             <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5 text-center">
               <Crown className="w-5 h-5 text-primary mx-auto mb-2" />
               <p className="text-xs font-bold mb-2">Upgrade to Premium to view {(preds?.safe?.length || 0) - 3} more Safe colleges.</p>
               <Link to="/dashboard/subscription" className="text-[10px] bg-primary text-white px-3 py-1.5 rounded-full font-bold inline-block">Upgrade Now</Link>
             </div>
          )}
        </div>
      )}

      {/* ── Moderate Colleges ── */}
      {preds?.moderate && preds.moderate.length > 0 && (
        <div className={`rounded-2xl border p-5 ${s.card} border-l-4 border-l-amber-500/60`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🟡</span>
            <h3 className="font-black text-sm uppercase tracking-wider">Moderate Colleges</h3>
          </div>
          <CollegeGroupList 
            colleges={preds?.moderate || []} 
            s={s} isPremium={isPremium} maxFreeCount={3}
            bgClass={s.dark ? 'bg-amber-900/10' : 'bg-amber-50'} 
            borderClass="border-amber-500/30" 
            isReach={false}
            onCollegeClick={setSelectedCollegeInfo}
            candidateRank={aiResponse.query?.score_or_rank?.value || 0}
          />
          
          {!isPremium && (preds?.moderate?.length || 0) > 3 && (
             <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5 text-center">
               <Crown className="w-5 h-5 text-primary mx-auto mb-2" />
               <p className="text-xs font-bold mb-2">Upgrade to Premium to view {(preds?.moderate?.length || 0) - 3} more Moderate colleges.</p>
               <Link to="/dashboard/subscription" className="text-[10px] bg-primary text-white px-3 py-1.5 rounded-full font-bold inline-block">Upgrade Now</Link>
             </div>
          )}
        </div>
      )}

      {/* ── Reach Colleges ── */}
      {preds?.reach && preds.reach.length > 0 && (
        <div className={`rounded-2xl border p-5 ${s.card} border-l-4 border-l-orange-500/60`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🔴</span>
            <h3 className="font-black text-sm uppercase tracking-wider">Reach Colleges</h3>
          </div>
          <CollegeGroupList 
            colleges={preds?.reach || []} 
            s={s} isPremium={isPremium} maxFreeCount={3}
            bgClass={s.dark ? 'bg-orange-900/10' : 'bg-orange-50'} 
            borderClass="border-orange-500/30" 
            isReach={true}
            onCollegeClick={setSelectedCollegeInfo}
            candidateRank={aiResponse.query?.score_or_rank?.value || 0}
          />
          
          {!isPremium && (preds?.reach?.length || 0) > 3 && (
             <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5 text-center">
               <Crown className="w-5 h-5 text-primary mx-auto mb-2" />
               <p className="text-xs font-bold mb-2">Upgrade to Premium to view {(preds?.reach?.length || 0) - 3} more Reach colleges.</p>
               <Link to="/dashboard/subscription" className="text-[10px] bg-primary text-white px-3 py-1.5 rounded-full font-bold inline-block">Upgrade Now</Link>
             </div>
          )}
        </div>
      )}

      {/* ── Unlikely MBBS Guidance ── */}
      {aiResponse.unlikely_mbbs_guidance?.active && (
        <div className={`rounded-2xl border p-5 ${s.card}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">❌</span>
            <h3 className="font-black text-sm uppercase tracking-wider text-red-500">MBBS Admission Guidance</h3>
          </div>
          {isPremium ? (
            <>
              <p className="text-sm font-semibold mb-4 leading-relaxed">{aiResponse.unlikely_mbbs_guidance.message}</p>
              
              {aiResponse.unlikely_mbbs_guidance.private_options?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-primary">Suggested Private Options</h4>
                  {(aiResponse.unlikely_mbbs_guidance?.private_options || []).map((opt: any, i: number) => (
                    <div key={i} className={`rounded-xl border p-3 ${s.dark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} text-sm flex justify-between items-center`}>
                      <div>
                        <p className="font-bold">{opt.name}</p>
                        <p className={`text-[10px] mt-0.5 ${s.muted}`}>{opt.state} · {opt.rounds}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-500">{opt.probability}</p>
                        <p className={`text-[10px] mt-0.5 ${s.muted}`}>{opt.fees}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-center">
               <Crown className="w-5 h-5 text-primary mx-auto mb-2" />
               <p className="text-xs font-bold mb-2">Upgrade to Premium to view detailed admission guidance and private options.</p>
               <Link to="/dashboard/subscription" className="text-[10px] bg-primary text-white px-3 py-1.5 rounded-full font-bold inline-block">Upgrade Now</Link>
             </div>
          )}
        </div>
      )}
      
      {/* ── Management Quota ── */}
      {aiResponse.management_quota_opportunities && aiResponse.management_quota_opportunities.length > 0 && (
        <div className={`rounded-2xl border p-5 ${s.card}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🏛️</span>
            <h3 className="font-black text-sm uppercase tracking-wider">Management Quota Opportunities</h3>
          </div>
          {isPremium ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b ${s.dark ? 'border-white/10' : 'border-slate-200'}`}>
                    <th className="pb-2 font-bold">College</th>
                    <th className="pb-2 font-bold">Rank Req.</th>
                    <th className="pb-2 font-bold">Tuition Fee</th>
                    <th className="pb-2 font-bold">Total Cost</th>
                    <th className="pb-2 font-bold">Chances</th>
                  </tr>
                </thead>
                <tbody>
                  {(aiResponse.management_quota_opportunities || []).map((mq: any, i: number) => (
                    <tr key={i} className={`border-b ${s.dark ? 'border-white/5' : 'border-slate-100'}`}>
                      <td className="py-2 font-semibold pr-4">
                        <button 
                          onClick={() => setSelectedCollegeInfo(mq.college)} 
                          className="hover:underline decoration-orange-500 underline-offset-4 text-left transition-all hover:text-orange-400"
                        >
                          {mq.college}
                        </button>
                      </td>
                      <td className="py-2 pr-4">{mq.expected_rank}</td>
                      <td className="py-2 pr-4">{mq.approx_fees}</td>
                      <td className="py-2 pr-4 font-bold text-amber-500">{mq.total_cost}</td>
                      <td className="py-2">
                        <span className="px-2 py-1 rounded bg-primary/10 text-primary font-bold">{mq.chances}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-center">
               <Crown className="w-5 h-5 text-primary mx-auto mb-2" />
               <p className="text-xs font-bold mb-2">Upgrade to Premium to view Management Quota opportunities and costs.</p>
               <Link to="/dashboard/subscription" className="text-[10px] bg-primary text-white px-3 py-1.5 rounded-full font-bold inline-block">Upgrade Now</Link>
             </div>
          )}
        </div>
      )}

      {/* ── Alternative Courses ── */}
      {aiResponse.alternative_courses && aiResponse.alternative_courses.length > 0 && (
        <div className={`rounded-2xl border p-5 ${s.card}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🦷</span>
            <h3 className="font-black text-sm uppercase tracking-wider">Alternative Courses</h3>
          </div>
          {isPremium ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(aiResponse.alternative_courses || []).map((alt: any, i: number) => (
                <div key={i} className={`p-4 rounded-xl border ${s.dark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black text-lg text-primary">{alt.course}</h4>
                    <span className="text-[10px] font-bold px-2 py-1 bg-primary/10 text-primary rounded-full">{alt.admission_chances} Chance</span>
                  </div>
                  <p className="text-xs mb-1"><span className="font-semibold">Scope:</span> {alt.career_scope}</p>
                  <p className="text-xs mb-1"><span className="font-semibold">Avg Salary:</span> {alt.average_salary}</p>
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase mb-1">Top Colleges</p>
                    <ul className="text-xs list-disc pl-4 space-y-1">
                      {(Array.isArray(alt.top_colleges) ? alt.top_colleges : [alt.top_colleges].filter(Boolean)).map((tc: string, j: number) => <li key={j}>{tc}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-primary/20 bg-primary/5 text-center">
               <Crown className="w-6 h-6 text-primary mx-auto mb-3" />
               <p className="text-sm font-bold mb-2">Premium Feature</p>
               <p className="text-xs opacity-70 mb-4">Upgrade to view detailed Alternative Courses (BDS, BAMS, BHMS) and career scope.</p>
               <Link to="/dashboard/subscription" className="text-xs bg-primary text-white px-5 py-2.5 rounded-full font-bold inline-block hover:scale-105 transition">Upgrade Now</Link>
             </div>
          )}
        </div>
      )}

      {/* ── Scholarships ── */}
      {aiResponse.scholarships && Object.values(aiResponse.scholarships).some((arr: any) => Array.isArray(arr) && arr.length > 0) && (
        <div className={`rounded-2xl border p-5 ${s.card}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🎓</span>
            <h3 className="font-black text-sm uppercase tracking-wider">Eligible Scholarships</h3>
          </div>
          {isPremium ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(aiResponse.scholarships).map(([type, list]: [string, any]) => {
                if (!Array.isArray(list) || list.length === 0 || list[0] === '...') return null;
                return (
                  <div key={type} className={`rounded-xl p-3 border ${s.dark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2 text-primary">{type.replace('_', ' ')}</h4>
                    <ul className="space-y-1">
                      {list.map((item: string, i: number) => (
                        <li key={i} className={`text-xs ${s.muted}`}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-primary/20 bg-primary/5 text-center">
               <Crown className="w-6 h-6 text-primary mx-auto mb-3" />
               <p className="text-sm font-bold mb-2">Premium Feature</p>
               <p className="text-xs opacity-70 mb-4">Upgrade to view personalized scholarship opportunities you may be eligible for.</p>
               <Link to="/dashboard/subscription" className="text-xs bg-primary text-white px-5 py-2.5 rounded-full font-bold inline-block hover:scale-105 transition">Upgrade Now</Link>
             </div>
          )}
        </div>
      )}

      {/* ── AI Recommendation ── */}
      {aiResponse.ai_recommendation && (
        <div className={`rounded-2xl border p-5 ${s.card} border-l-4 border-l-primary/60`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <h3 className="font-black text-sm uppercase tracking-wider">AI Recommendation</h3>
          </div>
          {isPremium ? (
            <>
              <div className="text-sm leading-relaxed mb-4">
                {typeof aiResponse.ai_recommendation === 'string' 
                  ? aiResponse.ai_recommendation 
                  : (aiResponse.ai_recommendation?.tip || JSON.stringify(aiResponse.ai_recommendation))}
              </div>
              
              {aiResponse.counselling_strategy && (
                <div className="mt-4 pt-4 border-t border-primary/20">
                  <h4 className="text-xs font-bold uppercase tracking-wider mb-3">Suggested Counselling Strategy</h4>
                  <div className="space-y-2">
                    {Object.entries(aiResponse.counselling_strategy || {}).map(([round, strategy]) => {
                      if (!strategy || typeof strategy !== 'string') return null;
                      return (
                        <div key={round} className="flex gap-3 text-sm">
                          <div className="w-24 shrink-0 font-bold capitalize text-primary">{round.replace('_', ' ')}</div>
                          <div className={s.muted}>{strategy}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-6 rounded-xl border border-primary/20 bg-primary/5 text-center">
               <Crown className="w-6 h-6 text-primary mx-auto mb-3" />
               <p className="text-sm font-bold mb-2">Premium Feature</p>
               <p className="text-xs opacity-70 mb-4">Upgrade to unlock personalized AI Counselling Strategy and Recommendations for all rounds.</p>
               <Link to="/dashboard/subscription" className="text-xs bg-primary text-white px-5 py-2.5 rounded-full font-bold inline-block hover:scale-105 transition">Upgrade Now</Link>
             </div>
          )}
        </div>
      )}
      
      {/* ── Disclaimers ── */}
      {aiResponse.disclaimers_fraud_warnings && aiResponse.disclaimers_fraud_warnings.length > 0 && (
        <div className={`rounded-xl border p-4 ${s.dark ? 'border-white/5 bg-white/3' : 'border-slate-200 bg-slate-50'}`}>
          <p className={`text-[10px] font-bold uppercase mb-2 ${s.muted}`}>⚖️ Important Disclaimers</p>
          <ul className="space-y-1.5">
            {(aiResponse.disclaimers_fraud_warnings || []).map((d: string, i: number) => (
              <li key={i} className={`text-xs leading-relaxed ${s.muted}`}>• {d}</li>
            ))}
          </ul>
        </div>
      )}

      <CollegeInfoModal 
        collegeName={selectedCollegeInfo} 
        isOpen={!!selectedCollegeInfo} 
        onClose={() => setSelectedCollegeInfo(null)} 
        s={s}
      />
    </div>
  );
}
