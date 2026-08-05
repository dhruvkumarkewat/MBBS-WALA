import supabase from './db-client.js';

const FALLBACK_STATS = [
  { id: 1, key: 'students_counselled', label: 'Students Counselled', numeric_value: 45000, suffix: '+', icon: 'Users' },
  { id: 2, key: 'success_rate', label: 'Allotment Success Rate', numeric_value: 99, suffix: '%', icon: 'Award' },
  { id: 3, key: 'colleges_mapped', label: 'Medical Colleges Mapped', numeric_value: 1000, suffix: '+', icon: 'Building' },
  { id: 4, key: 'scholarships', label: 'Scholarships Unlocked', numeric_value: 12, prefix: '₹', suffix: ' Cr+', icon: 'BadgePercent' }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('site_stats')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error || !data || data.length === 0) {
        return res.status(200).json(FALLBACK_STATS);
      }
      return res.status(200).json(data);
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.warn('API site_stats fallback:', err.message);
    res.status(200).json(FALLBACK_STATS);
  }
}
