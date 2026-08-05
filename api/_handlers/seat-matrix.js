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
        .from('colleges')
        .select('id, name, type, seats, state', usePaging ? { count: 'exact' } : undefined)
        .order('seats', { ascending: false });

      if (kind && kind !== 'All') {
        if (kind.includes('Dental')) {
          query = query.eq('type', kind.replace(' Dental', '')).eq('course', 'BDS');
        } else if (kind.includes('AYUSH')) {
          query = query.eq('type', kind.replace(' AYUSH', '')).in('course', ['BAMS', 'BHMS', 'BUMS']);
        } else {
          query = query.eq('type', kind);
        }
      }
      if (q) query = query.ilike('name', `%${q}%`);
      if (course && course !== 'All') query = query.eq('course', course);

      const mapRow = (c) => ({
        id: c.id,
        college_name: c.name,
        college_kind: c.type || 'Unknown',
        total_seats: c.seats || 0,
        all_india: Math.floor((c.seats || 0) * 0.15) || null, // Estimate 15% AIQ
        open_seats: Math.floor((c.seats || 0) * 0.85) || null, // Estimate 85% Open
        nri_seats: null,
      });

      if (usePaging) {
        const { page, limit, from, to } = parsePagination(req.query, {
          defaultLimit: 30,
          maxLimit: 100,
        });
        const { data, error, count } = await query.range(from, to);
        if (error) throw error;
        return res.status(200).json({
          data: (data || []).map(mapRow),
          page,
          limit,
          total: count || 0,
          totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
          course: course || 'All',
          supported_courses: MEDICAL_COURSES,
        });
      }

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json((data || []).map(mapRow));
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
