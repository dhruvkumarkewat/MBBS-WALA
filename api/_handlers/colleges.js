import supabase from './db-client.js';
import { parsePagination } from './_auth.js';
import { applyCourseFilterOnCollegesQuery, MEDICAL_COURSES } from './_courses.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { state, type, q, country, course, courses } = req.query;
      const usePaging = paginateFlag(req.query);

      // Meta endpoint: list supported courses
      if (courses === '1' || courses === 'true') {
        return res.status(200).json({ courses: MEDICAL_COURSES });
      }

      let query = supabase
        .from('colleges')
        .select('*', usePaging ? { count: 'exact' } : undefined)
        .order('name', { ascending: true });

      if (country && country !== 'All') {
        query = query.ilike('country', country);
      } else if (!country) {
        query = query.ilike('country', 'INDIA');
      }

      if (state && state !== 'All') query = query.eq('state', state);
      if (type && type !== 'All') query = query.eq('college_type', type);
      query = applyCourseFilterOnCollegesQuery(query, course);
      if (q) query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,state.ilike.%${q}%,course.ilike.%${q}%`);

      if (usePaging) {
        const { page, limit, from, to } = parsePagination(req.query, {
          defaultLimit: 24,
          maxLimit: 100,
        });
        query = query.range(from, to);
        const { data, error, count } = await query;
        if (error) throw error;
        return res.status(200).json({
          data: data || [],
          page,
          limit,
          total: count || 0,
          totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
          course: course || 'All',
          supported_courses: MEDICAL_COURSES,
        });
      }

      if (req.query.limit) query = query.limit(Number(req.query.limit));
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

function paginateFlag(query) {
  return query.paginate === '1' || query.paginate === 'true' || query.page;
}
