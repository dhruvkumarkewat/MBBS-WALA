/**
 * /api/ai-predict — AI-Grounded College & Scholarship Predictor
 *
 * Pipeline: Retrieve context from Supabase → Resolve authority/rounds deterministically →
 * Call AI with grounded prompt + context → Verify grounding → Return PredictorResponse
 */
import supabase from './db-client.js';
import { callAI, verifyGrounding, buildFallbackResponse } from './ai-service.js';
import { getRoundMultiplier } from './_courses.js';

// ── Authority Resolution (deterministic, spec Section 3) ────────────────────

function resolveAuthority(examTrack, quota, domicileState) {
  if (examTrack === 'AYUSH') return 'AACCC-AYUSH';
  if (quota === 'AIQ' || quota === 'Deemed-Central') return 'MCC-AIQ';
  if (quota === 'State' && domicileState) return `STATE:${domicileState}`;
  return 'MCC-AIQ';
}

function isDomicileRestricted(quota) {
  return quota === 'State';
}

// ── Retrieval Layer ─────────────────────────────────────────────────────────

function getCategoryClosing(cutoff, category) {
  if (!cutoff) return null;
  const cat = (category || 'General').toUpperCase();
  if (cat.includes('OBC')) return cutoff.OBC_closing || cutoff.OBC || cutoff.closing_rank || cutoff.closing;
  if (cat.includes('SC')) return cutoff.SC_closing || cutoff.SC || cutoff.closing_rank || cutoff.closing;
  if (cat.includes('ST')) return cutoff.ST_closing || cutoff.ST || cutoff.closing_rank || cutoff.closing;
  if (cat.includes('EWS')) return cutoff.EWS_closing || cutoff.EWS || cutoff.closing_rank || cutoff.closing;
  return cutoff.GEN_closing || cutoff.GEN || cutoff.closing_rank || cutoff.closing;
}

