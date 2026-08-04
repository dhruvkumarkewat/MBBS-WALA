/**
 * /api/ai-predict — AI-Grounded College & Scholarship Predictor
 *
 * Pipeline: Retrieve context from Supabase → Resolve authority/rounds deterministically →
 * Call AI with grounded prompt + context → Verify grounding → Return PredictorResponse
 */
import supabase from './db-client.js';
import { callAI, verifyGrounding, buildFallbackResponse } from './ai-service.js';

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

async function retrieveContext(query) {
  const year = query.score_or_rank?.neet_year || new Date().getFullYear();
  const category = query.category || 'General';
  const examTrack = query.exam_track || 'MBBS_BDS';
  const quotas = query.quotas || ['AIQ'];
  const domicileState = query.domicile_state || null;

  // 1. Qualifying cutoffs
  const { data: qualifyingCutoffs } = await supabase
    .from('qualifying_cutoffs')
    .select('*')
    .eq('neet_year', year)
    .eq('exam_track', examTrack);

  // 2. Counselling calendar (available rounds)
  const primaryAuthority = resolveAuthority(examTrack, quotas[0], domicileState);
  const { data: calendarRounds } = await supabase
    .from('counselling_calendar')
    .select('*')
    .eq('authority', primaryAuthority)
    .eq('neet_year', year)
    .order('round_number');

  // 3. Closing ranks (cutoffs) — filtered by category, limit to recent years
  let cutoffQuery = supabase
    .from('cutoffs')
    .select('*')
    .eq('category', category)
    .gte('year', year - 2)
    .order('aiq_rank', { ascending: true })
    .limit(500);

  // Apply state filter for State quota only
  if (quotas.includes('State') && domicileState && !quotas.includes('AIQ')) {
    cutoffQuery = cutoffQuery.eq('state', domicileState);
  }

  const { data: closingRanks } = await cutoffQuery;

  // 4. Fee structures
  const { data: fees } = await supabase
    .from('fee_structures')
    .select('*')
    .eq('year', year)
    .limit(200);

  // 5. Scholarships — match by category scope
  let scholarshipQuery = supabase
    .from('scholarships')
    .select('*')
    .eq('is_active', true);

  const { data: scholarships } = await scholarshipQuery;

  // Filter scholarships in JS (ARRAY containment queries are finicky)
  const matchedScholarships = (scholarships || []).filter((s) => {
    // Category scope: null = all categories
    if (s.category_scope && s.category_scope.length > 0) {
      if (!s.category_scope.includes(category)) return false;
    }
    // State scope: null = all states
    if (s.state_scope && s.state_scope.length > 0 && domicileState) {
      if (!s.state_scope.includes(domicileState)) return false;
    }
    // Course scope
    if (s.course_scope && s.course_scope.length > 0) {
      const course = examTrack === 'AYUSH' ? 'BAMS' : 'MBBS';
      if (!s.course_scope.includes(course)) return false;
    }
    return true;
  });

  // 6. Seat matrix enrichment
  const { data: seatMatrix } = await supabase
    .from('seat_matrix')
    .select('*')
    .limit(200);

  return {
    qualifying_cutoffs: qualifyingCutoffs || [],
    closing_ranks: closingRanks || [],
    fees: fees || [],
    scholarships: matchedScholarships,
    seat_matrix: seatMatrix || [],
    calendar_rounds: calendarRounds || [],
  };
}

// ── Build resolved (deterministic) values ───────────────────────────────────

function buildResolved(query, context) {
  const quotas = query.quotas || ['AIQ'];
  const domicileState = query.domicile_state || null;
  const examTrack = query.exam_track || 'MBBS_BDS';

  const authority = resolveAuthority(examTrack, quotas[0], domicileState);

  const availableRounds = (context.calendar_rounds || []).map((r) => ({
    round_id: r.id,
    label: r.round_label,
    status: r.status,
    window: r.reg_start ? { start: r.reg_start, end: r.reg_end } : null,
  }));

  return {
    authority,
    available_rounds: availableRounds.length > 0
      ? availableRounds
      : [{ round_id: 'default_r1', label: 'Round 1', status: 'upcoming', window: null }],
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
