import supabase from './db-client.js';
import { COURSE_META, MEDICAL_COURSES, normalizeCourse } from './_courses.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      const { exam, score, rank, category, course } = req.body || {};
      const courseKey = normalizeCourse(course);
      // UG medical courses share NEET UG rank bands
      const examKey =
        exam ||
        (courseKey && COURSE_META[courseKey] ? COURSE_META[courseKey].exam : null) ||
        'NEET UG';

      const maxScores = {
        'NEET UG': 720,
        'NEET PG': 800,
        'NEET MDS': 960,
        INICET: 200,
        'NEET SS': 400,
        'DNB PDCET': 300,
      };
      const max = maxScores[examKey] || 720;
      const pool = examKey === 'NEET UG' ? 1200000 : 200000;

      const catMultiplier =
        category === 'SC' || category === 'ST'
          ? 0.72
          : category === 'OBC' || category === 'EWS'
          ? 0.88
          : 1;

      // Case 1: Direct Rank input
      if (rank != null && rank !== '') {
        const rankNum = Math.max(1, Number(rank));
        if (Number.isNaN(rankNum)) {
          return res.status(400).json({ error: 'Invalid rank' });
        }

        // Estimate score from rank
        const normalizedRank = rankNum / catMultiplier;
        const pct = Math.max(0, Math.min(1, 1 - Math.pow(Math.min(pool, normalizedRank) / pool, 1 / 2.2)));
        const estScore = Math.round(pct * max);

        return res.status(200).json({
          exam: examKey,
          course: courseKey || (examKey === 'NEET UG' ? 'MBBS' : null),
          rank: rankNum,
          predicted_rank_min: rankNum,
          predicted_rank_max: rankNum,
          score: estScore,
          predicted_score_min: Math.max(0, estScore - 15),
          predicted_score_max: Math.min(max, estScore + 15),
          category: category || 'General',
          supported_courses: MEDICAL_COURSES,
          note: `All India Rank ${rankNum.toLocaleString()} in category ${category || 'General'}. Use this to view matching Safe, Moderate, and Reach medical colleges.`,
        });
      }

      // Case 2: Score input
      if (score == null || score === '') {
        return res.status(400).json({ error: 'Either rank or score is required' });
      }
      const scoreNum = Number(score);
      if (Number.isNaN(scoreNum)) {
        return res.status(400).json({ error: 'Invalid score' });
      }

      let band = null;
      try {
        const { data, error } = await supabase
          .from('rank_bands')
          .select('*')
          .eq('exam', examKey)
          .lte('score_min', scoreNum)
          .gte('score_max', scoreNum);

        if (!error && data && data.length > 0) {
          band = data[0];
        }
      } catch {
        // Table not present — fallback to formula
      }

      if (!band) {
        const pct = Math.max(0, Math.min(1, scoreNum / max));
        const estRank = Math.round(Math.pow(1 - pct, 2.2) * pool + 1);
        band = {
          predicted_rank_min: Math.max(1, Math.round(estRank * 0.85)),
          predicted_rank_max: Math.round(estRank * 1.15),
          score_min: scoreNum,
          score_max: scoreNum,
        };
      }

      return res.status(200).json({
        exam: examKey,
        course: courseKey || (examKey === 'NEET UG' ? 'MBBS' : null),
        score: scoreNum,
        category: category || 'General',
        predicted_rank_min: Math.max(1, Math.round(band.predicted_rank_min * catMultiplier)),
        predicted_rank_max: Math.round(band.predicted_rank_max * catMultiplier),
        supported_courses: MEDICAL_COURSES,
        note: courseKey
          ? `Estimated NEET rank for ${courseKey} counselling planning. Actual ranks may vary.`
          : 'Estimated based on previous year trends. Actual ranks may vary.',
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('rank-calculator API error:', err);
    res.status(500).json({ error: err.message });
  }
}