export async function retrieveContext(query) {
  const year = query.score_or_rank?.neet_year || new Date().getFullYear();
  const category = query.category || 'General';
  const examTrack = query.exam_track || 'MBBS_BDS';
  const quotas = query.quotas || ['AIQ'];
  const domicileState = query.domicile_state || null;
  const candidateRank = query.score_or_rank?.value || 30000;
  const selectedRound = query.round || query.round_id || 'Round 1';
  const roundMultiplier = getRoundMultiplier(selectedRound);

  // 1. Qualifying cutoffs
  const { data: qualifyingCutoffs } = await supabase
    .from('qualifying_cutoffs')
    .select('*')
    .eq('exam_track', examTrack);

  // 2. Counselling calendar (available rounds)
  const primaryAuthority = resolveAuthority(examTrack, quotas[0], domicileState);
  const { data: calendarRounds } = await supabase
    .from('counselling_calendar')
    .select('*')
    .eq('authority', primaryAuthority)
    .order('round_number');

  // 3. Closing ranks (cutoffs) from cutoffs table
  let cutoffQuery = supabase
    .from('cutoffs')
    .select('*')
    .eq('category', category)
    .limit(500);

  if (quotas.includes('State') && domicileState && !quotas.includes('AIQ')) {
    cutoffQuery = cutoffQuery.ilike('state', `%${domicileState}%`);
  }

  const { data: directCutoffs } = await cutoffQuery;

  // 4. Also fetch from colleges table to ensure full 1,000 college database coverage
  const { data: allColleges } = await supabase
    .from('colleges')
    .select('id, name, state, type, feeGovt, feePvt, seats, cutoff, hospital_beds, established, bond, counselling')
    .limit(1000);

const DEEMED_KEYWORDS = [
  'patil', 'd.y. patil', 'd. y. patil', 'dy patil', 'manipal', 'kasturba', 'kmc',
  'jss', 'j.s.s', 'hamdard', 'symbiosis', 'kalinga', 'kiit', 'amrita', 
  'sri ramachandra', 'ramachandra', 'srm', 'saveetha', 'meenakshi', 'chettinad', 
  'yenepoya', 'ks hegge', 'k.s. hegde', 'jnmc', 'kle', 'bharati vidyapeeth', 
  'mgm', 'pravara', 'datta meghe', 'krishna institute', 'santosh', 'sharda', 
  'gitam', 'vinayaka mission', 'aarupadai', 'bharath', 'bhaarath', 
  'acs medical', 'rajarajeswari', 'sri devaraj', 'siddhartha', 'sumandeep', 'sbks',
  'dr. m.g.r.', 'drmgr', 'deemed'
];

  // Map colleges into structured closing ranks
  const collegeCutoffs = (allColleges || []).map((col) => {
    const baseClosing = getCategoryClosing(col.cutoff, category);
    if (!baseClosing) return null;
    const closing = Math.round(baseClosing * roundMultiplier);

    const colType = (col.type || '').toLowerCase();
    const colName = (col.name || '').toLowerCase();
    const isDeemed = DEEMED_KEYWORDS.some((k) => colName.includes(k)) || colType.includes('deemed');
    const isGovt = !isDeemed && (colType.includes('govt') || colType.includes('central') || colName.includes('aiims') || colName.includes('jipmer') || colName.includes('government') || colName.includes('gmc') || colName.includes('grant') || colName.includes('king george') || colName.includes('lady hardinge') || colName.includes('vmmc') || colName.includes('safdarjung') || colName.includes('maulana azad'));
    const stateMatch = Boolean(domicileState && (col.state || '').toLowerCase().includes(domicileState.toLowerCase()));

    let quotaCode = 'AIQ';
    if (isDeemed) {
      quotaCode = 'Deemed-Central';
    } else if (isGovt) {
      if (stateMatch && quotas.includes('State')) {
        quotaCode = 'State';
      } else {
        quotaCode = 'AIQ';
      }
    } else {
      if (stateMatch && quotas.includes('State') && !quotas.includes('Management')) {
        quotaCode = 'State';
      } else {
        quotaCode = 'Management';
      }
    }

    const feeVal = isGovt ? (col.feeGovt || 50000) : isDeemed ? (col.feePvt || 2200000) : (col.feePvt || 1400000);

    return {
      id: col.id,
      college_name: col.name,
      state: col.state || 'India',
      aiq_rank: closing,
      closing_rank: closing,
      category: category,
      round_name: selectedRound === 'All Rounds' || selectedRound === 'All' ? 'Round 1' : selectedRound,
      year: year,
      course_name: examTrack === 'AYUSH' ? 'BAMS' : 'MBBS',
      quota_code: quotaCode,
      fee_amount: feeVal,
      seats: col.seats || 100,
      _state_match: stateMatch,
    };
  }).filter(Boolean);

  // Normalize direct cutoffs state matches
  const normalizedDirect = (directCutoffs || []).map((item) => {
    const stateMatch = Boolean(domicileState && (item.state || '').toLowerCase().includes(domicileState.toLowerCase()));
    let quotaCode = item.quota_code || 'AIQ';
    if (stateMatch && quotas.includes('State')) {
      quotaCode = 'State';
    } else if (quotaCode === 'State' && !stateMatch) {
      quotaCode = 'AIQ';
    }
    const closing = Math.round((item.closing_rank || item.aiq_rank || 50000) * roundMultiplier);
    return {
      ...item,
      aiq_rank: closing,
      closing_rank: closing,
      round_name: selectedRound === 'All Rounds' || selectedRound === 'All' ? (item.round_name || 'Round 1') : selectedRound,
      quota_code: quotaCode,
      _state_match: stateMatch,
    };
  });

  // Combine directCutoffs and collegeCutoffs
  const combined = [
    ...normalizedDirect,
    ...collegeCutoffs,
  ];

  // Deduplicate and strictly enforce Quota & Domicile isolation
  const seen = new Set();
  const deduplicated = [];
  const onlyStateQuota = quotas.includes('State') && !quotas.includes('AIQ');

  for (const item of combined) {
    // 1. STRICT QUOTA FILTER: If user specified quotas, NEVER include colleges of unselected quotas
    if (quotas.length > 0 && !quotas.includes(item.quota_code)) {
      continue;
    }

    // 2. STRICT STATE QUOTA DOMICILE ISOLATION: A State Quota seat is legally ONLY available in domicile state
    if (item.quota_code === 'State' && (!domicileState || !item._state_match)) {
      continue;
    }

    // 3. DOMICILE STATE FILTER: If only State Quota was selected, drop all colleges outside domicile state
    if (onlyStateQuota && domicileState && !item._state_match) {
      continue;
    }

    const key = `${(item.college_name || '').trim().toLowerCase()}_${item.category}_${item.quota_code}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(item);
    }
  }

  // Rank relevance scoring for candidate's rank: High, Moderate, Reach
  const scored = deduplicated.map((c) => {
    const closing = c.aiq_rank || c.closing_rank || 0;
    let tier = 'Unlikely';
    if (closing && candidateRank > 0) {
      if (closing >= candidateRank * 1.05 && closing <= candidateRank * 3.0) {
        tier = 'High';
      } else if (closing >= candidateRank * 0.85 && closing < candidateRank * 1.05) {
        tier = 'Moderate';
      } else if (closing >= candidateRank * 0.35 && closing < candidateRank * 0.85) {
        tier = 'Reach';
      }
    }

    return {
      ...c,
      _tier: tier,
      _diff: Math.abs(closing - candidateRank),
      _closing: closing,
    };
  });

  // Filter to eligible tiers and prioritize closest ranks
  const eligible = scored.filter((c) => c._tier !== 'Unlikely');
  const highTier = eligible
    .filter((c) => c._tier === 'High')
    .sort((a, b) => (b._state_match ? 1 : 0) - (a._state_match ? 1 : 0) || a._closing - b._closing)
    .slice(0, 30);
  const modTier = eligible
    .filter((c) => c._tier === 'Moderate')
    .sort((a, b) => (b._state_match ? 1 : 0) - (a._state_match ? 1 : 0) || a._diff - b._diff)
    .slice(0, 20);
  const reachTier = eligible
    .filter((c) => c._tier === 'Reach')
    .sort((a, b) => (b._state_match ? 1 : 0) - (a._state_match ? 1 : 0) || b._closing - a._closing)
    .slice(0, 15);

  const finalClosingRanks = [...highTier, ...modTier, ...reachTier];

  // 5. Fee structures
  const { data: fees } = await supabase
    .from('fee_structures')
    .select('*')
    .limit(200);

  // 6. Scholarships — match by category scope, state scope, and course scope
  const { data: scholarships } = await supabase
    .from('scholarships')
    .select('*')
    .eq('is_active', true);

  const catNorm = (category || 'General').toUpperCase();
  const selectedCourse = examTrack === 'AYUSH' ? 'BAMS' : 'MBBS';

  const matchedScholarships = (scholarships || []).filter((s) => {
    // 1. Category Matching
    if (s.category_scope && s.category_scope.length > 0) {
      const matchesCat = s.category_scope.some((cs) => {
        const csUpper = cs.toUpperCase();
        if (catNorm.includes('OBC') && csUpper.includes('OBC')) return true;
        if (catNorm.includes('SC') && csUpper.includes('SC')) return true;
        if (catNorm.includes('ST') && csUpper.includes('ST')) return true;
        if (catNorm.includes('EWS') && csUpper.includes('EWS')) return true;
        if (catNorm.includes('PWD') && csUpper.includes('PWD')) return true;
        if ((catNorm === 'GENERAL' || catNorm === 'GEN') && (csUpper === 'GENERAL' || csUpper === 'GEN')) return true;
        return csUpper === catNorm;
      });
      if (!matchesCat) return false;
    }

    // 2. State Domicile Matching
    if (s.state_scope && s.state_scope.length > 0 && domicileState) {
      const stateNorm = domicileState.toLowerCase();
      const matchesState = s.state_scope.some(
        (st) => stateNorm.includes(st.toLowerCase()) || st.toLowerCase().includes(stateNorm)
      );
      if (!matchesState) return false;
    }

    // 3. Course Matching
    if (s.course_scope && s.course_scope.length > 0) {
      const matchesCourse = s.course_scope.some((c) => c.toUpperCase() === selectedCourse.toUpperCase());
      if (!matchesCourse) return false;
    }

    return true;
  });

  // 7. Seat matrix
  const { data: seatMatrix } = await supabase
    .from('seat_matrix')
    .select('*')
    .limit(200);

  return {
    qualifying_cutoffs: qualifyingCutoffs || [],
    closing_ranks: finalClosingRanks.length > 0 ? finalClosingRanks : deduplicated.slice(0, 50),
    fees: fees || [],
    scholarships: matchedScholarships,
    seat_matrix: seatMatrix || [],
    calendar_rounds: calendarRounds || [],
  };
}

// ── Build resolved (deterministic) values ───────────────────────────────────

function buildResolved(query, context) {
  const category = query.category || 'General';
  const quotas = query.quotas || ['AIQ'];
  const domicileState = query.domicile_state || null;
  const examTrack = query.exam_track || 'MBBS_BDS';
  const year = query.score_or_rank?.neet_year || 2024;
  const selectedRound = query.round || query.round_id || 'Round 1';
  const roundMultiplier = getRoundMultiplier(selectedRound);

  const authority = resolveAuthority(examTrack, quotas[0], domicileState);

  const availableRounds = (context.calendar_rounds || []).map((r) => ({
    round_id: r.id,
    label: r.round_label,
    status: r.status,
    window: r.reg_start ? { start: r.reg_start, end: r.reg_end } : null,
  }));

  const matchedRound = availableRounds.find(
    (r) => r.label?.toLowerCase() === selectedRound.toLowerCase() || r.round_id === selectedRound
  ) || {
    round_id: 'selected_round',
    label: selectedRound,
    status: 'open',
    window: null,
  };

  return {
    authority,
    round: matchedRound,
    available_rounds: availableRounds.length > 0
      ? availableRounds
      : [{ round_id: 'default_r1', label: selectedRound, status: 'open', window: null }],
    domicile_restrictions: Object.fromEntries(quotas.map((q) => [q, isDomicileRestricted(q)])),
  };
}

// ── Main Handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const startTime = Date.now();

  try {
    const body = req.body || {};

    // Normalize input to spec's query schema
    const query = {
      exam_track: body.exam_track || 'MBBS_BDS',
      score_or_rank: {
        kind: body.rank ? 'air' : 'marks',
        value: Number(body.rank || body.score || 0),
        neet_year: Number(body.neet_year || new Date().getFullYear()),
      },
      category: body.category || 'General',
      quotas: body.quotas || (body.quota ? [body.quota] : ['AIQ']),
      domicile_state: body.domicile_state || body.state || null,
      preferred_states: body.preferred_states || null,
      round: body.round || body.round_id || 'Round 1',
      round_id: body.round_id || null,
    };

    if (!query.score_or_rank.value || query.score_or_rank.value < 1) {
      return res.status(400).json({ error: 'Valid rank or score is required' });
    }

    // Step 1: Retrieve context from database
    const context = await retrieveContext(query);

    // Step 2: Build deterministic resolved values
    const resolved = buildResolved(query, context);

    // Step 3: Prepare payload for AI
    const aiPayload = { query, context, resolved };

    let response;

    try {
      // Step 4: Call AI with failover
      const aiResponse = await callAI(aiPayload);

      // Step 5: Verify grounding
      const groundingCheck = verifyGrounding(aiResponse, context);
      if (!groundingCheck.ok) {
        console.warn('[AI-Predict] Grounding issues:', groundingCheck.issues);
        // Add grounding warning to disclaimers but still use the response
        if (!aiResponse.disclaimers) aiResponse.disclaimers = [];
        aiResponse.disclaimers.push(
          'Some details in this response could not be fully verified against our database. Always cross-check with official sources.'
        );
      }

      response = aiResponse;
    } catch (aiError) {
      console.error('[AI-Predict] All AI providers failed:', aiError.message || aiError);
      // Step 4b: Fall back to deterministic response
      response = buildFallbackResponse(query, context, resolved);
    }

    // Ensure meta always has timing info
    response._response_time_ms = Date.now() - startTime;
    response._data_summary = {
      colleges_in_context: context.closing_ranks.length,
      scholarships_matched: context.scholarships.length,
      qualifying_cutoffs: context.qualifying_cutoffs.length,
      rounds_available: context.calendar_rounds.length,
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error('[AI-Predict] Handler error:', err);
    return res.status(500).json({
      error: 'Prediction service error',
      details: err.message || 'Internal error',
    });
  }
}
