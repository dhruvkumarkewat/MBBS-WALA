import supabase from './db-client.js';

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
  parts.push(
    `${row.state_name} shows ${row.difficulty || difficultyFromScore(row.competition_score)} competition`
  );
  if (live?.avgClosingRank)
    parts.push(`avg closing rank near ${live.avgClosingRank.toLocaleString('en-IN')}`);
  if (live?.govt != null && live?.priv != null)
    parts.push(`${live.govt} govt / ${live.priv} private colleges in catalogue`);
  parts.push('Blend AIQ with state quota and re-check seat matrix each round.');
  return parts.join('. ') + '.';
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
    } = req.query;

    let yearNum = Number(year) || 2024;
    // Fallback to latest available data year (2024) for future years since new cutoffs aren't released yet
    if (yearNum > 2024) {
      yearNum = 2024;
    }
    const userRank = Number(rank) || null;

    async function fetchAll(table, select, modifier = q => q, maxPages = 1) {
      const pageSize = 1000;
      const ranges = Array.from({length: maxPages}, (_, i) => [i*pageSize, (i+1)*pageSize - 1]);
      const res = await Promise.all(ranges.map(r => modifier(supabase.from(table).select(select)).range(r[0], r[1])));
      return res.flatMap(r => r.data || []);
    }

    const [baseRowsRes, colleges, seats, cuts] =
      await Promise.all([
        supabase.from('state_competition').select('*').eq('year', yearNum).order('competition_score', { ascending: false }),
        fetchAll('colleges', 'id,name,city,state,country,college_type,course,feePvt,feeGovt', q => q.ilike('country', 'INDIA'), 3),
        fetchAll('seat_matrix', '*', q => q, 2),
        fetchAll('cutoffs', 'state, category, score, closing_rank, aiq_rank, aiq_score, state_rank_range, college_name, quota_code', q => {
          if (category !== 'All') return q.eq('category', category);
          return q.in('category', ['General', 'UR', 'Unreserved', 'OPEN']);
        }, 10)
      ]);

    const baseRows = baseRowsRes.data || [];
    const baseErr = baseRowsRes.error;

    if (baseErr) console.warn('base query note:', baseErr.message);

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

        if (fee > 0) {
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

    const cutsByState = new Map();
    for (const c of cuts || []) {
      if (category && category !== 'All' && c.category !== category) continue;
      
      if (quota && quota !== 'All') {
         const cQuota = String(c.quota_code || '').toUpperCase();
         if (cQuota) {
           if (quota === 'AIQ' && !cQuota.includes('AIQ') && !cQuota.includes('AI')) continue;
           if (quota === 'State' && !cQuota.includes('SQ') && !cQuota.includes('STATE')) continue;
           if (quota === 'Management' && !cQuota.includes('MGT')) continue;
           if (quota === 'NRI' && !cQuota.includes('NRI')) continue;
         }
      }

      const key = normalizeState(c.state);
      if (!cutsByState.has(key)) cutsByState.set(key, []);
      cutsByState.get(key).push(c);
    }

    // Deduplicate base rows so each Indian State / UT appears exactly once (36 regions)
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

      const govtLive = liveCols.filter((c) => /gov/i.test(c.college_type || '')).length;
      const privLive = liveCols.filter((c) => /priv/i.test(c.college_type || '')).length;

      let totalSeats = row.total_seats || 0;
      let aiqSeats = row.aiq_seats || 0;
      let stateQuota = row.state_quota_seats || 0;
      if (liveSeats.length) {
        totalSeats = liveSeats.reduce((a, s) => a + (s.total_seats || 0), 0) || totalSeats;
        aiqSeats = liveSeats.reduce((a, s) => a + (s.all_india || 0), 0) || aiqSeats;
        stateQuota =
          liveSeats.reduce((a, s) => a + (s.open_seats || s.remaining_seats || 0), 0) || stateQuota;
      }

      // Quota filter adjusts displayed seat emphasis
      let displaySeats = totalSeats;
      if (quota === 'AIQ') displaySeats = aiqSeats;
      else if (quota === 'State') displaySeats = stateQuota;
      else if (quota === 'Management') displaySeats = Math.round(stateQuota * 0.1);
      else if (quota === 'NRI') displaySeats = Math.round(totalSeats * 0.08);

      const ranks = liveCuts
        .map((c) => c.aiq_rank || parseRankMid(c.state_rank_range))
        .filter((n) => typeof n === 'number' && !Number.isNaN(n));
      const scores = liveCuts
        .map((c) => c.aiq_score || parseScoreMid(c.state_score_range))
        .filter((n) => typeof n === 'number' && !Number.isNaN(n));

      const avgClosingRank = ranks.length
        ? Math.round(ranks.reduce((a, b) => a + b, 0) / ranks.length)
        : row.avg_closing_rank;
      const avgCutoff = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : row.avg_cutoff;

      const totalColleges = liveCols.length || row.total_colleges || 0;
      const govtColleges = govtLive || row.govt_colleges || 0;
      const privateColleges = privLive || row.private_colleges || 0;

      // Live competition nudge from density
      let competitionScore = Number(row.competition_score) || 50;
      if (totalColleges > 0 && totalSeats > 0) {
        const density = Math.min(20, Math.round(totalSeats / Math.max(totalColleges, 1) / 20));
        competitionScore = Math.min(99, Math.max(20, competitionScore + (10 - density)));
      }
      
      const difficulty = row.difficulty || difficultyFromScore(competitionScore);

      let matchingColleges = 0;
      let safestCollege = null;
      let mostCompetitiveCollege = null;
      let bestCollege = null;
      let lowestCR = Infinity;
      let highestCR = -Infinity;
      
      const collegeProbs = [];

      for (const col of liveCols) {
        // find cutoffs for this college
        const colCuts = liveCuts.filter(c => String(c.college_name || '').toLowerCase().includes(String(col.name || '').toLowerCase().slice(0, 12)));
        const colRanks = colCuts
          .map((c) => c.aiq_rank || parseRankMid(c.state_rank_range))
          .filter((n) => typeof n === 'number' && !Number.isNaN(n));
        
        let colCR = colRanks.length ? Math.max(...colRanks) : row.avg_closing_rank;
        if (!colCR) continue;

        if (colCR < lowestCR) { lowestCR = colCR; mostCompetitiveCollege = col.name; }
        if (colCR > highestCR) { highestCR = colCR; safestCollege = col.name; }

        let prob = 0.5;
        if (userRank) {
          const diff = colCR - userRank;
          const ratio = diff / userRank; 
          
          if (ratio >= 0.1) prob = 1.0;
          else if (ratio <= -0.15) prob = 0.0;
          else {
            prob = (ratio + 0.15) / 0.25;
            prob = Math.max(0, Math.min(1, prob));
          }
          if (prob > 0.4) matchingColleges++;
        }
        collegeProbs.push({ name: col.name, cr: colCR, prob });
      }

      if (lowestCR === Infinity) lowestCR = null;
      if (highestCR === -Infinity) highestCR = null;

      let admissionProbability = 0;
      if (userRank && collegeProbs.length > 0) {
        collegeProbs.sort((a, b) => b.prob - a.prob);
        const topN = Math.max(1, Math.min(5, collegeProbs.length));
        const bestOppProbs = collegeProbs.slice(0, topN).map(c => c.prob);
        admissionProbability = bestOppProbs.reduce((a, b) => a + b, 0) / bestOppProbs.length;
        bestCollege = collegeProbs[0]?.name;
        // Adjust competition score based on user's probability (0 to 100)
        // If prob is 100%, competition is low for them (e.g. 10). If prob is 0%, competition is extreme (e.g. 99)
        competitionScore = 100 - Math.round(admissionProbability * 100);
        competitionScore = Math.max(5, Math.min(99, competitionScore));
      } else {
        admissionProbability = row.admission_probability != null
          ? Number(row.admission_probability)
          : Math.max(0.08, Math.min(0.85, (100 - competitionScore) / 100));
      }

      const topFromLive = liveCols.slice(0, 6).map((c, i) => ({
        name: c.name,
        type: c.college_type || 'Government',
        city: c.city,
        seats: liveSeats.find((s) =>
          String(s.college_name || '')
            .toLowerCase()
            .includes(String(c.name || '').toLowerCase().slice(0, 12))
        )?.total_seats,
        closing_rank: ranks[i] || avgClosingRank,
      }));

      const top_colleges =
        Array.isArray(row.top_colleges) && row.top_colleges.length
          ? row.top_colleges
          : topFromLive;

      const cutoff_trend = Array.isArray(row.cutoff_trend)
        ? row.cutoff_trend
        : [
            (avgCutoff || 560) + 15,
            (avgCutoff || 560) + 10,
            (avgCutoff || 560) + 6,
            (avgCutoff || 560) + 2,
            avgCutoff || 560,
            (avgCutoff || 560) - 2,
          ];

      const seat_split =
        row.seat_split && typeof row.seat_split === 'object'
          ? row.seat_split
          : {
              AIQ: aiqSeats,
              State: stateQuota,
              Management: Math.round(stateQuota * 0.1),
              NRI: Math.round(totalSeats * 0.08),
            };

      const live = { avgClosingRank, govt: govtColleges, priv: privateColleges };
      
      let insightText = '';
      if (userRank) {
        if (matchingColleges > 0) {
          const chanceLevel = admissionProbability >= 0.8 ? 'strong' : admissionProbability >= 0.4 ? 'moderate' : 'low';
          insightText = `Your current AIR gives ${chanceLevel} admission chances in ${row.state_name} because ${matchingColleges} colleges closed below your rank in ${round}.`;
        } else {
          insightText = `Your current AIR makes admission very difficult in ${row.state_name}. Try looking at private quotas or other states.`;
        }
      } else {
        insightText = buildInsight(row, live);
      }

      return {
        id: row.id,
        state_key: row.state_key || key2,
        state_name: row.state_name,
        map_name: row.state_name,
        competition_score: Math.round(competitionScore * 10) / 10,
        difficulty: userRank ? difficultyFromScore(competitionScore) : difficulty,
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
        year: row.year || yearNum,
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
      highest_chance: userRank ? [...list].filter(r => r.admission_probability >= 0.8).sort((a,b) => b.admission_probability - a.admission_probability).slice(0, 5).map(r => ({ state_name: r.state_name, competition_score: Math.round(r.admission_probability * 100) + '%' })) : undefined,
      moderate_chance: userRank ? [...list].filter(r => r.admission_probability >= 0.4 && r.admission_probability < 0.8).sort((a,b) => b.admission_probability - a.admission_probability).slice(0, 5).map(r => ({ state_name: r.state_name, competition_score: Math.round(r.admission_probability * 100) + '%' })) : undefined,
      very_difficult: userRank ? [...list].filter(r => r.admission_probability < 0.4).sort((a,b) => a.admission_probability - b.admission_probability).slice(0, 5).map(r => ({ state_name: r.state_name, competition_score: Math.round(r.admission_probability * 100) + '%' })) : undefined,
    };

    // Detail mode
    if (req.query.detail === '1' && list.length === 1) {
      return res.status(200).json({ state: list[0], summary });
    }

    return res.status(200).json({ states: list, summary });
  } catch (err) {
    console.error('competition-map error:', err);
    res.status(500).json({ error: err.message });
  }
}
