import supabase from './db-client.js';
import { setCors } from './_auth.js';
import { requireStaff } from './_admin.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const ctx = await requireStaff(req, res);
    if (!ctx) return;
    const { user, staff } = ctx;
    const isSuper = staff.role === 'super_admin';

    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { staff_id, limit = '100' } = req.query;
    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('id', { ascending: false })
      .limit(Math.min(300, Number(limit) || 100));

    if (!isSuper) query = query.eq('staff_id', user.id);
    else if (staff_id) query = query.eq('staff_id', staff_id);

    const { data, error } = await query;
    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (err) {
    console.error('admin-activity error', err);
    res.status(500).json({ error: err.message });
  }
}
