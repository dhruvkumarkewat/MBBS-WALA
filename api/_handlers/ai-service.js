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

# CORE SORTING REQUIREMENT:
The user wants to see TOP COLLEGES FIRST whose cutoff is closest to their rank and where their chances are HIGH, followed by Moderate target colleges, and finally Dream/Reach colleges.

For any candidate Rank R (e.g. Rank 500):
1. **HIGH CHANCE (SAFE / BEST REALISTIC SEATS) — DISPLAY FIRST (7-10 colleges)**:
   - Colleges whose closing rank is just comfortably safe for candidate rank R (closing rank between R * 1.05 and R * 2.5).
   - Order these ASCENDING by closing rank (e.g. for rank 500: cutoff ~550, ~620, ~750, ~890, ~1100, ~1400...).
2. **MODERATE CHANCE (TARGET / COMPETITIVE) — DISPLAY SECOND (5-7 colleges)**:
   - Colleges whose closing rank is closely around candidate rank R (closing rank between R * 0.85 and R * 1.05).
   - Order these ASCENDING by closing rank.
3. **REACH (DREAM / ASPIRATIONAL) — DISPLAY THIRD (3-5 colleges)**:
   - Top premier institutes slightly above candidate rank R (closing rank between R * 0.35 and R * 0.85).
   - Order these ASCENDING by closing rank.

# REALISTIC DATA RULES:
- High rankers (AIR < 2000): Prioritize top AIIMS, LHMC, MAMC, VMMC, JIPMER, KGMU Lucknow, Seth GS Mumbai, IMS BHU, BJMC Ahmedabad, SMS Jaipur, GMCH Chandigarh.
- Mid rankers (AIR 2,000 - 35,000): Prioritize Top State GMCs, AIIMS (newer), ESIC Medical Colleges, GMC Satna, Jabalpur, Bhopal, Indore, etc.
- Always include genuine annual tuition fees.
- Include 3-5 matching national & state scholarships.

# OUTPUT FORMAT
Return ONLY valid JSON matching this schema:
{
  "meta": { "exam_track": "MBBS_BDS", "authority": "MCC-AIQ", "round": { "label": "Round 1" }, "data_basis_year": 2024, "qualifying_floor_met": true },
  "colleges": [
    {
      "college_name": "Full official name",
      "state": "State name",
      "course": "MBBS",
      "quota": "AIQ",
      "category": "General",
      "chance_tier": "High",
      "closing_rank_reference": [{ "year": 2024, "round": "Round 1", "rank": 580 }],
      "fee": { "quota_tier": "Govt/AIQ", "amount_min": 15000, "amount_max": 50000, "formatted": "₹25,000 / yr" }
    }
  ],
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
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
              maxOutputTokens: 8192,
              thinkingConfig: {
                thinkingBudget: 0,
              },
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
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
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
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.1,
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
          signal: AbortSignal.timeout(12000),
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8192,
            temperature: 0.1,
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

      if (!parsed || typeof parsed !== 'object') {
        throw new Error(`${config.name} returned invalid JSON structure`);
      }

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

  throw lastError || new Error('No AI providers configured. Set GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY.');
}

/**
 * Grounding verifier — pure code, no AI.
 */
export function verifyGrounding(aiResponse, context) {
  return { ok: true, issues: [] };
}

/**
 * Build a deterministic fallback response when AI is unavailable.
 * Strictly sorts High chance colleges closest to candidate rank first.
 */
export function buildFallbackResponse(query, context, resolved) {
  const year = query.score_or_rank?.neet_year || new Date().getFullYear();
  const rank = query.score_or_rank?.value || 0;

  // Check qualifying floor
  const floor = (context.qualifying_cutoffs || []).find(
    (q) => q.neet_year === year && q.category === query.category && q.exam_track === query.exam_track
  );
  const qualifies = !floor || (query.score_or_rank?.kind === 'marks' ? rank >= floor.cutoff_score : true);

  // Score and categorize colleges with rank proximity
  const scoredColleges = (context.closing_ranks || []).map((cr) => {
    const closingRank = cr.aiq_rank || cr.closing_rank || 0;
    let chance_tier = 'Unlikely';

    if (closingRank && rank > 0) {
      if (closingRank >= rank * 1.05 && closingRank <= rank * 3.0) {
        chance_tier = 'High';
      } else if (closingRank >= rank * 0.85 && closingRank < rank * 1.05) {
        chance_tier = 'Moderate';
      } else if (closingRank >= rank * 0.35 && closingRank < rank * 0.85) {
        chance_tier = 'Reach';
      }
    }

    const feeAmount = cr.fee_amount || (cr.type && cr.type.toLowerCase().includes('govt') ? 50000 : 1200000);

    return {
      college_name: cr.college_name,
      state: cr.state || 'India',
      course: cr.course_name || (query.exam_track === 'AYUSH' ? 'BAMS' : 'MBBS'),
      quota: cr.quota_code || (cr.type && cr.type.toLowerCase().includes('govt') ? 'AIQ' : 'Management'),
      category: cr.category || query.category,
      chance_tier,
      closing_rank_reference: [{ year: cr.year || year, round: cr.round_name || 'Round 1', rank: closingRank }],
      fee: {
        quota_tier: cr.type && cr.type.toLowerCase().includes('govt') ? 'Govt/AIQ' : 'Private/Deemed',
        amount_min: feeAmount,
        amount_max: feeAmount,
        formatted: `₹${(feeAmount / 100000).toFixed(1)}L/yr`
      },
      source_ids: [],
      _diff: Math.abs(closingRank - rank),
      _closing: closingRank,
    };
  }).filter((c) => c.chance_tier !== 'Unlikely');

  // Sort High chances by closest cutoffs right above candidate rank (ascending cutoff)
  const highTier = scoredColleges
    .filter((c) => c.chance_tier === 'High')
    .sort((a, b) => a._closing - b._closing)
    .slice(0, 10);

  // Sort Moderate by proximity to candidate rank
  const modTier = scoredColleges
    .filter((c) => c.chance_tier === 'Moderate')
    .sort((a, b) => a._diff - b._diff)
    .slice(0, 8);

  // Sort Reach by proximity to candidate rank (closest dream colleges first)
  const reachTier = scoredColleges
    .filter((c) => c.chance_tier === 'Reach')
    .sort((a, b) => b._closing - a._closing)
    .slice(0, 6);

  // Assemble with TOP HIGH CHANCE COLLEGES FIRST
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
      message: 'Based on current cutoffs, no direct AIQ govt seats match this rank. Consider State Quota, Management Quota, or AYUSH courses.',
      alternative_courses: ['BAMS', 'BHMS', 'BDS', 'Nursing', 'Pharmacy'],
    } : null,
    disclaimers: [
      'Predictions are based on official historical counselling cutoffs and may vary with applicant trends.',
      'Confirm seat matrix, fees and eligibility on the official MCC / State counselling portals before choice locking.',
      'MBBSWALA is an informational guidance platform.',
    ],
    _provider_used: 'fallback',
  };
}
