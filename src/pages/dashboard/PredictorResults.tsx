import { Link } from 'react-router-dom';
import { Crown, Sparkles, AlertTriangle, FileText, IndianRupee, MapPin, Search } from 'lucide-react';
import React from 'react';

// Interfaces mapping to PredictorResponse
interface PredictorResultsProps {
  aiResponse: any;
  s: any;
  isPremium: boolean;
  domicileState: string;
}


const CollegeGroupList = ({ colleges, s, isPremium, maxFreeCount, bgClass, borderClass, isReach }: any) => {
  if (!colleges || colleges.length === 0) return null;
  const displayColleges = isPremium ? colleges : colleges.slice(0, maxFreeCount);
  const grouped = displayColleges.reduce((acc: any, c: any) => {
    const q = c.quota || 'Other';
    if (!acc[q]) acc[q] = [];
    acc[q].push(c);
    return acc;
  }, {});
  const sortedQuotas = Object.keys(grouped).sort((a, b) => {
    if (a === 'AIQ') return -1;
    if (b === 'AIQ') return 1;
    if (a === 'State') return -1;
    if (b === 'State') return 1;
    return a.localeCompare(b);
  });
  return (
    <div className="space-y-5">
      {sortedQuotas.map((quota) => (
        <div key={quota} className="space-y-3">
          {sortedQuotas.length > 1 && (
            <h4 className={`text-[11px] font-bold uppercase tracking-wider ${s.muted} border-b ${s.dark ? 'border-white/10' : 'border-slate-200'} pb-1.5`}>
              {quota} Quota Colleges
            </h4>
          )}
          {grouped[quota].map((c: any, i: number) => (
            <div key={i} className={`rounded-xl border ${bgClass} ${borderClass} p-4`}>
              <p className="font-bold text-sm mb-1">{c.name}</p>
              {!isReach ? (
                <>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${borderClass} bg-white/5`}>{c.probability} Probability</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{c.expected_round}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">{c.quota}</span>
                  </div>
                  <div className="grid grid-cols-2 text-xs gap-2 mt-3">
                    <div>
                      <span className={s.muted}>Last Year Closing: </span>
                      <span className="font-bold">{c.closing_rank}</span>
                    </div>
                    <div>
                      <span className={s.muted}>Est. Fees: </span>
                      <span className="font-bold">{c.fees}</span>
                    </div>
                  </div>
                  <p className={`text-[11px] mt-2 italic ${s.muted}`}>💡 {c.reason}</p>
                </>
              ) : (
                <div className="grid grid-cols-2 text-xs gap-2 mt-2">
                  <div>
                    <span className={s.muted}>Closing: </span>
                    <span className="font-bold text-orange-500">{c.closing_rank}</span>
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
};

export function PredictorResults({ aiResponse, s, isPremium, domicileState }: PredictorResultsProps) {
  if (!aiResponse) return null;

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
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
             <div className="bg-primary/10 rounded-xl p-3 border border-primary/20">
               <p className="text-[10px] uppercase font-bold text-primary mb-1">Status</p>
               <p className="text-sm font-black text-primary">{aiResponse.admission_summary.status}</p>
             </div>
             <div className={`${s.dark ? 'bg-white/5' : 'bg-slate-50'} rounded-xl p-3 border border-slate-500/20`}>
               <p className={`text-[10px] uppercase font-bold ${s.muted} mb-1`}>Expected Probability</p>
               <p className="text-sm font-black text-emerald-500">{aiResponse.admission_summary.expected_probability}</p>
             </div>
             <div className={`${s.dark ? 'bg-white/5' : 'bg-slate-50'} rounded-xl p-3 border border-slate-500/20`}>
               <p className={`text-[10px] uppercase font-bold ${s.muted} mb-1`}>AI Confidence</p>
               <p className="text-sm font-black text-blue-500">{aiResponse.admission_summary.ai_prediction_confidence}</p>
             </div>
             <div className={`${s.dark ? 'bg-white/5' : 'bg-slate-50'} rounded-xl p-3 border border-slate-500/20`}>
               <p className={`text-[10px] uppercase font-bold ${s.muted} mb-1`}>Overall Match</p>
               <p className="text-sm font-black text-amber-500">{aiResponse.admission_summary.overall_confidence}</p>
             </div>
          </div>
          
          <p className={`text-sm leading-relaxed ${s.muted}`}>
            {aiResponse.admission_summary.explanation}
          </p>
        </div>
      )}

      {/* ── Safe Colleges ── */}
      {aiResponse.college_predictions?.safe && aiResponse.college_predictions.safe.length > 0 && (
        <div className={`rounded-2xl border p-5 ${s.card} border-l-4 border-l-emerald-500/60`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">✅</span>
            <h3 className="font-black text-sm uppercase tracking-wider">Safe Colleges (High Chance)</h3>
          </div>
          <CollegeGroupList colleges={aiResponse.college_predictions?.safe} s={s} isPremium={true} maxFreeCount={100} bgClass="bg-emerald-500/5" borderClass="border-emerald-500/20" isReach={false} />
        </div>
      )}

      {/* ── Moderate Colleges ── */}
      {aiResponse.college_predictions?.moderate && aiResponse.college_predictions.moderate.length > 0 && (
        <div className={`rounded-2xl border p-5 ${s.card} border-l-4 border-l-amber-500/60`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🟡</span>
            <h3 className="font-black text-sm uppercase tracking-wider">Moderate Colleges</h3>
          </div>
          <CollegeGroupList colleges={aiResponse.college_predictions?.moderate} s={s} isPremium={true} maxFreeCount={100} bgClass="bg-amber-500/5" borderClass="border-amber-500/20" isReach={false} />
        </div>
      )}

      {/* ── Reach Colleges ── */}
      {aiResponse.college_predictions?.reach && aiResponse.college_predictions.reach.length > 0 && (
        <div className={`rounded-2xl border p-5 ${s.card} border-l-4 border-l-orange-500/60`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🔴</span>
            <h3 className="font-black text-sm uppercase tracking-wider">Reach Colleges</h3>
          </div>
          <CollegeGroupList colleges={aiResponse.college_predictions?.reach} s={s} isPremium={isPremium} maxFreeCount={1} bgClass="bg-orange-500/5" borderClass="border-orange-500/20" isReach={true} />
          
          {!isPremium && aiResponse.college_predictions.reach.length > 1 && (
             <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5 text-center">
               <Crown className="w-5 h-5 text-primary mx-auto mb-2" />
               <p className="text-xs font-bold mb-2">Upgrade to Premium to view {aiResponse.college_predictions.reach.length - 1} more Reach colleges.</p>
               <Link to="/packages" className="text-[10px] bg-primary text-white px-3 py-1.5 rounded-full font-bold inline-block">Upgrade Now</Link>
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
        </div>
      )}
      
      {/* ── Management Quota ── */}
      {aiResponse.management_quota_opportunities && aiResponse.management_quota_opportunities.length > 0 && (
        <div className={`rounded-2xl border p-5 ${s.card}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🏛️</span>
            <h3 className="font-black text-sm uppercase tracking-wider">Management Quota Opportunities</h3>
          </div>
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
                    <td className="py-2 font-semibold pr-4">{mq.college}</td>
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
        </div>
      )}

      {/* ── Alternative Courses ── */}
      {aiResponse.alternative_courses && aiResponse.alternative_courses.length > 0 && (
        <div className={`rounded-2xl border p-5 ${s.card}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🦷</span>
            <h3 className="font-black text-sm uppercase tracking-wider">Alternative Courses</h3>
          </div>
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
                    {alt.top_colleges?.map((tc: string, j: number) => <li key={j}>{tc}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Recommendation & Strategy ── */}
      {aiResponse.ai_recommendation && (
        <div className={`rounded-2xl border p-5 ${s.card} border-l-4 border-l-primary/60`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <h3 className="font-black text-sm uppercase tracking-wider">AI Recommendation</h3>
          </div>
          <p className="text-sm leading-relaxed mb-4">{aiResponse.ai_recommendation}</p>
          
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

    </div>
  );
}
