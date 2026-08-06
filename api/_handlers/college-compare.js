import supabase from './db-client.js';
import { callAI } from './ai-service.js';

/* ── Load full college data bundle from DB ── */
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
    supabase.from('seat_matrix').select('*').eq('college_name', college.name),
  ]);

  const relatedCutoffs = cutoffs || [];
  const seat = seats && seats.length > 0 ? seats[0] : null;

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
      total_seats: seat?.total_seats ?? college.total_seats ?? null,
      open_seats: seat?.open_seats ?? null,
      all_india: seat?.all_india ?? null,
      nri_seats: seat?.nri_seats ?? null,
      college_kind: seat?.college_kind || college.college_type,
    },
  };
}

/* ── Build static fields table from real DB data ── */
function buildFields(left, right) {
  const mk = (key, a, b, opts = {}) => ({ key, a: a ?? '—', b: b ?? '—', ...opts });

  return [
    mk('City', left.college.city, right.college.city),
    mk('State', left.college.state, right.college.state),
    mk('Country', left.college.country, right.college.country),
    mk('Type', left.college.college_type, right.college.college_type),
    mk('Course', left.college.course || 'MBBS', right.college.course || 'MBBS'),
    mk(
      'Total seats',
      left.highlights.total_seats,
      right.highlights.total_seats,
      {
        better:
          left.highlights.total_seats && right.highlights.total_seats
            ? left.highlights.total_seats > right.highlights.total_seats
              ? 'a'
              : left.highlights.total_seats < right.highlights.total_seats
              ? 'b'
              : null
            : null,
      }
    ),
    mk('Open seats', left.highlights.open_seats, right.highlights.open_seats),
    mk('AIQ seats', left.highlights.all_india, right.highlights.all_india),
    mk('NRI seats', left.highlights.nri_seats, right.highlights.nri_seats),
    mk(
      'AIQ Gen closing rank',
      left.highlights.general_aiq?.toLocaleString?.() || left.highlights.general_aiq,
      right.highlights.general_aiq?.toLocaleString?.() || right.highlights.general_aiq,
      {
        better:
          left.highlights.general_aiq && right.highlights.general_aiq
            ? left.highlights.general_aiq > right.highlights.general_aiq
              ? 'a' // higher closing rank = easier to get in
              : left.highlights.general_aiq < right.highlights.general_aiq
              ? 'b'
              : null
            : null,
        hint: 'Higher closing rank usually means relatively easier AIQ access',
      }
    ),
    mk('State Gen rank band', left.highlights.general_state, right.highlights.general_state),
  ];
}

