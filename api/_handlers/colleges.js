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

      const buildQuery = () => {
        let q = supabase
          .from('colleges')
          .select('*', usePaging ? { count: 'exact' } : undefined)
          .order('name', { ascending: true });

        if (country && country !== 'All') {
          q = q.ilike('country', country);
        } else if (!country) {
          q = q.ilike('country', 'INDIA');
        }

        if (state && state !== 'All') q = q.eq('state', state);
        if (type && type !== 'All') q = q.eq('college_type', type);
        q = applyCourseFilterOnCollegesQuery(q, course);
        if (req.query.q) q = q.or(`name.ilike.%${req.query.q}%,city.ilike.%${req.query.q}%,state.ilike.%${req.query.q}%,course.ilike.%${req.query.q}%`);
        
        return q;
      };

      if (usePaging) {
        const { page, limit, from, to } = parsePagination(req.query, {
          defaultLimit: 24,
          maxLimit: 100,
        });
        const { data, error, count } = await buildQuery().range(from, to);
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

      const limitVal = req.query.limit ? Number(req.query.limit) : 0;
      if (limitVal > 1000) {
        let allData = [];
        let from = 0;
        let step = 999;
        while (true) {
          const { data, error } = await buildQuery().range(from, from + step);
          if (error) throw error;
          if (data) allData = allData.concat(data);
          if (!data || data.length <= step) break;
          from += step + 1;
        }
        return res.status(200).json(allData);
      }

      let finalQuery = buildQuery();
      if (limitVal > 0) finalQuery = finalQuery.limit(limitVal);
      const { data, error } = await finalQuery;
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
