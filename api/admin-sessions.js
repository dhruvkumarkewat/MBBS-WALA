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

    const { staff_id, limit = '50' } = req.query;
    let query = supabase
      .from('login_history')
      .select('*')
      .order('id', { ascending: false })
      .limit(Math.min(200, Number(limit) || 50));

    if (!isSuper) query = query.eq('user_id', user.id);
    else if (staff_id) query = query.eq('user_id', staff_id);

    const { data, error } = await query;
    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (err) {
    console.error('admin-sessions error', err);
    res.status(500).json({ error: err.message });
  }
}
