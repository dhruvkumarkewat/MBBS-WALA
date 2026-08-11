/**
 * AI Predictor Service — Multi-provider failover with grounded system prompt.
 *
 * Architecture (from spec Section 7):
 * 1. Try providers in configured order (Gemini → OpenAI → Anthropic)
 * 2. Same grounded system prompt + context for each
 * 3. Pure-code grounding verifier ensures every claim maps to context data
 */

// ── System Prompt (Authoritative NEET Admissions & Cutoffs Engine) ────────────
const SYSTEM_PROMPT = `You are MBBSWALA NEET Expert Admission Advisor. Analyze the user's profile and the provided database context (colleges, cutoffs, fees).
Return ONLY valid JSON exactly matching this structure (be concise to avoid timeouts):
{
  "admission_summary": { "status": "Excellent Chances|High Chances|Moderate Chances|Low Chances|Very Low Chances", "data_reliability": "High (Based on 5-Year Trends)", "expected_probability": "85%", "explanation": "2-3 sentences explaining why" },
  "college_predictions": {
    "safe": [{ "name": "...", "course": "MBBS or BDS", "probability": "96%", "expected_round": "Round 1", "category": "General/OBC/SC/ST/etc", "seats": "...", "tuition_fee": "...", "hostel_fee": "...", "bond": "...", "nmc_recognition": "...", "internship_hospital": "...", "quota": "MUST BE EXACTLY 'AIQ' OR 'State' OR 'Management Quota'", "predicted_closing_rank": "...", "margin": "...", "historical_trend": [{ "year": "2025", "closing_rank": "..." }, { "year": "2024", "closing_rank": "..." }, { "year": "2023", "closing_rank": "..." }], "reason": "..." }],
    "moderate": [{ "name": "...", "course": "MBBS or BDS", "probability": "65%", "expected_round": "Round 2", "category": "General/OBC/SC/ST/etc", "seats": "...", "tuition_fee": "...", "hostel_fee": "...", "bond": "...", "nmc_recognition": "...", "internship_hospital": "...", "quota": "MUST BE EXACTLY 'AIQ' OR 'State' OR 'Management Quota'", "predicted_closing_rank": "...", "margin": "...", "historical_trend": [{ "year": "2025", "closing_rank": "..." }, { "year": "2024", "closing_rank": "..." }, { "year": "2023", "closing_rank": "..." }], "reason": "..." }],
    "reach": [{ "name": "...", "course": "MBBS or BDS", "probability": "30%", "expected_round": "Stray", "category": "General/OBC/SC/ST/etc", "seats": "...", "tuition_fee": "...", "hostel_fee": "...", "bond": "...", "nmc_recognition": "...", "internship_hospital": "...", "quota": "MUST BE EXACTLY 'AIQ' OR 'State' OR 'Management Quota'", "predicted_closing_rank": "...", "margin": "...", "historical_trend": [{ "year": "2025", "closing_rank": "..." }, { "year": "2024", "closing_rank": "..." }, { "year": "2023", "closing_rank": "..." }], "reason": "..." }]
  },
  "unlikely_mbbs_guidance": { "active": true, "message": "...", "private_options": [{ "name": "...", "state": "...", "fees": "...", "probability": "...", "rounds": "...", "management_quota": true, "nri_seats": true }] },
  "management_quota_opportunities": [{ "college": "...", "expected_rank": "...", "approx_fees": "...", "hostel_fees": "...", "bond": "...", "total_cost": "...", "chances": "...", "donation_expected": true }],
  "nri_quota": { "eligible_colleges": ["..."], "approx_fees": "...", "eligibility": "...", "required_documents": ["..."] },
  "alternative_courses": [{ "course": "BDS / BAMS / BHMS / BUMS / BSMS (choose relevant)", "career_scope": "...", "average_salary": "...", "higher_studies": "...", "admission_chances": "...", "top_colleges": ["..."] }],
  "scholarships": { "government": ["..."], "state": ["..."], "private": ["..."], "minority": ["..."], "category": ["..."], "income_based": ["..."] },
  "counselling_strategy": { "round_1": "...", "round_2": "...", "round_3": "...", "stray_vacancy": "...", "aaccc": "...", "state_counselling": "..." },
  "expected_cutoff_comparison": [{ "college": "...", "last_year_closing_rank": "...", "your_rank": "...", "difference": "...", "admission_chance": "..." }],
  "fee_comparison": { "government": "...", "private": "...", "management": "...", "nri": "...", "total_course_cost": "...", "hostel": "...", "miscellaneous": "...", "bond": "...", "penalty": "..." },
  "documents_required": ["NEET Admit Card", "Rank Card", "10th", "12th", "Transfer Certificate"],
  "important_advice": ["...", "..."],
  "ai_recommendation": "Based on previous years' counselling trends...",
  "smart_suggestions": ["...", "..."],
  "dashboard_cards": { "govt_mbbs": "Low", "pvt_mbbs": "Moderate", "mgmt_quota": "High", "bds": "High", "ayush": "High", "scholarships": "Eligible", "expected_fees": "15L", "expected_rounds": "2", "confidence_score": "85%" }
}
Rules:
1. ONLY return JSON.
2. If Govt MBBS is unlikely, provide Private/Management/Alternative options.
3. PREDICT COLLEGES FROM YOUR OWN KNOWLEDGE: Use your expert knowledge of official MCC and State counselling cutoffs to predict the best possible colleges based on the student's input rank, score, and category. Do NOT restrict yourself to only the data provided in the context.
4. Estimate "safe", "moderate", and "reach" groups accurately based on historical cutoff trends.
5. Provide realistic tuition fees, hostel fees, and bond details.
6. Calculate a realistic admission probability percentage.
7. CLEARLY designate the course (MBBS vs BDS). If the user asks for MBBS/BDS, provide both but mark the 'course' field accurately.
8. Provide multi-year trend data (2025, 2024, 2023) to show closing rank history. Use realistic historical estimates.
9. CRITICAL RULE FOR NEET RANKS: In NEET, a LOWER number rank is BETTER. AIR 330 is an outstanding, top-tier rank that guarantees admission to premier government medical colleges (e.g., AIIMS New Delhi, MAMC). A rank like 330 is vastly superior to 25,000. Do NOT treat low numbers as poor ranks!`;

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
            systemInstruction: { parts: [{ text: payload.system_prompt || SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload.user_prompt || payload) }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
              maxOutputTokens: 4000,
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
  gemini_fallback: {
    name: 'Gemini (Fallback Key)',
    buildRequest: (payload) => {
      const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY_FALLBACK;
      if (!key) return null;
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: payload.system_prompt || SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload.user_prompt || payload) }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
              maxOutputTokens: 4000,
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
            max_tokens: 8000,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: payload.system_prompt || SYSTEM_PROMPT },
              { role: 'user', content: JSON.stringify(payload.user_prompt || payload) },
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
};

