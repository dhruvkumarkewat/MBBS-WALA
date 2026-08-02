import { getPublicClient, getAdminClient } from '../config/database.js';
import { createChildLogger } from '../utils/logger.js';

const log = createChildLogger('prediction');

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PredictInput {
  rank: number;
  category: string;
  state?: string;
  domicile_state?: string;
  gender: string;
  is_pwd: boolean;
  course: string;
  quota: string;
  round?: string;
  limit: number;
}

export interface PredictMatch {
  college_name: string;
  state: string;
  category: string;
  year: number;
  closing_rank: number | null;
  opening_rank: number | null;
  aiq_rank: number | null;
  aiq_score: number | null;
  probability: number;
  band: 'Dream' | 'Very High' | 'High' | 'Moderate' | 'Low' | 'Very Low';
  best_path: string;
  reason: string;
  trend: 'stable' | 'getting_harder' | 'getting_easier' | 'insufficient_data';
  confidence_interval: { low: number; high: number };
  // Seat info
  total_seats: number | null;
  college_kind: string | null;
}

export interface PredictResult {
  summary: {
    total_evaluated: number;
    dream_count: number;
    very_high_count: number;
    high_count: number;
    moderate_count: number;
    low_count: number;
    very_low_count: number;
    recommended: number;
  };
  matches: PredictMatch[];
  modelInfo: {
    version: string;
    data_years: number[];
    method: string;
  };
  note: string;
}

// ── Scoring Engine ────────────────────────────────────────────────────────────

interface CutoffRecord {
  college_name: string;
  state: string;
  category: string;
  year: number;
  aiq_rank: number | null;
  aiq_score: number | null;
  state_rank_range: string | null;
  state_score_range: string | null;
}

interface SeatRecord {
  college_name: string;
  total_seats: number | null;
  open_seats: number | null;
  college_kind: string | null;
}

function parseRangeMax(range: string | null): number | null {
  if (!range || typeof range !== 'string') return null;
  const nums = range.replace(/,/g, '').match(/\d+/g);
  if (!nums || !nums.length) return null;
  return Number(nums[nums.length - 1]);
}

/**
 * Score a student's chance at a college based on historical cutoff data.
 * Uses rank-to-cutoff ratio with adjustments for trends and category.
 *
 * This does NOT use hardcoded values — it's purely data-driven from the cutoffs table.
 */
function scoreChance(
  rank: number,
  closingRank: number | null,
  category: string,
  yearTrend: 'stable' | 'getting_harder' | 'getting_easier' | 'insufficient_data'
): { probability: number; band: PredictMatch['band']; reason: string } {
  if (!closingRank || closingRank <= 0) {
    return {
      probability: 0,
      band: 'Very Low',
      reason: 'No verified cutoff data available for this college and category.',
    };
  }

  const ratio = rank / closingRank;
  let probability: number;
  let band: PredictMatch['band'];
  let reason: string;

  if (ratio <= 0.55) {
    probability = 95;
    band = 'Dream';
    reason = `Your rank (${rank.toLocaleString()}) is well within the historical closing rank (${closingRank.toLocaleString()}) for ${category}. Very high chance of allotment.`;
  } else if (ratio <= 0.75) {
    probability = 88;
    band = 'Very High';
    reason = `Comfortable margin vs ${category} closing rank ${closingRank.toLocaleString()}. Strong position in recent years' data.`;
  } else if (ratio <= 0.90) {
    probability = 78;
    band = 'High';
    reason = `Inside the typical ${category} allotment band. Keep this high in your preference list.`;
  } else if (ratio <= 1.02) {
    probability = 62;
    band = 'Moderate';
    reason = `Near the closing rank boundary (${closingRank.toLocaleString()}). Good target — outcome depends on this year's applicant pool.`;
  } else if (ratio <= 1.15) {
    probability = 45;
    probability = 45;
    band = 'Low';
    reason = `Slightly above last year's close. Possible in later rounds with vacancies.`;
  } else if (ratio <= 1.40) {
    probability = 28;
    band = 'Low';
    reason = `Reach zone. Watch later rounds and category-specific vacancy patterns.`;
  } else {
    probability = 12;
    band = 'Very Low';
    reason = `Historically closes much higher for ${category}. Consider pairing with safer options.`;
  }

  // Trend adjustment: if cutoffs are getting easier (ranks increasing), boost; if harder, reduce
  if (yearTrend === 'getting_easier') {
    probability = Math.min(99, probability + 5);
    reason += ' Recent trend shows cutoffs relaxing.';
  } else if (yearTrend === 'getting_harder') {
    probability = Math.max(5, probability - 5);
    reason += ' Recent trend shows cutoffs tightening.';
  }

  return { probability, band, reason };
}

