/**
 * _eligibility-engine.js
 *
 * Pure eligibility evaluation — no database calls, no side effects.
 *
 * Given a candidate profile + college record + state rules,
 * determines eligibility per seat type and picks the best route.
 *
 * Usage:
 *   import { evaluateEligibility, getBestRoute } from './_eligibility-engine.js';
 *   const result = evaluateEligibility(candidate, college, stateRules);
 */

import { getStateRules, normalizeStateName } from './_state-rules.js';

// ── Deemed university detection keywords ─────────────────────────────────────
const DEEMED_KEYWORDS = [
  'patil', 'd.y. patil', 'manipal', 'kasturba', 'kmc', 'jss', 'hamdard',
  'symbiosis', 'amrita', 'sri ramachandra', 'srm', 'saveetha', 'meenakshi',
  'chettinad', 'yenepoya', 'k.s. hegde', 'jnmc', 'kle', 'bharati vidyapeeth',
  'mgm', 'pravara', 'datta meghe', 'krishna institute', 'santosh', 'sharda',
  'gitam', 'vinayaka mission', 'aarupadai', 'sumandeep', 'sbks', 'drmgr',
  'dr. m.g.r.', 'deemed',
];

const GOVT_KEYWORDS = [
  'aiims', 'jipmer', 'safdarjung', 'vmmc', 'rml', 'lady hardinge', 'maulana azad',
  'mamc', 'afmc', 'esic', 'central',
];

/**
 * Classify a college from its DB record.
 * Returns { isDeemed, isGovt, isCentral, isPrivate }
 */
export function classifyCollege(college) {
  const colType = (college.type || '').toLowerCase();
  const colName = (college.name || '').toLowerCase();

  const isDeemed = colType.includes('deemed') ||
    DEEMED_KEYWORDS.some(k => colName.includes(k));

  const isCentral = colType.includes('central') ||
    GOVT_KEYWORDS.some(k => colName.includes(k));

  const isGovt = !isDeemed && (
    colType.includes('government') ||
    colType.includes('govt') ||
    isCentral ||
    colName.includes('government')
  );

  const isPrivate = !isDeemed && !isGovt;

  return { isDeemed, isGovt, isCentral, isPrivate };
}

/**
 * Main eligibility evaluation function.
 *
 * @param {object} candidate
 *   { domicile_state, category, rank, score, input_mode, is_nri, is_minority }
 *
 * @param {object} college
 *   { name, state, type, ... } — a college record from the database
 *
 * @returns {EligibilityResult}
 *   Per-seat-type eligibility with reason strings and best_route.
 */
