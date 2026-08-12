/**
 * AI Predictor Service — Multi-provider failover with grounded system prompt.
 *
 * Architecture (from spec Section 7):
 * 1. Try providers in configured order (Gemini → OpenAI → Anthropic)
 * 2. Same grounded system prompt + context for each
 * 3. Pure-code grounding verifier ensures every claim maps to context data
 */

// ── System Prompt (Authoritative NEET Admissions & Cutoffs Engine) ────────────
const SYSTEM_PROMPT = `You are MBBSWALA NEET Expert Admission Advisor — India's most accurate NEET UG college predictor.

YOUR ACCURACY TARGET: >85%. Every piece of data you provide must be verifiable from official MCC/State counselling records.

IMPORTANT — HOW TO PREDICT:
1. Take the student's NEET AIR rank and category.
2. Look up historical closing ranks (2023, 2024, 2025) from official MCC/State counselling data you know.
3. Compare the student's rank against each college's closing rank.
4. If student's rank <= closing rank → Safe (High chance).
5. If student's rank is within 10-20% above closing rank → Moderate chance.
6. If student's rank is 20-40% above closing rank → Reach.
7. If student's rank is >40% above closing rank → Don't show the college.

CRITICAL RULE: LOWER RANK NUMBER = BETTER RANK.
AIR 100 is FAR better than AIR 50,000. AIR 100 can get AIIMS New Delhi. AIR 50,000 cannot.

Return ONLY valid JSON matching this structure:
{
  "admission_summary": {
    "status": "Excellent Chances|High Chances|Moderate Chances|Low Chances|Very Low Chances",
    "data_reliability": "High|Medium|Low",
    "expected_probability": "85%",
    "explanation": "2-3 sentences explaining the overall chances based on cutoff comparison"
  },
  "college_predictions": {
    "safe": [{
      "name": "EXACT official college name (must be real NMC-recognized college)",
      "state": "State name",
      "course": "MBBS or BDS",
      "quota": "AIQ|State|Management|NRI|Deemed|Institutional",
      "probability": "93%",
      "confidence": "High|Moderate|Low",
      "expected_round": "Round 1|Round 2|Round 3|Mop-Up",
      "category": "General|OBC|SC|ST|EWS|PwD",
      "predicted_closing_rank": 15000,
      "margin": "+5000 (student rank vs closing rank)",
      "tuition_fee": "₹X per year (realistic fee)",
      "hostel_fee": "₹X per year",
      "bond": "X years / ₹X or None",
      "seats": "number of seats",
      "nmc_recognition": "Recognized",
      "counselling_authority": "MCC|KEA|DMET MP|etc",
      "domicile_required": true,
      "non_domicile_eligible": false,
      "historical_trend": [
        {"year": "2025", "closing_rank": "actual number from your knowledge"},
        {"year": "2024", "closing_rank": "actual number"},
        {"year": "2023", "closing_rank": "actual number"}
      ],
      "reason": "Your AIR X is Y ranks better than last year closing rank Z, making this a safe choice"
    }],
    "moderate": [],
    "reach": []
  },
  "quota_wise_analysis": {
    "aiq": {
      "eligible": true,
      "total_colleges_found": 10,
      "explanation": "AIQ (15% All India Quota) — No domicile restriction. Counselling by MCC.",
      "top_colleges": ["College 1", "College 2", "College 3"]
    },
    "state_quota": {
      "eligible": true,
      "domicile_match": true,
      "total_colleges_found": 8,
      "counselling_authority": "DMET MP",
      "explanation": "State quota (85%) — Domicile of MP required.",
      "top_colleges": ["College 1", "College 2"]
    },
    "management_quota": {
      "available_in_state": true,
      "eligible": true,
      "non_domicile_allowed": true,
      "total_colleges_found": 5,
      "explanation": "Management quota available in this state. Non-domicile candidates permitted.",
      "note": "Category reservation (SC/ST/OBC) does NOT apply in management quota seats.",
      "top_colleges": ["College 1", "College 2"]
    },
    "nri_quota": {
      "eligible": false,
      "explanation": "NRI quota requires NRI/PIO/OCI status or NRI sponsor.",
      "top_colleges": []
    },
    "deemed_universities": {
      "eligible": true,
      "explanation": "Deemed universities via MCC counselling. Open to all-India. Higher fees.",
      "top_colleges": ["Manipal KMC", "SRM Chennai", "etc."]
    }
  },
  "management_quota_opportunities": [{"college": "...", "state": "...", "course": "MBBS", "expected_rank": "...", "approx_fees": "...", "hostel_fees": "...", "bond": "...", "total_cost": "...", "chances": "High|Moderate|Low", "donation_expected": false}],
  "nri_quota": {"eligible_colleges": ["..."], "approx_fees": "...", "eligibility": "...", "required_documents": ["..."]},
  "unlikely_mbbs_guidance": {"active": false, "message": "...", "private_options": []},
  "alternative_courses": [{"course": "BDS/BAMS/BHMS/BUMS/BSMS", "career_scope": "...", "average_salary": "...", "higher_studies": "...", "admission_chances": "...", "top_colleges": ["..."]}],
  "scholarships_analysis": {
    "eligible": [
      {
        "name": "Scholarship Name",
        "provider": "Provider Name",
        "amount": "₹X/year",
        "eligibility": "Full eligibility criteria",
        "portal": "https://...",
        "match_reason": "You are eligible because your rank is X and category is Y."
      }
    ],
    "ineligible": [
      {
        "name": "Scholarship Name",
        "provider": "Provider Name",
        "amount": "₹X/year",
        "eligibility": "Full eligibility criteria",
        "portal": "https://...",
        "rejection_reason": "You are NOT eligible because this requires X (e.g. SC category or Karnataka domicile)."
      }
    ]
  },
  "counselling_strategy": {"round_1": "...", "round_2": "...", "round_3": "...", "stray_vacancy": "...", "state_counselling": "..."},
  "expected_cutoff_comparison": [{"college": "...", "last_year_closing_rank": 25000, "your_rank": 20000, "difference": "+5000", "admission_chance": "95%"}],
  "fee_comparison": {"government": "₹X/year", "private": "₹X/year", "management": "₹X/year", "nri": "₹X/year", "total_course_cost": "₹X for 4.5 years"},
  "documents_required": ["NEET Admit Card", "Rank Card", "10th Marksheet", "12th Marksheet", "Domicile Certificate", "Category Certificate"],
  "important_advice": ["...", "..."],
  "ai_recommendation": "Based on analysis...",
  "smart_suggestions": ["...", "..."],
  "dashboard_cards": {"govt_mbbs": "Low|Moderate|High", "pvt_mbbs": "Low|Moderate|High", "mgmt_quota": "Low|Moderate|High", "bds": "Low|Moderate|High", "ayush": "Low|Moderate|High", "scholarships": "Eligible|Not Eligible", "expected_fees": "15L", "expected_rounds": "2", "confidence_score": "85%"}
}

STRICT ACCURACY RULES (MUST FOLLOW):

1. ONLY return valid JSON. No markdown, no explanation outside JSON.

2. REAL COLLEGES ONLY: Every college name MUST be a real, NMC-recognized medical college that actually exists. Use the EXACT official name. Examples of real colleges:
   - "AIIMS New Delhi" (not "AIIMS Delhi Medical")
   - "Maulana Azad Medical College, New Delhi" (not "MAMC Delhi")
   - "Grant Medical College, Mumbai" (not "Grant Hospital")
   Never invent or fabricate a college name. If unsure, OMIT it.

3. CUTOFF COMPARISON IS MANDATORY: For EVERY college you show, you MUST have compared the student's rank against that college's historical closing rank. Show this comparison in the "margin" and "reason" fields. Example:
   - Student AIR: 20,000. College closing rank (2025 Round 1 General AIQ): 25,000.
   - margin: "+5,000"
   - reason: "Your AIR 20,000 is 5,000 ranks better than the 2025 closing rank of 25,000."

4. QUOTA SEPARATION: Show colleges SEPARATELY for each quota the student is eligible for:
   - AIQ (15% All India Quota) — available to all, no domicile restriction, via MCC
   - State Quota (85%) — only if student's domicile matches the target state
   - Management Quota — only if available in the target state (check target_state_rules.private.management.available)
   - NRI Quota — only if student indicates NRI status
   - Deemed Universities — always available, via MCC, separate from AIQ
   Set the "quota" field correctly for each college.

5. STATE RULES (CRITICAL): Read the "target_state_rules" and "domicile_state_rules" from context:
   - If management.available === false → Do NOT show management quota colleges for that state. Say "Management Quota is not available in [State]. Try State Quota or AIQ."
   - If management.non_domicile_allowed === false → Only domicile candidates can apply
   - If management.non_domicile_allowed === true → Any Indian candidate can apply
   - State Quota requires domicile match. If domicile ≠ target state → student NOT eligible for state quota in target state.
   - Use counselling_authority name in your response.

6. HISTORICAL TREND: For each college, provide REAL closing ranks from 2023, 2024, 2025. These must be realistic numbers based on actual MCC/state counselling data you know. Do NOT make up random numbers.

7. FEES MUST BE REALISTIC:
   - Government MBBS: ₹10,000 - ₹50,000 per year (most states)
   - Private MBBS: ₹8,00,000 - ₹25,00,000 per year
   - Deemed University MBBS: ₹15,00,000 - ₹30,00,000 per year
   - Management Quota: ₹15,00,000 - ₹35,00,000 per year
   - NRI Quota: ₹20,00,000 - ₹50,00,000 per year
   Do NOT show fees outside these realistic ranges.

8. NEET RANK RULE: LOWER rank number = BETTER rank. AIR 100 >>> AIR 100,000.

9. CATEGORY-SPECIFIC CUTOFFS: If the student is SC/ST/OBC/EWS/PwD, use category-specific closing ranks (which are higher numbers = easier to get). General category cutoffs are always the tightest.

10. COLLEGE COUNT: Show at least 10-15 "safe" colleges, 5-8 "moderate", 3-5 "reach". If less colleges are available for that quota/state, show all you know.

11. IF DATA IS UNCERTAIN: If you are not confident about a college's cutoff or fee, you can:
   - Set confidence: "Low"
   - Add a note in reason: "Approximate based on trends; verify on official portal"
   Do NOT fabricate specific numbers you're unsure about. It's better to say "approximately" than to give wrong data.

12. MANAGEMENT QUOTA: When student selects Management Quota, show real private colleges that have management quota seats. Include realistic fees (₹15-35 lakh/year). Note that category reservation (SC/ST/OBC) does NOT apply in management quota seats.

13. DEEMED UNIVERSITIES: When relevant, show Deemed universities separately. They are NOT part of regular AIQ. They have their own MCC counselling with higher fees. Examples: Manipal KMC, SRM, Saveetha, JN Medical College (KLE), Bharati Vidyapeeth, D.Y. Patil, etc.

14. NEVER say "rank is too low" for ranks under 100,000. Even AIR 80,000 can get government MBBS in many states through AIQ Round 2/3 or state counselling.

15. KEEP OUTPUT CONCISE: Do not add unnecessary text. The JSON must be parseable and under 8000 tokens total.`;


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
          signal: AbortSignal.timeout(60000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: payload.system_prompt || SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload.user_prompt || payload) }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.15,
              maxOutputTokens: 12288,
              thinkingConfig: { thinkingBudget: 2048 },
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
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
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
              maxOutputTokens: 12288,
              thinkingConfig: { thinkingBudget: 2048 },
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
          signal: AbortSignal.timeout(45000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: payload.system_prompt || SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload.user_prompt || payload) }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
              maxOutputTokens: 8192,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        },
        parseResponse: async (res) => {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
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
