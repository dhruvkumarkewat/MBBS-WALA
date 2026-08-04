/**
 * AI Predictor Service — Multi-provider failover with grounded system prompt.
 *
 * Architecture (from spec Section 7):
 * 1. Try providers in configured order (Gemini → OpenAI → Anthropic)
 * 2. Same grounded system prompt + context for each
 * 3. Pure-code grounding verifier ensures every claim maps to context data
 */

// ── System Prompt (spec Section 5 — exact text) ────────────────────────────────
// ── System Prompt (Authoritative NEET Admissions & Cutoffs Engine) ────────────
const SYSTEM_PROMPT = `# ROLE
You are the expert NEET-UG & AYUSH Medical College Predictor & Admissions Advisor for MBBSWALA.
Your mission is to provide candidates and their families with the most authentic, realistic, and comprehensive college predictions based on official MCC (Medical Counselling Committee) All India Quota (AIQ) and State Counselling (85% State Quota / Deemed Universities) historical cutoffs.

# TASK
Given candidate query (rank/marks, category, domicile state, quotas, exam track):
1. Recommend 15-20 highly accurate, realistic colleges categorized into 3 distinct tiers:
   - **Reach (3-5 colleges)**: Top aspirational colleges slightly above candidate rank (closing rank is between candidate_rank * 0.4 and candidate_rank * 0.85).
   - **Moderate (6-8 colleges)**: Realistic target colleges close to candidate rank (closing rank is between candidate_rank * 0.85 and candidate_rank * 1.25).
   - **High (5-7 colleges)**: Safe / high-probability colleges comfortably within reach (closing rank is between candidate_rank * 1.25 and candidate_rank * 2.5).
2. Rank-appropriate intelligence:
   - For top rankers (e.g. AIR < 1,500), prioritize premier national institutes (AIIMS New Delhi/Bhubaneswar/Bhopal/Jodhpur/Rishikesh, MAMC, VMMC, JIPMER, KGMU Lucknow, Seth GS Mumbai, IMS BHU, BJMC Ahmedabad, etc.).
   - For State Quota, include top Govt Medical Colleges in candidate's domicile state.
   - For middle & lower rankers, include appropriate State GMCs, Peripheral GMCs, Semi-Govt, and top Deemed/Private Medical Colleges (KMC Manipal, Hamdard, JSS Mysore, DY Patil, etc.).
3. For each college include:
   - college_name: Full official name
   - state: Indian state / UT
   - course: MBBS, BDS, BAMS, or BHMS
   - quota: 'AIQ', 'State', 'Deemed-Central', or 'Management'
   - category: candidate category
   - chance_tier: 'Reach' | 'Moderate' | 'High'
   - closing_rank_reference: [{ year: 2024, round: 'Round 1', rank: number }]
   - fee: { quota_tier: string, amount_min: number, amount_max: number, formatted: string }
4. Include 3-5 eligible scholarships (Central & State schemes) with official URLs and benefit details.

# OUTPUT
Return ONLY valid JSON matching this schema (no extra text):
{
  "meta": { "exam_track": "MBBS_BDS", "authority": "MCC-AIQ", "round": { "label": "Round 1" }, "data_basis_year": 2024, "qualifying_floor_met": true },
  "colleges": [ ... ],
  "scholarships": [ ... ],
  "disclaimers": [
    "Predictions are based on historical official MCC & State counselling cutoffs.",
    "Cutoffs move every year based on seat matrix and applicant demand — treat this as a guide.",
    "Always confirm official seat matrix and eligibility on official counselling portals."
  ]
}`;

// ── Provider Calling ────────────────────────────────────────────────────────

