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
      const { kind, q, course, paginate } = req.query;
      const usePaging = paginate === '1' || paginate === 'true' || req.query.page;

      let query = supabase
        .from('seat_matrix')
        .select('*', usePaging ? { count: 'exact' } : undefined)
        .order('total_seats', { ascending: false });

      if (kind && kind !== 'All') query = query.eq('college_kind', kind);
      if (q) query = query.ilike('college_name', `%${q}%`);

      const c = normalizeCourse(course);
      if (c) {
        const names = await collegeNamesForCourse(c);
        if (names && names.length) {
          query = query.in('college_name', names);
        } else if (c !== 'MBBS') {
          return res.status(200).json(
            usePaging
              ? { data: [], page: 1, limit: 30, total: 0, totalPages: 1, course: c, supported_courses: MEDICAL_COURSES }
              : []
          );
        }
        // MBBS with no name match: fall through to full matrix (legacy rows)
      }

      if (usePaging) {
        const { page, limit, from, to } = parsePagination(req.query, {
          defaultLimit: 30,
          maxLimit: 100,
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
