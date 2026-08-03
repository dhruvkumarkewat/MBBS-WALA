import supabase from './db-client.js';
import { collegeNamesForCourse, MEDICAL_COURSES, normalizeCourse } from './_courses.js';

function extractCutoffData(cutoffJson, category) {
  if (!cutoffJson) return null;
  let catPrefix = 'GEN';
  if (category === 'OBC') catPrefix = 'OBC';
  if (category === 'SC') catPrefix = 'SC';
  if (category === 'ST') catPrefix = 'ST';
  if (category === 'EWS') catPrefix = 'EWS';

  let closing = cutoffJson[`${catPrefix}_closing`] || cutoffJson[catPrefix] || cutoffJson.closing || cutoffJson.closing_rank;
  let opening = cutoffJson[`${catPrefix}_opening`] || cutoffJson.opening || cutoffJson.opening_rank;
  
  if (!closing) return null;
  return { closing: Number(closing), opening: Number(opening) || 1 };
}

function scoreChanceRealistic(rank, opening, closing) {
  if (!closing || closing <= 0) return { label: 'Unknown', score: 0, tone: 'muted' };
  
  // Super Safe: rank is better than or equal to opening rank
  if (rank <= opening) {
    return { label: 'Safe', score: 98, tone: 'safe' };
  }
  
  // Safe: rank is between opening and closing
  if (rank <= closing) {
    return { label: 'Safe', score: 92, tone: 'safe' };
  }
  
  // Likely: rank is within 10% worse than closing
  if (rank <= closing * 1.1) {
    return { label: 'Likely', score: 78, tone: 'likely' };
  }
  
  // Moderate: rank is within 25% worse
  if (rank <= closing * 1.25) {
    return { label: 'Moderate', score: 58, tone: 'moderate' };
  }
  
  // Reach: rank is within 50% worse
  if (rank <= closing * 1.5) {
    return { label: 'Reach', score: 38, tone: 'reach' };
  }
  
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

    // Query the comprehensive colleges table instead of cutoffs
    let query = supabase.from('colleges').select('*');
    
    if (state && state !== 'All') {
      query = query.eq('state', state);
    }
    
    if (courseNames && courseNames.length && course !== 'MBBS') {
      query = query.in('name', courseNames);
    } else if (course) {
      query = query.eq('course', course);
    }

    const { data: colleges, error } = await query;
    if (error) throw error;

    const validMatches = [];
    (colleges || []).forEach(c => {
      const cutoffData = extractCutoffData(c.cutoff, category);
      if (!cutoffData) return; // Skip if no cutoff data for this category
      
      const chance = scoreChanceRealistic(rank, cutoffData.opening, cutoffData.closing);
      
      validMatches.push({
        college_name: c.name,
        state: c.state || 'Unknown',
        category: category,
        year: 2024,
        aiq_rank: cutoffData.closing,
        opening_rank: cutoffData.opening,
        aiq_score: null, 
        state_rank_range: null,
        state_score_range: null,
        state_mid: null,
        chance: chance.label,
        chance_score: chance.score,
        chance_tone: chance.tone,
        best_path: 'AIQ',
        aiq_chance: chance.label,
        state_chance: null,
        total_seats: c.seats,
        open_seats: c.seats,
        college_kind: c.college_type,
        nirf: c.nirf || 999999 // Fallback for sorting
      });
    });

    // Meaningful outcome: keep options that are not pure stretch first, then fill
    const ranked = validMatches
      .filter((m) => m.chance_score >= 18)
      .sort((a, b) => {
        // 1. Sort by chance score descending (Safest first)
        if (b.chance_score !== a.chance_score) return b.chance_score - a.chance_score;
        // 2. Sort by NIRF ascending (AIIMS Delhi #1 first)
        if (a.nirf !== b.nirf) return a.nirf - b.nirf;
        // 3. Sort by closing rank ascending (More competitive colleges first)
        return (a.aiq_rank || 999999) - (b.aiq_rank || 999999);
      });

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
      total_evaluated: validMatches.length,
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