export function evaluateEligibility(candidate, college) {
  const collegeState = normalizeStateName(college.state);
  const domicileState = normalizeStateName(candidate.domicile_state);
  const category = (candidate.category || 'General').toUpperCase();
  const isNRI = candidate.is_nri === true;
  const isMinority = candidate.is_minority === true;
  const isDomicileMatch = !!(collegeState && domicileState && (
    collegeState === domicileState ||
    collegeState.includes(domicileState) ||
    domicileState.includes(collegeState)
  ));

  const { isDeemed, isGovt, isCentral, isPrivate } = classifyCollege(college);
  const stateRules = getStateRules(college.state);

  // ── AIQ ──────────────────────────────────────────────────────────────────────
  // Available for government colleges through MCC; deemed universities have their own route
  const aiq = (() => {
    if (isDeemed) return { eligible: false, reason: 'Deemed universities are not part of 15% AIQ. They have their own MCC-conducted counselling.' };
    if (isCentral || isGovt) {
      return {
        eligible: true,
        domicile_required: false,
        counselling: 'MCC',
        reason: 'AIQ seats are open to all-India candidates. No domicile restriction.',
      };
    }
    return { eligible: false, reason: 'AIQ is only for government/central colleges.' };
  })();

  // ── Government State Quota ────────────────────────────────────────────────────
  const stateQuotaGovt = (() => {
    if (!isGovt || isDeemed) return { eligible: 'not_applicable', reason: 'State quota is only for government colleges.' };
    if (!stateRules) return { eligible: 'unknown', reason: `State rules not available for ${college.state}.` };
    const rule = stateRules.government?.state_quota;
    if (!rule?.available) return { eligible: false, reason: `State quota not available in ${college.state}.` };
    if (rule.domicile_required && !isDomicileMatch) {
      return {
        eligible: false,
        domicile_required: true,
        counselling: rule.counselling,
        reason: `${college.state} State Quota requires ${college.state} domicile. Your domicile: ${candidate.domicile_state}.`,
      };
    }
    return {
      eligible: true,
      domicile_required: rule.domicile_required,
      counselling: rule.counselling,
      reason: isDomicileMatch
        ? `Eligible — domicile matches ${college.state}. Apply via ${rule.counselling}.`
        : `Eligible — no domicile restriction for this state quota.`,
    };
  })();

  // ── Private State/Govt Quota ──────────────────────────────────────────────────
  const privateStateQuota = (() => {
    if (!isPrivate) return { eligible: 'not_applicable', reason: 'Private state quota applies only to private colleges.' };
    if (!stateRules) return { eligible: 'unknown', reason: `State rules not available for ${college.state}.` };
    const rule = stateRules.private?.state_quota;
    if (!rule?.available) return { eligible: false, reason: `Private state quota not available in ${college.state}.` };
    if (rule.domicile_required && !isDomicileMatch) {
      return {
        eligible: false,
        domicile_required: true,
        counselling: rule.counselling,
        reason: `${college.state} private state quota requires ${college.state} domicile. Your domicile: ${candidate.domicile_state}.`,
        note: rule.note,
      };
    }
    return {
      eligible: true,
      domicile_required: rule.domicile_required,
      counselling: rule.counselling,
      note: rule.note,
      reason: `Eligible for private state quota in ${college.state} via ${rule.counselling}.`,
    };
  })();

  // ── Management Quota ──────────────────────────────────────────────────────────
  const management = (() => {
    if (isDeemed) return { eligible: 'not_applicable', reason: 'Deemed universities do not have Management Quota; they have their own MCC counselling.' };
    if (isGovt) return { eligible: 'not_applicable', reason: 'Management Quota does not exist for government colleges.' };
    if (!stateRules) return { eligible: 'unknown', reason: `State rules not available for ${college.state}.` };
    const rule = stateRules.private?.management;
    if (!rule?.available) {
      return {
        eligible: false,
        reason: `Management Quota is not available in ${college.state}. ${rule?.note || 'Private seats go through state counselling.'}`,
        suggestion: `Try State Quota (${stateRules.counselling_authority}) instead.`,
      };
    }
    // Management quota available in this state
    const nonDomicileOk = rule.non_domicile_allowed;
    if (!isDomicileMatch && nonDomicileOk === false) {
      return {
        eligible: false,
        reason: `${college.state} Management Quota requires local domicile. Your domicile: ${candidate.domicile_state}.`,
        note: rule.note,
      };
    }
    // Category note: SC/ST/OBC category reservation may not apply in management quota
    const categoryNote = ['SC', 'ST', 'OBC', 'OBC-NCL', 'EWS'].some(c => category.includes(c))
      ? 'Note: SC/ST/OBC/EWS category reservation does not apply to Management Quota seats in most private colleges. You compete on general merit within the management quota.'
      : null;

    return {
      eligible: true,
      non_domicile_allowed: nonDomicileOk,
      counselling: rule.counselling,
      category_note: categoryNote,
      note: rule.note,
      reason: nonDomicileOk === true
        ? `${college.state} Management Quota is open to all-India (non-domicile) candidates. Apply via ${rule.counselling}.`
        : nonDomicileOk === 'conditional'
          ? `${college.state} Management Quota eligibility for non-domicile candidates depends on the specific institution. Verify with the college directly.`
          : `Management Quota available. Domicile match — you are eligible.`,
    };
  })();

  // ── Institutional Quota ───────────────────────────────────────────────────────
  const institutional = (() => {
    if (!isPrivate) return { eligible: 'not_applicable' };
    if (!stateRules) return { eligible: 'unknown', reason: `State rules not available for ${college.state}.` };
    const rule = stateRules.private?.institutional;
    if (!rule || !rule.available) return { eligible: false, reason: `No institutional quota in ${college.state} private colleges.` };
    return {
      eligible: rule.non_domicile_allowed === false && !isDomicileMatch ? false : 'conditional',
      note: rule.note,
      reason: rule.note || `Institutional quota exists; eligibility is college-specific. Verify directly.`,
    };
  })();

  // ── NRI Quota ─────────────────────────────────────────────────────────────────
  const nri = (() => {
    if (!stateRules) return { eligible: 'unknown' };
    const rule = stateRules.private?.nri || stateRules.government?.nri;
    if (!rule?.available) return { eligible: false, reason: `NRI quota not available in ${college.state}.` };
    if (!isNRI) {
      return {
        eligible: false,
        reason: 'NRI quota requires NRI/PIO/OCI status or an NRI sponsor. You have not indicated NRI status.',
        note: rule.sponsor_allowed ? 'NRI-sponsored seats (where a close NRI relative sponsors) may be available.' : undefined,
      };
    }
    return {
      eligible: true,
      counselling: stateRules.counselling_authority,
      note: rule.note,
      reason: `NRI quota available in ${college.state}. You are eligible.`,
    };
  })();

  // ── Minority Quota ────────────────────────────────────────────────────────────
  const minority = (() => {
    if (!stateRules) return { eligible: 'unknown' };
    const rule = stateRules.private?.minority;
    if (!rule || rule.available === false) return { eligible: false, reason: `No minority quota in ${college.state}.` };
    if (rule.available === 'college_specific') {
      return {
        eligible: 'college_specific',
        reason: 'Minority quota exists in some colleges in this state. Eligibility depends on the college\'s minority designation and your minority status.',
      };
    }
    if (!isMinority) return { eligible: false, reason: 'Minority quota requires valid minority status (religion/language based).' };
    return { eligible: true, note: rule.note, reason: `Minority quota may be available. Verify with college.` };
  })();

  // ── Deemed University ─────────────────────────────────────────────────────────
  const deemed = (() => {
    if (!isDeemed) return { eligible: 'not_applicable', reason: 'Not a deemed university.' };
    return {
      eligible: true,
      domicile_required: false,
      counselling: 'MCC',
      reason: 'Deemed universities admit through MCC counselling. No domicile restriction. All-India candidates eligible.',
      note: 'Fees are significantly higher than government colleges. NRI seats (15–35%) also available.',
    };
  })();

  // ── Best Route ────────────────────────────────────────────────────────────────
  const best_route = getBestRoute({ aiq, stateQuotaGovt, privateStateQuota, management, deemed, nri, minority, institutional });

  // ── Summary ───────────────────────────────────────────────────────────────────
  const eligibleRoutes = [];
  if (aiq.eligible === true) eligibleRoutes.push('AIQ');
  if (stateQuotaGovt.eligible === true) eligibleRoutes.push('Government State Quota');
  if (privateStateQuota.eligible === true) eligibleRoutes.push('Private State Quota');
  if (management.eligible === true) eligibleRoutes.push('Management Quota');
  if (deemed.eligible === true) eligibleRoutes.push('Deemed');
  if (nri.eligible === true) eligibleRoutes.push('NRI Quota');

  const summary = eligibleRoutes.length > 0
    ? `Eligible via: ${eligibleRoutes.join(', ')}.`
    : `No standard admission route found for this candidate + college combination. Check eligibility conditions.`;

  return {
    college_state: college.state,
    college_type: isDeemed ? 'Deemed' : isGovt ? 'Government' : 'Private',
    domicile_match: isDomicileMatch,
    aiq,
    state_quota_govt: stateQuotaGovt,
    private_state_quota: privateStateQuota,
    management,
    institutional,
    nri,
    minority,
    deemed,
    best_route,
    eligible_routes: eligibleRoutes,
    summary,
    counselling_authority: stateRules?.counselling_authority || null,
  };
}

