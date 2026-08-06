import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Trophy, CheckCircle, XCircle, HeartHandshake, Building2, Stethoscope, BookOpen, MapPin, IndianRupee, Users, ArrowRight, Share2, Download, AlertTriangle } from 'lucide-react';

export function CompareResultUI({ payload, s, isPremium }: { payload: any, s: any, isPremium?: boolean }) {
  const [activeTab, setActiveTab] = useState('overview');
  const ai = payload.aiData;
  if (!ai || !ai.winner_card) {
    return (
      <div className={`p-8 text-center rounded-2xl border ${s.card}`}>
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-500 opacity-80" />
        <h3 className="text-xl font-bold mb-2">AI Insights Unavailable</h3>
        <p className={`text-sm ${s.muted}`}>The AI model could not generate the deep comparison profile. Try selecting different colleges.</p>
      </div>
    );
  }


  const a = payload.a.college || payload.a;
  const b = payload.b.college || payload.b;

  const radarData = [
    { subject: 'Academics', A: ai.overall_scores?.college_a?.academics || 0, B: ai.overall_scores?.college_b?.academics || 0, fullMark: 100 },
    { subject: 'Hospital', A: ai.overall_scores?.college_a?.hospital || 0, B: ai.overall_scores?.college_b?.hospital || 0, fullMark: 100 },
    { subject: 'Infrastructure', A: ai.overall_scores?.college_a?.infrastructure || 0, B: ai.overall_scores?.college_b?.infrastructure || 0, fullMark: 100 },
    { subject: 'Fees/ROI', A: ai.overall_scores?.college_a?.roi || 0, B: ai.overall_scores?.college_b?.roi || 0, fullMark: 100 },
    { subject: 'Location', A: ai.overall_scores?.college_a?.location || 0, B: ai.overall_scores?.college_b?.location || 0, fullMark: 100 },
    { subject: 'Student Life', A: ai.overall_scores?.college_a?.student_satisfaction || 0, B: ai.overall_scores?.college_b?.student_satisfaction || 0, fullMark: 100 },
  ];

  return (
    <div className="space-y-6">
      {/* 🏆 Winner Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`rounded-3xl border overflow-hidden shadow-xl ${s.card} relative`}>
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-400 to-amber-600"></div>
        <div className="p-6 md:p-8 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 font-bold text-sm mb-4">
              <Trophy className="w-4 h-4" /> Recommended Winner
            </div>
            <h2 className="text-3xl font-black mb-3 leading-tight">{ai.winner_card.recommended_college}</h2>
            <p className={`text-lg mb-6 ${s.muted}`}>{ai.winner_card.reason}</p>
            
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-3xl font-black text-primary">{ai.winner_card.confidence_score}</span>
                <span className={`text-xs uppercase font-bold tracking-wider ${s.muted}`}>Confidence</span>
              </div>
              <div className="w-px h-10 bg-gray-200 dark:bg-gray-800"></div>
              <div className="flex flex-col">
                <span className="text-3xl font-black text-amber-500">{ai.winner_card.overall_rating}</span>
                <span className={`text-xs uppercase font-bold tracking-wider ${s.muted}`}>Overall Rating</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-2xl border ${s.card} shadow-sm`}>
              <p className="text-xs font-bold uppercase tracking-wider text-green-600 mb-3 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Strengths</p>
              <ul className="space-y-2">
                {ai.winner_card.strengths?.map((str: string, i: number) => (
                  <li key={i} className="text-sm font-medium leading-snug">• {str}</li>
                ))}
              </ul>
            </div>
            <div className={`p-4 rounded-2xl border ${s.card} shadow-sm`}>
              <p className="text-xs font-bold uppercase tracking-wider text-red-500 mb-3 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Weaknesses</p>
              <ul className="space-y-2">
                {ai.winner_card.weaknesses?.map((w: string, i: number) => (
                  <li key={i} className="text-sm font-medium leading-snug text-gray-500 dark:text-gray-400">• {w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className={`p-4 border-t text-sm font-semibold flex items-center gap-2 ${s.dark ? 'bg-black/20' : 'bg-gray-50'}`}>
          <Users className="w-4 h-4 text-primary" />
          <span className="opacity-80">Ideal for:</span> {ai.winner_card.ideal_student}
        </div>
      </motion.div>

      {/* 📊 Radar Chart & Scores */}
      <div className="grid md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`md:col-span-1 rounded-3xl border p-6 flex flex-col items-center justify-center ${s.card}`}>
          <h3 className="text-lg font-bold mb-6 w-full text-center">Score Breakdown</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: s.dark ? '#888' : '#666' }} />
                <Tooltip wrapperClassName={s.dark ? 'dark' : ''} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Radar name={a.name.slice(0,15)+"..."} dataKey="A" stroke="#f97316" fill="#f97316" fillOpacity={0.4} />
                <Radar name={b.name.slice(0,15)+"..."} dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="md:col-span-2 grid grid-cols-2 gap-4">
          {[a, b].map((col, idx) => {
            const key = idx === 0 ? 'college_a' : 'college_b';
            const scores = ai.overall_scores?.[key] || {};
            const color = idx === 0 ? 'text-orange-500' : 'text-blue-500';
            const bg = idx === 0 ? 'bg-orange-500/10' : 'bg-blue-500/10';
            
            return (
              <div key={idx} className={`rounded-3xl border p-6 ${s.card} flex flex-col justify-between`}>
                <div>
                  <h4 className="font-bold text-sm mb-1 opacity-70 line-clamp-1">{col.name}</h4>
                  <div className="flex items-end gap-2 mb-6">
                    <span className={`text-5xl font-black ${color}`}>{scores.overall || 0}</span>
                    <span className="font-bold text-sm mb-1 opacity-50">/ 100</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {[
                    { label: 'Academics', icon: BookOpen, val: scores.academics },
                    { label: 'Hospital', icon: Stethoscope, val: scores.hospital },
                    { label: 'Infrastructure', icon: Building2, val: scores.infrastructure },
                    { label: 'Location/Life', icon: MapPin, val: (scores.location + scores.student_satisfaction)/2 }
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${bg} ${color}`}><stat.icon className="w-4 h-4" /></div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span>{stat.label}</span>
                          <span>{stat.val || 0}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full ${idx === 0 ? 'bg-orange-500' : 'bg-blue-500'}`} style={{ width: `${stat.val || 0}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Decision Insights Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className={`rounded-3xl border p-6 bg-gradient-to-br from-orange-500/5 to-transparent ${s.card}`}>
          <h3 className="font-black text-lg mb-4 flex items-center gap-2"><ArrowRight className="w-5 h-5 text-orange-500" /> Choose {a.name} If...</h3>
          <ul className="space-y-3">
            {ai.ai_decision_insights?.choose_a_if?.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-2 font-medium text-sm leading-snug">
                <CheckCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" /> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className={`rounded-3xl border p-6 bg-gradient-to-br from-blue-500/5 to-transparent ${s.card}`}>
          <h3 className="font-black text-lg mb-4 flex items-center gap-2"><ArrowRight className="w-5 h-5 text-blue-500" /> Choose {b.name} If...</h3>
          <ul className="space-y-3">
            {ai.ai_decision_insights?.choose_b_if?.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-2 font-medium text-sm leading-snug">
                <CheckCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tabs for Detailed Breakdown */}
      <div className="mt-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-gray-200 dark:border-gray-800">
          {['overview', 'admission', 'fees', 'hospital', 'infrastructure'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="pt-6">
          <DetailedTable 
            section={activeTab} 
            ai={ai} 
            a={a} 
            b={b} 
            s={s} 
          />
        </div>
      </div>

      {/* AI Recommendation Summary */}
      <div className={`rounded-3xl border p-6 md:p-8 ${s.card} shadow-lg relative overflow-hidden mt-8`}>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
        <h3 className="text-xl font-black mb-4 flex items-center gap-2"><HeartHandshake className="w-5 h-5 text-primary" /> Final Verdict</h3>
        <p className="text-sm md:text-base leading-relaxed opacity-90 font-medium">{ai.ai_recommendation}</p>
        <p className="text-xs opacity-60 mt-6 italic bg-black/10 dark:bg-white/5 p-4 rounded-xl border border-white/10 leading-relaxed">
          <strong>Disclaimer:</strong> This comparison is AI-generated using the information supplied to the model. Institutional facts such as fees, cutoffs, seats, and bond policies are shown only when verified data is available. If verified data is unavailable, MBBS Wala explicitly displays "Data Not Available" rather than generating estimates. The AI opinions are intended to help students understand the relative strengths and trade-offs between colleges and should not be treated as official counselling advice.
        </p>
      </div>
      
      {/* Action Bar */}
      <div className="flex justify-end gap-3 pt-4">
        <button className={`zn-btn flex items-center gap-2 px-6 py-2.5 rounded-xl border font-bold text-sm hover:bg-gray-100 dark:hover:bg-white/10 transition-colors`}>
          <Share2 className="w-4 h-4" /> Share
        </button>
        <button className={`zn-btn flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20`}>
          <Download className="w-4 h-4" /> Export PDF
        </button>
      </div>
    </div>
  );
}

// ---------------- Helper Table Component ---------------- //
function DetailedTable({ section, ai, a, b, s }: any) {
  const renderRow = (label: string, valA: any, valB: any, highlightCheaper?: string) => (
    <div className={`grid grid-cols-3 gap-4 p-4 border-b last:border-0 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors`}>
      <div className="font-bold opacity-70 flex items-center">{label}</div>
      <div className={`font-semibold ${highlightCheaper === 'a' ? 'text-green-500' : ''}`}>{valA || '—'}</div>
      <div className={`font-semibold ${highlightCheaper === 'b' ? 'text-green-500' : ''}`}>{valB || '—'}</div>
    </div>
  );

  const Header = () => (
    <div className={`grid grid-cols-3 gap-4 p-4 border-b font-black text-sm uppercase tracking-wider ${s.dark ? 'bg-white/5' : 'bg-gray-100'} rounded-t-xl`}>
      <div className="opacity-50">Metric</div>
      <div className="text-orange-500 truncate pr-4">{a.name}</div>
      <div className="text-blue-500 truncate pr-4">{b.name}</div>
    </div>
  );

  if (section === 'overview') {
    return (
      <div className={`rounded-xl border ${s.card}`}>
        <Header />
        {renderRow('Established Year', ai.admission_comparison?.established_year?.a, ai.admission_comparison?.established_year?.b)}
        {renderRow('NMC Status', ai.admission_comparison?.nmc_status?.a, ai.admission_comparison?.nmc_status?.b)}
        {renderRow('Faculty Count', ai.academic_quality?.faculty_count?.a, ai.academic_quality?.faculty_count?.b)}
        {renderRow('NIRF Ranking', ai.rankings?.nirf?.a, ai.rankings?.nirf?.b)}
        {renderRow('Student Rating', ai.student_reviews?.aggregate?.a ? ai.student_reviews?.aggregate?.a + '/5' : '—', ai.student_reviews?.aggregate?.b ? ai.student_reviews?.aggregate?.b + '/5' : '—')}
      </div>
    );
  }

  if (section === 'admission') {
    return (
      <div className={`rounded-xl border ${s.card}`}>
        <Header />
        {renderRow('AIQ Eligible', ai.admission_comparison?.aiq_eligible?.a, ai.admission_comparison?.aiq_eligible?.b)}
        {renderRow('Minority Status', ai.admission_comparison?.minority_status?.a, ai.admission_comparison?.minority_status?.b)}
        {renderRow('Management Quota', ai.admission_comparison?.management_quota?.a, ai.admission_comparison?.management_quota?.b)}
        {renderRow('PG Selection Rate', ai.placement?.pg_selection_rate?.a, ai.placement?.pg_selection_rate?.b)}
      </div>
    );
  }

  if (section === 'fees') {
    const cheaper = ai.fees_comparison?.cheaper_option === 'college_a_id' ? 'a' : 'b';
    return (
      <div className={`rounded-xl border ${s.card}`}>
        <Header />
        {renderRow('Tuition Fee / Year', ai.fees_comparison?.tuition_fee?.a, ai.fees_comparison?.tuition_fee?.b)}
        {renderRow('Hostel Fee / Year', ai.fees_comparison?.hostel_fee?.a, ai.fees_comparison?.hostel_fee?.b)}
        {renderRow('Total 5.5 Year Cost', ai.fees_comparison?.total_5_5_year?.a, ai.fees_comparison?.total_5_5_year?.b, cheaper)}
        {renderRow('Internship Stipend', ai.internship?.stipend?.a, ai.internship?.stipend?.b)}
        {renderRow('Service Bond', ai.internship?.bond?.a, ai.internship?.bond?.b)}
      </div>
    );
  }

  if (section === 'hospital') {
    return (
      <div className={`rounded-xl border ${s.card}`}>
        <Header />
        {renderRow('Hospital Beds', ai.hospital_exposure?.hospital_beds?.a, ai.hospital_exposure?.hospital_beds?.b)}
        {renderRow('Daily OPD Patient Load', ai.hospital_exposure?.daily_opd?.a, ai.hospital_exposure?.daily_opd?.b)}
        {renderRow('ICU Beds', ai.hospital_exposure?.icu_beds?.a, ai.hospital_exposure?.icu_beds?.b)}
        {renderRow('Clinical Score (0-100)', ai.hospital_exposure?.clinical_score?.a, ai.hospital_exposure?.clinical_score?.b)}
        {renderRow('Cadaver Labs', ai.academic_quality?.cadaver_labs?.a, ai.academic_quality?.cadaver_labs?.b)}
      </div>
    );
  }

  if (section === 'infrastructure') {
    return (
      <div className={`rounded-xl border ${s.card}`}>
        <Header />
        {renderRow('Campus Area', ai.infrastructure?.campus_area?.a, ai.infrastructure?.campus_area?.b)}
        {renderRow('AC Hostel Available', ai.infrastructure?.ac_hostel?.a, ai.infrastructure?.ac_hostel?.b)}
        {renderRow('Sports Facilities', ai.infrastructure?.sports?.a, ai.infrastructure?.sports?.b)}
        {renderRow('Food Quality', ai.student_life?.food_rating?.a, ai.student_life?.food_rating?.b)}
        {renderRow('City Climate', ai.location?.climate?.a, ai.location?.climate?.b)}
      </div>
    );
  }

  return null;
}
