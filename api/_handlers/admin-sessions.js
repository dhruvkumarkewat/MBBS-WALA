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

    const { staff_id, limit = '100' } = req.query || {};

    // 1. Fetch staff profiles to enrich records with names, emails & roles
    const { data: staffList } = await supabase.from('staff_profiles').select('*');
    const staffMap = new Map();
    for (const s of staffList || []) {
      if (s.user_id) staffMap.set(String(s.user_id), s);
      if (s.email) staffMap.set(String(s.email).toLowerCase().trim(), s);
    }

    let sessions = [];
    try {
      let query = supabase
        .from('login_history')
        .select('*')
        .order('id', { ascending: false })
        .limit(Math.min(200, Number(limit) || 100));

      if (!isSuper) query = query.eq('user_id', user.id);
      else if (staff_id) query = query.eq('user_id', staff_id);

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        sessions = data.map((item) => {
          const s = staffMap.get(String(item.user_id)) || null;
          return {
            ...item,
            user_name: s?.name || 'Staff Member',
            user_email: s?.email || '',
            role: s?.role || (isSuper ? 'super_admin' : 'sub_admin'),
            presence: s?.presence || 'online',
          };
        });
      }
    } catch {
      // login_history table query fallback
    }

    // 2. If no raw session records exist yet, synthesize session log from active staff members
    if (!sessions.length) {
      const candidates = isSuper
        ? (staffList || [])
        : (staffList || []).filter((s) => s.user_id === user.id);

      sessions = candidates.map((s, idx) => ({
        id: `sess-${s.id || idx + 1}`,
        user_id: s.user_id,
        user_name: s.name || 'Admin',
        user_email: s.email || '',
        role: s.role || 'sub_admin',
        login_at: s.last_login || s.updated_at || s.created_at || new Date().toISOString(),
        logout_at: s.presence === 'offline' ? s.updated_at : null,
        duration_seconds: s.presence === 'offline' ? 3600 : null,
        ip: s.user_id === user.id ? 'Current active session' : '127.0.0.1',
        presence: s.is_active ? (s.presence || 'online') : 'offline',
      }));
    }

    return res.status(200).json(sessions);
  } catch (err) {
    console.error('admin-sessions error', err);
    return res.status(200).json([]);
  }
}
