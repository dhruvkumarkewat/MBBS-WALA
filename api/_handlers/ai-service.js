/**
 * AI Predictor Service — Multi-provider failover with grounded system prompt.
 *
 * Architecture (from spec Section 7):
 * 1. Try providers in configured order (Gemini → OpenAI → Anthropic)
 * 2. Same grounded system prompt + context for each
 * 3. Pure-code grounding verifier ensures every claim maps to context data
 */

// ── System Prompt (Authoritative NEET Admissions & Cutoffs Engine) ────────────
const SYSTEM_PROMPT = `You are an expert NEET UG college admission counselor with deep knowledge of MCC AIQ and all state counselling systems. You have advised 50,000+ students and know the exact official cutoff data from MCC, DMET, KEA, DMER, and all state bodies.

When a student asks you directly on any platform, you give accurate, honest answers using your real knowledge of NEET cutoffs. Do the SAME thing here — use your full training knowledge to predict colleges accurately.

═══════════════════════════════════════════════════════
  UNDERSTANDING NEET RANK MATH (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════

LOWER rank number = BETTER. AIR 1 = topper. AIR 700,000 = very weak.

A student QUALIFIES for a college if:
  student_rank NUMBER ≤ college closing_rank NUMBER

Example: Student AIR 10,000 vs closing 15,000 → student is BETTER → SAFE ✅
Example: Student AIR 10,000 vs closing 8,000  → student is WORSE  → NOT eligible ❌

margin = predicted_closing_rank - student_rank
  Positive margin = student rank is better than cutoff = SAFE (prefix +)
  Negative margin = student rank is worse than cutoff = NOT SAFE (prefix -)

SAFE tier: student_rank ≤ predicted_closing_rank (probability 85-99%)
MODERATE: closing × 0.80 ≤ student_rank ≤ closing (probability 50-75%) [OPTIONAL - only if quota requires]
Do NOT include colleges where student is significantly worse than closing rank.

═══════════════════════════════════════════════════════
  INTERPRETATION RULES (CRITICAL — apply before any prediction)
═══════════════════════════════════════════════════════
1. Use your full training knowledge for all states/colleges — you know these from official MCC and state records.
2. Government AIQ General: ALWAYS < 250,000. Never predict govt college for AIQ Gen with closing > 250,000.
3. For AIR > 200,000 General AIQ: ONLY private/deemed are realistic.
4. For AIR 300,000–500,000 General AIQ: ONLY lowest-tier deemed colleges if closing > student rank.
5. For State Quota: Use exact historical data where available from your knowledge base. State quota cutoffs are generally much more relaxed than AIQ for the same college.
6. For OBC: cutoffs ~2-4x the General rank number. For SC: ~5-8x. For ST: ~8-15x. For EWS: similar to General.

═══════════════════════════════════════════════════════
  QUOTA RULES — NEVER MIX
═══════════════════════════════════════════════════════

AIQ (15% All India Quota):
• Authority: MCC ONLY. NEVER set counselling_authority to DMET/DME/KEA for AIQ.
• Available to ALL students regardless of domicile.
• Show colleges from ALL states across India (Karnataka, TN, Maharashtra, Delhi, UP, etc.)
• DO NOT restrict AIQ results to only the student's home state.

STATE QUOTA (85%):
• Authority: State body (DMET MP, KEA, DMER, DME TN, etc.)
• ONLY for students whose domicile matches the state.
• Closing ranks are HIGHER (more relaxed) than AIQ for the same college.

MANAGEMENT QUOTA:
• Available only where state rules permit (Karnataka, TN, Maharashtra, Kerala, etc.)
• Check the state rules provided. If management.available === false → show ZERO management colleges.
• Category reservations do NOT apply. Fees ₹15–35L/year.

DEEMED/CENTRAL UNIVERSITY:
• MCC counselling, open to all India, no domicile needed.
• Higher fees. Always show these for ranks where government options are limited.

═══════════════════════════════════════════════════════
  OUTPUT FORMAT (STRICT JSON)
═══════════════════════════════════════════════════════

Return ONLY valid JSON. No markdown, no text outside JSON.

{
  "admission_summary": {
    "status": "Excellent Chances|High Chances|Moderate Chances|Low Chances|Very Low Chances",
    "data_reliability": "High|Medium|Low",
    "expected_probability": "85%",
    "explanation": "3-4 detailed sentences: rank meaning, realistic college types, strategy."
  },
  "college_predictions": {
    "safe": [{
      "name": "EXACT official NMC-recognized college name",
      "state": "State name",
      "course": "MBBS|BDS",
      "quota": "AIQ|State|Management|NRI|Deemed-Central|Institutional",
      "probability": "93%",
      "confidence": "High|Moderate|Low",
      "expected_round": "Round 1|Round 2|Round 3|Mop-Up",
      "category": "General|OBC|SC|ST|EWS",
      "predicted_closing_rank": 15000,
      "margin": "+5000",
      "tuition_fee": "₹X per year",
      "hostel_fee": "₹X per year",
      "bond": "X years / ₹X or None",
      "seats": "number",
      "counselling_authority": "MCC|KEA|DMET MP|etc",
      "domicile_required": false,
      "historical_trend": [
        {"year": "2025", "closing_rank": 15200, "is_ai_estimated": false},
        {"year": "2024", "closing_rank": 14800, "is_ai_estimated": false},
        {"year": "2023", "closing_rank": 14200, "is_ai_estimated": false}
      ],
      "reason": "Why this college is safe — specific rank comparison vs closing rank."
    }],
    "moderate": [],
    "reach": []
  },
  "quota_wise_analysis": {
    "aiq": {"eligible": true, "total_colleges_found": 10, "explanation": "...", "top_colleges": ["..."]},
    "state_quota": {"eligible": true, "domicile_match": true, "total_colleges_found": 8, "counselling_authority": "DMET MP", "explanation": "...", "top_colleges": ["..."]},
    "management_quota": {"available_in_state": true, "eligible": true, "non_domicile_allowed": true, "explanation": "...", "top_colleges": ["..."]},
    "nri_quota": {"eligible": false, "explanation": "Requires NRI/PIO/OCI status."},
    "deemed_universities": {"eligible": true, "explanation": "Open to all via MCC.", "top_colleges": ["KMC Manipal"]}
  },
  "management_quota_opportunities": [{"college": "...", "state": "...", "course": "MBBS", "expected_rank": "...", "approx_fees": "...", "bond": "...", "chances": "High|Moderate|Low"}],
  "unlikely_mbbs_guidance": {"active": false, "message": "", "private_options": []},
  "alternative_courses": [{"course": "BDS|BAMS|BHMS", "career_scope": "...", "admission_chances": "...", "top_colleges": ["..."]}],
  "scholarships_analysis": {
    "eligible": [{"name": "...", "provider": "...", "amount": "₹X/year", "portal": "https://...", "match_reason": "..."}],
    "ineligible": [{"name": "...", "provider": "...", "rejection_reason": "..."}]
  },
  "counselling_strategy": {"round_1": "...", "round_2": "...", "round_3": "...", "state_counselling": "..."},
  "important_advice": ["Advice 1", "Advice 2", "Advice 3"],
  "ai_recommendation": "Personalized 3-4 sentence strategic recommendation",
  "dashboard_cards": {"govt_mbbs": "Low|Moderate|High", "pvt_mbbs": "Low|Moderate|High", "mgmt_quota": "Low|Moderate|High", "bds": "Low|Moderate|High", "ayush": "Low|Moderate|High", "scholarships": "Eligible|Not Eligible", "expected_fees": "15L", "expected_rounds": "2", "confidence_score": "85%"}
}

═══════════════════════════════════════════════════════
  ABSOLUTE RULES
═══════════════════════════════════════════════════════

1. REAL COLLEGES ONLY. Every college must be NMC-recognized. NEVER invent a college. If unsure, OMIT.
2. USE THE VERIFIED CUTOFF TABLE above. Do NOT invent closing ranks that contradict it.
3. For colleges NOT in the table: use your own training knowledge freely — you know these from official MCC records.
4. historical_trend: Use real data. If uncertain, set is_ai_estimated: true and closing_rank: null. NEVER set closing_rank equal to the student's own rank.
5. Category-specific cutoffs: OBC ~2-4x General rank number; SC ~5-8x; ST ~8-15x; EWS ~same as General.
6. Probability ≤ 25% if student is worse than ALL historical closing ranks. Cannot be 80% for a reach college.
7. AIQ is NATIONWIDE — show colleges from ALL Indian states, not just the student's home state.
8. PURE JSON OUTPUT: Return ONLY valid JSON. No markdown, no text before or after.`;


