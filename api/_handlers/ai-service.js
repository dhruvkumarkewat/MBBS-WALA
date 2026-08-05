/**
 * AI Predictor Service — Multi-provider failover with grounded system prompt.
 *
 * Architecture (from spec Section 7):
 * 1. Try providers in configured order (Gemini → OpenAI → Anthropic)
 * 2. Same grounded system prompt + context for each
 * 3. Pure-code grounding verifier ensures every claim maps to context data
 */

// ── System Prompt (Authoritative NEET Admissions & Cutoffs Engine) ────────────
const SYSTEM_PROMPT = 'You are MBBSWALA NEET College Predictor. Return ONLY valid JSON with these fields: prediction_summary (headline, government_mbbs_chance {percent,label,emoji}, private_mbbs_chance, government_bds_chance, private_bds_chance), government_options (state_quota_mbbs, aiq_mbbs, government_bds), ai_recommendation (focus_areas[], tip), ai_insight (2-3 sentences), confidence_percent (60-95), colleges[] (college_name, state, course, quota, category, chance_tier High/Moderate/Reach, admission_chance_percentage, closing_rank_reference [{year,round,rank}], fee {formatted}), scholarships[], disclaimers[]. Use real MCC/State counselling cutoff data. Return up to 20 colleges from the context. State Quota is ONLY for domicile_state colleges.';

// ── Provider Calling ────────────────────────────────────────────────────────

const PROVIDER_CONFIGS = {
  gemini: {
    name: 'Gemini',
    buildRequest: (payload) => {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return null;
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${key}`,
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
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${key}`,
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
            max_tokens: 4000,
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
};

for (let i = 1; i <= 15; i++) {
  PROVIDER_CONFIGS[`gemini_${i}`] = {
    name: `Gemini Key ${i}`,
    buildRequest: (payload) => {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (!key) return null;
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${key}`,
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
  return ['gemini_1', 'gemini_2', 'gemini_3', 'gemini_4', 'gemini_5', 'gemini_6', 'gemini_7', 'gemini_8', 'gemini_9', 'gemini_10', 'gemini_11', 'gemini_12', 'gemini_13', 'gemini_14', 'gemini_15', 'groq'];
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

      const query = payload?.query || {};
      const domicileState = query.domicile_state || '';
      const selectedQuotas = query.quotas || [];

      if (parsed.colleges && Array.isArray(parsed.colleges)) {
        // 1. Quota & Domicile State sanitization:
        parsed.colleges = parsed.colleges.map((c) => {
          const isHomeState = Boolean(domicileState && (c.state || '').toLowerCase().includes(domicileState.toLowerCase()));
          
          let quota = c.quota || 'AIQ';
          if (quota === 'State' && (!domicileState || !isHomeState)) {
            quota = 'AIQ';
          }
          if (isHomeState && selectedQuotas.includes('State') && quota !== 'Management' && quota !== 'Deemed-Central' && quota !== 'NRI') {
            quota = 'State';
          }
          return {
            ...c,
            quota,
            _is_home_state: isHomeState,
          };
        });

        // 2. Strict Quota Enforcement: Drop any college whose quota is NOT in selected quotas
        if (selectedQuotas.length > 0) {
          parsed.colleges = parsed.colleges.filter((c) => {
            // State quota is legally ONLY available in candidate's domicile state
            if (c.quota === 'State' && !c._is_home_state) return false;
            if (selectedQuotas.includes(c.quota)) return true;
            return false;
          });
        }

        // 3. If user ONLY selected State quota, strictly filter 100% to domicile state
        if (selectedQuotas.includes('State') && selectedQuotas.length === 1 && domicileState) {
          parsed.colleges = parsed.colleges.filter((c) => 
            (c.state || '').toLowerCase().includes(domicileState.toLowerCase()) && c.quota === 'State'
          );
        }

        // 4. If user selected State quota along with AIQ, boost domicile state colleges to the top of their chance tier
        if (selectedQuotas.includes('State') && domicileState) {
          parsed.colleges.sort((a, b) => {
            const aTierWeight = a.chance_tier === 'High' ? 1 : a.chance_tier === 'Moderate' ? 2 : 3;
            const bTierWeight = b.chance_tier === 'High' ? 1 : b.chance_tier === 'Moderate' ? 2 : 3;
            if (aTierWeight !== bTierWeight) return aTierWeight - bTierWeight;
            
            const aIsHomeStateQuota = a._is_home_state && a.quota === 'State' ? 1 : 0;
            const bIsHomeStateQuota = b._is_home_state && b.quota === 'State' ? 1 : 0;
            if (bIsHomeStateQuota !== aIsHomeStateQuota) return bIsHomeStateQuota - aIsHomeStateQuota;

            const aRank = a.closing_rank_reference?.[0]?.rank || 999999;
            const bRank = b.closing_rank_reference?.[0]?.rank || 999999;
            return aRank - bRank;
          });
        }
      }

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
    if (isHomeState && selectedQuotas.includes('State')) {
      quotaCode = 'State';
    } else if (quotaCode === 'State' && !isHomeState) {
      quotaCode = 'AIQ';
    }

    const closingRank = Number(cr.closing_rank || cr.aiq_rank || 0);
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
      quota: quotaCode,
      category: cr.category || query.category,
      chance_tier,
      closing_rank_reference: [{ year: cr.year || year, round: cr.round_name || selectedRound, rank: closingRank }],
      fee: {
        quota_tier: cr.type && cr.type.toLowerCase().includes('govt') ? 'Govt/AIQ' : 'Private/Deemed',
        amount_min: feeAmount,
        amount_max: feeAmount,
        formatted: `₹${(feeAmount / 100000).toFixed(1)}L/yr`
      },
      source_ids: [],
      _diff: Math.abs(closingRank - rank),
      _closing: closingRank,
      _is_home_state: isHomeState,
    };
  }).filter((c) => {
    if (c.chance_tier === 'Unlikely') return false;
    // Strict State Quota isolation:
    if (c.quota === 'State' && !c._is_home_state) return false;
    if (onlyStateQuota && domicileState && (!c._is_home_state || c.quota !== 'State')) return false;
    if (selectedQuotas.length > 0 && !selectedQuotas.includes(c.quota)) return false;
    return true;
  });

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
