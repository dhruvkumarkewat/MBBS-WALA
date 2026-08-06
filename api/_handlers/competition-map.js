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

function difficultyFromScore(score) {
  if (score >= 88) return 'Extreme';
  if (score >= 78) return 'Very High';
  if (score >= 65) return 'High';
  if (score >= 48) return 'Moderate';
  return 'Low';
}

function buildInsight(row, live) {
  if (row.insight) return row.insight;
  const parts = [];
  parts.push(`${row.state_name} shows ${row.difficulty || difficultyFromScore(row.competition_score)} competition`);
  if (live?.avgClosingRank) parts.push(`avg closing rank near ${live.avgClosingRank.toLocaleString('en-IN')}`);
  if (live?.govt != null && live?.priv != null) parts.push(`${live.govt} govt / ${live.priv} private colleges in catalogue`);
  parts.push('Blend AIQ with state quota and re-check seat matrix each round.');
  return parts.join('. ') + '.';
}

function calculateProbability(userRank, closingRank) {
  if (!userRank || !closingRank || closingRank <= 0) return 0.5;

  // User rank lower is better.
  const diff = closingRank - userRank; 
  // Ratio = diff / closingRank (how far inside or outside the cutoff)
  const ratio = diff / closingRank;
  
  // Safe >= 0.15 * CR -> 95%
  // Impossible <= -0.15 * CR -> 5%
  let prob = (ratio + 0.15) / 0.30; 
  
  if (ratio >= 0.5) return 0.99;
  if (ratio <= -0.5) return 0.01;
  
  prob = Math.max(0.05, Math.min(0.95, prob));
  return prob;
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
      year = '2026',
      round = 'Round 1',
      min_score,
      max_fees,
      fees,
      rank,
      annual_income,
      has_sambal_card,
      studied_in_govt_school
    } = req.query;

    const userRank = Number(rank) || null;
    const isPrediction = Number(year) >= 2026;
    let baseYearNum = Number(year);
    if (baseYearNum > 2024) baseYearNum = 2024; // Use 2024 as base for base metrics

    async function fetchAll(table, select, modifier = q => q, maxPages = 1) {
      const pageSize = 1000;
      const ranges = Array.from({length: maxPages}, (_, i) => [i*pageSize, (i+1)*pageSize - 1]);
      const res = await Promise.all(ranges.map(r => modifier(supabase.from(table).select(select)).range(r[0], r[1])));
      return res.flatMap(r => r.data || []);
    }
    
    // Fetch base metadata, colleges, seat matrix, and cutoffs in parallel
    const [baseRowsRes, colleges, seats, cuts] = await Promise.all([
      supabase.from('state_competition').select('*').order('competition_score', { ascending: false }),
      fetchAll('colleges', 'id,name,city,state,country,college_type,course,feePvt,feeGovt', q => q.ilike('country', 'INDIA'), 4),
      fetchAll('seat_matrix', '*', q => q, 3),
      fetchAll('cutoffs', 'state, category, score, closing_rank, aiq_rank, aiq_score, state_rank_range, college_name, quota_code, year, round_name', q => {
        let query = q;
        if (category !== 'All') {
          query = query.eq('category', category);
        } else {
          query = query.in('category', ['General', 'UR', 'Unreserved', 'OPEN']);
        }
        if (round && round !== 'All') {
          query = query.ilike('round_name', `%${round}%`);
        }
        return query;
      }, 15) // Fetch multiple years for weighting
    ]);

    const baseRows = baseRowsRes.data || [];

    // Filter Colleges matching UI state
    const collegesByState = new Map();
    for (const c of colleges || []) {
      const cCourse = (c.course || 'MBBS').toUpperCase();
      if (course && course !== 'All' && cCourse !== String(course).toUpperCase()) continue;
      if (college_type && college_type !== 'Both' && college_type !== 'All' && c.college_type !== college_type) continue;
      
      if (fees && fees !== 'All') {
        const pvtFee = Number(c.feePvt) || 0;
        const govtFee = Number(c.feeGovt) || 0;
        const fee = (/priv/i.test(c.college_type)) ? pvtFee : (govtFee || pvtFee);

        const isMPPriv = normalizeState(c.state) === 'MADHYA_PRADESH' && /priv/i.test(c.college_type);
        const isMPScholarshipEligible = (annual_income && Number(annual_income) < 600000) || has_sambal_card === 'true';
        const bypassFee = isMPPriv && isMPScholarshipEligible;

        if (fee > 0 && !bypassFee) {
          if (fees === 'Below ₹5L' || fees === 'Under ₹5L') { if (fee > 500000) continue; }
          else if (fees === '₹5L–₹15L') { if (fee < 500000 || fee > 1500000) continue; }
          else if (fees === 'Above ₹15L') { if (fee < 1500000) continue; }
        }
      }

      const key = normalizeState(c.state);
      if (!collegesByState.has(key)) collegesByState.set(key, []);
      collegesByState.get(key).push(c);
    }

    // Filter Seat Matrix
    const seatsByState = new Map();
    for (const s of seats || []) {
      if (college_type && college_type !== 'Both' && college_type !== 'All') {
        const kind = String(s.college_kind || '');
        if (college_type === 'Government' && !/gov/i.test(kind)) continue;
        if (college_type === 'Private' && !/priv/i.test(kind)) continue;
      }
      const key = normalizeState(s.state);
      if (!seatsByState.has(key)) seatsByState.set(key, []);
      seatsByState.get(key).push(s);
    }

    // Filter Cutoffs (apply Quota strictly)
    const cutsByState = new Map();
    for (const c of cuts || []) {
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

      const key = normalizeState(c.state);
      if (!cutsByState.has(key)) cutsByState.set(key, []);
      cutsByState.get(key).push(c);
    }

    const seenStates = new Set();
    const uniqueBaseRows = (baseRows || []).filter((row) => {
      const k = normalizeState(row.state_name || row.state_key);
      if (!k || seenStates.has(k)) return false;
      if (row.year !== baseYearNum && row.year !== 2024) return false;
      seenStates.add(k);
      return true;
    });

    const enriched = uniqueBaseRows.map((row) => {
      const key = normalizeState(row.state_name);
      const key2 = row.state_key || key;
      const liveCols = collegesByState.get(key) || collegesByState.get(key2) || [];
      const liveSeats = seatsByState.get(key) || seatsByState.get(key2) || [];
      const liveCuts = cutsByState.get(key) || cutsByState.get(key2) || [];

      const govtLive = liveCols.filter((c) => /gov/i.test(c.college_type || '')).length;
      const privLive = liveCols.filter((c) => /priv/i.test(c.college_type || '')).length;

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

      const totalColleges = liveCols.length || row.total_colleges || 0;
      const govtColleges = govtLive || row.govt_colleges || 0;
      const privateColleges = privLive || row.private_colleges || 0;

      let matchingCollegesCount = 0;
      let safestCollege = null;
      let mostCompetitiveCollege = null;
      let bestCollege = null;
      let lowestCR = Infinity;
      let highestCR = -Infinity;
      
      const collegeProbs = [];
      let totalValidCollegesForRank = 0;

      for (const col of liveCols) {
        const colCuts = liveCuts.filter(c => String(c.college_name || '').toLowerCase().includes(String(col.name || '').toLowerCase().slice(0, 12)));
        
        let weightedCR = 0;
        let totalWeight = 0;

        const yearWeights = {
          2025: 0.40,
          2024: 0.30,
          2023: 0.20,
          2022: 0.10
        };

        let lastKnownCR = null;

        for (const [y, w] of Object.entries(yearWeights)) {
          const cY = colCuts.filter(c => c.year === Number(y));
          if (cY.length > 0) {
            const ranks = cY.map((c) => c.closing_rank || c.aiq_rank || parseRankMid(c.state_rank_range)).filter(n => typeof n === 'number' && !Number.isNaN(n));
            if (ranks.length > 0) {
              const avgYRank = ranks.reduce((a, b) => a + b, 0) / ranks.length;
              weightedCR += avgYRank * w;
              totalWeight += w;
              lastKnownCR = avgYRank;
            }
          }
        }

        let finalCR = null;
        if (totalWeight > 0) {
          finalCR = Math.round(weightedCR / totalWeight);
        } else if (lastKnownCR) {
          finalCR = lastKnownCR;
        } else {
          finalCR = row.avg_closing_rank;
        }

        if (!finalCR) continue;

        // MP Private Override
        if (key === 'MADHYA_PRADESH' && /priv/i.test(col.college_type || '')) {
            const mpData = mpPrivateCutoffs['Madhya Pradesh'];
            if (mpData) {
                const overrideKey = Object.keys(mpData).find(k => String(col.name).toLowerCase().includes(k.split(',')[0].toLowerCase()));
                if (overrideKey && mpData[overrideKey]) {
                    const catData = mpData[overrideKey][category] || mpData[overrideKey]['UR'];
                    if (catData && catData.rank) finalCR = catData.rank;
                }
            }
        }

        totalValidCollegesForRank++;

        if (isPrediction) {
          // Prediction tightening logic based on historical trend
          const yearsDiff = Number(year) - 2024;
          if (yearsDiff > 0) {
             finalCR = Math.round(finalCR * Math.pow(0.97, yearsDiff));
          }
        }

        if (studied_in_govt_school === 'true' && /gov/i.test(col.college_type || '')) {
            finalCR = Math.round(finalCR * 1.3);
        }

        if (finalCR < lowestCR) { lowestCR = finalCR; mostCompetitiveCollege = col.name; }
        if (finalCR > highestCR) { highestCR = finalCR; safestCollege = col.name; }

        let prob = 0.5;
        if (userRank) {
          prob = calculateProbability(userRank, finalCR);
          if (prob > 0.4) matchingCollegesCount++;
        }
        collegeProbs.push({ name: col.name, cr: finalCR, prob });
      }

      if (lowestCR === Infinity) lowestCR = null;
      if (highestCR === -Infinity) highestCR = null;

      let admissionProbability = 0;
      let competitionScore = Number(row.competition_score) || 50;

      if (userRank && collegeProbs.length > 0) {
        collegeProbs.sort((a, b) => b.prob - a.prob);
        
        const probs = collegeProbs.map(c => c.prob);
        const topProb = probs[0];
        const avgProb = probs.reduce((a, b) => a + b, 0) / probs.length;
        const midIndex = Math.floor(probs.length / 2);
        const medianProb = probs.length % 2 !== 0 ? probs[midIndex] : (probs[midIndex - 1] + probs[midIndex]) / 2.0;
        const successRatio = matchingCollegesCount / totalValidCollegesForRank;

        bestCollege = collegeProbs[0]?.name;

        // Smart aggregation logic
        admissionProbability = (topProb * 0.40) + (avgProb * 0.30) + (medianProb * 0.20) + (successRatio * 0.10);
        admissionProbability = Math.max(0.05, Math.min(0.95, admissionProbability));
        
        competitionScore = 100 - (admissionProbability * 100);
        competitionScore = Math.max(5, Math.min(99, competitionScore));
      } else {
        if (totalColleges > 0 && totalSeats > 0) {
          const density = Math.min(20, Math.round(totalSeats / Math.max(totalColleges, 1) / 20));
          competitionScore = Math.min(99, Math.max(20, competitionScore + (10 - density)));
        }
        admissionProbability = Math.max(0.05, Math.min(0.95, (100 - competitionScore) / 100));
      }

      const difficulty = userRank ? difficultyFromScore(competitionScore) : (row.difficulty || difficultyFromScore(competitionScore));

      const topFromLive = liveCols.slice(0, 6).map((c, i) => ({
        name: c.name,
        type: c.college_type || 'Government',
        city: c.city,
        seats: liveSeats.find((s) => String(s.college_name || '').toLowerCase().includes(String(c.name || '').toLowerCase().slice(0, 12)))?.total_seats,
        closing_rank: collegeProbs.find(p => p.name === c.name)?.cr || row.avg_closing_rank,
      }));

      const top_colleges = Array.isArray(row.top_colleges) && row.top_colleges.length ? row.top_colleges : topFromLive;
      const live = { avgClosingRank: row.avg_closing_rank, govt: govtColleges, priv: privateColleges };
      
      let insightText = '';
      if (userRank) {
        if (matchingCollegesCount > 0) {
          const chanceLevel = admissionProbability >= 0.75 ? 'strong' : admissionProbability >= 0.45 ? 'moderate' : 'low';
          insightText = `Your current AIR gives ${chanceLevel} admission chances in ${row.state_name} because ${matchingCollegesCount} colleges closed below your rank historically for ${round}.`;
        } else {
          insightText = `Your current AIR makes admission very difficult in ${row.state_name}. Try looking at private quotas or other states.`;
        }
      } else {
        insightText = buildInsight(row, live);
      }

      return {
        id: row.id,
        state_key: key2,
        state_name: row.state_name,
        map_name: row.state_name,
        competition_score: Math.round(competitionScore * 10) / 10,
        difficulty,
        total_colleges: totalColleges,
        govt_colleges: govtColleges,
        private_colleges: privateColleges,
        total_seats: totalSeats,
        display_seats: displaySeats,
        aiq_seats: aiqSeats,
        state_quota_seats: stateQuota,
        avg_closing_rank: row.avg_closing_rank,
        lowest_closing_rank: lowestCR,
        highest_closing_rank: highestCR,
        safest_college: safestCollege,
        most_competitive_college: mostCompetitiveCollege,
        best_college: bestCollege,
        matching_colleges: matchingCollegesCount,
        avg_cutoff: row.avg_cutoff,
        admission_probability: Math.round(admissionProbability * 1000) / 1000,
        insight: insightText,
        demand_index: Number(row.demand_index) || competitionScore,
        supply_index: Number(row.supply_index) || Math.max(5, 100 - competitionScore),
        top_colleges,
        cutoff_trend: row.cutoff_trend || [],
        seat_split: row.seat_split || {},
        year: Number(year),
        colleges_sample: liveCols.slice(0, 12),
        seat_rows: liveSeats.slice(0, 20),
        cutoff_rows: liveCuts.slice(0, 24),
        filters_applied: { course, category, quota, college_type, year: Number(year) },
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

    list.sort((a, b) => b.competition_score - a.competition_score);

    const summary = {
      states: list.length,
      total_colleges: list.reduce((a, r) => a + (r.total_colleges || 0), 0),
      total_seats: list.reduce((a, r) => a + (r.total_seats || 0), 0),
      avg_competition: list.length === 0 ? 0 : Math.round((list.reduce((a, r) => a + r.competition_score, 0) / list.length) * 10) / 10,
      hottest: list.slice(0, 5).map((r) => ({ state_name: r.state_name, competition_score: r.competition_score, difficulty: r.difficulty })),
      easiest: [...list].sort((a, b) => a.competition_score - b.competition_score).slice(0, 5).map((r) => ({ state_name: r.state_name, competition_score: r.competition_score, difficulty: r.difficulty })),
      highest_chance: userRank ? [...list].filter(r => r.admission_probability >= 0.75).sort((a,b) => b.admission_probability - a.admission_probability).slice(0, 5).map(r => ({ state_name: r.state_name, competition_score: Math.round(r.admission_probability * 100) + '%' })) : undefined,
      moderate_chance: userRank ? [...list].filter(r => r.admission_probability >= 0.45 && r.admission_probability < 0.75).sort((a,b) => b.admission_probability - a.admission_probability).slice(0, 5).map(r => ({ state_name: r.state_name, competition_score: Math.round(r.admission_probability * 100) + '%' })) : undefined,
      very_difficult: userRank ? [...list].filter(r => r.admission_probability < 0.45).sort((a,b) => a.admission_probability - b.admission_probability).slice(0, 5).map(r => ({ state_name: r.state_name, competition_score: Math.round(r.admission_probability * 100) + '%' })) : undefined,
    };

    try {
      const { callAI } = await import('./ai-service.js');
      const aiPrompt = `You are an expert NEET Medical Admissions Counsellor. 
Analyze this map data for a student with AIR ${userRank || 'Not provided'}, Category: ${category}, Quotas: ${quota}.
The safest states for them are: ${summary.easiest.map(e => e.state_name).join(', ')}.
The toughest states are: ${summary.hottest.map(e => e.state_name).join(', ')}.
Total states analyzed: ${list.length}.

Write a personalized 2-sentence summary providing strategic advice on which state quotas or management quotas they should target. Do not use markdown, just plain text. Return it in JSON format: {"summary_text": "..."}`;
      
      const aiResponseText = await callAI(
        "You are an expert NEET Admissions Analyst. ONLY RETURN VALID JSON.",
        aiPrompt,
        true
      );
      
      if (aiResponseText) {
        const aiJson = JSON.parse(aiResponseText);
        if (aiJson.summary_text) {
          summary.ai_analysis = aiJson.summary_text;
        }
      }
    } catch (e) {
      console.error("AI Map Summary Error:", e);
    }

    if (req.query.detail === '1' && list.length === 1) {
      return res.status(200).json({ state: list[0], summary });
    }

    return res.status(200).json({ states: list, summary });
  } catch (err) {
    console.error('competition-map error:', err);
    res.status(500).json({ error: err.message });
  }
}