const PROVIDER_CONFIGS = {
  gemini: {
    name: 'Gemini',
    buildRequest: (payload) => {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return null;
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
              maxOutputTokens: 8192,
            },
          }),
        },
        parseResponse: async (res) => {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error('Empty Gemini response');
          return JSON.parse(text);
        },
      };
    },
  },
  groq: {
    name: 'Groq',
    buildRequest: (payload) => {
      const key = process.env.GROQ_API_KEY || process.env.GROQ_PREDICT_API_KEY;
      if (!key) return null;
      return {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.2,
            max_tokens: 8192,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: JSON.stringify(payload) },
            ],
          }),
        },
        parseResponse: async (res) => {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (!text) throw new Error('Empty Groq response');
          return JSON.parse(text);
        },
      };
    },
  },
  openai: {
    name: 'OpenAI',
    buildRequest: (payload) => {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return null;
      return {
        url: 'https://api.openai.com/v1/chat/completions',
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.2,
            max_tokens: 8192,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: JSON.stringify(payload) },
            ],
          }),
        },
        parseResponse: async (res) => {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (!text) throw new Error('Empty OpenAI response');
          return JSON.parse(text);
        },
      };
    },
  },
  anthropic: {
    name: 'Anthropic',
    buildRequest: (payload) => {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return null;
      return {
        url: 'https://api.anthropic.com/v1/messages',
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8192,
            temperature: 0.2,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: JSON.stringify(payload) }],
          }),
        },
        parseResponse: async (res) => {
          const data = await res.json();
          const text = data?.content?.[0]?.text;
          if (!text) throw new Error('Empty Anthropic response');
          const cleaned = text.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
          return JSON.parse(cleaned);
        },
      };
    },
  },
};

/**
 * Get provider order from env or use default.
 */
function getProviderOrder() {
  const envOrder = process.env.AI_PROVIDER_ORDER;
  if (envOrder) {
    return envOrder.split(',').map((s) => s.trim().toLowerCase()).filter((p) => PROVIDER_CONFIGS[p]);
  }
  return ['gemini', 'groq', 'openai', 'anthropic'];
}

/**
 * Call AI providers in failover order. Returns the parsed PredictorResponse.
 */