/**
 * Pick the best (most accessible) eligible route for a candidate.
 */
export function getBestRoute(seats) {
  // Priority: AIQ > Deemed > Management > Private State Quota > Govt State Quota > Institutional > NRI > Minority
  if (seats.aiq?.eligible === true) return 'AIQ';
  if (seats.deemed?.eligible === true) return 'Deemed';
  if (seats.management?.eligible === true) return 'Management';
  if (seats.privateStateQuota?.eligible === true) return 'Private State Quota';
  if (seats.stateQuotaGovt?.eligible === true) return 'Government State Quota';
  if (seats.institutional?.eligible === true || seats.institutional?.eligible === 'conditional') return 'Institutional';
  if (seats.nri?.eligible === true) return 'NRI';
  if (seats.minority?.eligible === true) return 'Minority';
  return null;
}

/**
 * Get a short human-readable eligibility note for a college card.
 * Used in the frontend badge/label.
 */
export function getEligibilityNote(eligibilityResult, selectedQuotas) {
  if (!eligibilityResult) return null;

  // If user specifically requested Management quota
  if (selectedQuotas?.includes('Management')) {
    const mgmt = eligibilityResult.management;
    if (mgmt?.eligible === false && mgmt?.suggestion) {
      return { type: 'warning', text: mgmt.reason, suggestion: mgmt.suggestion };
    }
    if (mgmt?.eligible === true) {
      const note = mgmt.non_domicile_allowed === true
        ? '✅ Management Quota — Open to All India'
        : mgmt.non_domicile_allowed === 'conditional'
          ? '⚠️ Management Quota — Verify eligibility with college'
          : '✅ Management Quota — Domicile match';
      return { type: 'success', text: note, category_note: mgmt.category_note };
    }
  }

  // Default: show best route
  const best = eligibilityResult.best_route;
  if (!best) return { type: 'error', text: 'No eligible route found for your profile' };
  return { type: 'success', text: `✅ Eligible via ${best}` };
}
