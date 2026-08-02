import supabase from './db-client.js';
import { parsePagination } from './_auth.js';
import { collegeNamesForCourse, MEDICAL_COURSES, normalizeCourse } from './_courses.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { category, q, state, course, paginate } = req.query;
      const usePaging = paginate === '1' || paginate === 'true' || req.query.page;

      let query = supabase
        .from('cutoffs')
        .select('*', usePaging ? { count: 'exact' } : undefined)
        .order('aiq_rank', { ascending: true });

      if (category && category !== 'All') query = query.eq('category', category);
      if (state) query = query.eq('state', state);
      if (q) query = query.ilike('college_name', `%${q}%`);

      const c = normalizeCourse(course);
      if (c) {
        const names = await collegeNamesForCourse(c);
        if (names && names.length) {
          query = query.in('college_name', names);
        } else if (c !== 'MBBS') {
          // No colleges mapped — return empty
          return res.status(200).json(usePaging ? { data: [], page: 1, limit: 40, total: 0, totalPages: 1, course: c, supported_courses: MEDICAL_COURSES } : []);
        }
      }

      if (usePaging) {
        const { page, limit, from, to } = parsePagination(req.query, {
          defaultLimit: 40,
          maxLimit: 200,
        });
        const { data, error, count } = await query.range(from, to);
        if (error) throw error;
        return res.status(200).json({
          data: data || [],
          page,
          limit,
          total: count || 0,
          totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
          course: c || 'All',
          supported_courses: MEDICAL_COURSES,
        });
      }

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data || []);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
