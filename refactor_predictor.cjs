const fs = require('fs');
const file = 'src/pages/dashboard/PredictorResults.tsx';
let content = fs.readFileSync(file, 'utf8');

const collegeGroupListCode = `
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
            <h4 className={\`text-[11px] font-bold uppercase tracking-wider \${s.muted} border-b \${s.dark ? 'border-white/10' : 'border-slate-200'} pb-1.5\`}>
              {quota} Quota Colleges
            </h4>
          )}
          {grouped[quota].map((c: any, i: number) => (
            <div key={i} className={\`rounded-xl border \${bgClass} \${borderClass} p-4\`}>
              <p className="font-bold text-sm mb-1">{c.name}</p>
              {!isReach ? (
                <>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full \${borderClass} bg-white/5\`}>{c.probability} Probability</span>
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
                  <p className={\`text-[11px] mt-2 italic \${s.muted}\`}>💡 {c.reason}</p>
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
`;

content = content.replace(
  "export function PredictorResults({ aiResponse, s, isPremium, domicileState }: PredictorResultsProps) {",
  collegeGroupListCode + "\nexport function PredictorResults({ aiResponse, s, isPremium, domicileState }: PredictorResultsProps) {"
);

const safeOld = `<div className="space-y-3">
            {(aiResponse.college_predictions?.safe || []).map((c: any, i: number) => (
              <div key={i} className={\`rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4\`}>
                <p className="font-bold text-sm mb-1">{c.name}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{c.probability} Probability</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{c.expected_round}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">{c.quota}</span>
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
                <p className={\`text-[11px] mt-2 italic \${s.muted}\`}>💡 {c.reason}</p>
              </div>
            ))}
          </div>`;

content = content.replace(safeOld, `<CollegeGroupList colleges={aiResponse.college_predictions?.safe} s={s} isPremium={true} maxFreeCount={100} bgClass="bg-emerald-500/5" borderClass="border-emerald-500/20" isReach={false} />`);

const modOld = `<div className="space-y-3">
            {(aiResponse.college_predictions?.moderate || []).map((c: any, i: number) => (
              <div key={i} className={\`rounded-xl border border-amber-500/20 bg-amber-500/5 p-4\`}>
                <p className="font-bold text-sm mb-1">{c.name}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">{c.probability} Probability</span>
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
                <p className={\`text-[11px] mt-2 italic \${s.muted}\`}>💡 {c.reason}</p>
              </div>
            ))}
          </div>`;

content = content.replace(modOld, `<CollegeGroupList colleges={aiResponse.college_predictions?.moderate} s={s} isPremium={true} maxFreeCount={100} bgClass="bg-amber-500/5" borderClass="border-amber-500/20" isReach={false} />`);

const reachOld = `<div className="space-y-3">
            {((isPremium ? aiResponse.college_predictions?.reach : aiResponse.college_predictions?.reach?.slice(0, 1)) || []).map((c: any, i: number) => (
              <div key={i} className={\`rounded-xl border border-orange-500/20 bg-orange-500/5 p-4\`}>
                <p className="font-bold text-sm mb-1">{c.name}</p>
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
              </div>
            ))}
          </div>`;

content = content.replace(reachOld, `<CollegeGroupList colleges={aiResponse.college_predictions?.reach} s={s} isPremium={isPremium} maxFreeCount={1} bgClass="bg-orange-500/5" borderClass="border-orange-500/20" isReach={true} />`);

fs.writeFileSync(file, content);
console.log('Successfully refactored PredictorResults.tsx');
