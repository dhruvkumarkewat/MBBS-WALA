import supabase from './db-client.js';
import { COURSE_META, MEDICAL_COURSES, normalizeCourse } from './_courses.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      const { exam, score, category, course } = req.body || {};
      const courseKey = normalizeCourse(course);
      // UG medical courses share NEET UG rank bands
      const examKey =
        exam ||
        (courseKey && COURSE_META[courseKey] ? COURSE_META[courseKey].exam : null) ||
        'NEET UG';

      if (score == null) {
        return res.status(400).json({ error: 'score is required' });
      }
      const scoreNum = Number(score);
      if (Number.isNaN(scoreNum)) {
        return res.status(400).json({ error: 'Invalid score' });
      }

      const { data, error } = await supabase
        .from('rank_bands')
        .select('*')
        .eq('exam', examKey)
        .lte('score_min', scoreNum)
        .gte('score_max', scoreNum);

      if (error) throw error;

      let band = data && data[0];
      if (!band) {
        const maxScores = {
          'NEET UG': 720,
          'NEET PG': 800,
          'NEET MDS': 960,
          INICET: 200,
          'NEET SS': 400,
          'DNB PDCET': 300,
        };
        const max = maxScores[examKey] || 720;
        const pct = Math.max(0, Math.min(1, scoreNum / max));
        const pool = examKey === 'NEET UG' ? 1200000 : 200000;
        const estRank = Math.round(Math.pow(1 - pct, 2.2) * pool + 1);
        band = {
          predicted_rank_min: Math.max(1, Math.round(estRank * 0.85)),
          predicted_rank_max: Math.round(estRank * 1.15),
          score_min: scoreNum,
          score_max: scoreNum,
        };
      }

      const catMultiplier =
        category === 'SC' || category === 'ST'
          ? 0.72
          : category === 'OBC' || category === 'EWS'
          ? 0.88
          : 1;

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
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
