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
      min_score,
      max_fees,
    } = req.query;

    const yearNum = Number(year) || 2024;

    async function fetchAll(table, select, modifier = q => q, maxPages = 1) {
      const pageSize = 1000;
      const ranges = Array.from({length: maxPages}, (_, i) => [i*pageSize, (i+1)*pageSize - 1]);
      const res = await Promise.all(ranges.map(r => modifier(supabase.from(table).select(select)).range(r[0], r[1])));
      return res.flatMap(r => r.data || []);
    }

    const [baseRowsRes, colleges, seats, cuts] =
      await Promise.all([
        supabase.from('state_competition').select('*').eq('year', yearNum).order('competition_score', { ascending: false }),
        fetchAll('colleges', 'id,name,city,state,country,college_type,course', q => q.ilike('country', 'INDIA'), 3),
        fetchAll('seat_matrix', '*', q => q, 2),
        category !== 'All' 
          ? fetchAll('cutoffs', 'state, category, score, closing_rank', q => q.eq('category', category), 10)
          : []
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
      if (quota === 'State') displaySeats = stateQuota;

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
      const admissionProbability =
        row.admission_probability != null
          ? Number(row.admission_probability)
          : Math.max(0.08, Math.min(0.85, (100 - competitionScore) / 100));

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

      return {
        id: row.id,
        state_key: row.state_key || key2,
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
        avg_closing_rank: avgClosingRank,
        avg_cutoff: avgCutoff,
        admission_probability: Math.round(admissionProbability * 1000) / 1000,
        insight: buildInsight(row, live),
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
