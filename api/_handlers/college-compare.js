import supabase from './db-client.js';
import { callAI } from './ai-service.js';

function normalize(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}



async function loadCollegeBundle(id) {
  const { data: college, error } = await supabase
    .from('colleges')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!college) return null;

  const [{ data: cutoffs }, { data: seats }] = await Promise.all([
    supabase.from('cutoffs').select('*').eq('college_name', college.name).order('category'),
    supabase.from('seat_matrix').select('*').eq('college_name', college.name)
  ]);

  const relatedCutoffs = cutoffs || [];
  const seat = (seats && seats.length > 0) ? seats[0] : null;

  const byCat = {};
  relatedCutoffs.forEach((c) => {
    byCat[c.category] = c;
  });

  return {
    college,
    seat,
    cutoffs: relatedCutoffs,
    cutoff_by_category: byCat,
    highlights: {
      general_aiq: byCat.General?.aiq_rank ?? null,
      general_state: byCat.General?.state_rank_range ?? null,
      total_seats: seat?.total_seats ?? null,
      open_seats: seat?.open_seats ?? null,
      all_india: seat?.all_india ?? null,
      nri_seats: seat?.nri_seats ?? null,
      college_kind: seat?.college_kind || college.college_type,
    },
  };
}

function verdict(a, b) {
  const tips = [];
  const ag = a.highlights.general_aiq;
  const bg = b.highlights.general_aiq;
  if (ag && bg) {
    if (ag < bg) tips.push(`${a.college.name} is more competitive on AIQ (closes earlier).`);
    else if (bg < ag) tips.push(`${b.college.name} is more competitive on AIQ (closes earlier).`);
    else tips.push('Similar AIQ closing ranks historically.');
  } else if (ag || bg) {
    tips.push('Cutoff history is available for only one of these colleges in our MP dataset.');
  } else {
    tips.push('Detailed MP cutoff rows not linked yet — compare location and type, then verify official cutoffs.');
  }

  const as = a.highlights.total_seats;
  const bs = b.highlights.total_seats;
  if (as && bs) {
    if (as > bs) tips.push(`${a.college.name} offers more total seats (${as} vs ${bs}).`);
    else if (bs > as) tips.push(`${b.college.name} offers more total seats (${bs} vs ${as}).`);
  }

  if (a.college.state && b.college.state && a.college.state !== b.college.state) {
    tips.push(`Different states (${a.college.state} vs ${b.college.state}) — domicile rules matter for state quota.`);
  }

  if (a.college.college_type !== b.college.college_type) {
    tips.push(`Type differs: ${a.college.college_type} vs ${b.college.college_type} — fees and bonds usually differ sharply.`);
  }

  return tips;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const aId = req.query.a;
    const bId = req.query.b;
    if (!aId || !bId) {
      return res.status(400).json({ error: 'Query params a and b (college ids) are required' });
    }

    const [left, right] = await Promise.all([loadCollegeBundle(aId), loadCollegeBundle(bId)]);
    if (!left || !right) return res.status(404).json({ error: 'One or both colleges not found' });

    let aiInsights = [];
    try {
      const aiResponse = await callAI({
        system_prompt: `You are an expert medical admission counsellor and data analyst in India. Compare the two provided medical colleges and return a detailed JSON profile containing both verified data from the context and AI-estimated approximations for facilities, hospital exposure, and rankings based on your extensive knowledge of Indian medical colleges.
DO NOT return markdown formatting like \`\`\`json. ONLY return a valid JSON object matching this exact structure:
{
  "winner_card": {
    "winner_id": "id of the winning college",
    "recommended_college": "Name of winning college",
    "confidence_score": "e.g., 92%",
    "overall_rating": "4.8/5",
    "reason": "1 sentence why",
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "ideal_student": "..."
  },
  "overall_scores": {
    "college_a": { "overall": 92, "academics": 95, "hospital": 90, "infrastructure": 85, "fees": 90, "roi": 95, "location": 90, "hostel": 80, "research": 85, "faculty": 92, "student_satisfaction": 90 },
    "college_b": { "overall": 85, "academics": 80, "hospital": 85, "infrastructure": 90, "fees": 70, "roi": 80, "location": 85, "hostel": 90, "research": 70, "faculty": 80, "student_satisfaction": 85 }
  },
  "admission_comparison": {
    "established_year": { "a": "1956", "b": "2001" },
    "nmc_status": { "a": "Recognized", "b": "Recognized" },
    "aiq_eligible": { "a": "Yes", "b": "No" },
    "minority_status": { "a": "None", "b": "Jain Minority" },
    "management_quota": { "a": "No", "b": "Yes" }
  },
  "cutoff_trends": {
    "General": [
      { "year": 2023, "a_closing": 50, "b_closing": 15000 },
      { "year": 2024, "a_closing": 47, "b_closing": 14000 }
    ]
  },
  "fees_comparison": {
    "tuition_fee": { "a": "₹1,628/yr", "b": "₹15,00,000/yr" },
    "hostel_fee": { "a": "₹1,000/yr", "b": "₹1,50,000/yr" },
    "total_5_5_year": { "a": "₹10,000", "b": "₹80,00,000" },
    "cheaper_option": "college_a_id"
  },
  "hospital_exposure": {
    "hospital_beds": { "a": "2500+", "b": "1000+" },
    "daily_opd": { "a": "10000+", "b": "1500+" },
    "icu_beds": { "a": "200+", "b": "50+" },
    "clinical_score": { "a": 95, "b": 75 }
  },
  "academic_quality": {
    "faculty_count": { "a": "600+", "b": "150+" },
    "cadaver_labs": { "a": "Excellent", "b": "Good" },
    "teaching_score": { "a": 95, "b": 80 }
  },
  "infrastructure": {
    "campus_area": { "a": "100+ Acres", "b": "30 Acres" },
    "ac_hostel": { "a": "No", "b": "Yes" },
    "sports": { "a": "Excellent", "b": "Good" },
    "campus_rating": { "a": 90, "b": 95 }
  },
  "internship": {
    "stipend": { "a": "₹30,000/mo", "b": "₹15,000/mo" },
    "bond": { "a": "No Bond", "b": "1 Year" }
  },
  "student_life": {
    "festivals": { "a": "Pulse", "b": "Euphoria" },
    "food_rating": { "a": "3.5/5", "b": "4.5/5" }
  },
  "research": {
    "publications": { "a": "1000+/yr", "b": "50+/yr" },
    "grants": { "a": "High", "b": "Low" }
  },
  "placement": {
    "pg_selection_rate": { "a": "High", "b": "Moderate" },
    "alumni_network": { "a": "Global", "b": "Regional" }
  },
  "location": {
    "city": { "a": "Delhi", "b": "Pune" },
    "climate": { "a": "Extreme", "b": "Pleasant" },
    "cost_of_living": { "a": "High", "b": "High" }
  },
  "rankings": {
    "nirf": { "a": "1", "b": "Not Ranked" }
  },
  "student_reviews": {
    "aggregate": { "a": "4.8", "b": "4.2" }
  },
  "ai_decision_insights": {
    "choose_a_if": ["...", "..."],
    "choose_b_if": ["...", "..."],
    "pros_a": ["...", "..."],
    "cons_a": ["...", "..."],
    "pros_b": ["...", "..."],
    "cons_b": ["...", "..."]
  },
  "winner_badges": {
    "best_overall": "id",
    "best_hospital": "id",
    "best_academics": "id",
    "best_roi": "id",
    "best_hostel": "id",
    "best_location": "id"
  },
  "ai_recommendation": "Detailed 3-4 paragraph verdict..."
}`,
        user_prompt: {
          college_a: {
            id: left.college.id,
            name: left.college.name,
            state: left.college.state,
            type: left.college.college_type,
            seats: left.highlights.total_seats,
            aiq_closing_rank: left.highlights.general_aiq
          },
          college_b: {
            id: right.college.id,
            name: right.college.name,
            state: right.college.state,
            type: right.college.college_type,
            seats: right.highlights.total_seats,
            aiq_closing_rank: right.highlights.general_aiq,
            cutoffs: right.cutoff_by_category
          }
        }
      });
      if (aiResponse && aiResponse.winner_card) {
        aiInsights = aiResponse;
      }
    } catch (e) {
      console.error('AI comparison failed:', e);
      aiInsights = null;
    }

    const fields = [
      { key: 'City', a: left.college.city, b: right.college.city },
      { key: 'State', a: left.college.state || '—', b: right.college.state || '—' },
      { key: 'Country', a: left.college.country, b: right.college.country },
      { key: 'Type', a: left.college.college_type, b: right.college.college_type },
      { key: 'Course', a: left.college.course || 'MBBS', b: right.college.course || 'MBBS' },
      {
        key: 'Total seats',
        a: left.highlights.total_seats ?? '—',
        b: right.highlights.total_seats ?? '—',
        better:
          left.highlights.total_seats && right.highlights.total_seats
            ? left.highlights.total_seats > right.highlights.total_seats
              ? 'a'
              : left.highlights.total_seats < right.highlights.total_seats
              ? 'b'
              : null
            : null,
      },
      {
        key: 'Open seats',
        a: left.highlights.open_seats ?? '—',
        b: right.highlights.open_seats ?? '—',
      },
      {
        key: 'AIQ seats',
        a: left.highlights.all_india ?? '—',
        b: right.highlights.all_india ?? '—',
      },
      {
        key: 'NRI seats',
        a: left.highlights.nri_seats ?? '—',
        b: right.highlights.nri_seats ?? '—',
      },
      {
        key: 'AIQ Gen closing rank',
        a: left.highlights.general_aiq?.toLocaleString?.() || left.highlights.general_aiq || '—',
        b: right.highlights.general_aiq?.toLocaleString?.() || right.highlights.general_aiq || '—',
        better:
          left.highlights.general_aiq && right.highlights.general_aiq
            ? left.highlights.general_aiq > right.highlights.general_aiq
              ? 'a' // higher closing rank = easier
              : left.highlights.general_aiq < right.highlights.general_aiq
              ? 'b'
              : null
            : null,
        hint: 'Higher closing rank usually means relatively easier AIQ access',
      },
      {
        key: 'State Gen rank band',
        a: left.highlights.general_state || '—',
        b: right.highlights.general_state || '—',
      },
    ];

    // category cutoff matrix
    const cats = ['General', 'OBC', 'EWS', 'SC', 'ST'];
    const category_matrix = cats.map((cat) => ({
      category: cat,
      a: left.cutoff_by_category[cat]
        ? {
            aiq_rank: left.cutoff_by_category[cat].aiq_rank,
            aiq_score: left.cutoff_by_category[cat].aiq_score,
            state_rank_range: left.cutoff_by_category[cat].state_rank_range,
          }
        : null,
      b: right.cutoff_by_category[cat]
        ? {
            aiq_rank: right.cutoff_by_category[cat].aiq_rank,
            aiq_score: right.cutoff_by_category[cat].aiq_score,
            state_rank_range: right.cutoff_by_category[cat].state_rank_range,
          }
        : null,
    }));

    return res.status(200).json({
      a: left,
      b: right,
      aiData: aiInsights,
    });
  } catch (err) {
    console.error('college-compare error:', err);
    res.status(500).json({ error: err.message });
  }
}