/* ── Build category cutoff matrix from real DB data ── */
function buildCategoryMatrix(left, right) {
  const cats = ['General', 'OBC', 'EWS', 'SC', 'ST'];
  return cats.map((cat) => ({
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
}

/* ── Build text insights from real data ── */
function buildInsights(left, right) {
  const tips = [];
  const ag = left.highlights.general_aiq;
  const bg = right.highlights.general_aiq;
  if (ag && bg) {
    if (ag < bg)
      tips.push(`${left.college.name} is more competitive on AIQ (closes at a lower rank).`);
    else if (bg < ag)
      tips.push(`${right.college.name} is more competitive on AIQ (closes at a lower rank).`);
    else tips.push('Both colleges have similar AIQ closing ranks historically.');
  } else if (ag || bg) {
    tips.push('Cutoff history is available for only one of these colleges.');
  } else {
    tips.push('Detailed AIQ cutoff rows not linked yet — compare location and type, then verify official cutoffs.');
  }

  const as = left.highlights.total_seats;
  const bs = right.highlights.total_seats;
  if (as && bs) {
    if (as > bs)
      tips.push(`${left.college.name} offers more total seats (${as} vs ${bs}).`);
    else if (bs > as)
      tips.push(`${right.college.name} offers more total seats (${bs} vs ${as}).`);
  }

  if (left.college.state && right.college.state && left.college.state !== right.college.state) {
    tips.push(
      `Different states (${left.college.state} vs ${right.college.state}) — domicile rules matter for state quota.`
    );
  }

  if (left.college.college_type !== right.college.college_type) {
    tips.push(
      `Type differs: ${left.college.college_type} vs ${right.college.college_type} — fees and bonds usually differ sharply.`
    );
  }

  return tips;
}

/* ── Build rich AI context from all available DB data ── */
function buildAIContext(left, right) {
  const formatCutoffs = (byCat) => {
    const rows = [];
    for (const [cat, c] of Object.entries(byCat)) {
      rows.push(
        `${cat}: AIQ rank ${c.aiq_rank ?? 'N/A'}, AIQ score ${c.aiq_score ?? 'N/A'}, State band ${c.state_rank_range ?? 'N/A'}`
      );
    }
    return rows.length ? rows.join(' | ') : 'No cutoff data available';
  };

  return {
    college_a: {
      id: left.college.id,
      name: left.college.name,
      city: left.college.city || 'N/A',
      state: left.college.state || 'N/A',
      country: left.college.country || 'India',
      type: left.college.college_type || 'N/A',
      course: left.college.course || 'MBBS',
      established: left.college.established_year || left.college.year_established || 'N/A',
      nirf_rank: left.college.nirf || left.college.nirf_rank || 'N/A',
      nmc_approved: left.college.nmc_approved ?? true,
      total_seats: left.highlights.total_seats ?? 'N/A',
      open_seats: left.highlights.open_seats ?? 'N/A',
      aiq_seats: left.highlights.all_india ?? 'N/A',
      nri_seats: left.highlights.nri_seats ?? 'N/A',
      annual_fee: left.college.annual_fee || left.college.tuition_fee || 'N/A',
      hostel_fee: left.college.hostel_fee || 'N/A',
      hospital_beds: left.college.hospital_beds || 'N/A',
      cutoffs_by_category: formatCutoffs(left.cutoff_by_category),
      aiq_general_closing_rank: left.highlights.general_aiq ?? 'N/A',
    },
    college_b: {
      id: right.college.id,
      name: right.college.name,
      city: right.college.city || 'N/A',
      state: right.college.state || 'N/A',
      country: right.college.country || 'India',
      type: right.college.college_type || 'N/A',
      course: right.college.course || 'MBBS',
      established: right.college.established_year || right.college.year_established || 'N/A',
      nirf_rank: right.college.nirf || right.college.nirf_rank || 'N/A',
      nmc_approved: right.college.nmc_approved ?? true,
      total_seats: right.highlights.total_seats ?? 'N/A',
      open_seats: right.highlights.open_seats ?? 'N/A',
      aiq_seats: right.highlights.all_india ?? 'N/A',
      nri_seats: right.highlights.nri_seats ?? 'N/A',
      annual_fee: right.college.annual_fee || right.college.tuition_fee || 'N/A',
      hostel_fee: right.college.hostel_fee || 'N/A',
      hospital_beds: right.college.hospital_beds || 'N/A',
      cutoffs_by_category: formatCutoffs(right.cutoff_by_category),
      aiq_general_closing_rank: right.highlights.general_aiq ?? 'N/A',
    },
  };
}

/* ── Try to load cached result from DB ── */
async function loadCachedResult(aId, bId) {
  try {
    const minId = Math.min(Number(aId), Number(bId));
    const maxId = Math.max(Number(aId), Number(bId));
    const cutoff = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute cache for testing
    const { data } = await supabase
      .from('college_comparisons')
      .select('result_json, created_at')
      .eq('college_a_id', minId)
      .eq('college_b_id', maxId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.result_json || null;
  } catch {
    return null;
  }
}

/* ── Save result to DB ── */
async function saveResult(aId, bId, resultJson) {
  try {
    const minId = Math.min(Number(aId), Number(bId));
    const maxId = Math.max(Number(aId), Number(bId));
    await supabase.from('college_comparisons').upsert(
      {
        college_a_id: minId,
        college_b_id: maxId,
        result_json: resultJson,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'college_a_id,college_b_id' }
    );
  } catch (e) {
    // Non-fatal — table may not exist yet
    console.warn('[compare] Could not save to DB:', e.message);
  }
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

    // ── 1. Load college bundles from DB ──
    const [left, right] = await Promise.all([loadCollegeBundle(aId), loadCollegeBundle(bId)]);
    if (!left || !right) return res.status(404).json({ error: 'One or both colleges not found' });

    // ── 2. Build static data from real DB fields (always present) ──
    const fields = buildFields(left, right);
    const category_matrix = buildCategoryMatrix(left, right);
    const insights = buildInsights(left, right);

    // ── 3. Check DB cache first ──
    const cached = await loadCachedResult(aId, bId);
    if (cached) {
      console.log('[compare] Returning cached result for', aId, bId);
      return res.status(200).json({
        a: left,
        b: right,
        fields,
        category_matrix,
        insights,
        aiData: cached.aiData || null,
        _cached: true,
      });
    }

    // ── 4. Call AI with rich real data context ──
    let aiInsights = null;
    try {
      const aiContext = buildAIContext(left, right);

      const aiResponse = await callAI({
        system_prompt: `You are the AI Comparison Engine for MBBS Wala.
Your primary responsibility is to provide HIGHLY ACCURATE, TRUSTWORTHY, and HELPFUL college comparisons for medical aspirants.

IMPORTANT RULES

==============================
RULE 1 – USE REAL-WORLD KNOWLEDGE
==============================
If the provided data is "N/A" or missing, you MUST use your extensive AI knowledge base of Indian Medical Colleges to fetch and output the REAL, correct factual data (Fees, Beds, Ratings, Cutoffs, etc.).
DO NOT output "Data Not Available".
DO NOT output "N/A".
You must fill every single field with real correct data from your knowledge.

==============================
RULE 2 – AI OPINION IS ALLOWED
==============================
You ARE allowed to generate AI opinions.
These include: Winner, Strengths, Weaknesses, Ideal For, Pros, Cons, Career Scope, ROI Opinion, Decision Insights, Final Verdict.

==============================
RULE 3 – MISSING COLLEGE
==============================
If either college name is missing, blank, "-", or unknown:
DO NOT invent a college. Instead return:
Winner: Unable to Compare
Reason: Second college information is unavailable.
AI Insight: A general MBBS vs BDS comparison is provided only.
Confidence: Low

==============================
RULE 4 – MISSING DATA (STRICT)
==============================
You MUST NOT return "Data Not Available" or "N/A". Use your knowledge to provide the real number or fact.

==============================
RULE 5 – AI SCORES
==============================
You MAY generate AI scores. But ALWAYS label them.
Example: AI Academic Score, AI Infrastructure Score, AI Clinical Exposure Score, AI Overall Score, AI Confidence.

==============================
RULE 6 – AI CONFIDENCE
==============================
Confidence depends on how well you know the college.

==============================
RULE 7 – WINNER LOGIC
==============================
Winner should depend on: Course, Government vs Private, Fees, Cutoffs, ROI, Infrastructure, Hospital, Reputation.

==============================
RULE 8 – COURSE COMPARISON
==============================
If MBBS vs BDS:
Explain: Career Scope, Clinical Exposure, PG Opportunities, Higher Education, Income Potential.
Do NOT automatically say MBBS always wins. Mention: Choice depends on career goals.

==============================
RULE 9 – FACTUAL FIELDS
==============================
Use supplied data. If absent, use your real-world knowledge to fill it accurately. NEVER output "Data Not Available".

==============================
RULE 10 – FINAL VERDICT
==============================
Verdict must include: Why College A wins, Why College B wins, Who should choose A, Who should choose B, Who should avoid A, Who should avoid B, Confidence reason.

==============================
OUTPUT FORMAT
==============================
CRITICAL: DO NOT return markdown. Return ONLY a valid JSON object exactly matching this schema:

{
  "winner_card": {
    "winner_id": "<id of winning college as string>",
    "recommended_college": "<name>",
    "confidence_score": "<e.g. Verified Data > 90%>",
    "overall_rating": "<e.g. AI Overall Score: 4.2/5>",
    "reason": "<one sentence>",
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "weaknesses": ["<weakness 1>", "<weakness 2>"],
    "ideal_student": "<one sentence describing ideal candidate>"
  },
  "overall_scores": {
    "college_a": { "overall": 0, "academics": 0, "hospital": 0, "infrastructure": 0, "fees": 0, "roi": 0, "location": 0, "hostel": 0, "research": 0, "faculty": 0, "student_satisfaction": 0 },
    "college_b": { "overall": 0, "academics": 0, "hospital": 0, "infrastructure": 0, "fees": 0, "roi": 0, "location": 0, "hostel": 0, "research": 0, "faculty": 0, "student_satisfaction": 0 }
  },
  "admission_comparison": {
    "established_year": { "a": "Fill with real data", "b": "Fill with real data" },
    "nmc_status": { "a": "Approved", "b": "Approved" },
    "aiq_eligible": { "a": "Yes", "b": "Yes" },
    "minority_status": { "a": "Fill with real data", "b": "Fill with real data" },
    "management_quota": { "a": "Fill with real data", "b": "Fill with real data" }
  },
  "cutoff_trends": {
    "General": [
      { "year": 2024, "a_closing": null, "b_closing": null },
      { "year": 2023, "a_closing": null, "b_closing": null },
      { "year": 2022, "a_closing": null, "b_closing": null }
    ]
  },
  "fees_comparison": {
    "tuition_fee": { "a": "Fill real fee", "b": "Fill real fee" },
    "hostel_fee": { "a": "Fill real fee", "b": "Fill real fee" },
    "total_5_5_year": { "a": "Fill total", "b": "Fill total" },
    "cheaper_option": "college_a_id"
  },
  "hospital_exposure": {
    "hospital_beds": { "a": "Fill real beds", "b": "Fill real beds" },
    "daily_opd": { "a": "Fill real OPD", "b": "Fill real OPD" },
    "icu_beds": { "a": "Fill real ICU", "b": "Fill real ICU" },
    "clinical_score": { "a": 0, "b": 0 }
  },
  "academic_quality": {
    "faculty_count": { "a": "Fill real count", "b": "Fill real count" },
    "cadaver_labs": { "a": "Fill real count", "b": "Fill real count" },
    "teaching_score": { "a": 0, "b": 0 }
  },
  "infrastructure": {
    "campus_area": { "a": "Fill real Area", "b": "Fill real Area" },
    "ac_hostel": { "a": "Yes/No", "b": "Yes/No" },
    "sports": { "a": "Fill details", "b": "Fill details" },
    "campus_rating": { "a": 0, "b": 0 }
  },
  "internship": {
    "stipend": { "a": "Fill real stipend", "b": "Fill real stipend" },
    "bond": { "a": "Fill real bond", "b": "Fill real bond" }
  },
  "student_life": {
    "festivals": { "a": "Fill details", "b": "Fill details" },
    "food_rating": { "a": "Fill details", "b": "Fill details" }
  },
  "research": {
    "publications": { "a": "Fill count", "b": "Fill count" },
    "grants": { "a": "Fill count", "b": "Fill count" }
  },
  "placement": {
    "pg_selection_rate": { "a": "Fill real rate", "b": "Fill real rate" },
    "alumni_network": { "a": "Fill details", "b": "Fill details" }
  },
  "location": {
    "city": { "a": "Fill real city", "b": "Fill real city" },
    "climate": { "a": "Fill details", "b": "Fill details" },
    "cost_of_living": { "a": "Fill cost", "b": "Fill cost" }
  },
  "rankings": {
    "nirf": { "a": "Fill ranking", "b": "Fill ranking" }
  },
  "student_reviews": {
    "aggregate": { "a": "Fill rating", "b": "Fill rating" }
  },
  "ai_decision_insights": {
    "choose_a_if": ["...", "...", "..."],
    "choose_b_if": ["...", "...", "..."],
    "pros_a": ["...", "..."],
    "cons_a": ["...", "..."],
    "pros_b": ["...", "..."],
    "cons_b": ["...", "..."]
  },
  "winner_badges": {
    "best_overall": "<id>",
    "best_hospital": "<id>",
    "best_academics": "<id>",
    "best_roi": "<id>",
    "best_hostel": "<id>",
    "best_location": "<id>"
  },
  "ai_recommendation": "<Detailed verdict using ONLY the real data provided.>"
}`,
        user_prompt: aiContext,
      });

      if (aiResponse && aiResponse.winner_card) {
        aiInsights = aiResponse;
      }
    } catch (e) {
      console.error('[compare] AI call failed:', e.message);
      aiInsights = null;
    }

    // ── 5. Build final response ──
    const result = {
      a: left,
      b: right,
      fields,
      category_matrix,
      insights,
      aiData: aiInsights,
    };

    // ── 6. Save to DB (non-blocking) ──
    saveResult(aId, bId, { aiData: aiInsights }).catch(() => {});

    return res.status(200).json(result);
  } catch (err) {
    console.error('[college-compare] error:', err);
    res.status(500).json({ error: err.message });
  }
}