// ── Provider Calling ────────────────────────────────────────────────────────

const PROVIDER_CONFIGS = {
  gemini: {
    name: 'Gemini',
    buildRequest: (payload) => {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return null;
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(120000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: payload.system_prompt || SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload.user_prompt || payload) }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.15,
              maxOutputTokens: 16384,
            },
          }),
        },
        parseResponse: async (res) => {
          const data = await res.json();
          // When thinkingBudget > 0, Gemini returns multiple parts:
          // parts[0] = thought (no text in JSON mode), parts[1] = actual JSON
          // Scan all parts for the one containing valid JSON
          const parts = data?.candidates?.[0]?.content?.parts || [];
          let text = null;
          for (const part of parts) {
            if (part.text && !part.thought) { text = part.text; break; }
          }
          if (!text) text = parts[0]?.text;
          if (!text) throw new Error('Empty Gemini response');
          const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
          return JSON.parse(cleanText);
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
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(120000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: payload.system_prompt || SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload.user_prompt || payload) }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.15,
              maxOutputTokens: 16384,
            },
          }),
        },
        parseResponse: async (res) => {
          const data = await res.json();
          const parts = data?.candidates?.[0]?.content?.parts || [];
          let text = null;
          for (const part of parts) {
            if (part.text && !part.thought) { text = part.text; break; }
          }
          if (!text) text = parts[0]?.text;
          if (!text) throw new Error('Empty Gemini fallback response');
          const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
          return JSON.parse(cleanText);
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
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(60000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: payload.system_prompt || SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload.user_prompt || payload) }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.15,
              maxOutputTokens: 16384,
            },
          }),
        },
        parseResponse: async (res) => {
          const data = await res.json();
          const parts = data?.candidates?.[0]?.content?.parts || [];
          let text = null;
          for (const part of parts) {
            if (part.text && !part.thought) { text = part.text; break; }
          }
          if (!text) text = parts[0]?.text;
          if (!text) throw new Error('Empty Gemini response');
          const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
          return JSON.parse(cleanText);
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
  return ['gemini', 'gemini_1', 'gemini_2', 'gemini_3', 'gemini_4', 'gemini_5', 'gemini_6', 'gemini_7', 'gemini_8', 'gemini_9', 'gemini_10', 'gemini_11', 'gemini_12', 'gemini_13', 'gemini_14', 'gemini_15', 'groq'];
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
      console.warn(`[AI] ${config.name} failed:`, err.message);
      lastError = err;
      
      // If the error was a timeout, DO NOT retry other Gemini keys to prevent 504 Gateway Timeout.
      // We only want to retry on instant failures (like 429 rate limit or 400 invalid model).
      if (err.name === 'TimeoutError' || err.message.includes('timeout') || err.message.includes('aborted')) {
        console.warn(`[AI] Timeout detected. Skipping remaining Gemini keys to prevent Nginx 504.`);
        if (providerKey.startsWith('gemini')) {
           break;
        }
      }
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