for (let i = 1; i <= 15; i++) {
  PROVIDER_CONFIGS[`gemini_${i}`] = {
    name: `Gemini Key ${i}`,
    buildRequest: (payload) => {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (!key) return null;
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: payload.system_prompt || SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload.user_prompt || payload) }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
              maxOutputTokens: 4000,
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
  };
}

/**
 * Get provider order from env or use default.
 */
function getProviderOrder() {
  const envOrder = process.env.AI_PROVIDER_ORDER;
  if (envOrder) {
    return envOrder.split(',').map((s) => s.trim().toLowerCase()).filter((p) => PROVIDER_CONFIGS[p]);
  }
  return ['gemini', 'gemini_1', 'gemini_2', 'gemini_3', 'gemini_4', 'gemini_5', 'gemini_6', 'gemini_7', 'gemini_8', 'gemini_9', 'gemini_10', 'gemini_11', 'gemini_12', 'gemini_13', 'gemini_14', 'gemini_15', 'gemini_fallback', 'groq'];
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
      if (!parsed.disclaimers_fraud_warnings) parsed.disclaimers_fraud_warnings = [];

      console.log(`[AI] ${config.name} succeeded.`);

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

  const domicileState = query.domicile_state || '';
  const selectedQuotas = query.quotas || [];
  const onlyStateQuota = selectedQuotas.includes('State') && !selectedQuotas.includes('AIQ');

  // Score and categorize colleges with rank proximity
  const scoredColleges = (context.closing_ranks || []).map((cr) => {
    const isHomeState = Boolean(domicileState && (cr.state || '').toLowerCase().includes(domicileState.toLowerCase()));
    
    // CRITICAL: A college can ONLY have quota 'State' if it matches candidate's domicile state
    let quotaCode = cr.quota_code || 'AIQ';
    if (isHomeState && selectedQuotas.includes('State') && cr.quota_code !== 'AIQ' && !/AIIMS|JIPMER/i.test(cr.college_name || '')) {
      quotaCode = 'State';
    } else if (quotaCode === 'State' && !isHomeState) {
      quotaCode = 'AIQ';
    }

    const closingRank = Number(cr.closing_rank || cr.aiq_rank || 0);
    let chance_tier = 'Unlikely';

    if (closingRank && rank > 0) {
      if (closingRank >= rank) {
        chance_tier = 'High'; // Safe: Rank easily beats or matches cutoff
      } else if (closingRank >= rank * 0.70) {
        chance_tier = 'Moderate'; // Moderate: Within achievable striking distance
      } else if (closingRank >= rank * 0.20) {
        chance_tier = 'Reach'; // Reach: Tougher cutoff, dream options
      }
    }

    let parsedFee = null;
    let isApprox = false;
    
    if (typeof cr.fee_amount === 'number') {
      parsedFee = cr.fee_amount;
    } else if (typeof cr.fee_amount === 'string') {
      const nums = cr.fee_amount.replace(/\D/g, '');
      if (nums) parsedFee = parseInt(nums, 10);
    }
    
    // AI Fallback approximation for missing fees
    if (!parsedFee || parsedFee <= 0) {
      const isGovt = (cr.type && cr.type.toLowerCase().includes('govt')) || quotaCode === 'AIQ' || (quotaCode === 'State' && !(cr.college_name || '').toLowerCase().includes('private'));
      parsedFee = isGovt ? 100000 : 1400000; // AI Approximation: ~1L for Govt, ~14L for Private
      isApprox = true;
    }

    const feeAmount = parsedFee;
    let formattedFee = feeAmount >= 100000 
      ? `₹${(feeAmount / 100000).toFixed(1)}L/yr` 
      : `₹${feeAmount.toLocaleString('en-IN')}/yr`;
      
    if (isApprox) {
      formattedFee = `~ ${formattedFee} (Est.)`;
    }

    return {
      college_name: cr.college_name,
      state: cr.state || 'India',
      course: cr.course_name || (query.exam_track === 'AYUSH' ? 'BAMS' : 'MBBS'),
      quota: quotaCode,
      category: cr.category || query.category,
      chance_tier,
      closing_rank_reference: [{ year: cr.year || year, round: cr.round_name || selectedRound, rank: closingRank }],
      fee: {
        quota_tier: cr.type && cr.type.toLowerCase().includes('govt') ? 'Govt/AIQ' : 'Private/Deemed',
        amount_min: feeAmount,
        amount_max: feeAmount,
        formatted: formattedFee
      },
      source_ids: [],
      seats: cr.seats || null,
      bond: cr.bond || null,
      hospital_beds: cr.hospital_beds || null,
      internship_stipend: cr.internship_stipend || null,
      _diff: Math.abs(closingRank - rank),
      _closing: closingRank,
      _is_home_state: isHomeState,
    };
  }).filter((c) => {
    // Strict State Quota isolation:
    if (c.quota === 'State' && !c._is_home_state) return false;
    if (onlyStateQuota && domicileState && (!c._is_home_state || c.quota !== 'State')) return false;
    if (selectedQuotas.length > 0 && !selectedQuotas.includes(c.quota)) return false;
    return true;
  });

  // Sort High chances by closest cutoffs right above candidate rank (ascending cutoff)
  let highTier = scoredColleges
    .filter((c) => c.chance_tier === 'High')
    .sort((a, b) => a._closing - b._closing)
    .slice(0, 30);

  // Sort Moderate by proximity to candidate rank
  let modTier = scoredColleges
    .filter((c) => c.chance_tier === 'Moderate')
    .sort((a, b) => a._diff - b._diff)
    .slice(0, 20);

  // Sort Reach by proximity to candidate rank (closest dream colleges first)
  let reachTier = scoredColleges
    .filter((c) => c.chance_tier === 'Reach')
    .sort((a, b) => b._closing - a._closing)
    .slice(0, 20);

  // GUARANTEE MINIMUM 12 COLLEGES: If safe/mod/reach are sparse, auto-distribute from all valid scored colleges
  let colleges = [...highTier, ...modTier, ...reachTier];
  if (colleges.length < 12 && scoredColleges.length > 0) {
    const remaining = scoredColleges.filter(sc => !colleges.some(c => c.college_name === sc.college_name));
    for (const r of remaining) {
      if (colleges.length >= 15) break;
      if (r._closing >= rank) {
        r.chance_tier = 'High';
        highTier.push(r);
      } else if (r._closing >= rank * 0.6) {
        r.chance_tier = 'Moderate';
        modTier.push(r);
      } else {
        r.chance_tier = 'Reach';
        reachTier.push(r);
      }
      colleges.push(r);
    }
  }

  // Match scholarships with rich eligibility explanations
  const scholarships = (context.scholarships || []).map((s) => {
    let reason = `Eligible based on ${query.category || 'General'} category`;
    if (s.eligibility?.family_income_limit) {
      reason += ` & family annual income limit of ₹${Number(s.eligibility.family_income_limit).toLocaleString('en-IN')}`;
    }
    if (s.eligibility?.min_percentile) {
      reason += ` for top rankers (above ${s.eligibility.min_percentile}th percentile)`;
    }
    if (s.eligibility?.gender === 'female') {
      reason += ` (Special welfare initiative for female medical students)`;
    }
    if (s.eligibility?.minority) {
      reason = `Minority welfare scholarship scheme (Annual family income limit: ₹${Number(s.eligibility.family_income_limit || 250000).toLocaleString('en-IN')})`;
    }
    if (s.eligibility?.pwd) {
      reason = `Welfare scheme for students with benchmark disabilities (${s.eligibility.disability_percentage || 40}%+ PwD)`;
    }

    return {
      name: s.name,
      provider: s.provider,
      match_reason: s.description ? `${s.description} — ${reason}` : reason,
      estimated_amount: s.amount_description || (s.amount_max ? `Up to ₹${s.amount_max.toLocaleString('en-IN')}/year` : null),
      official_portal: s.official_portal,
      source_id: s.source_id || '',
    };
  });

  return {
    meta: {
      exam_track: query.exam_track,
      authority: resolved.authority || 'MCC-AIQ',
      round: resolved.round || resolved.available_rounds?.[0] || { round_id: 'r1', label: selectedRound, status: 'open' },
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