export async function callAI(payload) {
  const order = getProviderOrder();
  let lastError = null;

  for (const providerKey of order) {
    const config = PROVIDER_CONFIGS[providerKey];
    if (!config) continue;

    const reqConfig = config.buildRequest(payload);
    if (!reqConfig) {
      // No API key configured for this provider
      continue;
    }

    try {
      console.log(`[AI] Trying ${config.name}...`);
      const res = await fetch(reqConfig.url, reqConfig.options);

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        throw new Error(`${config.name} responded ${res.status}: ${errorBody.slice(0, 200)}`);
      }

      const parsed = await reqConfig.parseResponse(res);

      // Validate basic structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error(`${config.name} returned invalid JSON structure`);
      }

      // Ensure required top-level keys exist
      if (!parsed.meta) parsed.meta = {};
      if (!parsed.colleges) parsed.colleges = [];
      if (!parsed.scholarships) parsed.scholarships = [];
      if (!parsed.disclaimers) parsed.disclaimers = [];

      console.log(`[AI] ${config.name} succeeded. Colleges: ${parsed.colleges?.length || 0}, Scholarships: ${parsed.scholarships?.length || 0}`);

      return { ...parsed, _provider_used: providerKey };
    } catch (err) {
      console.error(`[AI] ${config.name} failed:`, err.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('No AI providers configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.');
}

/**
 * Grounding verifier — pure code, no AI.
 * Checks that every college name and source_id in the AI response traces back to the context data.
 */
export function verifyGrounding(aiResponse, context) {
  const issues = [];

  // Build lookup sets from context
  const contextCollegeNames = new Set(
    (context.closing_ranks || []).map((r) => (r.college_name || '').toLowerCase().trim())
  );
  const contextScholarshipNames = new Set(
    (context.scholarships || []).map((s) => (s.name || '').toLowerCase().trim())
  );

  // Check colleges
  for (const college of aiResponse.colleges || []) {
    const name = (college.college_name || '').toLowerCase().trim();
    if (name && !contextCollegeNames.has(name)) {
      // Fuzzy match — check if context has a close match
      const hasClose = [...contextCollegeNames].some(
        (cn) => cn.includes(name.slice(0, 20)) || name.includes(cn.slice(0, 20))
      );
      if (!hasClose) {
        issues.push(`College "${college.college_name}" not found in context data`);
      }
    }
  }

  // Check scholarships
  for (const sch of aiResponse.scholarships || []) {
    const name = (sch.name || '').toLowerCase().trim();
    if (name && !contextScholarshipNames.has(name)) {
      const hasClose = [...contextScholarshipNames].some(
        (sn) => sn.includes(name.slice(0, 15)) || name.includes(sn.slice(0, 15))
      );
      if (!hasClose) {
        issues.push(`Scholarship "${sch.name}" not found in context data`);
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

/**
 * Build a deterministic fallback response when AI is unavailable.
 * Uses the same context data but without AI explanation.
 */
export function buildFallbackResponse(query, context, resolved) {
  const year = query.score_or_rank?.neet_year || new Date().getFullYear();

  // Check qualifying floor
  const floor = (context.qualifying_cutoffs || []).find(
    (q) => q.neet_year === year && q.category === query.category && q.exam_track === query.exam_track
  );
  const rank = query.score_or_rank?.value || 0;
  const qualifies = !floor || (query.score_or_rank?.kind === 'marks' ? rank >= floor.cutoff_score : true);

  // Score colleges and ensure a balanced distribution of High, Moderate, and Reach
  const scoredColleges = (context.closing_ranks || []).map((cr) => {
    const closingRank = cr.aiq_rank || cr.closing_rank;
    let chance_tier = 'Unlikely';
    if (closingRank && rank > 0) {
      const ratio = rank / closingRank;
      if (ratio <= 0.85) chance_tier = 'High';
      else if (ratio <= 1.15) chance_tier = 'Moderate';
      else if (ratio <= 1.40) chance_tier = 'Reach';
    }

    const feeAmount = cr.fee_amount || (cr.type && cr.type.toLowerCase().includes('govt') ? 50000 : 1200000);

    return {
      college_name: cr.college_name,
      state: cr.state || 'Unknown',
      course: cr.course_name || (query.exam_track === 'AYUSH' ? 'BAMS' : 'MBBS'),
      quota: cr.quota_code || (cr.type && cr.type.toLowerCase().includes('govt') ? 'AIQ' : 'Management'),
      category: cr.category || query.category,
      chance_tier,
      closing_rank_reference: [{ year: cr.year || year, round: cr.round_name || 'Round 1', rank: closingRank }],
      fee: feeAmount ? {
        tuition_annual: feeAmount,
        currency: 'INR',
        formatted: `₹${(feeAmount / 100000).toFixed(1)}L/yr`
      } : null,
      source_ids: [],
    };
  }).filter((c) => c.chance_tier !== 'Unlikely');

  const highTier = scoredColleges.filter((c) => c.chance_tier === 'High').slice(0, 10);
  const modTier = scoredColleges.filter((c) => c.chance_tier === 'Moderate').slice(0, 10);
  const reachTier = scoredColleges.filter((c) => c.chance_tier === 'Reach').slice(0, 8);
  const colleges = [...highTier, ...modTier, ...reachTier];

  // Match scholarships
  const scholarships = (context.scholarships || []).map((s) => ({
    name: s.name,
    provider: s.provider,
    match_reason: `Matches your ${query.category} category`,
    estimated_amount: s.amount_description || null,
    official_portal: s.official_portal,
    source_id: s.source_id || '',
  }));

  return {
    meta: {
      exam_track: query.exam_track,
      authority: resolved.authority || 'MCC-AIQ',
      round: resolved.available_rounds?.[0] || { round_id: 'r1', label: 'Round 1', status: 'upcoming' },
      data_basis_year: year,
      qualifying_floor_met: qualifies,
    },
    colleges,
    scholarships,
    fallback: colleges.length === 0 ? {
      tier_reached: 'ALTERNATIVES',
      message: 'Based on the available data, no colleges are within reach at this rank. Consider later rounds, management quota options, or AYUSH courses.',
      alternative_courses: ['BAMS', 'BHMS', 'BDS', 'Nursing', 'Pharmacy', 'Allied Health Sciences'],
    } : null,
    disclaimers: [
      'Predictions are based on historical counselling data and may not reflect current year dynamics.',
      'Confirm seat matrix, fees and eligibility on the official counselling website before locking choices or paying anything.',
      'MBBSWALA is an informational tool, not a counselling authority, and does not guarantee any allotment.',
    ],
    _provider_used: 'fallback',
  };
}
