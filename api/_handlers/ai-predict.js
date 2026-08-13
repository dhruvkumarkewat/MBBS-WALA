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
import { evaluateEligibility } from './_eligibility-engine.js';

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

    // Step 3: Build rich human-readable user prompt for AI
    const targetStateRulesForAI = getStateRules(query.target_state || query.domicile_state);
    const domicileStateRulesForAI = query.domicile_state ? getStateRules(query.domicile_state) : null;
    const targetStateName = query.target_state || query.domicile_state || 'All India';
    const domicileStateName = query.domicile_state || 'Not specified';
    const domicileMatchesTarget = query.domicile_state && query.target_state &&
      query.domicile_state.toLowerCase() === query.target_state.toLowerCase();

    // Pre-compute quota eligibility for each quota type
    const quotaEligibility = {};
    const selectedQuotas = query.quotas || ['AIQ'];

    const mgmtRules = targetStateRulesForAI?.private?.management;
    const nriRules  = targetStateRulesForAI?.private?.nri;
    const stateGovtRules = targetStateRulesForAI?.government?.state_quota;
    const aiqRules  = targetStateRulesForAI?.government?.aiq;

    quotaEligibility.aiq = {
      available: true,
      eligible: true,
      note: `AIQ (15% All India Quota) — Open to all candidates regardless of domicile. Counselling by MCC. Available in all government colleges in ${targetStateName}.`,
    };
    quotaEligibility.state_quota = {
      available: stateGovtRules?.available !== false,
      eligible: domicileMatchesTarget || !query.target_state,
      counselling_authority: targetStateRulesForAI?.counselling_authority || 'State Counselling Authority',
      note: domicileMatchesTarget
        ? `State Quota (85%) — You ARE eligible. Your domicile (${domicileStateName}) matches target state (${targetStateName}). Counselling by ${targetStateRulesForAI?.counselling_authority || 'state authority'}.`
        : `State Quota (85%) — You are NOT eligible. State Quota in ${targetStateName} requires ${targetStateName} domicile. Your domicile is ${domicileStateName}. You can apply for AIQ or Management Quota instead.`,
    };
    quotaEligibility.management = {
      available: mgmtRules?.available !== false,
      eligible: mgmtRules?.available && (mgmtRules?.non_domicile_allowed !== false),
      non_domicile_allowed: mgmtRules?.non_domicile_allowed,
      note: mgmtRules?.available === false
        ? `Management Quota — NOT AVAILABLE in ${targetStateName}. ${mgmtRules?.note || `Private college seats in ${targetStateName} are filled through state counselling, not through a separate Management Quota.`} Suggest: Try AIQ or State Quota (if domicile matches).`
        : mgmtRules?.non_domicile_allowed === false
          ? `Management Quota — Available in ${targetStateName} but ONLY for ${targetStateName} domicile holders. Your domicile is ${domicileStateName}, so you are NOT eligible. Suggest: Try AIQ or Management Quota in a different state.`
          : `Management Quota — Available in ${targetStateName} and open to ALL India candidates (no domicile restriction). Counselling by ${mgmtRules?.counselling || targetStateRulesForAI?.counselling_authority}. ${mgmtRules?.note || ''}`,
    };
    quotaEligibility.nri = {
      available: nriRules?.available !== false,
      eligible: false, // requires NRI/PIO/OCI status — we can't confirm from student input
      note: nriRules?.available === false
        ? `NRI Quota — NOT AVAILABLE in ${targetStateName}.`
        : `NRI Quota — Available in ${targetStateName} but requires NRI/PIO/OCI status or a qualifying NRI sponsor. Higher fees (typically ₹20-50 lakh/year). Student must confirm NRI eligibility separately.`,
    };
    quotaEligibility.deemed = {
      available: true,
      eligible: true,
      note: `Deemed Universities — Always open to all-India candidates regardless of domicile. Counselling by MCC. Higher fees than government colleges. Not counted in state quota.`,
    };

    // Build the user prompt as a clear human brief
    const userPromptText = `
=== STUDENT PROFILE ===
Exam Track: ${query.exam_track || 'MBBS / BDS'}
NEET AIR: ${query.score_or_rank.value} (Year: ${query.score_or_rank.neet_year || 2026})
Category: ${query.category || 'General'}
Domicile State: ${domicileStateName}
Target State: ${targetStateName}
Domicile matches Target State: ${domicileMatchesTarget ? 'YES' : 'NO'}
Requested Quotas: ${selectedQuotas.join(', ')}
Counselling Round: ${query.round || 'Round 1'}

=== PRE-VERIFIED QUOTA ELIGIBILITY FOR ${targetStateName.toUpperCase()} ===
${Object.entries(quotaEligibility).map(([k, v]) => `[${k.toUpperCase()}] ${v.eligible ? '✅ ELIGIBLE' : v.available === false ? '🚫 NOT AVAILABLE IN THIS STATE' : '⚠️ INELIGIBLE FOR THIS STUDENT'} — ${v.note}`).join('\n')}

=== COUNSELLING AUTHORITY FOR ${targetStateName.toUpperCase()} ===
${targetStateRulesForAI?.counselling_authority || 'State Counselling Body'}

=== WHAT TO PREDICT ===
The student has selected: ${selectedQuotas.join(', ')} in ${targetStateName}.

${selectedQuotas.map(q => {
  const qL = q.toLowerCase();
  if (qL.includes('management') || qL === 'management quota') return quotaEligibility.management.available === false
    ? `MANAGEMENT QUOTA: 🚫 NOT AVAILABLE in ${targetStateName}. Show NO management quota colleges. Instead, in quota_wise_analysis.management_quota set available_in_state: false and give a helpful message suggesting alternatives (${quotaEligibility.aiq.eligible ? 'AIQ' : ''}${domicileMatchesTarget ? ', State Quota' : ''}, Management Quota in other states like Karnataka/Tamil Nadu/Maharashtra).`
    : quotaEligibility.management.eligible
      ? `MANAGEMENT QUOTA: ✅ Show real private ${targetStateName} medical colleges with management quota seats. Non-domicile allowed. Show 8-12 real colleges.`
      : `MANAGEMENT QUOTA: ⚠️ Not eligible (domicile mismatch). Show message and suggest alternatives.`;
  if (qL === 'aiq' || qL.includes('all india')) return `AIQ: ✅ Show real government MBBS colleges in ${targetStateName} under AIQ. Use actual 2023-2025 closing ranks for ${query.category} category, Round 1 AIQ. Show 10-15 real colleges.`;
  if (qL.includes('state')) return domicileMatchesTarget
    ? `STATE QUOTA: ✅ Show real government colleges in ${targetStateName} under 85% state quota for ${query.category} category. Show 8-12 real colleges.`
    : `STATE QUOTA: ⚠️ Not eligible — domicile mismatch. Tell student they need ${targetStateName} domicile for state quota.`;
  if (qL.includes('nri')) return `NRI QUOTA: Show NRI quota colleges in ${targetStateName} if available, with fee structure. Note that NRI status must be verified.`;
  return `${q}: Show relevant colleges if available.`;
}).join('\n')}

For each college you show:
1. Use the EXACT official college name (real NMC-recognized college)
2. Compare student AIR ${query.score_or_rank.value} (${query.category}) against actual historical closing ranks
3. Only show colleges where the student has a realistic chance (rank ≤ closing rank = safe, within 20% = moderate, 20-40% = reach)
4. Show historical_trend as an ARRAY: [{year: 2025, closing_rank: XXXX}, {year: 2024, closing_rank: XXXX}, {year: 2023, closing_rank: XXXX}]
5. Set margin to: closing_rank - student_rank (positive = safe, negative = harder)
6. Government college fees: ₹10,000-₹50,000/year. Private fees: ₹8L-₹25L/year. Deemed: ₹15L-₹30L/year. Management: ₹15L-₹35L/year.

CRITICAL: LOWER AIR NUMBER = BETTER. AIR ${query.score_or_rank.value} is ${query.score_or_rank.value < 5000 ? 'an EXCELLENT top-tier rank' : query.score_or_rank.value < 25000 ? 'a GOOD rank with many options' : query.score_or_rank.value < 75000 ? 'a MODERATE rank' : query.score_or_rank.value < 150000 ? 'a rank with limited government options but good private options' : 'a rank where private/management/AYUSH options are recommended'}.

=== SCHOLARSHIPS TO ANALYZE ===
Analyze these scholarships based on the student's rank (${query.score_or_rank.value}), category (${query.category}), and domicile (${domicileStateName}). Place them into the "eligible" or "ineligible" arrays in "scholarships_analysis". For ineligible ones, explain exactly why (e.g. requires different category or domicile). If we don't have enough info (like income), assume eligible but note it in match_reason.
${(context.scholarships || []).slice(0, 5).map(s => `- Name: ${s.name}\n  Provider: ${s.provider}\n  Amount: ${s.amount_description || s.amount}\n  Eligibility: ${s.eligibility}\n  Portal: ${s.official_portal}`).join('\n\n')}
`.trim();

    const aiPayload = {
      user_prompt: userPromptText,
      // Also pass structured data for any provider that uses it
      query,
      context: {
        target_state_rules: targetStateRulesForAI,
        domicile_state_rules: domicileStateRulesForAI,
        quota_eligibility: quotaEligibility,
        scholarships: (context.scholarships || []).slice(0, 5),
      },
      resolved,
    };

    let response;

    try {
      // Step 4: Call AI — use AI's response directly (no DB override)
      const aiResponse = await callAI(aiPayload);

      // ── Normalize AI response to handle structural variations ───────────────
      // Gemini sometimes uses different field names than specified in the prompt.
      // We normalize here so the frontend always gets a consistent shape.

      // 1. Normalize admission_summary
      const as = aiResponse.admission_summary || {};
      aiResponse.admission_summary = {
        status: as.status || as.overall_status || as.summary_status || as.outlook || 'Prediction Ready',
        explanation: as.explanation || as.overall_outlook || as.summary || as.description || '',
        data_reliability: as.data_reliability || 'Medium',
        expected_probability: as.expected_probability || as.probability || '70%',
      };

      // 2. Normalize college_predictions — ensure safe/moderate/reach exist
      //    and each college has a 'name' field (AI sometimes uses 'college_name')
      const cp = aiResponse.college_predictions || {};
      ['safe', 'moderate', 'reach'].forEach(tier => {
        if (!Array.isArray(cp[tier])) cp[tier] = [];
        cp[tier] = cp[tier].map(c => {
          // Coerce name field
          c.name = c.name || c.college_name || c.institution || c.college || 'Unknown College';
          // Coerce predicted_closing_rank to number
          if (typeof c.predicted_closing_rank === 'string') {
            c.predicted_closing_rank = parseInt(c.predicted_closing_rank.replace(/[^\d]/g, '')) || 0;
          }
          // Ensure historical_trend is an array
          if (!Array.isArray(c.historical_trend)) {
            c.historical_trend = c.historical_trend ? [c.historical_trend] : [];
          }
          // Ensure quota field
          c.quota = c.quota || c.quota_type || c.admission_quota || 'AIQ';
          // Ensure probability is a string percentage
          if (typeof c.probability === 'number') c.probability = `${c.probability}%`;
          return c;
        });
      });
      aiResponse.college_predictions = cp;

      // 3. Normalize quota_wise_analysis — AI sometimes returns a flat array
      //    instead of our named sub-object structure
      const qwa = aiResponse.quota_wise_analysis;
      if (Array.isArray(qwa)) {
        // AI returned an array of quota objects — convert to named sub-objects
        const normalized = {};
        (qwa).forEach(q => {
          const t = (q.quota_type || q.type || '').toLowerCase();
          if (t.includes('aiq') || t.includes('all india')) normalized.aiq = q;
          else if (t.includes('state')) normalized.state_quota = q;
          else if (t.includes('management') || t.includes('mgmt')) normalized.management_quota = q;
          else if (t.includes('nri')) normalized.nri_quota = q;
          else if (t.includes('deemed')) normalized.deemed_universities = q;
        });
        aiResponse.quota_wise_analysis = normalized;
      } else if (qwa && !qwa.aiq && !qwa.state_quota && !qwa.management_quota) {
        // AI returned a flat object with non-standard keys — wrap it
        // Try to extract per-quota data from whatever keys exist
        const flat = qwa;
        aiResponse.quota_wise_analysis = {
          aiq: { eligible: true, explanation: flat.aiq_explanation || flat.all_india_quota || 'AIQ available — no domicile restriction via MCC.' },
          state_quota: { eligible: flat.state_eligible ?? null, explanation: flat.state_explanation || flat.state_quota || 'State Quota requires matching domicile.' },
          management_quota: { available_in_state: flat.mgmt_available ?? true, eligible: flat.mgmt_eligible ?? null, non_domicile_allowed: flat.non_domicile ?? true, explanation: flat.mgmt_explanation || flat.management || '' },
          nri_quota: { eligible: false, explanation: 'NRI Quota requires NRI/PIO/OCI status or NRI sponsor.' },
          deemed_universities: { eligible: true, explanation: 'Deemed universities open to all-India candidates via MCC counselling.' },
        };
      }
      if (!aiResponse.quota_wise_analysis) aiResponse.quota_wise_analysis = null;

      // 4. Ensure management_quota_opportunities is an array
      if (!Array.isArray(aiResponse.management_quota_opportunities)) {
        aiResponse.management_quota_opportunities = [];
      }

      // 5. Normalize scholarships_analysis
      const sa = aiResponse.scholarships_analysis || aiResponse.scholarships || {};
      aiResponse.scholarships_analysis = {
        eligible: Array.isArray(sa.eligible) ? sa.eligible : [],
        ineligible: Array.isArray(sa.ineligible) ? sa.ineligible : []
      };
      // Fallback: If AI put array in root instead of inside eligible/ineligible
      if (Array.isArray(sa)) {
        aiResponse.scholarships_analysis.eligible = sa;
      }
      // Delete old deprecated keys to avoid confusion
      delete aiResponse.scholarships;
      delete aiResponse.exact_scholarships;

      response = aiResponse;
    } catch (aiError) {
      console.error('[AI-Predict] All AI providers failed:', aiError.message || aiError);
      throw aiError;
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
