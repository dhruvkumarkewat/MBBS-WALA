import supabase from './db-client.js';
import { collegeNamesForCourse, MEDICAL_COURSES, normalizeCourse } from './_courses.js';

function parseRangeMid(range) {
  if (!range || typeof range !== 'string') return null;
  const nums = range.replace(/,/g, '').match(/\d+/g);
  if (!nums || !nums.length) return null;
  if (nums.length === 1) return Number(nums[0]);
  return Math.round((Number(nums[0]) + Number(nums[1])) / 2);
}

function parseRangeMax(range) {
  if (!range || typeof range !== 'string') return null;
  const nums = range.replace(/,/g, '').match(/\d+/g);
  if (!nums || !nums.length) return null;
  return Number(nums[nums.length - 1]);
}

function scoreChance(rank, closingRank) {
  if (!closingRank || closingRank <= 0) return { label: 'Unknown', score: 0, tone: 'muted' };
  const ratio = rank / closingRank;
  if (ratio <= 0.75) return { label: 'Safe', score: 92, tone: 'safe' };
  if (ratio <= 0.95) return { label: 'Likely', score: 78, tone: 'likely' };
  if (ratio <= 1.1) return { label: 'Moderate', score: 58, tone: 'moderate' };
  if (ratio <= 1.35) return { label: 'Reach', score: 38, tone: 'reach' };
  return { label: 'Stretch', score: 18, tone: 'stretch' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.method === 'GET' ? req.query : req.body || {};
    const rank = Number(body.rank);
    const category = body.category || 'General';
    const state = body.state || null;
    const course = normalizeCourse(body.course) || 'MBBS';
    const limit = Math.min(40, Math.max(5, Number(body.limit) || 18));

    if (!rank || Number.isNaN(rank) || rank < 1) {
      return res.status(400).json({ error: 'Valid rank is required' });
    }

    const courseNames = await collegeNamesForCourse(course);

    let cutoffQuery = supabase
      .from('cutoffs')
      .select('*')
      .order('aiq_rank', { ascending: true });

    if (category && category !== 'All') {
      if (category === 'General') {
        cutoffQuery = cutoffQuery.in('category', ['General', 'UR', 'Unreserved']);
      } else {
        cutoffQuery = cutoffQuery.eq('category', category);
      }
    }
    if (state && state !== 'All') {
      cutoffQuery = cutoffQuery.eq('state', state);
    }
    if (courseNames && courseNames.length) {
      cutoffQuery = cutoffQuery.in('college_name', courseNames);
    }

    const { data: cutoffs, error } = await cutoffQuery;
    if (error) throw error;

    let seatQuery = supabase.from('seat_matrix').select('*');
    if (courseNames && courseNames.length) {
      seatQuery = seatQuery.in('college_name', courseNames);
    }
    const { data: seats } = await seatQuery;
    const seatByName = new Map();
    (seats || []).forEach((s) => {
      const key = (s.college_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      seatByName.set(key, s);
    });

    const matches = (cutoffs || []).map((c) => {
      const stateMax = parseRangeMax(c.state_rank_range);
      const stateMid = parseRangeMid(c.state_rank_range);
      const aiqChance = scoreChance(rank, c.aiq_rank);
      const stateChance = stateMax ? scoreChance(rank, stateMax) : null;
      // Prefer the better path for the student
      const best =
        stateChance && stateChance.score > aiqChance.score ? stateChance : aiqChance;
      const path =
        stateChance && stateChance.score > aiqChance.score ? 'State quota' : 'AIQ';

      const key = (c.college_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      let seat = seatByName.get(key) || null;
      if (!seat) {
        for (const [k, v] of seatByName.entries()) {
          if (k.includes(key.slice(0, 12)) || key.includes(k.slice(0, 12))) {
            seat = v;
            break;
          }
        }
      }

      return {
        college_name: c.college_name,
        state: c.state,
        category: c.category,
        year: c.year,
        aiq_rank: c.aiq_rank,
        aiq_score: c.aiq_score,
        state_rank_range: c.state_rank_range,
        state_score_range: c.state_score_range,
        state_mid: stateMid,
        chance: best.label,
        chance_score: best.score,
        chance_tone: best.tone,
        best_path: path,
        aiq_chance: aiqChance.label,
        state_chance: stateChance?.label || null,
        total_seats: seat?.total_seats ?? null,
        open_seats: seat?.open_seats ?? null,
        college_kind: seat?.college_kind ?? null,
      };
    });

    // Meaningful outcome: keep options that are not pure stretch first, then fill
    const ranked = matches
      .filter((m) => m.chance_score >= 18)
      .sort((a, b) => b.chance_score - a.chance_score || (a.aiq_rank || 999999) - (b.aiq_rank || 999999));

    const safe = ranked.filter((m) => m.chance_tone === 'safe' || m.chance_tone === 'likely');
    const moderate = ranked.filter((m) => m.chance_tone === 'moderate');
    const reach = ranked.filter((m) => m.chance_tone === 'reach' || m.chance_tone === 'stretch');

    const pick = [];
    const pushUnique = (arr, n) => {
      for (const item of arr) {
        if (pick.length >= limit) break;
        if (!pick.find((p) => p.college_name === item.college_name)) pick.push(item);
        if (pick.filter((p) => p.college_name === item.college_name).length >= n) continue;
      }
    };
    // balanced shortlist
    for (const item of safe) {
      if (pick.length >= Math.ceil(limit * 0.45)) break;
      pick.push(item);
    }
    for (const item of moderate) {
      if (pick.length >= Math.ceil(limit * 0.75)) break;
      if (!pick.find((p) => p.college_name === item.college_name)) pick.push(item);
    }
    for (const item of reach) {
      if (pick.length >= limit) break;
      if (!pick.find((p) => p.college_name === item.college_name)) pick.push(item);
    }
    // fill remainder
    for (const item of ranked) {
      if (pick.length >= limit) break;
      if (!pick.find((p) => p.college_name === item.college_name)) pick.push(item);
    }

    const summary = {
      total_evaluated: matches.length,
      safe_count: safe.length,
      moderate_count: moderate.length,
      reach_count: reach.length,
      recommended: pick.length,
    };

    return res.status(200).json({
      rank,
      category,
      course,
      state: state || 'All',
      supported_courses: MEDICAL_COURSES,
      summary,
      matches: pick,
      buckets: {
        safe: safe.slice(0, 8),
        moderate: moderate.slice(0, 8),
        reach: reach.slice(0, 8),
      },
      note: `Estimates for ${course} use past closing ranks (AIQ / AACCC / state bands). Official allotment depends on seat matrix, preferences and round dynamics.`,
    });
  } catch (err) {
    console.error('college-matches error:', err);
    res.status(500).json({ error: err.message });
  }
}
