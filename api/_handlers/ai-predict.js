/**
 * /api/ai-predict — AI-Powered College & Scholarship Predictor
 *
 * Pipeline: Resolve authority/rounds → Pass state eligibility rules to AI →
 * AI generates predictions from its own knowledge → Return response
 */
import supabase from './db-client.js';
import { callAI } from './ai-service.js';
import { getRoundMultiplier } from './_courses.js';
import { getStateRules } from './_state-rules.js';

// ── Authority Resolution (deterministic, spec Section 3) ────────────────────
export const maxDuration = 60;

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
  const cat = String(category || 'General').toUpperCase();
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
    .gte('closing_rank', Math.max(1, candidateRank - 15000))
    .order('closing_rank', { ascending: true })
    .limit(3000);

  if (examTrack === 'MBBS_BDS') {
    cutoffQuery = cutoffQuery.in('course_name', ['MBBS', 'BDS']);
  } else if (examTrack === 'AYUSH') {
    cutoffQuery = cutoffQuery.in('course_name', ['BAMS', 'BUMS', 'BHMS', 'BSMS', 'BNYS']);
  }

  // Only forcefully restrict the database query to the domicile state if State Quota is the ONLY quota selected.
  // If Management or NRI is selected alongside it, we must allow cross-state queries.
  if (quotas.includes('State') && domicileState && quotas.length === 1) {
    cutoffQuery = cutoffQuery.ilike('state', `%${domicileState}%`);
  }

  // Filter out any garbage data that might have been incorrectly labelled as MBBS
  cutoffQuery = cutoffQuery
    .not('college_name', 'ilike', '%ITI %')
    .not('college_name', 'ilike', '%NCVT%')
    .not('college_name', 'eq', 'Regulations');

  const { data: directCutoffs } = await cutoffQuery;

  // 4. Also fetch from colleges table to ensure full database coverage
  let collegesQuery = supabase
    .from('colleges')
    .select('id, name, state, type, feeGovt, feePvt, seats, cutoff, hospital_beds, established, bond, counselling, course')
    .limit(3000);

  if (examTrack === 'MBBS_BDS') {
    collegesQuery = collegesQuery.in('course', ['MBBS', 'BDS']);
  } else if (examTrack === 'AYUSH') {
    collegesQuery = collegesQuery.in('course', ['BAMS', 'BUMS', 'BHMS', 'BSMS', 'BNYS']);
  }

  const { data: allColleges } = await collegesQuery;

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

  // ── State-Aware Quota Availability ─────────────────────────────────────────
  // States where a separate Management Quota exists (private colleges fill seats
  // via management/institutional quota outside state counselling).
  // In other states, private college seats go through the state counselling process
  // (e.g., DMET MP, DMER MH state rounds), so "Management Quota" as a separate
  // category doesn't apply — those seats are part of State Quota.
  const MANAGEMENT_QUOTA_STATES = new Set([
    'karnataka', 'tamil nadu', 'kerala', 'telangana', 'andhra pradesh',
    'maharashtra', 'gujarat', 'rajasthan', 'west bengal', 'bihar',
    'jharkhand', 'chhattisgarh', 'haryana', 'punjab', 'uttarakhand',
    'himachal pradesh', 'odisha', 'assam',
  ]);

  const targetStateLower = (query.target_state || '').toLowerCase();
  const domicileStateLower = (domicileState || '').toLowerCase();
  // Determine if management quota is relevant for the target or domicile state
  const mgmtQuotaRelevantState = targetStateLower || domicileStateLower;
  const isMgmtQuotaAvailable = MANAGEMENT_QUOTA_STATES.has(mgmtQuotaRelevantState);

  // Map colleges into structured closing ranks
  const collegeCutoffs = (allColleges || []).map((col) => {
    if (!col.name || col.name === '-' || col.name.length < 3) return null;
    
    const colType = (col.type || '').toLowerCase();
    const colName = (col.name || '').toLowerCase();
    const isDeemed = colType.includes('deemed') || ['patil', 'manipal', 'jss', 'srm', 'saveetha', 'bharati'].some((k) => colName.includes(k));
    const isGovt = !isDeemed && (colType.includes('government') || colType.includes('govt') || colType.includes('central') || colName.includes('aiims') || colName.includes('jipmer') || colName.includes('medical college,') || colName.includes('government'));

    let baseClosing = getCategoryClosing(col.cutoff, category);
    
    // For Private/Deemed colleges without explicit cutoffs:
    // Only assign a default closing rank if Management Quota is actually available
    // in the relevant state. Otherwise, drop the college — it would fabricate data.
    if (!baseClosing) {
      const colStateLower = (col.state || '').toLowerCase();
      const colStateHasMgmt = MANAGEMENT_QUOTA_STATES.has(colStateLower);
      if (!isGovt && colStateHasMgmt) {
        baseClosing = 1500000; // Management quota is fee-based; any NEET-qualified candidate eligible
      } else {
        return null; // No cutoff data and no management quota → skip
      }
    }
    
    const closing = Math.round(baseClosing * roundMultiplier);
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

    const feeVal = isGovt ? (col.feeGovt || null) : (col.feePvt || null);
    const feeString = feeVal ? `₹${Number(feeVal).toLocaleString('en-IN')}` : 'Check Govt/State Portal';

    return {
      id: col.id,
      college_name: col.name,
      state: col.state || 'India',
      aiq_rank: closing,
      closing_rank: closing,
      category: category,
      round_name: selectedRound === 'All Rounds' || selectedRound === 'All' ? 'Round 1' : selectedRound,
      year: year,
      course_name: col.course || (examTrack === 'AYUSH' ? 'BAMS' : 'MBBS'),
      quota_code: quotaCode,
      fee_amount: feeString,
      seats: col.seats || null,
      bond: col.bond || null,
      hospital_beds: col.hospital_beds || null,
      established: col.established || null,
      _state_match: stateMatch,
    };
  }).filter(Boolean);

  // Normalize direct cutoffs state matches
  const normalizedDirect = (directCutoffs || []).map((item) => {
    const stateMatch = Boolean(domicileState && (item.state || '').toLowerCase().includes(domicileState.toLowerCase()));
    let quotaCode = item.quota_code || 'AIQ';
    const isStateQuota = quotaCode.toUpperCase().includes('STATE') || quotaCode.toUpperCase().includes('SQ');
    if (stateMatch && quotas.includes('State') && isStateQuota) {
      quotaCode = 'State';
    }
    
    // Attempt to enrich direct cutoffs with exact college details if available
    const matchedCol = (allColleges || []).find(c => c.name && c.name.toUpperCase() === item.college_name.toUpperCase());
    
    const closing = Math.round((item.closing_rank || item.aiq_rank || 50000) * roundMultiplier);
    return {
      ...item,
      aiq_rank: closing,
      closing_rank: closing,
      round_name: selectedRound === 'All Rounds' || selectedRound === 'All' ? (item.round_name || 'Round 1') : selectedRound,
      quota_code: quotaCode,
      seats: matchedCol ? matchedCol.seats : null,
      bond: matchedCol ? matchedCol.bond : null,
      hospital_beds: matchedCol ? matchedCol.hospital_beds : null,
      established: matchedCol ? matchedCol.established : null,
      _state_match: stateMatch,
    };
  });

  // Combine directCutoffs and collegeCutoffs
  const combined = [
    ...normalizedDirect,
    ...collegeCutoffs,
  ];

  // Deduplicate and strictly enforce Quota & Domicile isolation
  const seenNames = new Set();
  const deduplicated = [];
  const onlyStateQuota = quotas.includes('State') && quotas.length === 1;
  const targetState = query.target_state;

  for (const item of combined) {
    if (!item.college_name || item.college_name === '-' || item.college_name.length < 3) continue;

    // STRICT MEDICAL KEYWORD FILTER: Reject all garbage data from the database
    const nameUpper = String(item.college_name).toUpperCase();
    const isValidMedical = /MEDICAL|COLLEGE|INSTITUTE|UNIVERSITY|HOSPITAL|AIIMS|JIPMER|GMC|AMC|SMC|RIMS|VIMS|PIMS|MIMS|SIMS|AIMS|KIMS|BJMC|SCIENCE|ACADEMY|FACULTY|DENTAL|AYURVED|HOMOEOPATH|UNANI/i.test(nameUpper);
    if (!isValidMedical) continue;

    let dedupKey = item.college_name.split(',')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (nameUpper.includes('RML')) dedupKey = 'rmlhospital';
    if (nameUpper.includes('VMMC') || nameUpper.includes('SAFDARJUNG')) dedupKey = 'vmmcsafdarjung';

    if (seenNames.has(dedupKey)) continue;

    if (/AIIMS|JIPMER/i.test(nameUpper)) item.quota_code = 'AIQ';
    if (/DENTAL|BDS/i.test(nameUpper)) item.course_name = 'BDS';
    
    // 1. STRICT QUOTA FILTER: If user specified quotas, NEVER include colleges of unselected quotas
    // EXCEPTION: If candidate rank is poor (> 150000), allow Management/Deemed colleges as a fallback so the AI can suggest them
    const isFallbackOption = candidateRank > 150000 && (item.quota_code === 'Management' || item.quota_code === 'Deemed-Central');
    if (quotas.length > 0 && !quotas.includes(item.quota_code) && !isFallbackOption) {
      continue;
    }

    // 2. STRICT STATE QUOTA DOMICILE ISOLATION: A State Quota seat is legally ONLY available in domicile state
    if (item.quota_code === 'State' && (!domicileState || !item._state_match)) {
      continue;
    }

    // 3. DOMICILE STATE FILTER: If only State Quota was selected, drop all colleges outside domicile state
    if (onlyStateQuota && !item._state_match) {
      continue;
    }

    // 4. TARGET STATE FILTER: If target state is specified, only include colleges from that state
    if (targetState) {
      const tStateMatch = Boolean((item.state || '').toLowerCase().includes(targetState.toLowerCase()));
      if (!tStateMatch) continue;
    }

    seenNames.add(dedupKey);
    deduplicated.push(item);
  }

  // Rank relevance scoring for candidate's rank: High, Moderate, Reach
  const scored = deduplicated.map((c) => {
    const closing = c.aiq_rank || c.closing_rank || 0;
    let tier = 'Unlikely';
    if (closing && candidateRank > 0) {
      if (closing >= candidateRank) {
        tier = 'High'; // Safe
      } else if (closing >= candidateRank * 0.70) {
        tier = 'Moderate';
      } else if (closing >= candidateRank * 0.20) {
        tier = 'Reach';
      }
    }

    let percentage = 0;
    if (closing > 0 && candidateRank > 0) {
        const ratio = closing / candidateRank; 
        if (ratio >= 1.5) percentage = 95 + Math.floor(Math.random() * 4);
        else if (ratio >= 1.1) percentage = 90 + Math.floor((ratio - 1.1) * 12.5);
        else if (ratio >= 1.0) percentage = 85 + Math.floor((ratio - 1.0) * 50);
        else if (ratio >= 0.95) percentage = 75 + Math.floor((ratio - 0.95) * 200);
        else if (ratio >= 0.85) percentage = 50 + Math.floor((ratio - 0.85) * 250);
        else if (ratio >= 0.70) percentage = 30 + Math.floor((ratio - 0.70) * 133);
        else if (ratio >= 0.50) percentage = 10 + Math.floor((ratio - 0.50) * 100);
        else percentage = 1 + Math.floor(ratio * 18);
        
        percentage = Math.max(1, Math.min(99, percentage));
    }

    return {
      ...c,
      _tier: tier,
      _chance_percentage: percentage,
      _diff: Math.abs(closing - candidateRank),
      _closing: closing,
    };
  });

  // ── Attach per-college eligibility evaluation ──────────────────────────────
  const candidate = {
    domicile_state: domicileState,
    category: category,
    rank: candidateRank,
    is_nri: !!(query.nri_status),
    is_minority: !!(query.minority_status),
  };

  const scoredWithEligibility = scored.map(c => {
    // Find the original college record to get type info
    const matchedCol = (allColleges || []).find(
      col => col.name && c.college_name &&
        col.name.toLowerCase().replace(/[^a-z0-9]/g, '') ===
        c.college_name.toLowerCase().replace(/[^a-z0-9]/g, '')
    );
    const collegeForEval = {
      name: c.college_name,
      state: c.state,
      type: matchedCol?.type || (c.quota_code === 'Deemed-Central' ? 'Deemed' : c.quota_code === 'AIQ' ? 'Government' : 'Private'),
    };
    const eligibility = evaluateEligibility(candidate, collegeForEval);
    return { ...c, _eligibility: eligibility };
  });

  const eligible = scoredWithEligibility.filter((c) => c._tier !== 'Unlikely');
  let highTier = eligible
    .filter((c) => c._tier === 'High')
    .sort((a, b) => a._closing - b._closing)
    .slice(0, 20);
  let modTier = eligible
    .filter((c) => c._tier === 'Moderate')
    .sort((a, b) => a._diff - b._diff)
    .slice(0, 10);
  let reachTier = eligible
    .filter((c) => c._tier === 'Reach')
    .sort((a, b) => a._diff - b._diff)
    .slice(0, 5);

  let finalClosingRanks = [...highTier, ...modTier, ...reachTier];
  if (finalClosingRanks.length < 5 && deduplicated.length > 0) {
    // Re-score deduplicated with eligibility
    finalClosingRanks = deduplicated.map(c => {
      const matchedCol = (allColleges || []).find(
        col => col.name && c.college_name &&
          col.name.toLowerCase().replace(/[^a-z0-9]/g, '') ===
          c.college_name.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      const collegeForEval = {
        name: c.college_name,
        state: c.state,
        type: matchedCol?.type || 'Unknown',
      };
      return { ...c, _eligibility: evaluateEligibility(candidate, collegeForEval) };
    }).slice(0, 20);
  }

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

  const catNorm = String(category || 'General').toUpperCase();
  const selectedCourse = examTrack === 'AYUSH' ? 'BAMS' : 'MBBS';

  const matchedScholarships = (scholarships || []).filter((s) => {
    // 1. Category Matching
    if (s.category_scope && s.category_scope.length > 0) {
      const matchesCat = s.category_scope.some((cs) => {
        const csUpper = cs?.toUpperCase() || '';
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
        (st) => {
          const stLower = st?.toLowerCase() || '';
          return stateNorm.includes(stLower) || stLower.includes(stateNorm);
        }
      );
      if (!matchesState) return false;
    }

    // 3. Course Matching
    if (s.course_scope && s.course_scope.length > 0) {
      const matchesCourse = s.course_scope.some((c) => c?.toUpperCase() === String(selectedCourse).toUpperCase());
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
    _candidate: candidate,
    _target_state: query.target_state || query.domicile_state || null,
    // Legacy flag kept for backward compatibility
    _mgmt_quota_available: isMgmtQuotaAvailable,
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
      target_state: body.target_state || null,
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
    // Pass state eligibility rules as context so the AI knows what quotas are valid
    // but do NOT pass DB colleges — let the AI predict from its own knowledge
    const targetStateRulesForAI = getStateRules(query.target_state || query.domicile_state);
    const domicileStateRulesForAI = query.domicile_state ? getStateRules(query.domicile_state) : null;
    
    const aiPayload = { 
      query, 
      context: {
        // Pass state eligibility rules to guide the AI
        target_state_rules: targetStateRulesForAI ? {
          state: query.target_state || query.domicile_state,
          counselling_authority: targetStateRulesForAI.counselling_authority,
          government: targetStateRulesForAI.government,
          private: targetStateRulesForAI.private,
        } : null,
        domicile_state_rules: domicileStateRulesForAI && domicileStateRulesForAI !== targetStateRulesForAI ? {
          state: query.domicile_state,
          counselling_authority: domicileStateRulesForAI.counselling_authority,
          government: domicileStateRulesForAI.government,
          private: domicileStateRulesForAI.private,
        } : null,
        // Pass scholarships from DB (these are useful data, not college predictions)
        scholarships: (context.scholarships || []).slice(0, 5),
      }, 
      resolved 
    };

    let response;

    try {
      // Step 4: Call AI — use AI's response directly (no DB override)
      const aiResponse = await callAI(aiPayload);
      
      // The AI generates all college predictions from its own knowledge.
      // We only verify basic structure is present.
      if (!aiResponse.college_predictions) {
        aiResponse.college_predictions = { safe: [], moderate: [], reach: [] };
      }
      if (!aiResponse.management_quota_opportunities) {
        aiResponse.management_quota_opportunities = [];
      }

      // Pass DB scholarships if AI didn't generate them
      if (context.scholarships?.length > 0) {
        aiResponse.exact_scholarships = context.scholarships.map(s => ({
          name: s.name,
          provider: s.provider,
          amount: s.amount,
          eligibility: s.eligibility_criteria,
          portal: s.application_url,
        }));
      }

      response = aiResponse;
    } catch (aiError) {
      console.error('[AI-Predict] All AI providers failed:', aiError.message || aiError);
      // Minimal fallback when AI is completely down — no DB colleges
      response = {
        admission_summary: {
          status: 'Service Temporarily Unavailable',
          explanation: 'Our AI prediction service is temporarily unavailable. Please try again in a few moments.',
          data_reliability: 'N/A',
        },
        college_predictions: { safe: [], moderate: [], reach: [] },
        management_quota_opportunities: [],
        alternative_courses: [],
        scholarships: {},
        counselling_strategy: {},
        important_advice: ['Please try again in a few minutes. Our AI service is temporarily down.'],
      };
    }

    // Ensure meta always has timing info
    response._response_time_ms = Date.now() - startTime;
    response._data_summary = {
      colleges_in_context: context.closing_ranks.length,
      scholarships_matched: context.scholarships.length,
      qualifying_cutoffs: context.qualifying_cutoffs.length,
      rounds_available: context.calendar_rounds.length,
    };
    
    // Attach query so frontend can display candidate rank
    response.query = query;
    
    // Attach quota availability metadata for the frontend — now powered by the eligibility engine
    const targetStateRules = getStateRules(query.target_state || query.domicile_state);
    response.quota_availability = {
      // Legacy field kept for backward compatibility
      management_quota_available: context._mgmt_quota_available || false,
      target_state: context._target_state || null,
      // Rich per-seat-type breakdown for the target state
      target_state_rules: targetStateRules ? {
        counselling_authority: targetStateRules.counselling_authority,
        government: targetStateRules.government,
        private: targetStateRules.private,
      } : null,
      // Specific quota notes for the selected quotas
      selected_quota_notes: (query.quotas || []).map(q => {
        if (!targetStateRules) return { quota: q, available: null, note: 'State rules not available' };
        let rule = null;
        const qL = q.toLowerCase();
        if (qL === 'management') rule = targetStateRules.private?.management;
        else if (qL === 'state') rule = targetStateRules.government?.state_quota || targetStateRules.private?.state_quota;
        else if (qL === 'aiq') rule = targetStateRules.government?.aiq;
        else if (qL === 'nri') rule = targetStateRules.private?.nri;
        if (!rule) return { quota: q, available: null, note: null };
        return {
          quota: q,
          available: rule.available,
          non_domicile_allowed: rule.non_domicile_allowed,
          counselling: rule.counselling,
          note: rule.note,
        };
      }),
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