/**
 * Analyze historical cutoff trend for a college.
 * Returns whether cutoffs are getting harder (lower closing ranks = more competitive)
 * or easier (higher closing ranks = less competitive).
 */
function analyzeTrend(cutoffs: CutoffRecord[]): 'stable' | 'getting_harder' | 'getting_easier' | 'insufficient_data' {
  if (cutoffs.length < 2) return 'insufficient_data';

  const sorted = [...cutoffs].sort((a, b) => a.year - b.year);
  const ranks = sorted
    .map((c) => c.aiq_rank)
    .filter((r): r is number => r != null && r > 0);

  if (ranks.length < 2) return 'insufficient_data';

  // Simple linear regression on closing ranks over years
  const n = ranks.length;
  const xMean = (n - 1) / 2;
  const yMean = ranks.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (ranks[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }

  if (den === 0) return 'stable';

  const slope = num / den;
  const relativeSlope = slope / yMean;

  // If closing ranks are increasing (slope > 0), cutoffs are getting easier
  // If closing ranks are decreasing (slope < 0), cutoffs are getting harder
  if (relativeSlope > 0.05) return 'getting_easier';
  if (relativeSlope < -0.05) return 'getting_harder';
  return 'stable';
}

// ── Service Class ─────────────────────────────────────────────────────────────

export class PredictionService {
  /**
   * Run the full prediction pipeline.
   * 1. Fetch cutoffs from DB (NO hardcoded values)
   * 2. Fetch seat matrix
   * 3. Score each college
   * 4. Sort and return balanced shortlist
   */
  async predict(input: PredictInput): Promise<PredictResult> {
    const db = getPublicClient();
    const { rank, category, state, course, limit } = input;

    // 1. Fetch all cutoffs (filter by category if not 'All')
    let cutoffQuery = db
      .from('cutoffs')
      .select('*')
      .order('aiq_rank', { ascending: true });

    if (category && category !== 'All') {
      cutoffQuery = cutoffQuery.eq('category', category);
    }
    if (state && state !== 'All') {
      cutoffQuery = cutoffQuery.eq('state', state);
    }

    const { data: cutoffs, error: cutoffErr } = await cutoffQuery;
    if (cutoffErr) {
      log.error({ cutoffErr }, 'Failed to fetch cutoffs for prediction');
      throw new Error('Failed to fetch cutoff data');
    }

    // 2. Fetch seat matrix for enrichment
    const { data: seats } = await db.from('seat_matrix').select('*');

    // Build seat lookup
    const seatMap = new Map<string, SeatRecord>();
    for (const s of seats || []) {
      const key = (s.college_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      seatMap.set(key, s);
    }

    // 3. Group cutoffs by college for trend analysis
    const collegeGroups = new Map<string, CutoffRecord[]>();
    for (const c of cutoffs || []) {
      const name = c.college_name;
      if (!collegeGroups.has(name)) collegeGroups.set(name, []);
      collegeGroups.get(name)!.push(c);
    }

    // 4. Score each college
    const scored: PredictMatch[] = [];

    for (const [collegeName, records] of collegeGroups) {
      // Use the most recent year's cutoff as the primary reference
      const sorted = [...records].sort((a, b) => b.year - a.year);
      const latest = sorted[0];
      if (!latest) continue;

      const closingRank = latest.aiq_rank;
      const stateMax = parseRangeMax(latest.state_rank_range);

      // Determine trend from historical data
      const trend = analyzeTrend(records);

      // Score via AIQ path
      const aiqScore = scoreChance(rank, closingRank, category, trend);

      // Score via state path (if available)
      const stateScore = stateMax ? scoreChance(rank, stateMax, category, trend) : null;

      // Pick the better path
      const best =
        stateScore && stateScore.probability > aiqScore.probability ? stateScore : aiqScore;
      const bestPath =
        stateScore && stateScore.probability > aiqScore.probability ? 'State quota' : 'AIQ';

      // Confidence interval based on data quality
      const dataYears = records.length;
      const ciWidth = dataYears >= 4 ? 5 : dataYears >= 2 ? 10 : 20;
      const ci = {
        low: Math.max(0, best.probability - ciWidth),
        high: Math.min(100, best.probability + ciWidth),
      };

      // Seat enrichment
      const seatKey = collegeName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const seatInfo = seatMap.get(seatKey) || findFuzzySeat(seatMap, seatKey);

      scored.push({
        college_name: collegeName,
        state: latest.state,
        category: latest.category,
        year: latest.year,
        closing_rank: closingRank,
        opening_rank: null, // Would come from cutoffs_v2
        aiq_rank: closingRank,
        aiq_score: latest.aiq_score,
        probability: best.probability,
        band: best.band,
        best_path: bestPath,
        reason: best.reason,
        trend,
        confidence_interval: ci,
        total_seats: seatInfo?.total_seats ?? null,
        college_kind: seatInfo?.college_kind ?? null,
      });
    }

    // 5. Sort: prioritize realistic chances, then by relevance
    scored.sort((a, b) => {
      // Group realistic (>= 45%) above unrealistic
      const aReal = a.probability >= 45;
      const bReal = b.probability >= 45;
      if (aReal && !bReal) return -1;
      if (!aReal && bReal) return 1;

      // Within group, sort by closest cutoff to rank (most relevant)
      const aDiff = Math.abs((a.closing_rank || 999999) - rank);
      const bDiff = Math.abs((b.closing_rank || 999999) - rank);
      if (aDiff !== bDiff) return aDiff - bDiff;

      return b.probability - a.probability;
    });

    // 6. Build balanced shortlist
    const dream = scored.filter((m) => m.band === 'Dream');
    const veryHigh = scored.filter((m) => m.band === 'Very High');
    const high = scored.filter((m) => m.band === 'High');
    const moderate = scored.filter((m) => m.band === 'Moderate');
    const low = scored.filter((m) => m.band === 'Low');
    const veryLow = scored.filter((m) => m.band === 'Very Low');

    const shortlist: PredictMatch[] = [];
    const addUnique = (arr: PredictMatch[], maxN: number) => {
      for (const item of arr) {
        if (shortlist.length >= limit) break;
        if (!shortlist.find((s) => s.college_name === item.college_name)) {
          shortlist.push(item);
        }
        if (shortlist.filter((s) => s.band === item.band).length >= maxN) break;
      }
    };

    addUnique(dream, Math.ceil(limit * 0.15));
    addUnique(veryHigh, Math.ceil(limit * 0.2));
    addUnique(high, Math.ceil(limit * 0.25));
    addUnique(moderate, Math.ceil(limit * 0.25));
    addUnique(low, Math.ceil(limit * 0.1));
    addUnique(veryLow, Math.ceil(limit * 0.05));

    // Fill remaining
    for (const item of scored) {
      if (shortlist.length >= limit) break;
      if (!shortlist.find((s) => s.college_name === item.college_name)) {
        shortlist.push(item);
      }
    }

    // 7. Determine available data years
    const allYears = [...new Set((cutoffs || []).map((c: any) => c.year))].sort();

    return {
      summary: {
        total_evaluated: collegeGroups.size,
        dream_count: dream.length,
        very_high_count: veryHigh.length,
        high_count: high.length,
        moderate_count: moderate.length,
        low_count: low.length,
        very_low_count: veryLow.length,
        recommended: shortlist.length,
      },
      matches: shortlist,
      modelInfo: {
        version: '2.0.0-historical',
        data_years: allYears as number[],
        method: 'Historical cutoff ratio analysis with linear trend regression. Predictions are based entirely on verified past counselling data from our database.',
      },
      note: `Predictions for ${course} are based on ${allYears.length} year(s) of official ${category} closing ranks. Actual allotment depends on seat matrix, choice ordering, and round dynamics. Confidence intervals reflect data availability.`,
    };
  }

  /**
   * Log a prediction to the database for analytics.
   */
  async logPrediction(
    input: PredictInput,
    result: PredictResult,
    responseTimeMs: number
  ): Promise<void> {
    try {
      const db = getAdminClient();
      await db.from('prediction_logs').insert({
        neet_rank: input.rank,
        category_code: input.category,
        quota_code: input.quota,
        gender: input.gender,
        state: input.state,
        domicile_state: input.domicile_state,
        course_code: input.course,
        round_name: input.round,
        total_matches: result.summary.total_evaluated,
        safe_count: result.summary.dream_count + result.summary.very_high_count,
        moderate_count: result.summary.moderate_count,
        reach_count: result.summary.low_count + result.summary.very_low_count,
        dream_count: result.summary.dream_count,
        model_version: result.modelInfo.version,
        response_time_ms: responseTimeMs,
        result_snapshot: { summary: result.summary, match_count: result.matches.length },
      });
    } catch (err) {
      log.warn({ err }, 'Failed to log prediction — non-critical');
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function findFuzzySeat(seatMap: Map<string, SeatRecord>, key: string): SeatRecord | null {
  for (const [k, v] of seatMap.entries()) {
    if (key.length >= 12 && k.length >= 12) {
      if (k.includes(key.slice(0, 12)) || key.includes(k.slice(0, 12))) {
        return v;
      }
    }
  }
  return null;
}
