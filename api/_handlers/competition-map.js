import supabase from './db-client.js';
import mpPrivateCutoffs from '../../src/data/mp_private_cutoffs_2024.js';

function normalizeState(s) {
  return String(s || '')
    .toUpperCase()
    .replace(/&/g, 'AND')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function parseRankMid(range) {
  if (!range) return null;
  const nums = String(range).replace(/,/g, '').match(/\d+/g);
  if (!nums || !nums.length) return null;
  if (nums.length === 1) return Number(nums[0]);
  return Math.round((Number(nums[0]) + Number(nums[1])) / 2);
}

function parseScoreMid(range) {
  if (!range) return null;
  const nums = String(range).match(/\d+/g);
  if (!nums || !nums.length) return null;
  if (nums.length === 1) return Number(nums[0]);
  return Math.round((Number(nums[0]) + Number(nums[1])) / 2);
}

// Generates probability strictly based on user's margin against historical cutoffs
// Lower rank is better. Positive margin means user is below the cutoff (better).
function getProbabilityForMargin(margin) {
  if (margin > 0.15) return 0.95; // Safe (90-95%)
  if (margin > 0.05) return 0.85; // Very High (75-89%)
  if (margin > 0.00) return 0.70; // High (60-74%)
  if (margin >= -0.10) return 0.55; // Moderate (45-59%)
  if (margin >= -0.20) return 0.35; // Borderline (30-44%)
  if (margin >= -0.30) return 0.20; // Low (15-29%)
  if (margin >= -0.50) return 0.10; // Very Low (5-14%)
  return 0.0; // Impossible (<5%)
}

function calculateMedian(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Maps 0-1 probability back to UI color ranges
function difficultyFromProbability(prob) {
  if (prob >= 0.90) return 'Excellent';
  if (prob >= 0.75) return 'Very Good';
  if (prob >= 0.60) return 'Good';
  if (prob >= 0.45) return 'Moderate';
  if (prob >= 0.30) return 'Borderline';
  if (prob >= 0.15) return 'Low';
  if (prob >= 0.05) return 'Very Low';
  return 'Impossible';
}

function scoreFromDifficulty(diff) {
    if (diff === 'Excellent') return 10;
    if (diff === 'Very Good') return 20;
    if (diff === 'Good') return 35;
    if (diff === 'Moderate') return 55;
    if (diff === 'Borderline') return 70;
    if (diff === 'Low') return 85;
    if (diff === 'Very Low') return 95;
    return 99; // Impossible
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
      state,
      q,
      course = 'MBBS',
      category = 'All',
      quota = 'All',
      college_type = 'All',
      year = '2024',
      round = 'Round 1',
      min_score,
      max_fees,
      fees,
      rank,
      annual_income,
      has_sambal_card,
      studied_in_govt_school
    } = req.query;

    let yearNum = Number(year) || 2024;
    // Base data uses the selected year or fallback to 2024 if future
    const baseYearNum = yearNum > 2024 ? 2024 : yearNum;
    
    // User rank parsing, ignore if invalid/negative
    let userRank = Number(rank);
    if (isNaN(userRank) || userRank <= 0) userRank = null;

    async function fetchAll(table, select, modifier = q => q, maxPages = 1) {
      const pageSize = 1000;
      const ranges = Array.from({length: maxPages}, (_, i) => [i*pageSize, (i+1)*pageSize - 1]);
      const res = await Promise.all(ranges.map(r => modifier(supabase.from(table).select(select)).range(r[0], r[1])));
      return res.flatMap(r => r.data || []);
    }

    const [baseRowsRes, colleges, seats, cuts] =
      await Promise.all([
        supabase.from('state_competition').select('*').eq('year', baseYearNum).order('competition_score', { ascending: false }),
        fetchAll('colleges', 'id,name,city,state,country,college_type,course,feePvt,feeGovt', q => q.ilike('country', 'INDIA'), 3),
        fetchAll('seat_matrix', '*', q => q, 2),
        // Fetch cutoffs for all recent years for trend analysis
        fetchAll('cutoffs', 'state, category, score, closing_rank, aiq_rank, aiq_score, state_rank_range, college_name, quota_code, year, round_name, course_name', q => {
          let query = q;
          if (category !== 'All') query = query.eq('category', category);
          else query = query.in('category', ['General', 'UR', 'Unreserved', 'OPEN']);
          return query;
        }, 15)
      ]);

    const baseRows = baseRowsRes.data || [];
    const baseErr = baseRowsRes.error;

    if (baseErr) console.warn('base query note:', baseErr.message);

    // Filter 1, 2, 6, 7: Course, College Type, Fees
    const collegesByState = new Map();
    for (const c of colleges || []) {
      const cCourse = (c.course || 'MBBS').toUpperCase();
      if (course && course !== 'All' && cCourse !== String(course).toUpperCase()) {
        continue;
      }
      if (college_type && college_type !== 'All' && c.college_type !== college_type) continue;
      
      if (fees && fees !== 'All') {
        const pvtFee = Number(c.feePvt) || 0;
        const govtFee = Number(c.feeGovt) || 0;
        const fee = (/priv/i.test(c.college_type)) ? pvtFee : (govtFee || pvtFee);

        const isMPPriv = normalizeState(c.state) === 'MADHYA_PRADESH' && /priv/i.test(c.college_type);
        const isMPScholarshipEligible = (annual_income && Number(annual_income) < 600000) || has_sambal_card === 'true';
        const bypassFee = isMPPriv && isMPScholarshipEligible;

        if (fee > 0 && !bypassFee) {
          if (fees === 'Under ₹5L' && fee > 500000) continue;
          if (fees === '₹5L–₹15L' && (fee < 500000 || fee > 1500000)) continue;
          if (fees === 'Above ₹15L' && fee < 1500000) continue;
        }
      }

      const key = normalizeState(c.state);
      if (!collegesByState.has(key)) collegesByState.set(key, []);
      collegesByState.get(key).push(c);
    }

    const seatsByState = new Map();
    for (const s of seats || []) {
      if (college_type && college_type !== 'All') {
        const kind = String(s.college_kind || '');
        if (college_type === 'Government' && !/gov/i.test(kind)) continue;
        if (college_type === 'Private' && !/priv/i.test(kind)) continue;
      }
      const key = normalizeState(s.state);
      if (!seatsByState.has(key)) seatsByState.set(key, []);
      seatsByState.get(key).push(s);
    }

    // Filter 3, 4, 5: Category, Quota, Round (Course is also checked here if available)
    const cutsByState = new Map();
    for (const c of cuts || []) {
      if (category && category !== 'All' && c.category !== category) continue;
      
      if (course && course !== 'All' && c.course_name && c.course_name.toUpperCase() !== String(course).toUpperCase()) continue;

      if (quota && quota !== 'All') {
         const cQuota = String(c.quota_code || '').toUpperCase();
         if (cQuota) {
           if (quota === 'AIQ' && !cQuota.includes('AIQ') && !cQuota.includes('AI')) continue;
           if (quota === 'State' && !cQuota.includes('SQ') && !cQuota.includes('STATE')) continue;
           if (quota === 'Management' && !cQuota.includes('MGT')) continue;
           if (quota === 'NRI' && !cQuota.includes('NRI')) continue;
           if (quota === 'AACCC' && !cQuota.includes('AACCC')) continue;
         }
      }
      
      // Strict Round Matching
      if (round && round !== 'All' && c.round_name) {
          const rName = String(c.round_name).toLowerCase();
          const targetR = String(round).toLowerCase();
          if (targetR.includes('1') && !rName.includes('1')) continue;
          if (targetR.includes('2') && !rName.includes('2')) continue;
          if (targetR.includes('3') && !rName.includes('3')) continue;
          if (targetR.includes('stray') && !rName.includes('stray')) continue;
      }

      const key = normalizeState(c.state);
      if (!cutsByState.has(key)) cutsByState.set(key, []);
      cutsByState.get(key).push(c);
    }

    const seenStates = new Set();
    const uniqueBaseRows = (baseRows || []).filter((row) => {
      const k = normalizeState(row.state_name || row.state_key);
      if (!k || seenStates.has(k)) return false;
      seenStates.add(k);
      return true;
    });

    const enriched = uniqueBaseRows.map((row) => {
      const key = normalizeState(row.state_name);
      const key2 = row.state_key || key;
      const liveCols = collegesByState.get(key) || collegesByState.get(key2) || [];
      const liveSeats = seatsByState.get(key) || seatsByState.get(key2) || [];
      const liveCuts = cutsByState.get(key) || cutsByState.get(key2) || [];

      let totalSeats = row.total_seats || 0;
      let aiqSeats = row.aiq_seats || 0;
      let stateQuota = row.state_quota_seats || 0;
      if (liveSeats.length) {
        totalSeats = liveSeats.reduce((a, s) => a + (s.total_seats || 0), 0) || totalSeats;
        aiqSeats = liveSeats.reduce((a, s) => a + (s.all_india || 0), 0) || aiqSeats;
        stateQuota = liveSeats.reduce((a, s) => a + (s.open_seats || s.remaining_seats || 0), 0) || stateQuota;
      }

      let displaySeats = totalSeats;
      if (quota === 'AIQ') displaySeats = aiqSeats;
      else if (quota === 'State') displaySeats = stateQuota;
      else if (quota === 'Management') displaySeats = Math.round(stateQuota * 0.1);
      else if (quota === 'NRI') displaySeats = Math.round(totalSeats * 0.08);
      else if (quota === 'AACCC') displaySeats = Math.round(totalSeats * 0.15);

      const ranks = liveCuts.map((c) => c.closing_rank || c.aiq_rank || parseRankMid(c.state_rank_range)).filter((n) => typeof n === 'number' && !Number.isNaN(n));
      const scores = liveCuts.map((c) => c.score || c.aiq_score || parseScoreMid(c.state_score_range)).filter((n) => typeof n === 'number' && !Number.isNaN(n));

      const avgClosingRank = ranks.length ? Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length) : row.avg_closing_rank;
      const avgCutoff = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : row.avg_cutoff;

      const totalColleges = liveCols.length || row.total_colleges || 0;
      const govtColleges = liveCols.filter((c) => /gov/i.test(c.college_type || '')).length || row.govt_colleges || 0;
      const privateColleges = liveCols.filter((c) => /priv/i.test(c.college_type || '')).length || row.private_colleges || 0;

      let matchingColleges = 0;
      let safestCollege = null;
      let mostCompetitiveCollege = null;
      let bestCollege = null;
      let lowestCR = Infinity;
      let highestCR = -Infinity;
      
      const collegeProbs = [];

      for (const col of liveCols) {
        let colCuts = liveCuts.filter(c => String(c.college_name || '').toLowerCase().includes(String(col.name || '').toLowerCase().slice(0, 12)));
        
        // --- ADDED FIX FOR "All" QUOTA REALISM ---
        // If quota is 'All', including all state quotas makes every state look easy (unrealistic).
        // To provide a realistic map, 'All' should behave as a Non-Domicile view:
        // Govt Colleges: Only AIQ/Central
        // Private Colleges: Only Open/Management/NRI in Open States
        if (quota === 'All' || !quota) {
            const isGovt = /gov/i.test(col.college_type || '');
            const OPEN_STATES = ['ANDHRA_PRADESH', 'BIHAR', 'CHHATTISGARH', 'HARYANA', 'HIMACHAL_PRADESH', 'JHARKHAND', 'KARNATAKA', 'KERALA', 'MANIPUR', 'PUDUCHERRY', 'RAJASTHAN', 'SIKKIM', 'TAMIL_NADU', 'TELANGANA', 'TRIPURA', 'UTTAR_PRADESH', 'UTTARAKHAND', 'WEST_BENGAL'];
            
            colCuts = colCuts.filter(c => {
                const cQuota = String(c.quota_code || '').toUpperCase();
                if (isGovt) {
                    return cQuota.includes('AIQ') || cQuota.includes('AI') || cQuota.includes('CENTRAL');
                } else {
                    if (!OPEN_STATES.includes(key)) return false; // Closed state private college
                    if (cQuota.includes('SQ') || cQuota.includes('STATE')) return false; // State quota in private colleges is closed
                    return true;
                }
            });
        }
        // ------------------------------------------

        let colOverallCR = null;
        
        // Year weights: 2025 (40%), 2024 (30%), 2023 (20%), 2022 (10%)
        const weights = { 2025: 0.40, 2024: 0.30, 2023: 0.20, 2022: 0.10 };
        const availableYears = {};

        for (const c of colCuts) {
            const yr = Number(c.year) || 2024;
            const r = c.closing_rank || c.aiq_rank || parseRankMid(c.state_rank_range);
            if (r && !isNaN(r) && r > 0) {
                if (!availableYears[yr] || availableYears[yr] < r) {
                    availableYears[yr] = r; // use highest rank (most lenient) if multiple rounds matched
                }
            }
        }

        // Apply MP Private overrides if applicable
        if (key === 'MADHYA_PRADESH' && /priv/i.test(col.college_type || '')) {
            const mpData = mpPrivateCutoffs['Madhya Pradesh'];
            if (mpData) {
                const overrideKey = Object.keys(mpData).find(k => String(col.name).toLowerCase().includes(k.split(',')[0].toLowerCase()));
                if (overrideKey && mpData[overrideKey]) {
                    const catData = mpData[overrideKey][category] || mpData[overrideKey]['UR'];
                    if (catData && catData.rank) {
                        availableYears[2024] = catData.rank; // Override 2024 data
                    }
                }
            }
        }

        if (Object.keys(availableYears).length === 0) continue;

        let totalWeight = 0;
        let weightedProb = 0;
        let latestCR = null;

        for (const [yr, yrCR_raw] of Object.entries(availableYears)) {
            let yrCR = yrCR_raw;
            // GS Quota Inflation
            if (studied_in_govt_school === 'true' && /gov/i.test(col.college_type || '')) {
                yrCR = Math.round(yrCR * 1.3);
            }

            if (!latestCR || Number(yr) > latestCR.year) {
                latestCR = { year: Number(yr), rank: yrCR };
            }

            if (userRank) {
                const margin = (yrCR - userRank) / yrCR;
                const p = getProbabilityForMargin(margin);
                const w = weights[yr] || 0.1;
                weightedProb += p * w;
                totalWeight += w;
            }
        }

        colOverallCR = latestCR ? latestCR.rank : null;

        if (colOverallCR) {
            if (colOverallCR < lowestCR) { lowestCR = colOverallCR; mostCompetitiveCollege = col.name; }
            if (colOverallCR > highestCR) { highestCR = colOverallCR; safestCollege = col.name; }
        }

        if (userRank && totalWeight > 0) {
            // Normalize probability by the weights of available years
            const finalProb = weightedProb / totalWeight;
            if (finalProb > 0.45) matchingColleges++;
            collegeProbs.push({ name: col.name, cr: colOverallCR, prob: finalProb });
        }
      }

      if (lowestCR === Infinity) lowestCR = null;
      if (highestCR === -Infinity) highestCR = null;

      let admissionProbability = 0;
      let stateDifficulty = 'Moderate';
      let competitionScore = 50;

      if (userRank) {
        if (collegeProbs.length > 0) {
            // Sort probabilities descending
            collegeProbs.sort((a, b) => b.prob - a.prob);
            
            const topProb = collegeProbs[0].prob;
            const medProb = calculateMedian(collegeProbs.map(c => c.prob));
            const avgProb = collegeProbs.reduce((acc, c) => acc + c.prob, 0) / collegeProbs.length;
            
            // Success Ratio: % of colleges where prob > 45% (Moderate or better)
            const successRatio = collegeProbs.filter(c => c.prob >= 0.45).length / collegeProbs.length;

            // Final State Score Rollup
            admissionProbability = (topProb * 0.20) + (medProb * 0.40) + (avgProb * 0.20) + (successRatio * 0.20);
            
            // Clamp between 0.0 and 1.0
            admissionProbability = Math.max(0, Math.min(1, admissionProbability));
            
            bestCollege = collegeProbs[0]?.name;
            stateDifficulty = difficultyFromProbability(admissionProbability);
            competitionScore = scoreFromDifficulty(stateDifficulty);
        } else {
            // If rank provided but no colleges match, probability is 0 (Impossible)
            admissionProbability = 0;
            stateDifficulty = 'Impossible';
            competitionScore = 99;
        }
      } else {
        // No rank provided, fallback to generic density calculation
        if (totalColleges > 0 && totalSeats > 0) {
            const density = Math.min(20, Math.round(totalSeats / Math.max(totalColleges, 1) / 20));
            competitionScore = Math.min(99, Math.max(20, 50 + (10 - density)));
        } else {
            competitionScore = 50;
        }
        stateDifficulty = difficultyFromProbability(Math.max(0, 1 - (competitionScore/100)));
        admissionProbability = Math.max(0.08, Math.min(0.85, (100 - competitionScore) / 100));
      }

      const topFromLive = liveCols.slice(0, 6).map((c, i) => ({
        name: c.name,
        type: c.college_type || 'Government',
        city: c.city,
        seats: liveSeats.find((s) => String(s.college_name || '').toLowerCase().includes(String(c.name || '').toLowerCase().slice(0, 12)))?.total_seats,
        closing_rank: ranks[i] || avgClosingRank,
      }));

      const top_colleges = Array.isArray(row.top_colleges) && row.top_colleges.length ? row.top_colleges : topFromLive;

      const cutoff_trend = Array.isArray(row.cutoff_trend) ? row.cutoff_trend : [
        (avgCutoff || 560) + 15, (avgCutoff || 560) + 10, (avgCutoff || 560) + 6,
        (avgCutoff || 560) + 2, avgCutoff || 560, (avgCutoff || 560) - 2,
      ];

      const seat_split = row.seat_split && typeof row.seat_split === 'object' ? row.seat_split : {
        AIQ: aiqSeats, State: stateQuota, Management: Math.round(stateQuota * 0.1), NRI: Math.round(totalSeats * 0.08),
      };

      let insightText = '';
      if (userRank) {
        if (matchingColleges > 0) {
          insightText = `Your AIR ${userRank.toLocaleString('en-IN')} gives ${stateDifficulty.toLowerCase()} admission chances in ${row.state_name}. ${matchingColleges} colleges historically closed near or below your rank in ${round}.`;
        } else {
          insightText = `Your AIR ${userRank.toLocaleString('en-IN')} makes admission impossible in ${row.state_name} based on current filters. Try relaxing your filters or exploring other states.`;
        }
      } else {
          insightText = `${row.state_name} shows ${stateDifficulty.toLowerCase()} competition. ${govtColleges} govt / ${privateColleges} private colleges in catalogue.`;
      }

      return {
        id: row.id,
        state_key: row.state_key || key2,
        state_name: row.state_name,
        map_name: row.state_name,
        competition_score: Math.round(competitionScore * 10) / 10,
        difficulty: stateDifficulty,
        total_colleges: totalColleges,
        govt_colleges: govtColleges,
        private_colleges: privateColleges,
        total_seats: totalSeats,
        display_seats: displaySeats,
        aiq_seats: aiqSeats,
        state_quota_seats: stateQuota,
        avg_closing_rank: avgClosingRank,
        lowest_closing_rank: lowestCR,
        highest_closing_rank: highestCR,
        safest_college: safestCollege,
        most_competitive_college: mostCompetitiveCollege,
        best_college: bestCollege,
        matching_colleges: matchingColleges,
        avg_cutoff: avgCutoff,
        admission_probability: Math.round(admissionProbability * 1000) / 1000,
        insight: insightText,
        demand_index: Number(row.demand_index) || competitionScore,
        supply_index: Number(row.supply_index) || Math.max(5, 100 - competitionScore),
        top_colleges,
        cutoff_trend,
        seat_split,
        year: yearNum,
        colleges_sample: liveCols.slice(0, 12),
        seat_rows: liveSeats.slice(0, 20),
        cutoff_rows: liveCuts.slice(0, 24),
        filters_applied: { course, category, quota, college_type, year: yearNum },
      };
    });

    let list = enriched;

    if (min_score) {
      const ms = Number(min_score);
      if (!Number.isNaN(ms)) list = list.filter((r) => (r.avg_cutoff || 0) >= ms);
    }

    if (q) {
      const qq = String(q).toLowerCase();
      list = list.filter(
        (r) =>
          r.state_name.toLowerCase().includes(qq) ||
          (r.top_colleges || []).some((c) => String(c.name || '').toLowerCase().includes(qq)) ||
          (r.colleges_sample || []).some((c) => String(c.name || '').toLowerCase().includes(qq))
      );
    }

    if (state && state !== 'All') {
      const sk = normalizeState(state);
      list = list.filter(
        (r) => normalizeState(r.state_name) === sk || normalizeState(r.state_key) === sk
      );
    }

    // Sort hottest first
    list.sort((a, b) => b.competition_score - a.competition_score);

    const summary = {
      states: list.length,
      total_colleges: list.reduce((a, r) => a + (r.total_colleges || 0), 0),
      total_seats: list.reduce((a, r) => a + (r.total_seats || 0), 0),
      avg_competition:
        list.length === 0
          ? 0
          : Math.round(
              (list.reduce((a, r) => a + r.competition_score, 0) / list.length) * 10
            ) / 10,
      hottest: list.slice(0, 5).map((r) => ({
        state_name: r.state_name,
        competition_score: r.competition_score,
        difficulty: r.difficulty,
      })),
      easiest: [...list]
        .sort((a, b) => a.competition_score - b.competition_score)
        .slice(0, 5)
        .map((r) => ({
          state_name: r.state_name,
          competition_score: r.competition_score,
          difficulty: r.difficulty,
        })),
      highest_chance: userRank ? [...list].filter(r => r.admission_probability >= 0.75).sort((a,b) => b.admission_probability - a.admission_probability).slice(0, 5).map(r => ({ state_name: r.state_name, competition_score: Math.round(r.admission_probability * 100) + '%' })) : undefined,
      moderate_chance: userRank ? [...list].filter(r => r.admission_probability >= 0.45 && r.admission_probability < 0.75).sort((a,b) => b.admission_probability - a.admission_probability).slice(0, 5).map(r => ({ state_name: r.state_name, competition_score: Math.round(r.admission_probability * 100) + '%' })) : undefined,
      very_difficult: userRank ? [...list].filter(r => r.admission_probability < 0.45).sort((a,b) => a.admission_probability - b.admission_probability).slice(0, 5).map(r => ({ state_name: r.state_name, competition_score: Math.round(r.admission_probability * 100) + '%' })) : undefined,
    };

    if (req.query.detail === '1' && list.length === 1) {
      return res.status(200).json({ state: list[0], summary });
    }

    return res.status(200).json({ states: list, summary });
  } catch (err) {
    console.error('competition-map error:', err);
    res.status(500).json({ error: err.message });
  }
}
