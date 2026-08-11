import supabase from './db-client.js';
import { COURSE_META, MEDICAL_COURSES, courseBaseChoices, normalizeCourse } from './_courses.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { exam, course } = req.query;
      let query = supabase.from('choice_estimates').select('*');
      const key = normalizeCourse(course) || exam;
      if (key) query = query.eq('exam', key);
      const { data, error } = await query.order('id', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { exam, course, counselling, quota, category, rank } = req.body || {};
      // Prefer explicit medical course; map NEET UG → MBBS for estimates
      const courseKey =
        normalizeCourse(course) ||
        (exam === 'NEET UG' ? 'MBBS' : null) ||
        exam;
      if (!courseKey || rank == null || rank === '') {
        return res.status(400).json({ error: 'exam/course and rank are required' });
      }
      const rankNum = Number(rank);
      if (Number.isNaN(rankNum) || rankNum < 1) {
        return res.status(400).json({ error: 'Invalid rank' });
      }

      // Try course-specific bands first, then NEET UG / exam fallback
      const keysToTry = [courseKey, exam, courseKey === 'MBBS' ? 'NEET UG' : null].filter(Boolean);
      let data = [];
      for (const key of keysToTry) {
        try {
          let query = supabase.from('choice_estimates').select('*').eq('exam', key);
          if (counselling) query = query.eq('counselling', counselling);
          if (quota && quota !== 'All') query = query.eq('quota', quota);
          if (category && category !== 'All') query = query.eq('category', category);
          const resQ = await query;
          if (!resQ.error && resQ.data?.length) {
            data = resQ.data;
            break;
          }
        } catch {}
      }

      let choices = 0;
      if (data && data.length > 0) {
        const match =
          data.find((r) => rankNum >= r.rank_min && rankNum <= r.rank_max) || data[0];
        const span = Math.max(1, match.rank_max - match.rank_min);
        const position = Math.min(1, Math.max(0, (rankNum - match.rank_min) / span));
        choices = Math.max(1, Math.round(match.base_choices * (1.2 - position * 0.7)));
      } else {
        const base =
          courseBaseChoices(courseKey) ||
          (exam === 'NEET UG' ? 4500 :
          exam === 'NEET PG' ? 2800 :
          exam === 'NEET MDS' ? 900 :
          exam === 'NEET SS' ? 400 :
          exam === 'INICET' ? 600 : 500);
        choices = Math.max(5, Math.round(base * (1 / Math.log10(rankNum + 10)) * 2.5));
      }

      const meta = COURSE_META[normalizeCourse(courseKey)] || null;

      return res.status(200).json({
        choices,
        exam: exam || meta?.exam || 'NEET UG',
        course: normalizeCourse(courseKey) || courseKey,
        counselling: counselling || meta?.authority || null,
        quota: quota || 'All',
        category: category || 'All',
        rank: rankNum,
        supported_courses: MEDICAL_COURSES,
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
