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

    let aiInsights = null;
    try {
      const aiResponse = await callAI({
        system_prompt: `You are an expert medical admission counsellor and data analyst in India. Compare the two provided medical colleges.
CRITICAL INSTRUCTIONS:
1. Use ONLY the data provided in the user_prompt for seats, cutoffs, states, and types.
2. Do NOT hallucinate or make up fake numbers. For fields you do not know with 100% absolute certainty (like exact daily OPD, exact ICU beds, or exact fees), you MUST return "N/A" or null.
3. Your JSON structure must perfectly match the schema below, but replace the placeholders with REAL data or "N/A".
DO NOT return markdown formatting like \`\`\`json. ONLY return a valid JSON object matching this exact structure:
{
  "winner_card": {
    "winner_id": "id of the winning college",
    "recommended_college": "Name of winning college",
    "confidence_score": "e.g. 92%",
    "overall_rating": "e.g. 4.8/5",
    "reason": "1 sentence why",
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "ideal_student": "..."
  },
  "overall_scores": {
    "college_a": { "overall": 0, "academics": 0, "hospital": 0, "infrastructure": 0, "fees": 0, "roi": 0, "location": 0, "hostel": 0, "research": 0, "faculty": 0, "student_satisfaction": 0 },
    "college_b": { "overall": 0, "academics": 0, "hospital": 0, "infrastructure": 0, "fees": 0, "roi": 0, "location": 0, "hostel": 0, "research": 0, "faculty": 0, "student_satisfaction": 0 }
  },
  "admission_comparison": {
    "established_year": { "a": "N/A", "b": "N/A" },
    "nmc_status": { "a": "N/A", "b": "N/A" },
    "aiq_eligible": { "a": "N/A", "b": "N/A" },
    "minority_status": { "a": "N/A", "b": "N/A" },
    "management_quota": { "a": "N/A", "b": "N/A" }
  },
  "cutoff_trends": {
    "General": [
      { "year": 2023, "a_closing": null, "b_closing": null }
    ]
  },
  "fees_comparison": {
    "tuition_fee": { "a": "N/A", "b": "N/A" },
    "hostel_fee": { "a": "N/A", "b": "N/A" },
    "total_5_5_year": { "a": "N/A", "b": "N/A" },
    "cheaper_option": "college_a_id or college_b_id"
  },
  "hospital_exposure": {
    "hospital_beds": { "a": "N/A", "b": "N/A" },
    "daily_opd": { "a": "N/A", "b": "N/A" },
    "icu_beds": { "a": "N/A", "b": "N/A" },
    "clinical_score": { "a": 0, "b": 0 }
  },
  "academic_quality": {
    "faculty_count": { "a": "N/A", "b": "N/A" },
    "cadaver_labs": { "a": "N/A", "b": "N/A" },
    "teaching_score": { "a": 0, "b": 0 }
  },
  "infrastructure": {
    "campus_area": { "a": "N/A", "b": "N/A" },
    "ac_hostel": { "a": "N/A", "b": "N/A" },
    "sports": { "a": "N/A", "b": "N/A" },
    "campus_rating": { "a": 0, "b": 0 }
  },
  "internship": {
    "stipend": { "a": "N/A", "b": "N/A" },
    "bond": { "a": "N/A", "b": "N/A" }
  },
  "student_life": {
    "festivals": { "a": "N/A", "b": "N/A" },
    "food_rating": { "a": "N/A", "b": "N/A" }
  },
  "research": {
    "publications": { "a": "N/A", "b": "N/A" },
    "grants": { "a": "N/A", "b": "N/A" }
  },
  "placement": {
    "pg_selection_rate": { "a": "N/A", "b": "N/A" },
    "alumni_network": { "a": "N/A", "b": "N/A" }
  },
  "location": {
    "city": { "a": "N/A", "b": "N/A" },
    "climate": { "a": "N/A", "b": "N/A" },
    "cost_of_living": { "a": "N/A", "b": "N/A" }
  },
  "rankings": {
    "nirf": { "a": "N/A", "b": "N/A" }
  },
  "student_reviews": {
    "aggregate": { "a": "N/A", "b": "N/A" }
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
  "ai_recommendation": "Detailed verdict using strictly accurate data..."
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
